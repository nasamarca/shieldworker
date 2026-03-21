"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import {
  useIsAdmin,
  usePoolStats,
  useTriggerList,
  useAffectedWorkers,
  type TriggerData,
} from "@/hooks/useShieldWorker";
import { useSubmitTrigger, useExecuteBatchPayout } from "@/hooks/useShieldActions";
import { formatUSDC, formatDate, snowtraceLink } from "@/lib/format";
import { ZONES, EVENT_TYPES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ── Affected workers sub-component ──────────────────────────────────

function AffectedWorkersList({ triggerId }: { triggerId: bigint }) {
  const workers = useAffectedWorkers(client, triggerId);

  if (workers.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-gray-500 mb-1">
        Affected Workers ({workers.length}):
      </p>
      <div className="flex flex-wrap gap-1">
        {workers.map((id) => (
          <Badge key={id.toString()} variant="outline" className="text-xs font-mono">
            #{id.toString()}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── Trigger card sub-component ──────────────────────────────────────

function TriggerCard({
  trigger,
  onExecutePayout,
  payoutPending,
}: {
  trigger: TriggerData;
  onExecutePayout: (triggerId: bigint) => void;
  payoutPending: boolean;
}) {
  const [showWorkers, setShowWorkers] = useState(false);

  const remaining =
    Number(trigger.workersAffected) - Number(trigger.workersProcessed);

  return (
    <Card className={trigger.fullyProcessed ? "opacity-75" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Trigger #{trigger.id.toString()}
          </CardTitle>
          <Badge
            variant={trigger.fullyProcessed ? "default" : "secondary"}
            className={trigger.fullyProcessed ? "bg-green-600" : "bg-amber-500 text-white"}
          >
            {trigger.fullyProcessed ? "COMPLETED" : `PENDING (${remaining} left)`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-gray-500">Event</span>
          <span className="font-medium">{trigger.eventType}</span>
          <span className="text-gray-500">Zone</span>
          <span className="font-medium">{trigger.zone}</span>
          <span className="text-gray-500">Time</span>
          <span>{trigger.timestamp > 0n ? formatDate(trigger.timestamp) : "—"}</span>
          <span className="text-gray-500">Workers Affected</span>
          <span className="font-bold">{trigger.workersAffected.toString()}</span>
          <span className="text-gray-500">Workers Processed</span>
          <span>
            {trigger.workersProcessed.toString()} / {trigger.workersAffected.toString()}
          </span>
          <span className="text-gray-500">Payout / Worker</span>
          <span className="font-bold">{formatUSDC(trigger.payoutPerWorker)}</span>
          <span className="text-gray-500">Total Paid</span>
          <span>{formatUSDC(trigger.totalPayouts)}</span>
        </div>

        {/* Show affected workers toggle */}
        <button
          onClick={() => setShowWorkers(!showWorkers)}
          className="text-xs text-blue-600 hover:underline"
        >
          {showWorkers ? "Hide affected workers" : "Show affected workers"}
        </button>
        {showWorkers && <AffectedWorkersList triggerId={trigger.id} />}

        {/* Execute payout button for pending triggers */}
        {!trigger.fullyProcessed && Number(trigger.workersAffected) > 0 && (
          <>
            <Separator />
            <Button
              onClick={() => onExecutePayout(trigger.id)}
              disabled={payoutPending}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {payoutPending
                ? "Executing..."
                : `Execute Batch Payout (up to 20 workers)`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main admin page ─────────────────────────────────────────────────

export default function AdminPage() {
  const account = useActiveAccount();
  const isAdmin = useIsAdmin(client);
  const { poolBalance, totalWorkers, totalPayouts } = usePoolStats(client);
  const { triggers, loading: triggersLoading, error: triggersError, refetch: refetchTriggers } = useTriggerList(client);
  const { submitTrigger, isPending: triggerPending } = useSubmitTrigger(client);
  const { executeBatchPayout, isPending: payoutPending } = useExecuteBatchPayout(client);

  const [eventType, setEventType] = useState("");
  const [zone, setZone] = useState("");

  if (!account) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet First</h1>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-500">Only ORACLE_ROLE holders can access the admin panel.</p>
      </div>
    );
  }

  const handleSubmitTrigger = async () => {
    if (!eventType || !zone) {
      toast.error("Select event type and zone");
      return;
    }
    try {
      const receipt = await submitTrigger(eventType, zone);
      toast.success(`Trigger submitted for ${eventType} in ${zone}!`, {
        action: receipt?.transactionHash
          ? {
              label: "View on Snowtrace",
              onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank"),
            }
          : undefined,
      });
      // Wait for RPC to index, then refetch
      setTimeout(() => refetchTriggers(), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Trigger failed: ${msg}`);
    }
  };

  const handleExecutePayout = async (triggerId: bigint) => {
    try {
      const receipt = await executeBatchPayout(triggerId, 20n);
      toast.success(`Batch payout executed for Trigger #${triggerId}!`, {
        action: receipt?.transactionHash
          ? {
              label: "View on Snowtrace",
              onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank"),
            }
          : undefined,
      });
      setTimeout(() => refetchTriggers(), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Payout failed: ${msg}`);
    }
  };

  const pendingTriggers = triggers.filter((t) => !t.fullyProcessed);
  const completedTriggers = triggers.filter((t) => t.fullyProcessed);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <Badge variant="outline">ORACLE_ROLE</Badge>
      </div>

      {/* Pool overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">Pool Balance</p>
            <p className="text-2xl font-bold">{formatUSDC(poolBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">Workers</p>
            <p className="text-2xl font-bold">{totalWorkers.toString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500">Total Payouts</p>
            <p className="text-2xl font-bold">{formatUSDC(totalPayouts)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Submit trigger */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Submit Trigger Event / Reportar Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">Select event...</option>
                {EVENT_TYPES.map((ev) => (
                  <option key={ev.value} value={ev.value}>{ev.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zone</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option value="">Select zone...</option>
                {ZONES.map((z) => (
                  <option key={z.value} value={z.value}>{z.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={handleSubmitTrigger}
            disabled={triggerPending || !eventType || !zone}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {triggerPending ? "Submitting..." : "Submit Trigger / Reportar Evento"}
          </Button>
        </CardContent>
      </Card>

      {/* Trigger list */}
      <div className="space-y-6">
        {/* Pending triggers */}
        {pendingTriggers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              Pending Triggers
              <Badge variant="secondary" className="bg-amber-500 text-white">
                {pendingTriggers.length}
              </Badge>
            </h2>
            <div className="space-y-3">
              {pendingTriggers.map((t) => (
                <TriggerCard
                  key={t.id.toString()}
                  trigger={t}
                  onExecutePayout={handleExecutePayout}
                  payoutPending={payoutPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed triggers */}
        {completedTriggers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              Completed Triggers
              <Badge variant="outline">{completedTriggers.length}</Badge>
            </h2>
            <div className="space-y-3">
              {completedTriggers.map((t) => (
                <TriggerCard
                  key={t.id.toString()}
                  trigger={t}
                  onExecutePayout={handleExecutePayout}
                  payoutPending={payoutPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error / empty state */}
        {triggersError && (
          <p className="text-center text-amber-500 py-8">
            Failed to load triggers: {triggersError}
          </p>
        )}
        {triggers.length === 0 && !triggersLoading && !triggersError && (
          <p className="text-center text-gray-400 py-8">
            No triggers submitted yet. Submit a trigger event above.
          </p>
        )}
        {triggersLoading && (
          <p className="text-center text-gray-400 py-8">Loading triggers...</p>
        )}
      </div>
    </div>
  );
}
