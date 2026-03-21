"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import { useWorkerByAddress, useCoverage, usePoolStats } from "@/hooks/useShieldWorker";
import { useApproveUSDC, useContribute, useContributeX402 } from "@/hooks/useShieldActions";
import { formatUSDC, formatDate, snowtraceLink } from "@/lib/format";
import { DEFAULT_CONTRIBUTION } from "@/lib/constants";
import { addresses } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet First</h1>
        <p className="text-gray-500">Use the Connect Wallet button in the navbar.</p>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Not Registered</h1>
        <p className="text-gray-500">You need to register first before contributing.</p>
      </div>
    );
  }

  // ── x402 flow (primary) ───────────────────────────────────────────
  const handleContributeX402 = async () => {
    try {
      toast.info("Initiating x402 payment...");
      const result = await contributeX402(agentId);
      if (result.txHash) {
        toast.success("Coverage activated for 7 days!", {
          description: "Cobertura activada por 7 días",
          action: {
            label: "View on Snowtrace",
            onClick: () => window.open(snowtraceLink(result.txHash!), "_blank"),
          },
        });
      }
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`x402 contribution failed: ${msg}`);
    }
  };

  // ── Direct flow (fallback) ────────────────────────────────────────
  const handleContributeDirect = async () => {
    try {
      toast.info("Step 1/2: Approving USDC...");
      await approve(addresses.protectionPool, DEFAULT_CONTRIBUTION);
      toast.info("Step 2/2: Contributing to pool...");
      const receipt = await contribute(agentId);
      toast.success("Coverage activated for 7 days!", {
        description: "Cobertura activada por 7 días",
        action: receipt?.transactionHash
          ? {
              label: "View on Snowtrace",
              onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank"),
            }
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
    <div className="max-w-lg mx-auto px-4 py-16 animate-fade-up">
      <h1 className="text-3xl font-bold mb-2">Contribute / Contribuir</h1>
      <p className="text-gray-500 mb-8">Weather Protection Plan — $1/week</p>

      {/* Coverage status */}
      <Card className={`mb-6 glass-card rounded-2xl border-0 ${isActive ? "glow-green" : ""}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${isActive ? "bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/20" : "bg-gray-100"}`}>
                {isActive ? "🛡️" : "⚪"}
              </div>
              <div>
                <p className="font-semibold">Coverage Status</p>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
            </div>
          </div>

          {isActive && expiresAt > 0n && (
            <p className="text-sm text-gray-500">
              Expires: {formatDate(expiresAt)}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-400">Streak</p>
              <p className="font-bold">{worker?.contributionStreak?.toString() ?? "0"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Contributed</p>
              <p className="font-bold">{formatUSDC(worker?.totalContributed ?? 0n)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Payouts Received</p>
              <p className="font-bold">{formatUSDC(worker?.totalPayoutsReceived ?? 0n)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan + contribute */}
      <Card className="mb-6 glass-card rounded-2xl border-0">
        <CardHeader>
          <CardTitle>Weather Protection / Protección Climática</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Contribution / Aporte</span>
            <span className="font-semibold">$1 USDC / week</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Coverage Duration</span>
            <span className="font-semibold">7 days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Max Payout</span>
            <span className="font-semibold">Up to $50 USDC (proportional)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pool Balance</span>
            <span className="font-semibold">{formatUSDC(poolBalance)}</span>
          </div>

          {/* Direct contribute (primary) */}
          {useDirectMode ? (
            <div className="space-y-2">
              <Button
                onClick={handleContributeDirect}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20"
                size="lg"
              >
                {approvePending || contributePending
                  ? "Processing..."
                  : "Contribute $1 / Contribuir $1"}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Approve USDC → contribute to pool (2 transactions)
              </p>
              <button
                onClick={() => setUseDirectMode(false)}
                className="text-xs text-gray-400 hover:text-gray-600 underline w-full text-center"
              >
                Try x402 HTTP Payment Protocol (experimental)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleContributeX402}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/20"
                size="lg"
              >
                {x402Pending ? "Processing x402 Payment..." : "Contribute $1 via x402 / Contribuir $1"}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Powered by{" "}
                <span className="font-semibold">x402 HTTP Payment Protocol</span>
                {" "}— gasless for you
              </p>
              <button
                onClick={() => setUseDirectMode(true)}
                className="text-xs text-gray-400 hover:text-gray-600 underline w-full text-center"
              >
                Switch to direct contribution
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Worker ID: #{agentId.toString()} • Zone: {worker?.zone} • Type: {worker?.workerType}
      </p>
    </div>
  );
}
