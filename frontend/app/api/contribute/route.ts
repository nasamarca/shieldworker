import { NextRequest } from "next/server";
import {
  createThirdwebClient,
  getContract,
  readContract,
  prepareContractCall,
  Engine,
} from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { settlePayment, facilitator } from "thirdweb/x402";
import { addresses, abis } from "@/lib/contracts";

// Force dynamic — this route must never be statically pre-rendered
export const dynamic = "force-dynamic";

// ── Lazy-initialized server resources ───────────────────────────────

function getServerClient() {
  return createThirdwebClient({
    secretKey: process.env.THIRDWEB_SECRET_KEY!,
  });
}

function getRelayerWallet() {
  const addr = process.env.RELAYER_WALLET_ADDRESS!;
  return Engine.serverWallet({
    client: getServerClient(),
    address: addr,
    chain: avalancheFuji,
    executionOptions: { type: "EOA", from: addr },
  });
}

function getThirdwebFacilitator() {
  return facilitator({
    client: getServerClient(),
    serverWalletAddress: process.env.RELAYER_WALLET_ADDRESS!,
  });
}

function getPoolContract() {
  return getContract({
    client: getServerClient(),
    chain: avalancheFuji,
    address: addresses.protectionPool,
    abi: abis.protectionPool as any,
  });
}

function getRegistryContract() {
  return getContract({
    client: getServerClient(),
    chain: avalancheFuji,
    address: addresses.shieldWorkerRegistry,
    abi: abis.shieldWorkerRegistry as any,
  });
}

// ── GET handler: settlePayment handles 402 → payment → settle ───────

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return Response.json({ error: "Missing agentId" }, { status: 400 });
  }

  // Extract payment header (x402 v2 uses "x-payment", v1 uses "payment-signature")
  const paymentData =
    request.headers.get("x-payment") ??
    request.headers.get("payment-signature");

  const resourceUrl = request.nextUrl.toString();

  const result = await settlePayment({
    resourceUrl,
    method: "GET",
    paymentData,
    payTo: process.env.RELAYER_WALLET_ADDRESS!,
    network: avalancheFuji,
    price: {
      amount: "1000000", // 1 USDC (6 decimals)
      asset: {
        address: addresses.usdc,
        decimals: 6,
      },
    },
    facilitator: getThirdwebFacilitator(),
    routeConfig: {
      description: "ShieldWorker weekly contribution — $1 USDC for 7-day coverage",
      mimeType: "application/json",
    },
  });

  // Payment required — return 402 with requirements
  if (result.status === 402) {
    return Response.json(result.responseBody, {
      status: 402,
      headers: result.responseHeaders,
    });
  }

  // Payment settled — verify worker is registered before calling contributeFor
  // This prevents the edge case where user pays x402 but contributeFor reverts
  try {
    const isRegistered = await readContract({
      contract: getRegistryContract(),
      method: "function isRegistered(uint256) view returns (bool)",
      params: [BigInt(agentId)],
    });

    if (!isRegistered) {
      return Response.json(
        {
          success: false,
          error: "Worker not registered. Register first at /register before contributing.",
        },
        { status: 400 }
      );
    }
  } catch {
    // If registry check fails, proceed anyway — contributeFor will revert if invalid
  }

  try {
    const tx = prepareContractCall({
      contract: getPoolContract(),
      method: "function contributeFor(uint256)",
      params: [BigInt(agentId)],
    });

    const relayer = getRelayerWallet();

    // Enqueue tx via thirdweb Engine server wallet
    const { transactionId } = await relayer.enqueueTransaction({
      transaction: tx,
    });

    // Wait for tx to be mined
    const { transactionHash } = await Engine.waitForTransactionHash({
      client: getServerClient(),
      transactionId,
    });

    return Response.json(
      {
        success: true,
        agentId,
        txHash: transactionHash,
        message: "Coverage activated for 7 days",
      },
      {
        status: 200,
        headers: result.responseHeaders,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "contributeFor failed";
    return Response.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
