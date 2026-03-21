// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {ShieldWorkerRegistry} from "../src/ShieldWorkerRegistry.sol";
import {ProtectionPool} from "../src/ProtectionPool.sol";
import {ClaimManager} from "../src/ClaimManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Deploy — ShieldWorker deployment script for Avalanche Fuji
/// @notice Deploys 3 custom contracts and configures them with official Fuji addresses
contract Deploy is Script {
    // ══════════════════════════════════════════════════════════════════════
    //                    OFFICIAL FUJI ADDRESSES
    // ══════════════════════════════════════════════════════════════════════

    address constant IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address constant FUJI_USDC = 0x5425890298aed601595a70AB815c96711a31Bc65;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address relayerWallet = vm.envOr("RELAYER_WALLET", deployer);
        uint256 seedAmount = vm.envOr("SEED_AMOUNT", uint256(0));

        console.log("Deployer:", deployer);
        console.log("Relayer wallet:", relayerWallet);

        vm.startBroadcast(deployerPrivateKey);

        // ════════════════════════════════════════════════════════════════
        // 1. Deploy ShieldWorkerRegistry
        // ════════════════════════════════════════════════════════════════
        ShieldWorkerRegistry registry = new ShieldWorkerRegistry(IDENTITY_REGISTRY);
        console.log("ShieldWorkerRegistry deployed:", address(registry));

        // ════════════════════════════════════════════════════════════════
        // 2. Deploy ProtectionPool
        // ════════════════════════════════════════════════════════════════
        ProtectionPool pool = new ProtectionPool(FUJI_USDC, address(registry), IDENTITY_REGISTRY);
        console.log("ProtectionPool deployed:", address(pool));

        // ════════════════════════════════════════════════════════════════
        // 3. Deploy ClaimManager
        // ════════════════════════════════════════════════════════════════
        ClaimManager claimManager = new ClaimManager(address(pool), address(registry));
        console.log("ClaimManager deployed:", address(claimManager));

        // ════════════════════════════════════════════════════════════════
        // 4. Configure cross-contract addresses
        // ════════════════════════════════════════════════════════════════
        registry.setProtectionPool(address(pool));
        registry.setClaimManager(address(claimManager));
        console.log("Registry configured: pool + claimManager set");

        // ════════════════════════════════════════════════════════════════
        // 5. Grant roles
        // ════════════════════════════════════════════════════════════════

        // ClaimManager gets CLAIM_MANAGER_ROLE on ProtectionPool
        pool.grantRole(pool.CLAIM_MANAGER_ROLE(), address(claimManager));
        console.log("ProtectionPool: CLAIM_MANAGER_ROLE granted to ClaimManager");

        // Relayer wallet gets RELAYER_ROLE on ProtectionPool (for x402 contributions)
        pool.grantRole(pool.RELAYER_ROLE(), relayerWallet);
        console.log("ProtectionPool: RELAYER_ROLE granted to relayer:", relayerWallet);

        // Deployer gets ORACLE_ROLE on ClaimManager
        claimManager.grantRole(claimManager.ORACLE_ROLE(), deployer);
        console.log("ClaimManager: ORACLE_ROLE granted to deployer");

        // ════════════════════════════════════════════════════════════════
        // 6. Seed pool (optional — if deployer has USDC)
        // ════════════════════════════════════════════════════════════════
        if (seedAmount > 0) {
            IERC20 usdc = IERC20(FUJI_USDC);
            usdc.approve(address(pool), seedAmount);
            pool.seedPool(seedAmount);
            console.log("Pool seeded with USDC:", seedAmount);
        }

        vm.stopBroadcast();

        // ════════════════════════════════════════════════════════════════
        // Summary
        // ════════════════════════════════════════════════════════════════
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Avalanche Fuji (43113)");
        console.log("IdentityRegistry (official):", IDENTITY_REGISTRY);
        console.log("USDC (official):", FUJI_USDC);
        console.log("ShieldWorkerRegistry:", address(registry));
        console.log("ProtectionPool:", address(pool));
        console.log("ClaimManager:", address(claimManager));
        console.log("Relayer:", relayerWallet);
        console.log("==========================");
    }
}
