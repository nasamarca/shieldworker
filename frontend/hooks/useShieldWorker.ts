import { useState, useEffect, useCallback, useMemo } from "react";
import { useReadContract, useActiveAccount } from "thirdweb/react";
import {
  readContract,
  getContract,
  type ThirdwebClient,
} from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { addresses, abis } from "@/lib/contracts";

// ── Contract getters (raw — use useShieldContracts for memoized) ────

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

function useShieldContracts(client: ThirdwebClient) {
  return useMemo(() => getShieldContracts(client), [client]);
}

// ── Read hooks ──────────────────────────────────────────────────────

export function useWorkerByAddress(client: ThirdwebClient) {
  const account = useActiveAccount();
  const contracts = useShieldContracts(client);

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
  const contracts = useShieldContracts(client);

  const { data: coverage, refetch: refetchCoverage } = useReadContract({
    contract: contracts.pool,
    method:
      "function getCoverage(uint256) view returns ((uint256 agentId, uint256 expiresAt, uint256 contributionCount))",
    params: [agentId],
    queryOptions: { enabled: agentId > 0n, refetchInterval: 15_000 },
  });

  const { data: isActive, refetch: refetchActive } = useReadContract({
    contract: contracts.pool,
    method: "function isActive(uint256) view returns (bool)",
    params: [agentId],
    queryOptions: { enabled: agentId > 0n, refetchInterval: 15_000 },
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
  const contracts = useShieldContracts(client);

  const { data: poolBalance } = useReadContract({
    contract: contracts.pool,
    method: "function getPoolBalance() view returns (uint256)",
    params: [],
    queryOptions: { refetchInterval: 10_000 },
  });

  const { data: totalContributions } = useReadContract({
    contract: contracts.pool,
    method: "function totalContributions() view returns (uint256)",
    params: [],
    queryOptions: { refetchInterval: 10_000 },
  });

  const { data: totalPayouts } = useReadContract({
    contract: contracts.pool,
    method: "function totalPayouts() view returns (uint256)",
    params: [],
    queryOptions: { refetchInterval: 10_000 },
  });

  const { data: totalWorkers } = useReadContract({
    contract: contracts.registry,
    method: "function totalRegistered() view returns (uint256)",
    params: [],
    queryOptions: { refetchInterval: 10_000 },
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
  const contracts = useShieldContracts(client);

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
  const contracts = useShieldContracts(client);

  const { data: triggerCount, refetch: refetchCount } = useReadContract({
    contract: contracts.claimManager,
    method: "function getTriggerCount() view returns (uint256)",
    params: [],
  });

  return { triggerCount: triggerCount ?? 0n, refetchCount };
}

// ── Trigger list ────────────────────────────────────────────────────

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
  const contracts = useShieldContracts(client);
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
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          readContract({
            contract: contracts.claimManager,
            method:
              "function getTrigger(uint256) view returns ((string eventType, string zone, uint256 timestamp, uint256 totalPayouts, uint256 workersAffected, uint256 workersProcessed, uint256 nextOffset, uint256 payoutPerWorker, bool fullyProcessed))",
            params: [BigInt(i)],
          }).then((data) => ({ id: BigInt(i), ...data }))
        )
      );
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

// ── Affected workers ────────────────────────────────────────────────

export function useAffectedWorkers(client: ThirdwebClient, triggerId: bigint | null) {
  const contracts = useShieldContracts(client);
  const [workers, setWorkers] = useState<bigint[]>([]);

  useEffect(() => {
    if (triggerId === null) return;
    let cancelled = false;
    readContract({
      contract: contracts.claimManager,
      method: "function getAffectedWorkers(uint256) view returns (uint256[])",
      params: [triggerId],
    })
      .then((v) => {
        if (!cancelled) setWorkers([...v]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [triggerId, contracts.claimManager]);

  return workers;
}

// ── Event history via public Fuji RPC (bypasses thirdweb rate limits) ──

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

// Public Avalanche Fuji RPC — no rate limit, max 2048 blocks per eth_getLogs
const FUJI_PUBLIC_RPC = "https://api.avax-test.network/ext/bc/C/rpc";

// Pre-computed event topic0 signatures
const TOPICS = {
  ContributionReceived: "0xf0d39bba72b097aac68d326a113c14384101f3ccf433a038c5d3aead41befed3",
  PayoutExecuted: "0xbeaa99d72a600712e4656a7da04b2cabe31fb50fbf8f5b5f96513b0a4f495c1a",
};

async function fujiRpc(method: string, params: any[]): Promise<any> {
  const res = await fetch(FUJI_PUBLIC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function fetchPoolEvents(topic: string): Promise<any[]> {
  const latestHex = await fujiRpc("eth_blockNumber", []);
  const latest = BigInt(latestHex);
  const from = latest - 2000n;

  const logs = await fujiRpc("eth_getLogs", [
    {
      address: addresses.protectionPool,
      topics: [topic],
      fromBlock: "0x" + from.toString(16),
      toBlock: "0x" + latest.toString(16),
    },
  ]);

  return logs ?? [];
}

function hexToAddress(topic: string): string {
  return "0x" + topic.slice(26);
}

function decodeUint256s(data: string): bigint[] {
  const hex = data.slice(2);
  const values: bigint[] = [];
  for (let i = 0; i < hex.length; i += 64) {
    values.push(BigInt("0x" + hex.slice(i, i + 64)));
  }
  return values;
}

export function useContributionHistory(_client: ThirdwebClient, agentId: bigint) {
  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!agentId || agentId === 0n) return;
    setLoading(true);
    setError(null);

    try {
      // ContributionReceived(uint256 indexed agentId, address indexed payer, uint256 amount, uint256 newExpiresAt, uint256 streak)
      const logs = await fetchPoolEvents(TOPICS.ContributionReceived);

      const mapped: ContributionEvent[] = logs
        .filter((log: any) => BigInt(log.topics[1]) === agentId)
        .map((log: any) => {
          const data = decodeUint256s(log.data);
          return {
            agentId: BigInt(log.topics[1]),
            payer: hexToAddress(log.topics[2]),
            amount: data[0] ?? 0n,
            newExpiresAt: data[1] ?? 0n,
            streak: data[2] ?? 0n,
            transactionHash: log.transactionHash,
            blockNumber: BigInt(log.blockNumber),
          };
        })
        .reverse();

      setEvents(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function usePayoutHistory(_client: ThirdwebClient, agentId: bigint) {
  const [events, setEvents] = useState<PayoutEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!agentId || agentId === 0n) return;
    setLoading(true);
    setError(null);

    try {
      // PayoutExecuted(uint256 indexed agentId, address indexed recipient, uint256 amount)
      const logs = await fetchPoolEvents(TOPICS.PayoutExecuted);

      const mapped: PayoutEvent[] = logs
        .filter((log: any) => BigInt(log.topics[1]) === agentId)
        .map((log: any) => {
          const data = decodeUint256s(log.data);
          return {
            agentId: BigInt(log.topics[1]),
            recipient: hexToAddress(log.topics[2]),
            amount: data[0] ?? 0n,
            transactionHash: log.transactionHash,
            blockNumber: BigInt(log.blockNumber),
          };
        })
        .reverse();

      setEvents(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
