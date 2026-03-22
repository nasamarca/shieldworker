"use client";

import { useActiveAccount } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import {
  useWorkerByAddress,
  useCoverage,
  usePoolStats,
  useContributionHistory,
  usePayoutHistory,
} from "@/hooks/useShieldWorker";
import { formatUSDC, formatDate, truncateAddress, snowtraceLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const account = useActiveAccount();
  const { agentId, isRegistered, worker } = useWorkerByAddress(client);
  const { coverage, isActive } = useCoverage(client, agentId);
  const { poolBalance } = usePoolStats(client);
  const { events: contributions, loading: contribLoading, error: contribError } = useContributionHistory(client, agentId);
  const { events: payouts, loading: payoutLoading, error: payoutError } = usePayoutHistory(client, agentId);

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
          <p className="text-gray-400 mb-6">Register first to see your dashboard.</p>
          <Link href="/register">
            <Button className="h-11 px-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm">Register Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  const expiresAt = coverage?.expiresAt ?? 0n;

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 animate-fade-up">
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-3">Dashboard</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Worker Dashboard</h1>
      <p className="text-gray-500 mb-12">Panel del Trabajador</p>

      {/* Coverage status */}
      <div className={`rounded-2xl border p-8 mb-10 transition-all ${isActive ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"}`}>
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all ${isActive ? "bg-emerald-500 shadow-lg shadow-emerald-500/20 animate-float" : "bg-gray-100"}`}>
            {isActive ? "🛡️" : "⚪"}
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Coverage Status</p>
            <p className={`text-2xl font-extrabold ${isActive ? "text-emerald-700" : "text-gray-400"}`}>
              {isActive ? "ACTIVE — PROTECTED" : "INACTIVE"}
            </p>
            {isActive && expiresAt > 0n && (
              <p className="text-sm text-gray-500 mt-1">Expires: {formatDate(expiresAt)}</p>
            )}
          </div>
        </div>
        {!isActive && (
          <Link href="/contribute" className="block mt-6">
            <Button className="w-full h-12 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
              Activate Coverage — Contribute $1
            </Button>
          </Link>
        )}
      </div>

      {/* Profile + Reputation */}
      <div className="grid md:grid-cols-2 gap-6 mb-10 stagger">
        <div className="rounded-2xl border border-gray-100 p-6 animate-fade-up">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-4">Worker Profile</p>
          <div className="space-y-3">
            {[
              { label: "Agent ID", value: `#${agentId.toString()}`, mono: true },
              { label: "Type", value: worker?.workerType },
              { label: "Zone", value: worker?.zone },
              { label: "Wallet", value: truncateAddress(account.address), mono: true },
              { label: "Registered", value: worker?.registeredAt ? formatDate(worker.registeredAt) : "—" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-medium ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 p-6 animate-fade-up">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-4">Reputation</p>
          <div className="mb-4">
            <p className="text-4xl font-extrabold text-gray-900">{worker?.contributionStreak?.toString() ?? "0"}</p>
            <p className="text-sm text-gray-400">week streak</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Contributed", value: formatUSDC(worker?.totalContributed ?? 0n) },
              { label: "Payouts", value: formatUSDC(worker?.totalPayoutsReceived ?? 0n) },
              { label: "Contributions", value: coverage?.contributionCount?.toString() ?? "0" },
              { label: "Pool Balance", value: formatUSDC(poolBalance) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contribution History */}
      <div className="mb-8">
        <div className="section-divider mb-8" />
        <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-6">Contribution History</p>
        {contribLoading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
        ) : contribError ? (
          <p className="text-sm text-amber-500 py-6 text-center">Could not load history — check Snowtrace.</p>
        ) : contributions.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No contributions yet. <Link href="/contribute" className="text-gray-900 font-medium hover:underline">Make your first</Link>
          </p>
        ) : (
          <div className="space-y-0">
            {contributions.map((c, i) => (
              <div key={`${c.transactionHash}-${i}`} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">+</div>
                  <div>
                    <p className="text-sm font-semibold">{formatUSDC(c.amount)} contributed</p>
                    <p className="text-xs text-gray-400">Streak: {c.streak.toString()} &middot; Until {formatDate(c.newExpiresAt)}</p>
                  </div>
                </div>
                <a href={snowtraceLink(c.transactionHash)} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-900 font-mono transition-colors">
                  {c.transactionHash.slice(0, 10)}...
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="mb-12">
        <div className="section-divider mb-8" />
        <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-6">Payout History</p>
        {payoutLoading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
        ) : payoutError ? (
          <p className="text-sm text-amber-500 py-6 text-center">Could not load history — check Snowtrace.</p>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No payouts received yet.</p>
        ) : (
          <div className="space-y-0">
            {payouts.map((p, i) => (
              <div key={`${p.transactionHash}-${i}`} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">$</div>
                  <div>
                    <p className="text-sm font-semibold text-blue-700">{formatUSDC(p.amount)} received</p>
                    <p className="text-xs text-gray-400">To: {truncateAddress(p.recipient)}</p>
                  </div>
                </div>
                <a href={snowtraceLink(p.transactionHash)} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-900 font-mono transition-colors">
                  {p.transactionHash.slice(0, 10)}...
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/contribute">
          <Button variant="outline" className="h-11 px-8 rounded-full border-gray-200 hover:bg-gray-50 text-sm font-medium transition-all">
            Contribute Again
          </Button>
        </Link>
      </div>
    </div>
  );
}
