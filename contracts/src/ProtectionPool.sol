// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ShieldWorkerRegistry } from "./ShieldWorkerRegistry.sol";
import { IIdentityRegistry } from "./interfaces/IIdentityRegistry.sol";
import "./interfaces/Errors.sol";

/**
 * @title ProtectionPool
 * @author ShieldWorker Team — Aleph Hackathon March 2026
 * @notice Community protection fund (fondo de proteccion comunitaria) for LATAM's informal workers.
 *
 *         The pool receives USDC contributions from workers and pays out parametric claims when
 *         trigger conditions are met (e.g., heavy rain in a specific zone).
 *
 *         Two contribution paths:
 *           1. contribute()    — Worker calls directly (approve USDC + call contribute)
 *           2. contributeFor() — Backend relayer calls after x402 payment settlement.
 *                                The x402 protocol (via Thirdweb ERC-4337 facilitator) transfers
 *                                USDC from the worker to the backend wallet, then the backend
 *                                calls contributeFor() to activate coverage for the worker.
 *
 *         Coverage model: Each $1 USDC contribution activates 7-day rolling coverage.
 *         Payout model: $50 USDC parametric payout per trigger event per affected worker.
 *
 *         Important: This is a mutual aid fund, NOT insurance. Under Argentina's Ley 20.091,
 *         offering insurance without SSN authorization is illegal.
 *
 * @dev Deployed on Avalanche C-Chain (Fuji testnet).
 *      Uses SafeERC20 for all USDC transfers.
 *      Uses ReentrancyGuardTransient (TSTORE-based, 98% cheaper than classic ReentrancyGuard).
 */
contract ProtectionPool is AccessControl, Pausable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              ROLES                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice Role for admin operations (pause, unpause, seed pool)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Role for ClaimManager to execute payouts from the pool
    bytes32 public constant CLAIM_MANAGER_ROLE = keccak256("CLAIM_MANAGER_ROLE");

    /// @notice Role for backend wallet to call contributeFor() after x402 settlement
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                            CONSTANTS                                ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice Duration of coverage per contribution (7 days)
    uint256 public constant COVERAGE_DURATION = 7 days;

    /// @notice Default contribution amount: $1 USDC (6 decimals)
    uint256 public constant DEFAULT_CONTRIBUTION = 1_000_000;

    /// @notice Default payout amount per worker per trigger: $50 USDC (6 decimals)
    uint256 public constant DEFAULT_PAYOUT = 50_000_000;

    /// @notice Maximum total payout per trigger event: $500 USDC (prevents pool drain)
    uint256 public constant MAX_PAYOUT_PER_EVENT = 500_000_000;

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              TYPES                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Tracks a worker's coverage status.
     * @param agentId The worker's agentId from IdentityRegistry
     * @param expiresAt Timestamp when coverage expires (0 = never covered)
     * @param contributionCount Total number of contributions made by this worker
     * @dev isActive is NOT stored — computed via isActive() function to save ~20,000 gas per write
     */
    struct Coverage {
        uint256 agentId;
        uint256 expiresAt;
        uint256 contributionCount;
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              STATE                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice USDC token contract (Fuji: 0x5425890298aed601595a70AB815c96711a31Bc65)
    IERC20 public immutable usdc;

    /// @notice ShieldWorkerRegistry contract for zone data and worker stats
    ShieldWorkerRegistry public immutable registry;

    /// @notice Official ERC-8004 IdentityRegistry for agentId ownership verification
    IIdentityRegistry public immutable identityRegistry;

    /// @notice Coverage data per worker (agentId → Coverage)
    mapping(uint256 => Coverage) public coverages;

    /// @notice Cumulative USDC received from all contributions
    uint256 public totalContributions;

    /// @notice Cumulative USDC paid out in all claims
    uint256 public totalPayouts;

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              EVENTS                                 ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Emitted when a worker's contribution is received and coverage is activated.
     * @param agentId The worker's agentId
     * @param payer The address that paid (worker for contribute(), relayer for contributeFor())
     * @param amount The contribution amount in USDC (6 decimals)
     * @param newExpiresAt The new coverage expiration timestamp
     * @param streak The worker's current consecutive contribution streak
     */
    event ContributionReceived(
        uint256 indexed agentId, address indexed payer, uint256 amount, uint256 newExpiresAt, uint256 streak
    );

    /**
     * @notice Emitted when a parametric payout is sent to a worker.
     * @param agentId The worker's agentId
     * @param recipient The worker's wallet address that received the payout
     * @param amount The payout amount in USDC (6 decimals)
     */
    event PayoutExecuted(uint256 indexed agentId, address indexed recipient, uint256 amount);

    /**
     * @notice Emitted when an admin seeds the pool with USDC.
     * @param admin The admin address that seeded
     * @param amount The seed amount in USDC (6 decimals)
     */
    event PoolSeeded(address indexed admin, uint256 amount);

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                            CONSTRUCTOR                              ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Deploy the ProtectionPool with references to USDC, registry, and IdentityRegistry.
     * @param _usdc Address of the USDC token (Fuji: 0x5425890298aed601595a70AB815c96711a31Bc65)
     * @param _registry Address of the deployed ShieldWorkerRegistry contract
     * @param _identityRegistry Address of the official ERC-8004 IdentityRegistry
     */
    constructor(address _usdc, address _registry, address _identityRegistry) {
        if (_usdc == address(0) || _registry == address(0) || _identityRegistry == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        registry = ShieldWorkerRegistry(_registry);
        identityRegistry = IIdentityRegistry(_identityRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                      CONTRIBUTION FUNCTIONS                         ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Direct contribution path — worker calls this directly.
     * @dev Worker must first call USDC.approve(pool, DEFAULT_CONTRIBUTION) before calling this.
     *      Verifies the caller owns the agentId NFT in the official IdentityRegistry.
     * @param agentId The worker's agentId from IdentityRegistry
     */
    function contribute(uint256 agentId) external whenNotPaused nonReentrant {
        if (!registry.isRegistered(agentId)) revert WorkerNotRegistered(agentId);
        if (identityRegistry.ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId, msg.sender);

        usdc.safeTransferFrom(msg.sender, address(this), DEFAULT_CONTRIBUTION);
        _activateCoverage(agentId, msg.sender);
    }

    /**
     * @notice Relayer contribution path — backend wallet calls this after x402 settlement.
     *
     *         Flow: Worker pays $1 USDC via x402 → Thirdweb ERC-4337 facilitator settles USDC
     *         to backend wallet → backend wallet calls this function → coverage activated for worker.
     *
     * @dev Only callable by addresses with RELAYER_ROLE. Backend wallet must have approved
     *      USDC spending to this contract before calling.
     * @param agentId The worker's agentId to activate coverage for
     */
    function contributeFor(uint256 agentId) external whenNotPaused nonReentrant onlyRole(RELAYER_ROLE) {
        if (!registry.isRegistered(agentId)) revert WorkerNotRegistered(agentId);

        usdc.safeTransferFrom(msg.sender, address(this), DEFAULT_CONTRIBUTION);
        _activateCoverage(agentId, msg.sender);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                        PAYOUT FUNCTIONS                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Execute a parametric payout to a worker with active coverage.
     * @dev Only callable by the ClaimManager contract (CLAIM_MANAGER_ROLE).
     *      Follows Checks-Effects-Interactions pattern.
     *      Sends USDC directly to the worker's wallet (resolved via IdentityRegistry.ownerOf).
     * @param agentId The worker's agentId to pay
     * @param amount The USDC payout amount (6 decimals)
     */
    function executePayout(uint256 agentId, uint256 amount) external nonReentrant onlyRole(CLAIM_MANAGER_ROLE) {

        uint256 poolBalance = usdc.balanceOf(address(this));
        if (poolBalance < amount) revert InsufficientPoolBalance(amount, poolBalance);

        address recipient = identityRegistry.ownerOf(agentId);

        // Effects before interactions (CEI pattern)
        totalPayouts += amount;
        registry.updatePayoutStats(agentId, amount);

        // Interaction: transfer USDC to worker
        usdc.safeTransfer(recipient, amount);

        emit PayoutExecuted(agentId, recipient, amount);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                          VIEW FUNCTIONS                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Get coverage details for a worker.
     * @param agentId The worker's agentId
     * @return Coverage struct with agentId, expiresAt, and contributionCount
     */
    function getCoverage(uint256 agentId) external view returns (Coverage memory) {
        return coverages[agentId];
    }

    /**
     * @notice Check if a worker currently has active coverage.
     * @dev Computed on-the-fly (not stored) to save ~20,000 gas per contribution.
     * @param agentId The worker's agentId
     * @return True if coverage has not expired (expiresAt > block.timestamp)
     */
    function isActive(uint256 agentId) public view returns (bool) {
        return coverages[agentId].expiresAt > block.timestamp;
    }

    /**
     * @notice Get the total USDC balance currently held in the pool.
     * @return The pool's USDC balance (6 decimals)
     */
    function getPoolBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                          ADMIN FUNCTIONS                            ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Seed the pool with USDC from admin/donors.
     * @dev Admin must approve USDC spending to this contract before calling.
     *      This is additive only — there is NO withdraw function by design.
     *      Pool funds can only leave via ClaimManager.executePayout().
     * @param amount The USDC amount to seed (6 decimals)
     */
    function seedPool(uint256 amount) external onlyRole(ADMIN_ROLE) {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit PoolSeeded(msg.sender, amount);
    }

    /// @notice Pause all contributions (emergency circuit breaker). Does not affect payouts.
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Resume contributions after emergency pause.
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                        INTERNAL FUNCTIONS                           ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Activate or extend coverage for a worker after a successful contribution.
     * @dev Shared logic used by both contribute() and contributeFor().
     *      Computes contribution streak:
     *        - If contributed before expiry → streak increments (consecutive)
     *        - If coverage had lapsed → streak resets to 1
     *      The streak serves as a portable on-chain credit signal (reputation).
     * @param agentId The worker's agentId
     * @param payer The address that paid (worker or relayer)
     */
    function _activateCoverage(uint256 agentId, address payer) internal {
        Coverage storage coverage = coverages[agentId];

        // Compute streak: consecutive contributions = portable credit signal
        // Read current streak from registry (not from contributionCount, which never resets)
        uint256 currentStreak = registry.getWorker(agentId).contributionStreak;
        uint256 newStreak;
        if (coverage.expiresAt > block.timestamp) {
            // Contributed before expiry → streak increments from current value
            newStreak = currentStreak + 1;
        } else {
            // Coverage had lapsed → streak resets to 1
            newStreak = 1;
        }

        // Update coverage state
        coverage.agentId = agentId;
        coverage.expiresAt = block.timestamp + COVERAGE_DURATION;
        coverage.contributionCount++;

        // Update pool totals
        totalContributions += DEFAULT_CONTRIBUTION;

        // Update worker stats in registry (streak + total contributed)
        registry.updateStreak(agentId, newStreak, DEFAULT_CONTRIBUTION);

        emit ContributionReceived(agentId, payer, DEFAULT_CONTRIBUTION, coverage.expiresAt, newStreak);
    }
}
