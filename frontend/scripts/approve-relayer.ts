/**
 * One-time setup: Approve USDC from server wallet (relayer) to ProtectionPool.
 *
 * Run:
 *   npx tsx scripts/approve-relayer.ts
 *
 * Requires .env.local with:
 *   THIRDWEB_SECRET_KEY=...
 *   RELAYER_WALLET_ADDRESS=0xf710...d5d2
 */

import { readFileSync } from "fs";

// Parse .env.local manually (no dotenv dependency)
const envFile = readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  Engine,
} from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { addresses } from "../lib/contracts/addresses";

const MAX_UINT256 = 2n ** 256n - 1n;

async function main() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  const relayerAddress = process.env.RELAYER_WALLET_ADDRESS;

  if (!secretKey || !relayerAddress) {
    console.error("Missing THIRDWEB_SECRET_KEY or RELAYER_WALLET_ADDRESS in .env.local");
    process.exit(1);
  }

  console.log("=== Approve USDC: Relayer → ProtectionPool ===");
  console.log("Relayer:", relayerAddress);
  console.log("USDC:", addresses.usdc);
  console.log("Spender (Pool):", addresses.protectionPool);
  console.log("Amount: max uint256 (unlimited)");
  console.log("");

  const client = createThirdwebClient({ secretKey });

  const usdcContract = getContract({
    client,
    chain: avalancheFuji,
    address: addresses.usdc,
  });

  const relayer = Engine.serverWallet({
    client,
    address: relayerAddress,
    chain: avalancheFuji,
    executionOptions: { type: "EOA", from: relayerAddress },
  });

  // Prepare approve(protectionPool, maxUint256)
  const tx = prepareContractCall({
    contract: usdcContract,
    method: "function approve(address spender, uint256 amount) returns (bool)",
    params: [addresses.protectionPool, MAX_UINT256],
  });

  console.log("Sending approve tx via Engine server wallet...");

  const { transactionId } = await relayer.enqueueTransaction({
    transaction: tx,
  });

  console.log("Transaction enqueued. ID:", transactionId);
  console.log("Waiting for confirmation...");

  const { transactionHash } = await Engine.waitForTransactionHash({
    client,
    transactionId,
  });

  console.log("");
  console.log("Approved! TX:", transactionHash);
  console.log("Snowtrace:", `https://testnet.snowtrace.io/tx/${transactionHash}`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
