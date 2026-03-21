// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test, console} from "forge-std/Test.sol";
import {ShieldWorkerRegistry} from "../src/ShieldWorkerRegistry.sol";
import {ProtectionPool} from "../src/ProtectionPool.sol";
import {ClaimManager} from "../src/ClaimManager.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC for testing (not deployed on-chain, only used in Foundry tests)
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @dev Mock IdentityRegistry for testing (simulates official ERC-8004)
contract MockIdentityRegistry {
    uint256 private _nextId = 1;
    mapping(uint256 => address) private _owners;
    mapping(uint256 => string) private _uris;

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextId++;
        _owners[agentId] = msg.sender;
        _uris[agentId] = agentURI;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function agentURI(uint256 agentId) external view returns (string memory) {
        return _uris[agentId];
    }
}

/// @title ShieldWorker Integration Tests
/// @notice Full flow: register → contribute → trigger → payout
contract IntegrationTest is Test {
    // Contracts
    MockUSDC usdc;
    MockIdentityRegistry identityRegistry;
    ShieldWorkerRegistry registry;
    ProtectionPool pool;
    ClaimManager claimManager;

    // Actors
    address deployer = makeAddr("deployer");
    address relayer = makeAddr("relayer");
    address maria = makeAddr("maria");
    address juan = makeAddr("juan");
    address pedro = makeAddr("pedro");

    // Constants
    uint256 constant CONTRIBUTION = 1_000_000; // $1 USDC
    uint256 constant PAYOUT = 50_000_000; // $50 USDC
    uint256 constant POOL_SEED = 500_000_000; // $500 USDC

    function setUp() public {
        vm.startPrank(deployer);

        // Deploy mock contracts
        usdc = new MockUSDC();
        identityRegistry = new MockIdentityRegistry();

        // Deploy ShieldWorker contracts
        registry = new ShieldWorkerRegistry(address(identityRegistry));
        pool = new ProtectionPool(address(usdc), address(registry), address(identityRegistry));
        claimManager = new ClaimManager(address(pool), address(registry));

        // Configure cross-contract addresses
        registry.setProtectionPool(address(pool));
        registry.setClaimManager(address(claimManager));

        // Grant roles
        pool.grantRole(pool.CLAIM_MANAGER_ROLE(), address(claimManager));
        pool.grantRole(pool.RELAYER_ROLE(), relayer);
        claimManager.grantRole(claimManager.ORACLE_ROLE(), deployer);

        // Seed pool
        usdc.mint(deployer, POOL_SEED);
        usdc.approve(address(pool), POOL_SEED);
        pool.seedPool(POOL_SEED);

        // Give workers some USDC for contributions
        usdc.mint(maria, 10_000_000); // $10
        usdc.mint(juan, 10_000_000);
        usdc.mint(pedro, 10_000_000);

        // Give relayer USDC for x402 contributions (enough for many contributions)
        usdc.mint(relayer, 100_000_000);

        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════
    //                    REGISTRATION TESTS
    // ══════════════════════════════════════════════════════════════════════

    function test_register_worker() public {
        // Step 1: María registers in IdentityRegistry (gets agentId NFT)
        vm.startPrank(maria);
        uint256 agentId = identityRegistry.register("https://shieldworker.xyz/metadata/maria.json");
        assertEq(agentId, 1);
        assertEq(identityRegistry.ownerOf(agentId), maria);

        // Step 2: María registers in ShieldWorkerRegistry
        registry.registerWorker(agentId, "street_vendor", "flores", "https://shieldworker.xyz/metadata/maria.json");
        vm.stopPrank();

        // Verify
        assertTrue(registry.isRegistered(agentId));
        assertEq(registry.totalRegistered(), 1);

        ShieldWorkerRegistry.WorkerProfile memory profile = registry.getWorker(agentId);
        assertEq(profile.workerType, "street_vendor");
        assertEq(profile.zone, "flores");
        assertEq(profile.registeredAt, block.timestamp);
        assertEq(profile.contributionStreak, 0);
    }

    function test_register_duplicate_reverts() public {
        vm.startPrank(maria);
        uint256 agentId = identityRegistry.register("uri");
        registry.registerWorker(agentId, "street_vendor", "flores", "uri");

        // Try to register again → should revert
        uint256 agentId2 = identityRegistry.register("uri2");
        vm.expectRevert(abi.encodeWithSignature("AlreadyRegistered(address)", maria));
        registry.registerWorker(agentId2, "gig", "palermo", "uri2");
        vm.stopPrank();
    }

    function test_register_not_owner_reverts() public {
        // María registers agentId
        vm.prank(maria);
        uint256 agentId = identityRegistry.register("uri");

        // Juan tries to register with María's agentId → should revert
        vm.prank(juan);
        vm.expectRevert(abi.encodeWithSignature("NotAgentOwner(uint256,address)", agentId, juan));
        registry.registerWorker(agentId, "gig", "palermo", "uri");
    }

    // ══════════════════════════════════════════════════════════════════════
    //                    CONTRIBUTION TESTS
    // ══════════════════════════════════════════════════════════════════════

    function test_contribute_direct() public {
        // Register María
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // María contributes directly
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION);
        pool.contribute(agentId);
        vm.stopPrank();

        // Verify coverage
        assertTrue(pool.isActive(agentId));
        ProtectionPool.Coverage memory cov = pool.getCoverage(agentId);
        assertEq(cov.expiresAt, block.timestamp + 7 days);
        assertEq(cov.contributionCount, 1);

        // Verify stats
        assertEq(pool.totalContributions(), CONTRIBUTION);
        ShieldWorkerRegistry.WorkerProfile memory profile = registry.getWorker(agentId);
        assertEq(profile.contributionStreak, 1);
        assertEq(profile.totalContributed, CONTRIBUTION);
    }

    function test_contributeFor_relayer() public {
        // Register María
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // Relayer contributes on behalf of María (x402 flow)
        vm.startPrank(relayer);
        usdc.approve(address(pool), CONTRIBUTION);
        pool.contributeFor(agentId);
        vm.stopPrank();

        // Verify coverage activated for María
        assertTrue(pool.isActive(agentId));
        assertEq(pool.totalContributions(), CONTRIBUTION);
    }

    function test_contribute_streak_increment() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // First contribution → streak = 1
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION * 3);
        pool.contribute(agentId);
        assertEq(registry.getWorker(agentId).contributionStreak, 1);

        // Second contribution (before expiry) → streak = 2
        vm.warp(block.timestamp + 3 days);
        pool.contribute(agentId);
        assertEq(registry.getWorker(agentId).contributionStreak, 2);

        vm.stopPrank();
    }

    function test_contribute_streak_reset_after_expiry() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // First contribution
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION * 2);
        pool.contribute(agentId);
        assertEq(registry.getWorker(agentId).contributionStreak, 1);

        // Coverage expires, then contribute again → streak = 1 (reset)
        vm.warp(block.timestamp + 8 days);
        assertFalse(pool.isActive(agentId));
        pool.contribute(agentId);
        assertEq(registry.getWorker(agentId).contributionStreak, 1);

        vm.stopPrank();
    }

    function test_contribute_unregistered_reverts() public {
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION);
        vm.expectRevert(abi.encodeWithSignature("WorkerNotRegistered(uint256)", 999));
        pool.contribute(999);
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════
    //                    TRIGGER + PAYOUT TESTS
    // ══════════════════════════════════════════════════════════════════════

    function test_full_flow_register_contribute_trigger_payout() public {
        // Register 3 workers in "flores"
        _registerWorker(maria, "street_vendor", "flores");
        _registerWorker(juan, "gig", "flores");
        _registerWorker(pedro, "construction", "palermo"); // different zone

        uint256 mariaId = registry.addressToAgentId(maria);
        uint256 juanId = registry.addressToAgentId(juan);
        uint256 pedroId = registry.addressToAgentId(pedro);

        // María and Juan contribute (active coverage), Pedro does NOT
        _contributeFor(maria, mariaId);
        _contributeFor(juan, juanId);
        // Pedro has no coverage

        // Admin submits trigger for "flores" zone
        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        // Verify trigger
        ClaimManager.TriggerEvent memory trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersAffected, 2); // María + Juan (both active in flores)

        // Verify Pedro not affected (different zone)
        uint256[] memory affected = claimManager.getAffectedWorkers(triggerId);
        assertEq(affected.length, 2);

        // Execute batch payout
        uint256 mariaBefore = usdc.balanceOf(maria);
        uint256 juanBefore = usdc.balanceOf(juan);

        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 0, 20);

        // Verify payouts
        assertEq(usdc.balanceOf(maria), mariaBefore + PAYOUT);
        assertEq(usdc.balanceOf(juan), juanBefore + PAYOUT);

        // Verify trigger fully processed
        trigger = claimManager.getTrigger(triggerId);
        assertTrue(trigger.fullyProcessed);
        assertEq(trigger.totalPayouts, PAYOUT * 2);
        assertEq(trigger.workersProcessed, 2);

        // Verify worker stats updated
        assertEq(registry.getWorker(mariaId).totalPayoutsReceived, PAYOUT);
        assertEq(registry.getWorker(juanId).totalPayoutsReceived, PAYOUT);
    }

    function test_no_double_payout() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 mariaId = registry.addressToAgentId(maria);
        _contributeFor(maria, mariaId);

        // Submit trigger + payout
        vm.startPrank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");
        claimManager.executeBatchPayout(triggerId, 0, 20);

        // Try to payout again → should revert (already fully processed)
        vm.expectRevert(abi.encodeWithSignature("TriggerAlreadyProcessed(uint256)", triggerId));
        claimManager.executeBatchPayout(triggerId, 0, 20);
        vm.stopPrank();
    }

    function test_payout_only_active_coverage() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 mariaId = registry.addressToAgentId(maria);
        _contributeFor(maria, mariaId);

        // Fast forward past coverage expiry
        vm.warp(block.timestamp + 8 days);
        assertFalse(pool.isActive(mariaId));

        // Submit trigger — María should NOT be affected (expired)
        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        ClaimManager.TriggerEvent memory trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersAffected, 0); // No active workers
    }

    function test_payout_cap_enforced() public {
        // Register 11 workers in flores (11 * $50 = $550 > $500 cap)
        address[11] memory workers;
        for (uint256 i = 0; i < 11; i++) {
            workers[i] = makeAddr(string(abi.encodePacked("worker", i)));
            usdc.mint(workers[i], CONTRIBUTION);
            _registerWorker(workers[i], "street_vendor", "flores");
            uint256 agentId = registry.addressToAgentId(workers[i]);
            _contributeFor(workers[i], agentId);
        }

        // Submit trigger
        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        // Execute payout — should revert when cap exceeded (11 * 50 = 550 > 500)
        vm.prank(deployer);
        vm.expectRevert(); // PayoutCapExceeded
        claimManager.executeBatchPayout(triggerId, 0, 20);
    }

    // ══════════════════════════════════════════════════════════════════════
    //                        POOL ADMIN TESTS
    // ══════════════════════════════════════════════════════════════════════

    function test_seedPool() public {
        uint256 balanceBefore = pool.getPoolBalance();
        uint256 extraSeed = 100_000_000; // $100

        vm.startPrank(deployer);
        usdc.mint(deployer, extraSeed);
        usdc.approve(address(pool), extraSeed);
        pool.seedPool(extraSeed);
        vm.stopPrank();

        assertEq(pool.getPoolBalance(), balanceBefore + extraSeed);
    }

    function test_pause_unpause() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // Pause
        vm.prank(deployer);
        pool.pause();

        // Contribution should revert when paused
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION);
        vm.expectRevert(); // EnforcedPause
        pool.contribute(agentId);
        vm.stopPrank();

        // Unpause
        vm.prank(deployer);
        pool.unpause();

        // Should work now
        vm.startPrank(maria);
        pool.contribute(agentId);
        vm.stopPrank();
        assertTrue(pool.isActive(agentId));
    }

    // ══════════════════════════════════════════════════════════════════════
    //                        HELPER FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════

    function _registerWorker(address worker, string memory workerType, string memory zone) internal {
        vm.startPrank(worker);
        uint256 agentId = identityRegistry.register("https://shieldworker.xyz/metadata.json");
        registry.registerWorker(agentId, workerType, zone, "https://shieldworker.xyz/metadata.json");
        vm.stopPrank();
    }

    function _contributeFor(
        address,
        /* worker */
        uint256 agentId
    )
        internal
    {
        // Simulate x402 flow: relayer contributes on behalf
        vm.startPrank(relayer);
        usdc.approve(address(pool), CONTRIBUTION);
        pool.contributeFor(agentId);
        vm.stopPrank();
    }
}
