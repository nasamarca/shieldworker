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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ── Affected workers sub-component ──────────────────────────────────

function AffectedWorkersList({ triggerId }: { triggerId: bigint }) {
  const workers = useAffectedWorkers(client, triggerId);
  if (workers.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Affected Workers ({workers.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {workers.map((id) => (
          <span key={id.toString()} className="px-2.5 py-1 rounded-full border border-gray-200 text-xs font-mono text-gray-600">
            #{id.toString()}
          </span>
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
  const remaining = Number(trigger.workersAffected) - Number(trigger.workersProcessed);

  return (
    <div className={`rounded-2xl border p-6 transition-all ${trigger.fullyProcessed ? "border-gray-100 opacity-70" : "border-gray-200 hover:border-gray-300"}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold">Trigger #{trigger.id.toString()}</p>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          trigger.fullyProcessed
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {trigger.fullyProcessed ? "COMPLETED" : `PENDING (${remaining} left)`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
        {[
          { label: "Event", value: trigger.eventType },
          { label: "Zone", value: trigger.zone },
          { label: "Time", value: trigger.timestamp > 0n ? formatDate(trigger.timestamp) : "—" },
          { label: "Affected", value: trigger.workersAffected.toString(), bold: true },
          { label: "Processed", value: `${trigger.workersProcessed.toString()} / ${trigger.workersAffected.toString()}` },
          { label: "Payout/Worker", value: formatUSDC(trigger.payoutPerWorker), bold: true },
          { label: "Total Paid", value: formatUSDC(trigger.totalPayouts) },
        ].map((row) => (
          <div key={row.label} className="flex justify-between">
            <span className="text-gray-400">{row.label}</span>
            <span className={row.bold ? "font-bold" : "font-medium"}>{row.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowWorkers(!showWorkers)}
        className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
      >
        {showWorkers ? "Hide workers ↑" : "Show affected workers →"}
      </button>
      {showWorkers && <AffectedWorkersList triggerId={trigger.id} />}

      {!trigger.fullyProcessed && Number(trigger.workersAffected) > 0 && (
        <>
          <div className="section-divider my-4" />
          <Button
            onClick={() => onExecutePayout(trigger.id)}
            disabled={payoutPending}
            className="w-full h-11 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all"
            size="sm"
          >
            {payoutPending ? "Executing..." : "Execute Batch Payout"}
          </Button>
        </>
      )}
    </div>
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-3">Connect Wallet</h1>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-3">Access Denied</h1>
          <p className="text-gray-400">Only ORACLE_ROLE holders can access the admin panel.</p>
        </div>
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
          ? { label: "View on Snowtrace", onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank") }
          : undefined,
      });
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
          ? { label: "View on Snowtrace", onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank") }
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

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all outline-none";

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-sm font-medium tracking-widest uppercase text-gray-400">Admin</p>
        <span className="px-2.5 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-500">ORACLE_ROLE</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-12">Control Panel</h1>

      {/* Pool overview */}
      <div className="grid grid-cols-3 gap-6 mb-12 stagger">
        {[
          { label: "Pool Balance", value: formatUSDC(poolBalance) },
          { label: "Workers", value: totalWorkers.toString() },
          { label: "Total Payouts", value: formatUSDC(totalPayouts) },
        ].map((stat) => (
          <div key={stat.label} className="text-center animate-fade-up">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-2">{stat.label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Submit trigger */}
      <div className="section-divider mb-10" />
      <div className="mb-12">
        <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-4">Submit Trigger</p>
        <div className="rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">Event Type</label>
              <select className={inputClass} value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="">Select event...</option>
                {EVENT_TYPES.map((ev) => (
                  <option key={ev.value} value={ev.value}>{ev.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">Zone</label>
              <select className={inputClass} value={zone} onChange={(e) => setZone(e.target.value)}>
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
            className="w-full h-12 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all"
          >
            {triggerPending ? "Submitting..." : "Submit Trigger Event"}
          </Button>
        </div>
      </div>

      {/* Trigger list */}
      <div className="space-y-10">
        {pendingTriggers.length > 0 && (
          <div>
            <div className="section-divider mb-8" />
            <div className="flex items-center gap-2 mb-6">
              <p className="text-xs font-medium tracking-widest uppercase text-gray-400">Pending Triggers</p>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">{pendingTriggers.length}</Badge>
            </div>
            <div className="space-y-4">
              {pendingTriggers.map((t) => (
                <TriggerCard key={t.id.toString()} trigger={t} onExecutePayout={handleExecutePayout} payoutPending={payoutPending} />
              ))}
            </div>
          </div>
        )}

        {completedTriggers.length > 0 && (
          <div>
            <div className="section-divider mb-8" />
            <div className="flex items-center gap-2 mb-6">
              <p className="text-xs font-medium tracking-widest uppercase text-gray-400">Completed Triggers</p>
              <span className="px-2 py-0.5 rounded-full border border-gray-200 text-xs text-gray-400">{completedTriggers.length}</span>
            </div>
            <div className="space-y-4">
              {completedTriggers.map((t) => (
                <TriggerCard key={t.id.toString()} trigger={t} onExecutePayout={handleExecutePayout} payoutPending={payoutPending} />
              ))}
            </div>
          </div>
        )}

        {triggersError && (
          <p className="text-center text-amber-500 py-8 text-sm">Failed to load triggers: {triggersError}</p>
        )}
        {triggers.length === 0 && !triggersLoading && !triggersError && (
          <p className="text-center text-gray-400 py-12 text-sm">No triggers submitted yet.</p>
        )}
        {triggersLoading && (
          <p className="text-center text-gray-400 py-12 text-sm">Loading triggers...</p>
        )}
      </div>
    </div>
  );
}
