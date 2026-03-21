"use client";

import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount, useActiveWallet } from "thirdweb/react";
import { prepareContractCall, type ThirdwebClient } from "thirdweb";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { getShieldContracts } from "./useShieldWorker";
import { DEFAULT_CONTRIBUTION } from "@/lib/constants";

// ── Step 1: Register in IdentityRegistry (mint agentId NFT) ─────────

export function useRegisterIdentity(client: ThirdwebClient) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();
  const contracts = getShieldContracts(client);

  const register = async (metadataURI: string) => {
    const tx = prepareContractCall({
      contract: contracts.identityRegistry,
      method: "function register(string) returns (uint256)",
      params: [metadataURI],
    });
    return await sendTx(tx);
  };

  return { register, isPending, error };
}

// ── Step 2: Register in ShieldWorkerRegistry (link agentId to zone) ──

export function useRegisterWorker(client: ThirdwebClient) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();
  const contracts = getShieldContracts(client);

  const registerWorker = async (
    agentId: bigint,
    workerType: string,
    zone: string,
    metadataURI: string
  ) => {
    const tx = prepareContractCall({
      contract: contracts.registry,
      method: "function registerWorker(uint256, string, string, string)",
      params: [agentId, workerType, zone, metadataURI],
    });
    return await sendTx(tx);
  };

  return { registerWorker, isPending, error };
}

// ── Approve USDC ────────────────────────────────────────────────────

export function useApproveUSDC(client: ThirdwebClient) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();
  const contracts = getShieldContracts(client);

  const approve = async (spender: string, amount: bigint) => {
    const tx = prepareContractCall({
      contract: contracts.usdc,
      method: "function approve(address, uint256) returns (bool)",
      params: [spender, amount],
    });
    return await sendTx(tx);
  };

  return { approve, isPending, error };
}

// ── Contribute (direct path) ────────────────────────────────────────

export function useContribute(client: ThirdwebClient) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();
  const contracts = getShieldContracts(client);

  const contribute = async (agentId: bigint) => {
    const tx = prepareContractCall({
      contract: contracts.pool,
      method: "function contribute(uint256)",
      params: [agentId],
    });
    return await sendTx(tx);
  };

  return { contribute, isPending, error };
}

// ── Contribute via x402 (HTTP 402 payment protocol) ─────────────────

export function useContributeX402(client: ThirdwebClient) {
  const wallet = useActiveWallet();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const contributeX402 = useCallback(
    async (agentId: bigint): Promise<{ success: boolean; txHash?: string }> => {
      if (!wallet) throw new Error("Wallet not connected");
      setIsPending(true);
      setError(null);

      try {
        const fetchWithPay = wrapFetchWithPayment(
          globalThis.fetch,
          client,
          wallet,
          { maxValue: 2_000_000n }, // max 2 USDC safety cap
        );

        const res = await fetchWithPay(
          `/api/contribute?agentId=${agentId.toString()}`
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? `x402 contribute failed (${res.status})`);
        }

        return { success: true, txHash: data.txHash };
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Unknown x402 error");
        setError(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [client, wallet]
  );

  return { contributeX402, isPending, error };
}

// ── Submit Trigger (admin/oracle) ───────────────────────────────────

export function useSubmitTrigger(client: ThirdwebClient) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();
  const contracts = getShieldContracts(client);

  const submitTrigger = async (eventType: string, zone: string) => {
    const tx = prepareContractCall({
      contract: contracts.claimManager,
      method: "function submitTrigger(string, string) returns (uint256)",
      params: [eventType, zone],
    });
    return await sendTx(tx);
  };

  return { submitTrigger, isPending, error };
}

// ── Execute Batch Payout (admin/oracle) ─────────────────────────────

export function useExecuteBatchPayout(client: ThirdwebClient) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();
  const contracts = getShieldContracts(client);

  const executeBatchPayout = async (triggerId: bigint, limit: bigint = 20n) => {
    const tx = prepareContractCall({
      contract: contracts.claimManager,
      method: "function executeBatchPayout(uint256, uint256)",
      params: [triggerId, limit],
    });
    return await sendTx(tx);
  };

  return { executeBatchPayout, isPending, error };
}
