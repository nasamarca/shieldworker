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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <p className="text-gray-500 mb-4">Register first to see your dashboard.</p>
        <Link href="/register">
          <Button className="bg-blue-600 hover:bg-blue-700">Register Now</Button>
        </Link>
      </div>
    );
  }

  const expiresAt = coverage?.expiresAt ?? 0n;

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Worker Dashboard</h1>
      <p className="text-gray-500 mb-8">Panel del Trabajador</p>

      {/* Coverage card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${isActive ? "bg-blue-100" : "bg-gray-100"}`}>
              {isActive ? "🛡️" : "⚪"}
            </div>
            <div>
              <h2 className="text-xl font-bold">Coverage Status</h2>
              <Badge variant={isActive ? "default" : "secondary"} className="text-sm">
                {isActive ? "ACTIVE — PROTECTED" : "INACTIVE — NOT COVERED"}
              </Badge>
              {isActive && expiresAt > 0n && (
                <p className="text-sm text-gray-500 mt-1">Expires: {formatDate(expiresAt)}</p>
              )}
            </div>
          </div>

          {!isActive && (
            <Link href="/contribute">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Activate Coverage — Contribute $1 / Contribuir $1
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Worker Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Agent ID</span>
              <span className="font-mono">#{agentId.toString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Type / Tipo</span>
              <span>{worker?.workerType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Zone / Zona</span>
              <span>{worker?.zone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Wallet</span>
              <span className="font-mono">{truncateAddress(account.address)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Registered</span>
              <span>{worker?.registeredAt ? formatDate(worker.registeredAt) : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Reputation / Reputación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Contribution Streak</span>
              <span className="font-bold text-lg">{worker?.contributionStreak?.toString() ?? "0"} weeks</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Contributed</span>
              <span className="font-semibold">{formatUSDC(worker?.totalContributed ?? 0n)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Payouts Received</span>
              <span className="font-semibold">{formatUSDC(worker?.totalPayoutsReceived ?? 0n)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Contributions Made</span>
              <span>{coverage?.contributionCount?.toString() ?? "0"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pool Balance</span>
              <span>{formatUSDC(poolBalance)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contribution History */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Contribution History / Historial de Aportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contribLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
          ) : contribError ? (
            <p className="text-sm text-amber-500 py-4 text-center">
              Could not load history (RPC limit). Your on-chain data is safe — check Snowtrace.
            </p>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No contributions yet. <Link href="/contribute" className="text-blue-600 hover:underline">Make your first contribution</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {contributions.map((c, i) => (
                <div
                  key={`${c.transactionHash}-${i}`}
                  className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 text-lg">+</span>
                    <div>
                      <p className="font-medium">{formatUSDC(c.amount)} contributed</p>
                      <p className="text-xs text-gray-400">
                        Streak: {c.streak.toString()} • Coverage until {formatDate(c.newExpiresAt)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={snowtraceLink(c.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline font-mono"
                  >
                    {c.transactionHash.slice(0, 10)}...
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Payout History / Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payoutLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
          ) : payoutError ? (
            <p className="text-sm text-amber-500 py-4 text-center">
              Could not load history (RPC limit). Your on-chain data is safe — check Snowtrace.
            </p>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No payouts received yet. Payouts are automatic when a trigger event matches your zone.
            </p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p, i) => (
                <div
                  key={`${p.transactionHash}-${i}`}
                  className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 text-lg">$</span>
                    <div>
                      <p className="font-medium text-blue-700">
                        {formatUSDC(p.amount)} received
                      </p>
                      <p className="text-xs text-gray-400">
                        To: {truncateAddress(p.recipient)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={snowtraceLink(p.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline font-mono"
                  >
                    {p.transactionHash.slice(0, 10)}...
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/contribute">
          <Button variant="outline">Contribute Again / Contribuir de Nuevo</Button>
        </Link>
      </div>
    </div>
  );
}
