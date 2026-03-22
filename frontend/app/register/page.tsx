"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { useWorkerByAddress } from "@/hooks/useShieldWorker";
import { useRegisterIdentity, useRegisterWorker } from "@/hooks/useShieldActions";
import { WORKER_TYPES, ZONES } from "@/lib/constants";
import { snowtraceLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ERC-721 Transfer event topic0
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_ADDRESS_TOPIC =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function parseAgentIdFromReceipt(receipt: any): bigint | null {
  if (!receipt?.logs) return null;
  for (const log of receipt.logs) {
    if (
      log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC &&
      log.topics?.length >= 4 &&
      log.topics[1] === ZERO_ADDRESS_TOPIC
    ) {
      return BigInt(log.topics[3]);
    }
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { isRegistered } = useWorkerByAddress(client);
  const { register: registerIdentity, isPending: identityPending } = useRegisterIdentity(client);
  const { registerWorker, isPending: workerPending } = useRegisterWorker(client);

  const [step, setStep] = useState<1 | 2>(1);
  const [agentId, setAgentId] = useState<bigint | null>(null);
  const [workerType, setWorkerType] = useState("");
  const [zone, setZone] = useState("");

  if (!account) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-3">Connect Wallet</h1>
          <p className="text-gray-400">Use the Connect Wallet button in the navbar to get started.</p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-3">Already Registered</h1>
          <p className="text-gray-400 mb-6">You already have a ShieldWorker identity.</p>
          <Button onClick={() => router.push("/dashboard")} className="h-11 px-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleStep1 = async () => {
    try {
      const metadataURI = `https://shieldworker.xyz/metadata/${account.address}.json`;
      const txResult = await registerIdentity(metadataURI);
      const receipt = await waitForReceipt(txResult);
      const mintedAgentId = parseAgentIdFromReceipt(receipt);

      if (mintedAgentId && mintedAgentId > 0n) {
        setAgentId(mintedAgentId);
        toast.success(`AgentId #${mintedAgentId} minted successfully.`, {
          action: receipt?.transactionHash
            ? { label: "View on Snowtrace", onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank") }
            : undefined,
        });
      } else {
        toast.info("Identity minted! Enter your agentId manually.", {
          action: receipt?.transactionHash
            ? { label: "View TX", onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank") }
            : undefined,
        });
      }
      setStep(2);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Step 1 failed: ${msg}`);
    }
  };

  const handleStep2 = async () => {
    if (!agentId || !workerType || !zone) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      const metadataURI = `https://shieldworker.xyz/metadata/${account.address}.json`;
      const receipt = await registerWorker(agentId, workerType, zone, metadataURI);
      toast.success("Registration complete! Welcome to ShieldWorker.", {
        action: receipt?.transactionHash
          ? { label: "View on Snowtrace", onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank") }
          : undefined,
      });
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Step 2 failed: ${msg}`);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all outline-none";

  return (
    <div className="max-w-md mx-auto px-4 py-20 animate-fade-up">
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-3">Registration</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Create your identity</h1>
      <p className="text-gray-500 mb-10">Registrarse como trabajador</p>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-gray-900" : "text-gray-300"}`}>
          <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${step >= 1 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>1</span>
          <span className="text-sm font-medium">Mint Identity</span>
        </div>
        <div className={`h-px flex-1 ${step >= 2 ? "bg-gray-900" : "bg-gray-200"} transition-colors`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-gray-900" : "text-gray-300"}`}>
          <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${step >= 2 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>2</span>
          <span className="text-sm font-medium">Link Profile</span>
        </div>
      </div>

      {step === 1 && (
        <div className="animate-fade-up space-y-6">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8">
            <h2 className="font-bold text-lg mb-2">Create On-Chain Identity</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              This mints an agentId NFT in the official ERC-8004 IdentityRegistry.
              You <strong>own</strong> this NFT — it&apos;s your portable, self-sovereign identity.
            </p>
            <Button onClick={handleStep1} disabled={identityPending} className="w-full h-12 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all" size="lg">
              {identityPending ? "Minting Identity..." : "Mint Identity NFT"}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-up space-y-6">
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="font-bold text-lg mb-2">Link to ShieldWorker</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Link your identity to a zone for parametric protection coverage.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">Agent ID</label>
              <input
                type="number"
                className={inputClass}
                value={agentId?.toString() ?? ""}
                onChange={(e) => setAgentId(BigInt(e.target.value || "0"))}
                placeholder="Enter your agentId"
              />
              {agentId && agentId > 0n && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  AgentId #{agentId.toString()} detected from mint transaction
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">Worker Type / Tipo de Trabajo</label>
              <select className={inputClass} value={workerType} onChange={(e) => setWorkerType(e.target.value)}>
                <option value="">Select type...</option>
                {WORKER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">Zone / Zona</label>
              <select className={inputClass} value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="">Select zone...</option>
                {ZONES.map((z) => (
                  <option key={z.value} value={z.value}>{z.label}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleStep2}
              disabled={workerPending || !workerType || !zone || !agentId}
              className="w-full h-12 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all"
              size="lg"
            >
              {workerPending ? "Registering..." : "Complete Registration"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
