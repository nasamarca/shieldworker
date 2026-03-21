// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { Test, console } from "forge-std/Test.sol";
import { ShieldWorkerRegistry } from "../src/ShieldWorkerRegistry.sol";
import { ProtectionPool } from "../src/ProtectionPool.sol";
import { ClaimManager } from "../src/ClaimManager.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC for testing (not deployed on-chain, only used in Foundry tests)
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") { }

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
        claimManager.executeBatchPayout(triggerId, 20);

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
        claimManager.executeBatchPayout(triggerId, 20);

        // Try to payout again → should revert (already fully processed)
        vm.expectRevert(abi.encodeWithSignature("TriggerAlreadyProcessed(uint256)", triggerId));
        claimManager.executeBatchPayout(triggerId, 20);
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

    function test_proportional_payout_when_cap_exceeded() public {
        // Register 11 workers (11 * $50 = $550 > $500 cap)
        // Pool = $500 seed + $11 contributions = $511
        // Proportional: min($50, $511/11=$46.4, $500/11=$45.4) = $45 (cap/workers wins)
        address[11] memory wkrs;
        for (uint256 i = 0; i < 11; i++) {
            wkrs[i] = makeAddr(string(abi.encodePacked("worker", i)));
            usdc.mint(wkrs[i], CONTRIBUTION);
            _registerWorker(wkrs[i], "street_vendor", "flores");
            uint256 agentId = registry.addressToAgentId(wkrs[i]);
            _contributeFor(wkrs[i], agentId);
        }

        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        // Verify proportional payout was computed: $500 cap / 11 workers = $45.45 → $45 (floor)
        ClaimManager.TriggerEvent memory trigger = claimManager.getTrigger(triggerId);
        uint256 expectedPayout = pool.MAX_PAYOUT_PER_EVENT() / 11; // 500_000_000 / 11 = 45_454_545
        assertEq(trigger.payoutPerWorker, expectedPayout);

        // Execute — should NOT revert, all 11 workers get proportional share
        uint256 balanceBefore = usdc.balanceOf(wkrs[0]);
        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 20);

        // Each worker gets proportional payout
        assertEq(usdc.balanceOf(wkrs[0]), balanceBefore + expectedPayout);

        trigger = claimManager.getTrigger(triggerId);
        assertTrue(trigger.fullyProcessed);
        assertEq(trigger.workersProcessed, 11);
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

    function test_register_agentId_zero_reverts() public {
        vm.prank(maria);
        vm.expectRevert("agentId must be > 0");
        registry.registerWorker(0, "street_vendor", "flores", "uri");
    }

    function test_setProtectionPool_already_set_reverts() public {
        // protectionPool already set in setUp()
        vm.prank(deployer);
        vm.expectRevert("Already set");
        registry.setProtectionPool(makeAddr("newPool"));
    }

    function test_submitTrigger_pool_empty_payout_is_zero() public {
        // Deploy fresh contracts with empty pool (no seed)
        vm.startPrank(deployer);
        ShieldWorkerRegistry freshRegistry = new ShieldWorkerRegistry(address(identityRegistry));
        ProtectionPool freshPool = new ProtectionPool(address(usdc), address(freshRegistry), address(identityRegistry));
        ClaimManager freshClaim = new ClaimManager(address(freshPool), address(freshRegistry));

        freshRegistry.setProtectionPool(address(freshPool));
        freshRegistry.setClaimManager(address(freshClaim));
        freshPool.grantRole(freshPool.CLAIM_MANAGER_ROLE(), address(freshClaim));
        freshPool.grantRole(freshPool.RELAYER_ROLE(), relayer);
        freshClaim.grantRole(freshClaim.ORACLE_ROLE(), deployer);
        vm.stopPrank();

        // Register + contribute worker
        vm.startPrank(maria);
        uint256 agentId = identityRegistry.register("uri");
        freshRegistry.registerWorker(agentId, "street_vendor", "flores", "uri");
        usdc.approve(address(freshPool), CONTRIBUTION);
        freshPool.contribute(agentId);
        vm.stopPrank();

        // Pool only has $1 (from contribution), no seed
        assertEq(freshPool.getPoolBalance(), CONTRIBUTION);

        // Submit trigger — payoutPerWorker = min($50, $1/1, $500/1) = $1
        vm.prank(deployer);
        uint256 triggerId = freshClaim.submitTrigger("heavy_rain", "flores");

        ClaimManager.TriggerEvent memory trigger = freshClaim.getTrigger(triggerId);
        assertEq(trigger.payoutPerWorker, CONTRIBUTION); // $1, not $50
    }

    // ══════════════════════════════════════════════════════════════════════
    //              REGISTRY — MISSING UNHAPPY PATH + EDGE CASES
    // ══════════════════════════════════════════════════════════════════════

    function test_register_duplicate_agentId_reverts() public {
        // María registers with agentId 1
        vm.prank(maria);
        uint256 agentId = identityRegistry.register("uri");
        vm.prank(maria);
        registry.registerWorker(agentId, "street_vendor", "flores", "uri");

        // Transfer agentId ownership concept: Juan registers a NEW agentId,
        // but we simulate agentId already used by setting registeredAt != 0.
        // The only way to hit AgentIdAlreadyRegistered is if a different wallet
        // tries to register an agentId that already has a profile.
        // We need the mock to return juan as ownerOf(agentId) — not possible with current mock.
        // Instead: María's agentId=1 is registered. If someone else somehow owns agentId=1
        // and tries to register it, they get AgentIdAlreadyRegistered.
        // With current mock this is not directly testable, so we test via a second mock approach:
        // We create a scenario where two different agents map to same agentId.
        // Actually — let's test it properly: if María registered agentId 1, and Juan somehow
        // also owns agentId 1 in IdentityRegistry (not possible with mock), we need a different approach.
        // The realistic scenario: María registers agentId 1. Then María transfers the NFT to Juan
        // (not supported by mock). So we test the error directly by using a custom mock.

        // Simpler approach: we can test this by directly writing to the workers mapping
        // via a second registration contract. But the cleanest way is:
        // Register worker profile for agentId X, then have the actual NFT owner (different address)
        // try to register the same agentId.
        // Since our mock doesn't support transfer, we'll verify the error path exists
        // by noting the first two checks pass (ownerOf == sender, addressToAgentId == 0)
        // but registeredAt != 0. This requires a fresh address that owns the same agentId.
        // We cannot do this with the current mock. Let's use vm.store or a workaround.

        // Practical test: use vm.mockCall to make identityRegistry.ownerOf(agentId) return juan
        vm.mockCall(address(identityRegistry), abi.encodeWithSignature("ownerOf(uint256)", agentId), abi.encode(juan));
        vm.prank(juan);
        vm.expectRevert(abi.encodeWithSignature("AgentIdAlreadyRegistered(uint256)", agentId));
        registry.registerWorker(agentId, "gig", "palermo", "uri2");

        vm.clearMockedCalls();
    }

    function test_getWorkersByZone_returns_correct_list() public {
        _registerWorker(maria, "street_vendor", "flores");
        _registerWorker(juan, "gig", "flores");
        _registerWorker(pedro, "construction", "palermo");

        uint256[] memory floresWorkers = registry.getWorkersByZone("flores");
        assertEq(floresWorkers.length, 2);
        assertEq(floresWorkers[0], registry.addressToAgentId(maria));
        assertEq(floresWorkers[1], registry.addressToAgentId(juan));

        uint256[] memory palermoWorkers = registry.getWorkersByZone("palermo");
        assertEq(palermoWorkers.length, 1);
        assertEq(palermoWorkers[0], registry.addressToAgentId(pedro));

        // Empty zone
        uint256[] memory emptyZone = registry.getWorkersByZone("la_boca");
        assertEq(emptyZone.length, 0);
    }

    function test_updateStreak_only_protectionPool() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // Random address tries to call updateStreak → reverts
        vm.prank(maria);
        vm.expectRevert(abi.encodeWithSignature("UnauthorizedCaller(address,address)", maria, address(pool)));
        registry.updateStreak(agentId, 5, CONTRIBUTION);
    }

    function test_updatePayoutStats_only_protectionPool() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // Random address tries to call updatePayoutStats → reverts
        vm.prank(maria);
        vm.expectRevert(abi.encodeWithSignature("UnauthorizedCaller(address,address)", maria, address(pool)));
        registry.updatePayoutStats(agentId, PAYOUT);
    }

    function test_setProtectionPool_only_admin() public {
        vm.prank(maria);
        vm.expectRevert();
        registry.setProtectionPool(address(0x1234));
    }

    function test_setClaimManager_only_admin() public {
        vm.prank(maria);
        vm.expectRevert();
        registry.setClaimManager(address(0x1234));
    }

    function test_setProtectionPool_zero_address_reverts() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        registry.setProtectionPool(address(0));
    }

    function test_setClaimManager_zero_address_reverts() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        registry.setClaimManager(address(0));
    }

    function test_registry_constructor_zero_address_reverts() public {
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ShieldWorkerRegistry(address(0));
    }

    // ══════════════════════════════════════════════════════════════════════
    //              POOL — MISSING UNHAPPY PATH + EDGE CASES
    // ══════════════════════════════════════════════════════════════════════

    function test_contribute_not_agent_owner_reverts() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 mariaAgentId = registry.addressToAgentId(maria);

        // Juan tries to contribute with María's agentId → NotAgentOwner
        vm.startPrank(juan);
        usdc.approve(address(pool), CONTRIBUTION);
        vm.expectRevert(abi.encodeWithSignature("NotAgentOwner(uint256,address)", mariaAgentId, juan));
        pool.contribute(mariaAgentId);
        vm.stopPrank();
    }

    function test_contributeFor_non_relayer_reverts() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);

        // María (not a relayer) tries to call contributeFor → AccessControl revert
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION);
        vm.expectRevert();
        pool.contributeFor(agentId);
        vm.stopPrank();
    }

    function test_executePayout_after_coverage_expiry_still_works() public {
        // NOTE: executePayout does NOT check isActive() — coverage is verified at trigger
        // submission time (snapshot). This prevents denying legitimate payouts when coverage
        // expires between trigger and batch execution (Security Finding #1).
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);
        _contributeFor(maria, agentId);

        // Warp past coverage expiry
        vm.warp(block.timestamp + 8 days);
        assertFalse(pool.isActive(agentId));

        // ClaimManager can still execute payout (coverage was active at trigger time)
        uint256 balanceBefore = usdc.balanceOf(maria);
        vm.prank(address(claimManager));
        pool.executePayout(agentId, PAYOUT);
        assertEq(usdc.balanceOf(maria), balanceBefore + PAYOUT);
    }

    function test_executePayout_insufficient_balance_reverts() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);
        _contributeFor(maria, agentId);

        // Try to pay out more than pool balance
        uint256 hugeAmount = 999_999_000_000; // way more than pool has
        uint256 poolBal = usdc.balanceOf(address(pool));

        vm.prank(address(claimManager));
        vm.expectRevert(abi.encodeWithSignature("InsufficientPoolBalance(uint256,uint256)", hugeAmount, poolBal));
        pool.executePayout(agentId, hugeAmount);
    }

    function test_executePayout_only_claim_manager_role() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);
        _contributeFor(maria, agentId);

        // Random address tries to call executePayout → AccessControl revert
        vm.prank(maria);
        vm.expectRevert();
        pool.executePayout(agentId, PAYOUT);
    }

    function test_seedPool_only_admin_role() public {
        vm.startPrank(maria);
        usdc.approve(address(pool), CONTRIBUTION);
        vm.expectRevert();
        pool.seedPool(CONTRIBUTION);
        vm.stopPrank();
    }

    function test_pause_only_admin_role() public {
        vm.prank(maria);
        vm.expectRevert();
        pool.pause();
    }

    function test_unpause_only_admin_role() public {
        // First pause as admin
        vm.prank(deployer);
        pool.pause();

        // Non-admin tries to unpause → reverts
        vm.prank(maria);
        vm.expectRevert();
        pool.unpause();
    }

    function test_pool_constructor_zero_address_reverts() public {
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ProtectionPool(address(0), address(registry), address(identityRegistry));

        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ProtectionPool(address(usdc), address(0), address(identityRegistry));

        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ProtectionPool(address(usdc), address(registry), address(0));
    }

    // ══════════════════════════════════════════════════════════════════════
    //           CLAIM MANAGER — MISSING UNHAPPY PATH + EDGE CASES
    // ══════════════════════════════════════════════════════════════════════

    function test_submitTrigger_only_oracle_role() public {
        vm.prank(maria);
        vm.expectRevert();
        claimManager.submitTrigger("heavy_rain", "flores");
    }

    function test_executeBatchPayout_pagination() public {
        // Register 5 workers in flores
        address[5] memory workers;
        for (uint256 i = 0; i < 5; i++) {
            workers[i] = makeAddr(string(abi.encodePacked("pag_worker", i)));
            usdc.mint(workers[i], CONTRIBUTION);
            _registerWorker(workers[i], "street_vendor", "flores");
            uint256 agentId = registry.addressToAgentId(workers[i]);
            _contributeFor(workers[i], agentId);
        }

        // Submit trigger
        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        // Process in batches of 2 — offset auto-tracked by contract
        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 2);

        ClaimManager.TriggerEvent memory trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersProcessed, 2);
        assertFalse(trigger.fullyProcessed);

        // Next batch — contract knows to start at offset 2
        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 2);

        trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersProcessed, 4);
        assertFalse(trigger.fullyProcessed);

        // Final batch — contract starts at offset 4, processes 1 remaining
        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 2);

        trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersProcessed, 5);
        assertTrue(trigger.fullyProcessed);
    }

    function test_submitTrigger_zero_workers_auto_completes() public {
        // No workers registered in "palermo" — trigger should auto-complete
        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "palermo");

        ClaimManager.TriggerEvent memory trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersAffected, 0);
        assertTrue(trigger.fullyProcessed); // auto-completed, no need to call executeBatchPayout
        assertEq(trigger.payoutPerWorker, 0);
    }

    function test_executeBatchPayout_trigger_not_found() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("TriggerNotFound(uint256)", 999));
        claimManager.executeBatchPayout(999, 20);
    }

    function test_executeBatchPayout_auto_offset_prevents_re_execution() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);
        _contributeFor(maria, agentId);

        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        // First call processes all workers
        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 20);

        // Second call reverts — trigger fully processed, offset auto-tracked
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("TriggerAlreadyProcessed(uint256)", triggerId));
        claimManager.executeBatchPayout(triggerId, 20);
    }

    function test_executeBatchPayout_only_oracle_role() public {
        _registerWorker(maria, "street_vendor", "flores");
        uint256 agentId = registry.addressToAgentId(maria);
        _contributeFor(maria, agentId);

        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        // Non-oracle tries to execute payout
        vm.prank(maria);
        vm.expectRevert();
        claimManager.executeBatchPayout(triggerId, 20);
    }

    function test_executeBatchPayout_pays_even_after_coverage_expires() public {
        // Security Finding #1: Workers who had active coverage at trigger time SHOULD
        // receive payout even if coverage expires before batch execution. The trigger
        // snapshot is the source of truth, not the current coverage state.
        _registerWorker(maria, "street_vendor", "flores");
        _registerWorker(juan, "gig", "flores");
        uint256 mariaId = registry.addressToAgentId(maria);
        uint256 juanId = registry.addressToAgentId(juan);

        _contributeFor(maria, mariaId);
        _contributeFor(juan, juanId);

        // Submit trigger — both active at this moment (snapshot taken)
        vm.prank(deployer);
        uint256 triggerId = claimManager.submitTrigger("heavy_rain", "flores");

        ClaimManager.TriggerEvent memory trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersAffected, 2);

        // Warp so coverage expires BEFORE payout execution
        vm.warp(block.timestamp + 8 days);
        assertFalse(pool.isActive(mariaId));
        assertFalse(pool.isActive(juanId));

        // Execute payout — should STILL pay both workers (they had coverage at trigger time)
        uint256 mariaBefore = usdc.balanceOf(maria);
        uint256 juanBefore = usdc.balanceOf(juan);

        vm.prank(deployer);
        claimManager.executeBatchPayout(triggerId, 20);

        // Both workers should receive payout despite expired coverage
        assertEq(usdc.balanceOf(maria), mariaBefore + PAYOUT);
        assertEq(usdc.balanceOf(juan), juanBefore + PAYOUT);

        // Verify trigger fully processed — both workers paid despite expired coverage
        trigger = claimManager.getTrigger(triggerId);
        assertEq(trigger.workersProcessed, 2);
        assertEq(trigger.totalPayouts, PAYOUT * 2);
        assertTrue(trigger.fullyProcessed);
    }

    function test_claimManager_constructor_zero_address_reverts() public {
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ClaimManager(address(0), address(registry));

        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new ClaimManager(address(pool), address(0));
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
