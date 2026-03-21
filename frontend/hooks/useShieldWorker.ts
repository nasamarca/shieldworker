"use client";

import { useState, useEffect, useCallback } from "react";
import { useReadContract, useActiveAccount } from "thirdweb/react";
import {
  readContract,
  getContract,
  getContractEvents,
  prepareEvent,
  type ThirdwebClient,
} from "thirdweb";
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

  const { data: triggerCount, refetch: refetchCount } = useReadContract({
    contract: contracts.claimManager,
    method: "function getTriggerCount() view returns (uint256)",
    params: [],
  });

  return { triggerCount: triggerCount ?? 0n, refetchCount };
}

// ── Trigger list: fetch all triggers ─────────────────────────────────

export interface TriggerData {
  id: bigint;
  eventType: string;
  zone: string;
  timestamp: bigint;
  totalPayouts: bigint;
  workersAffected: bigint;
  workersProcessed: bigint;
  nextOffset: bigint;
  payoutPerWorker: bigint;
  fullyProcessed: boolean;
}

export function useTriggerList(client: ThirdwebClient) {
  const contracts = getShieldContracts(client);
  const { triggerCount, refetchCount } = useTriggers(client);
  const [triggers, setTriggers] = useState<TriggerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTriggers = useCallback(async () => {
    const count = Number(triggerCount);
    if (count === 0) {
      setTriggers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results: TriggerData[] = [];
      for (let i = 0; i < count; i++) {
        const data = await readContract({
          contract: contracts.claimManager,
          method:
            "function getTrigger(uint256) view returns ((string eventType, string zone, uint256 timestamp, uint256 totalPayouts, uint256 workersAffected, uint256 workersProcessed, uint256 nextOffset, uint256 payoutPerWorker, bool fullyProcessed))",
          params: [BigInt(i)],
        });
        results.push({ id: BigInt(i), ...data });
      }
      // Reverse: newest first
      setTriggers(results.reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load triggers");
    } finally {
      setLoading(false);
    }
  }, [triggerCount, contracts.claimManager]);

  useEffect(() => {
    fetchAllTriggers();
  }, [fetchAllTriggers]);

  return {
    triggers,
    loading,
    error,
    refetch: () => {
      refetchCount();
      fetchAllTriggers();
    },
  };
}

// ── Affected workers for a trigger ──────────────────────────────────

export function useAffectedWorkers(client: ThirdwebClient, triggerId: bigint | null) {
  const contracts = getShieldContracts(client);
  const [workers, setWorkers] = useState<bigint[]>([]);

  useEffect(() => {
    if (triggerId === null) return;
    readContract({
      contract: contracts.claimManager,
      method: "function getAffectedWorkers(uint256) view returns (uint256[])",
      params: [triggerId],
    }).then((v) => setWorkers([...v])).catch(() => {});
  }, [triggerId, contracts.claimManager]);

  return workers;
}

// ── Event history: contributions + payouts ──────────────────────────

export interface ContributionEvent {
  agentId: bigint;
  payer: string;
  amount: bigint;
  newExpiresAt: bigint;
  streak: bigint;
  transactionHash: string;
  blockNumber: bigint;
}

export interface PayoutEvent {
  agentId: bigint;
  recipient: string;
  amount: bigint;
  transactionHash: string;
  blockNumber: bigint;
}

// Fuji RPC typically supports 2k–10k block range for eth_getLogs.
// We paginate backwards in chunks to stay within limits.
const EVENT_BLOCK_CHUNK = 2048n;
const EVENT_MAX_CHUNKS = 5; // 5 × 2048 = ~10k blocks lookback

async function fetchEventsPaginated<T>(
  contract: ReturnType<typeof getContract>,
  event: ReturnType<typeof prepareEvent>,
  filterFn: (log: any) => boolean,
  mapFn: (log: any) => T,
): Promise<{ data: T[]; error: string | null }> {
  let lastError: string | null = null;

  // Try with thirdweb's indexer first (useIndexer: true is default)
  try {
    const logs = await getContractEvents({
      contract,
      events: [event],
      blockRange: 10000n,
    });
    const filtered = logs.filter(filterFn).map(mapFn).reverse();
    return { data: filtered, error: null };
  } catch (e) {
    lastError = e instanceof Error ? e.message : "Indexer fetch failed";
  }

  // Paginated fallback: fetch in smaller chunks via direct RPC
  for (let i = 0; i < EVENT_MAX_CHUNKS; i++) {
    try {
      const logs = await getContractEvents({
        contract,
        events: [event],
        blockRange: EVENT_BLOCK_CHUNK,
        useIndexer: false,
      });
      const filtered = logs.filter(filterFn).map(mapFn).reverse();
      return { data: filtered, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "RPC fetch failed";
      // Try next smaller chunk — but current impl uses same range,
      // so break to avoid identical retry
      break;
    }
  }

  // All attempts failed — return error so UI can warn user
  return { data: [], error: lastError };
}

export function useContributionHistory(client: ThirdwebClient, agentId: bigint) {
  const contracts = getShieldContracts(client);
  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!agentId || agentId === 0n) return;
    setLoading(true);
    setError(null);

    const contributionEvent = prepareEvent({
      signature:
        "event ContributionReceived(uint256 indexed agentId, address indexed payer, uint256 amount, uint256 newExpiresAt, uint256 streak)",
    });

    const result = await fetchEventsPaginated<ContributionEvent>(
      contracts.pool,
      contributionEvent,
      (log: any) => log.args.agentId === agentId,
      (log: any) => ({
        agentId: log.args.agentId,
        payer: log.args.payer,
        amount: log.args.amount,
        newExpiresAt: log.args.newExpiresAt,
        streak: log.args.streak,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      }),
    );

    setEvents(result.data);
    setError(result.error);
    setLoading(false);
  }, [agentId, contracts.pool]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function usePayoutHistory(client: ThirdwebClient, agentId: bigint) {
  const contracts = getShieldContracts(client);
  const [events, setEvents] = useState<PayoutEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!agentId || agentId === 0n) return;
    setLoading(true);
    setError(null);

    const payoutEvent = prepareEvent({
      signature:
        "event PayoutExecuted(uint256 indexed agentId, address indexed recipient, uint256 amount)",
    });

    const result = await fetchEventsPaginated<PayoutEvent>(
      contracts.pool,
      payoutEvent,
      (log: any) => log.args.agentId === agentId,
      (log: any) => ({
        agentId: log.args.agentId,
        recipient: log.args.recipient,
        amount: log.args.amount,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      }),
    );

    setEvents(result.data);
    setError(result.error);
    setLoading(false);
  }, [agentId, contracts.pool]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
