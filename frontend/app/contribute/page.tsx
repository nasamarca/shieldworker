"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import { useWorkerByAddress, useCoverage, usePoolStats } from "@/hooks/useShieldWorker";
import { useApproveUSDC, useContribute, useContributeX402 } from "@/hooks/useShieldActions";
import { formatUSDC, formatDate, snowtraceLink } from "@/lib/format";
import { DEFAULT_CONTRIBUTION } from "@/lib/constants";
import { addresses } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ContributePage() {
  const account = useActiveAccount();
  const { agentId, isRegistered, worker } = useWorkerByAddress(client);
  const { coverage, isActive, refetch } = useCoverage(client, agentId);
  const { poolBalance } = usePoolStats(client);
  const { approve, isPending: approvePending } = useApproveUSDC(client);
  const { contribute, isPending: contributePending } = useContribute(client);
  const { contributeX402, isPending: x402Pending } = useContributeX402(client);
  // Direct contribute as primary (x402 settlement has Fuji bundler limitation)
  const [useDirectMode, setUseDirectMode] = useState(true);

  if (!account) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-3">Connect Wallet</h1>
          <p className="text-gray-400">Use the Connect Wallet button in the navbar.</p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-3">Not Registered</h1>
          <p className="text-gray-400">You need to register first before contributing.</p>
        </div>
      </div>
    );
  }

  const handleContributeX402 = async () => {
    try {
      toast.info("Initiating x402 payment...");
      const result = await contributeX402(agentId);
      if (result.txHash) {
        toast.success("Coverage activated for 7 days!", {
          description: "Cobertura activada por 7 días",
          action: { label: "View on Snowtrace", onClick: () => window.open(snowtraceLink(result.txHash!), "_blank") },
        });
      }
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`x402 contribution failed: ${msg}`);
    }
  };

  const handleContributeDirect = async () => {
    try {
      toast.info("Step 1/2: Approving USDC...");
      await approve(addresses.protectionPool, DEFAULT_CONTRIBUTION);
      toast.info("Step 2/2: Contributing to pool...");
      const receipt = await contribute(agentId);
      toast.success("Coverage activated for 7 days!", {
        description: "Cobertura activada por 7 días",
        action: receipt?.transactionHash
          ? { label: "View on Snowtrace", onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank") }
          : undefined,
      });
      refetch();
    } catch (e: any) {
      const msg = e?.message ?? e?.reason ?? (typeof e === "string" ? e : JSON.stringify(e));
      toast.error(`Contribution failed: ${msg}`);
    }
  };

  const isPending = x402Pending || approvePending || contributePending;
  const expiresAt = coverage?.expiresAt ?? 0n;

  return (
    <div className="max-w-lg mx-auto px-4 py-20 animate-fade-up">
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-3">Contribute</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Weather Protection</h1>
      <p className="text-gray-500 mb-12">Protección Climática — $1/week</p>

      {/* Coverage status */}
      <div className={`rounded-2xl border p-6 mb-8 transition-all ${isActive ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${isActive ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-gray-100"}`}>
            {isActive ? "🛡️" : "⚪"}
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Coverage Status</p>
            <p className={`text-lg font-extrabold ${isActive ? "text-emerald-700" : "text-gray-400"}`}>
              {isActive ? "ACTIVE" : "INACTIVE"}
            </p>
          </div>
        </div>

        {isActive && expiresAt > 0n && (
          <p className="text-sm text-gray-500">Expires: {formatDate(expiresAt)}</p>
        )}

        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Streak</p>
            <p className="text-xl font-extrabold">{worker?.contributionStreak?.toString() ?? "0"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contributed</p>
            <p className="text-xl font-extrabold">{formatUSDC(worker?.totalContributed ?? 0n)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Received</p>
            <p className="text-xl font-extrabold">{formatUSDC(worker?.totalPayoutsReceived ?? 0n)}</p>
          </div>
        </div>
      </div>

      {/* Plan details + contribute */}
      <div className="rounded-2xl border border-gray-100 p-6 mb-8">
        <h2 className="font-bold text-lg mb-6">Plan Details</h2>
        <div className="space-y-3 mb-8">
          {[
            { label: "Contribution", value: "$1 USDC / week" },
            { label: "Coverage Duration", value: "7 days" },
            { label: "Max Payout", value: "Up to $50 USDC" },
            { label: "Pool Balance", value: formatUSDC(poolBalance) },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{row.label}</span>
              <span className="font-semibold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>

        {useDirectMode ? (
          <div className="space-y-3">
            <Button
              onClick={handleContributeDirect}
              disabled={isPending}
              className="w-full h-12 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all"
              size="lg"
            >
              {approvePending || contributePending ? "Processing..." : "Contribute $1 USDC"}
            </Button>
            <p className="text-xs text-gray-400 text-center">Approve USDC → contribute to pool (2 transactions)</p>
            <button onClick={() => setUseDirectMode(false)} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors">
              Try x402 Payment Protocol →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleContributeX402}
              disabled={isPending}
              className="w-full h-12 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all"
              size="lg"
            >
              {x402Pending ? "Processing x402..." : "Contribute $1 via x402"}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              Powered by <span className="font-semibold">x402 HTTP Payment Protocol</span>
            </p>
            <button onClick={() => setUseDirectMode(true)} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors">
              ← Switch to direct contribution
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-300 text-center">
        Worker #{agentId.toString()} &middot; {worker?.zone} &middot; {worker?.workerType}
      </p>
    </div>
  );
}
