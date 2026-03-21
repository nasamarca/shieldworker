"use client";

import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { prepareContractCall, readContract, getContract, type ThirdwebClient } from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { addresses, abis } from "@/lib/contracts";

// ── Contract getters ────────────────────────────────────────────────

export function getShieldContracts(client: ThirdwebClient) {
  return {
    identityRegistry: getContract({
      client,
      chain: avalancheFuji,
      address: addresses.identityRegistry,
      abi: abis.identityRegistry as any,
    }),
    registry: getContract({
      client,
      chain: avalancheFuji,
      address: addresses.shieldWorkerRegistry,
      abi: abis.shieldWorkerRegistry as any,
    }),
    pool: getContract({
      client,
      chain: avalancheFuji,
      address: addresses.protectionPool,
      abi: abis.protectionPool as any,
    }),
    claimManager: getContract({
      client,
      chain: avalancheFuji,
      address: addresses.claimManager,
      abi: abis.claimManager as any,
    }),
    usdc: getContract({
      client,
      chain: avalancheFuji,
      address: addresses.usdc,
    }),
  };
}

// ── Read hooks ──────────────────────────────────────────────────────

export function useWorkerByAddress(client: ThirdwebClient) {
  const account = useActiveAccount();
  const contracts = getShieldContracts(client);

  const { data: agentId } = useReadContract({
    contract: contracts.registry,
    method: "function addressToAgentId(address) view returns (uint256)",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  const { data: worker } = useReadContract({
    contract: contracts.registry,
    method:
      "function getWorker(uint256) view returns ((string workerType, string zone, string metadataURI, uint256 registeredAt, uint256 contributionStreak, uint256 totalContributed, uint256 totalPayoutsReceived))",
    params: [agentId ?? 0n],
    queryOptions: { enabled: !!agentId && agentId > 0n },
  });

  return {
    agentId: agentId ?? 0n,
    isRegistered: !!agentId && agentId > 0n && !!worker?.registeredAt,
    worker,
  };
}

export function useCoverage(client: ThirdwebClient, agentId: bigint) {
  const contracts = getShieldContracts(client);

  const { data: coverage, refetch: refetchCoverage } = useReadContract({
    contract: contracts.pool,
    method:
      "function getCoverage(uint256) view returns ((uint256 agentId, uint256 expiresAt, uint256 contributionCount))",
    params: [agentId],
    queryOptions: { enabled: agentId > 0n },
  });

  const { data: isActive, refetch: refetchActive } = useReadContract({
    contract: contracts.pool,
    method: "function isActive(uint256) view returns (bool)",
    params: [agentId],
    queryOptions: { enabled: agentId > 0n },
  });

  return {
    coverage,
    isActive: isActive ?? false,
    refetch: () => {
      refetchCoverage();
      refetchActive();
    },
  };
}

export function usePoolStats(client: ThirdwebClient) {
  const contracts = getShieldContracts(client);

  const { data: poolBalance } = useReadContract({
    contract: contracts.pool,
    method: "function getPoolBalance() view returns (uint256)",
    params: [],
  });

  const { data: totalContributions } = useReadContract({
    contract: contracts.pool,
    method: "function totalContributions() view returns (uint256)",
    params: [],
  });

  const { data: totalPayouts } = useReadContract({
    contract: contracts.pool,
    method: "function totalPayouts() view returns (uint256)",
    params: [],
  });

  const { data: totalWorkers } = useReadContract({
    contract: contracts.registry,
    method: "function totalRegistered() view returns (uint256)",
    params: [],
  });

  return {
    poolBalance: poolBalance ?? 0n,
    totalContributions: totalContributions ?? 0n,
    totalPayouts: totalPayouts ?? 0n,
    totalWorkers: totalWorkers ?? 0n,
  };
}

export function useIsAdmin(client: ThirdwebClient) {
  const account = useActiveAccount();
  const contracts = getShieldContracts(client);

  const { data: oracleRole } = useReadContract({
    contract: contracts.claimManager,
    method: "function ORACLE_ROLE() view returns (bytes32)",
    params: [],
  });

  const { data: hasRole } = useReadContract({
    contract: contracts.claimManager,
    method: "function hasRole(bytes32, address) view returns (bool)",
    params: [oracleRole ?? "0x", account?.address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!oracleRole && !!account },
  });

  return hasRole ?? false;
}

export function useTriggers(client: ThirdwebClient) {
  const contracts = getShieldContracts(client);

  const { data: triggerCount } = useReadContract({
    contract: contracts.claimManager,
    method: "function getTriggerCount() view returns (uint256)",
    params: [],
  });

  return { triggerCount: triggerCount ?? 0n };
}
