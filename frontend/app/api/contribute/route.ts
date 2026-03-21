import { NextRequest } from "next/server";
import {
  createThirdwebClient,
  getContract,
  readContract,
  prepareContractCall,
  Engine,
} from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { facilitator } from "thirdweb/x402";
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

// ── x402 v1 helpers (Fuji only supports v1) ─────────────────────────

const PRICE_CONFIG = {
  amount: "1000000",
  asset: { address: addresses.usdc, decimals: 6 },
};

async function getPaymentRequirementsV1(resourceUrl: string) {
  const f = getThirdwebFacilitator();
  // Force x402Version: 1 — Fuji does not support v2
  const result = await (f.accepts as any)({
    resourceUrl,
    method: "GET",
    network: avalancheFuji,
    payTo: process.env.RELAYER_WALLET_ADDRESS!,
    price: PRICE_CONFIG,
    x402Version: 1,
    routeConfig: {
      description: "ShieldWorker weekly contribution — $1 USDC for 7-day coverage",
      mimeType: "application/json",
    },
  });
  return result;
}

async function verifyAndSettlePayment(paymentData: string, resourceUrl: string) {
  const f = getThirdwebFacilitator();

  // Decode the payment from the header
  const { decodePayment } = await import("thirdweb/x402");
  const decodedPayment = decodePayment(paymentData);

  // Get the full payment requirements from accepts (v1) — includes all required fields
  const acceptsResult = await (f.accepts as any)({
    resourceUrl,
    method: "GET",
    network: avalancheFuji,
    payTo: process.env.RELAYER_WALLET_ADDRESS!,
    price: PRICE_CONFIG,
    x402Version: 1,
    routeConfig: {
      description: "ShieldWorker weekly contribution — $1 USDC for 7-day coverage",
      mimeType: "application/json",
    },
  });

  // Find matching payment requirements for the payment
  const paymentRequirements = acceptsResult.responseBody.accepts?.[0];
  if (!paymentRequirements) {
    return { success: false, error: "No payment requirements available" };
  }

  // Verify the payment
  const verifyResult = await f.verify(decodedPayment, paymentRequirements);
  if (!verifyResult.isValid) {
    return { success: false, error: verifyResult.invalidReason || "Payment verification failed" };
  }

  // Settle the payment
  const settleResult = await f.settle(decodedPayment, paymentRequirements);
  if (!settleResult.success) {
    return { success: false, error: settleResult.errorReason || "Payment settlement failed" };
  }

  return { success: true, receipt: settleResult };
}

// ── GET handler ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("agentId");

    // Validate agentId
    if (!raw || !/^\d+$/.test(raw)) {
      return Response.json({ error: "Missing or invalid agentId" }, { status: 400 });
    }
    const parsedAgentId = BigInt(raw);
    if (parsedAgentId === 0n) {
      return Response.json({ error: "agentId must be > 0" }, { status: 400 });
    }

    // Verify worker is registered BEFORE payment
    try {
      const isRegistered = await readContract({
        contract: getRegistryContract(),
        method: "function isRegistered(uint256) view returns (bool)",
        params: [parsedAgentId],
      });
      if (!isRegistered) {
        return Response.json(
          { error: "Worker not registered. Register first at /register." },
          { status: 400 }
        );
      }
    } catch {
      // proceed — on-chain will enforce
    }

    const paymentData =
      request.headers.get("x-payment") ??
      request.headers.get("payment-signature");

    const resourceUrl = request.nextUrl.toString();

    // ── No payment header → return 402 with v1 requirements ─────────
    if (!paymentData) {
      console.log("[x402] No payment header — returning 402 requirements (v1)");
      try {
        const requirements = await getPaymentRequirementsV1(resourceUrl);
        return Response.json(requirements.responseBody, {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to get payment requirements";
        console.error("[x402] accepts() failed:", msg);
        return Response.json({ error: `x402 setup error: ${msg}` }, { status: 500 });
      }
    }

    // ── Has payment header → verify & settle ────────────────────────
    console.log("[x402] Payment header received — verifying & settling");
    let settlement;
    try {
      settlement = await verifyAndSettlePayment(paymentData, resourceUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Settlement error";
      console.error("[x402] verify/settle failed:", msg);
      return Response.json({ error: `x402 settle error: ${msg}` }, { status: 500 });
    }

    if (!settlement.success) {
      return Response.json(
        { error: settlement.error },
        { status: 402 }
      );
    }

    // ── Payment settled → call contributeFor ────────────────────────
    console.log("[x402] Payment settled — calling contributeFor");
    const tx = prepareContractCall({
      contract: getPoolContract(),
      method: "function contributeFor(uint256)",
      params: [parsedAgentId],
    });

    const relayer = getRelayerWallet();

    const { transactionId } = await relayer.enqueueTransaction({
      transaction: tx,
    });

    const { transactionHash } = await Engine.waitForTransactionHash({
      client: getServerClient(),
      transactionId,
    });

    // Read coverage expiry
    let coverageExpiresAt: string | null = null;
    try {
      const coverage = await readContract({
        contract: getPoolContract(),
        method:
          "function getCoverage(uint256) view returns ((uint256 agentId, uint256 expiresAt, uint256 contributionCount))",
        params: [parsedAgentId],
      });
      coverageExpiresAt = new Date(Number(coverage.expiresAt) * 1000).toISOString();
    } catch {
      // non-critical
    }

    return Response.json({
      success: true,
      agentId: parsedAgentId.toString(),
      txHash: transactionHash,
      coverageExpiresAt,
      message: "Coverage activated for 7 days",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[x402] Unhandled error:", msg);
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
