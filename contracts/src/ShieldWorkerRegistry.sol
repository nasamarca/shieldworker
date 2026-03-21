// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";
import "./interfaces/Errors.sol";

/**
 * @title ShieldWorkerRegistry
 * @author ShieldWorker Team — Aleph Hackathon March 2026
 * @notice Zone-based worker registry for the ShieldWorker community protection fund.
 *
 *         This contract does NOT mint agentId NFTs. Instead, it follows a 2-step registration model:
 *           Step 1: Worker calls the official ERC-8004 IdentityRegistry directly from their wallet
 *                   to mint an agentId NFT (self-sovereign identity — worker OWNS the NFT).
 *           Step 2: Worker calls registerWorker() here, linking their agentId to ShieldWorker-specific
 *                   data: zone, worker type, and metadata URI for parametric claim matching.
 *
 *         Why 2-step? Because IdentityRegistry.register() mints to msg.sender. If this contract
 *         called it, the NFT would be owned by the contract, not the worker. Self-sovereign identity
 *         means workers own and control their on-chain identity across any protocol.
 *
 * @dev Deployed on Avalanche C-Chain (Fuji testnet).
 *      Official IdentityRegistry: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 *      Source: https://github.com/ava-labs/8004-boilerplate
 */
contract ShieldWorkerRegistry is AccessControl, ReentrancyGuardTransient {
    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              TYPES                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Represents an informal worker's profile in ShieldWorker.
     * @param workerType Category of informal work ("street_vendor", "domestic", "construction", "gig")
     * @param zone Geographic zone in Buenos Aires ("flores", "palermo", "la_boca", "once")
     * @param metadataURI Off-chain JSON URI following ERC-8004 agentURI format
     * @param registeredAt Timestamp when the worker registered in ShieldWorker
     * @param contributionStreak Consecutive weekly contributions without lapse (portable credit signal)
     * @param totalContributed Cumulative USDC contributed to the protection fund (6 decimals)
     * @param totalPayoutsReceived Cumulative USDC received from parametric payouts (6 decimals)
     */
    struct WorkerProfile {
        string workerType;
        string zone;
        string metadataURI;
        uint256 registeredAt;
        uint256 contributionStreak;
        uint256 totalContributed;
        uint256 totalPayoutsReceived;
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              STATE                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice Reference to the official ERC-8004 IdentityRegistry (immutable after deployment)
    IIdentityRegistry public immutable identityRegistry;

    /// @notice Worker profiles indexed by agentId
    mapping(uint256 => WorkerProfile) public workers;

    /// @notice Maps wallet address to their agentId (1 identity per wallet)
    mapping(address => uint256) public addressToAgentId;

    /// @notice Maps zone name to array of agentIds in that zone (for parametric claim matching)
    mapping(string => uint256[]) internal _zoneToWorkers;

    /// @notice Total number of workers registered in ShieldWorker
    uint256 public totalRegistered;

    /// @notice ProtectionPool contract address — authorized to call updateStreak() and updatePayoutStats()
    address public protectionPool;

    /// @notice ClaimManager contract address — reserved for future cross-contract calls
    address public claimManager;

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              EVENTS                                 ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice Emitted when a new worker registers in ShieldWorker
    /// @param agentId The worker's agentId from the official IdentityRegistry
    /// @param worker The worker's wallet address
    /// @param workerType Category of informal work
    /// @param zone Geographic zone for parametric claim matching
    event WorkerRegistered(uint256 indexed agentId, address indexed worker, string workerType, string zone);

    /// @notice Emitted when a worker's contribution streak is updated
    /// @param agentId The worker's agentId
    /// @param newStreak The new consecutive contribution count
    event StreakUpdated(uint256 indexed agentId, uint256 newStreak);

    /// @notice Emitted when a worker's payout statistics are updated
    /// @param agentId The worker's agentId
    /// @param amount The payout amount added (USDC, 6 decimals)
    event PayoutStatsUpdated(uint256 indexed agentId, uint256 amount);

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                            CONSTRUCTOR                              ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Deploy ShieldWorkerRegistry with a reference to the official ERC-8004 IdentityRegistry.
     * @param _identityRegistry Address of the official ERC-8004 IdentityRegistry on Avalanche Fuji
     *                          (0x8004A818BFB912233c491871b3d84c89A494BD9e)
     */
    constructor(address _identityRegistry) {
        if (_identityRegistry == address(0)) revert ZeroAddress();
        identityRegistry = IIdentityRegistry(_identityRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                          ADMIN FUNCTIONS                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Set the ProtectionPool contract address. Required for cross-contract calls.
     * @dev Should be called once after all contracts are deployed.
     * @param _pool Address of the deployed ProtectionPool contract
     */
    function setProtectionPool(address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_pool == address(0)) revert ZeroAddress();
        protectionPool = _pool;
    }

    /**
     * @notice Set the ClaimManager contract address. Reserved for future cross-contract calls.
     * @dev Should be called once after all contracts are deployed.
     * @param _claimManager Address of the deployed ClaimManager contract
     */
    function setClaimManager(address _claimManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_claimManager == address(0)) revert ZeroAddress();
        claimManager = _claimManager;
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                      WORKER REGISTRATION                            ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Register a worker in ShieldWorker (Step 2 of 2-step registration).
     *
     *         Prerequisites (Step 1): Worker must have already called IdentityRegistry.register()
     *         directly from their wallet to mint an agentId NFT they own.
     *
     *         This function verifies the worker owns the agentId NFT, then stores ShieldWorker-specific
     *         data: zone (for parametric claim matching), worker type, and metadata URI.
     *
     * @param agentId The agentId NFT the worker owns in the official IdentityRegistry
     * @param workerType Category of informal work (e.g., "street_vendor", "domestic", "construction", "gig")
     * @param zone Geographic zone in Buenos Aires (e.g., "flores", "palermo", "la_boca")
     * @param metadataURI Off-chain JSON URI with worker details (following ERC-8004 agentURI format)
     */
    function registerWorker(
        uint256 agentId,
        string calldata workerType,
        string calldata zone,
        string calldata metadataURI
    ) external nonReentrant {
        // 1. Verify worker owns the agentId NFT in official IdentityRegistry
        if (identityRegistry.ownerOf(agentId) != msg.sender) {
            revert NotAgentOwner(agentId, msg.sender);
        }

        // 2. Verify wallet not already registered (1 identity per wallet)
        if (addressToAgentId[msg.sender] != 0) {
            revert AlreadyRegistered(msg.sender);
        }

        // 3. Verify agentId not already registered (1 worker per agentId)
        if (workers[agentId].registeredAt != 0) {
            revert AgentIdAlreadyRegistered(agentId);
        }

        // 4. Store worker profile
        workers[agentId] = WorkerProfile({
            workerType: workerType,
            zone: zone,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            contributionStreak: 0,
            totalContributed: 0,
            totalPayoutsReceived: 0
        });

        // 5. Map address → agentId
        addressToAgentId[msg.sender] = agentId;

        // 6. Add to zone index for parametric claim matching
        _zoneToWorkers[zone].push(agentId);

        // 7. Increment total registered count
        totalRegistered++;

        emit WorkerRegistered(agentId, msg.sender, workerType, zone);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                          VIEW FUNCTIONS                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Get a worker's full profile by their agentId.
     * @param agentId The worker's agentId from IdentityRegistry
     * @return The WorkerProfile struct with all worker data
     */
    function getWorker(uint256 agentId) external view returns (WorkerProfile memory) {
        return workers[agentId];
    }

    /**
     * @notice Get a worker's profile by their wallet address.
     * @param worker The worker's wallet address
     * @return agentId The worker's agentId (0 if not registered)
     * @return profile The WorkerProfile struct
     */
    function getWorkerByAddress(address worker) external view returns (uint256 agentId, WorkerProfile memory profile) {
        agentId = addressToAgentId[worker];
        profile = workers[agentId];
    }

    /**
     * @notice Get all agentIds registered in a specific zone.
     * @dev Used by ClaimManager to find affected workers during a parametric trigger event.
     * @param zone The zone name (e.g., "flores")
     * @return Array of agentIds in the zone
     */
    function getWorkersByZone(string calldata zone) external view returns (uint256[] memory) {
        return _zoneToWorkers[zone];
    }

    /**
     * @notice Check if an agentId has a worker profile in ShieldWorker.
     * @param agentId The agentId to check
     * @return True if the agentId is registered in ShieldWorker
     */
    function isRegistered(uint256 agentId) external view returns (bool) {
        return workers[agentId].registeredAt != 0;
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                    CROSS-CONTRACT UPDATE FUNCTIONS                   ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Update a worker's contribution streak and total contributed amount.
     * @dev Only callable by the ProtectionPool contract after a successful contribution.
     * @param agentId The worker's agentId
     * @param newStreak The new consecutive contribution count
     * @param contributionAmount The USDC amount contributed (6 decimals)
     */
    function updateStreak(uint256 agentId, uint256 newStreak, uint256 contributionAmount) external {
        if (msg.sender != protectionPool) revert NotAgentOwner(agentId, msg.sender);
        workers[agentId].contributionStreak = newStreak;
        workers[agentId].totalContributed += contributionAmount;
        emit StreakUpdated(agentId, newStreak);
    }

    /**
     * @notice Update a worker's total payouts received.
     * @dev Only callable by the ProtectionPool contract (called during executePayout).
     * @param agentId The worker's agentId
     * @param amount The payout USDC amount received (6 decimals)
     */
    function updatePayoutStats(uint256 agentId, uint256 amount) external {
        if (msg.sender != protectionPool) revert NotAgentOwner(agentId, msg.sender);
        workers[agentId].totalPayoutsReceived += amount;
        emit PayoutStatsUpdated(agentId, amount);
    }
}
