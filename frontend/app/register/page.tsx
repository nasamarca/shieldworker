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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ERC-721 Transfer event topic0
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// address(0) padded to 32 bytes — mint events have from == address(0)
const ZERO_ADDRESS_TOPIC =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function parseAgentIdFromReceipt(receipt: any): bigint | null {
  if (!receipt?.logs) return null;
  for (const log of receipt.logs) {
    // ERC-721 Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    // Only match mint: from must be address(0)
    if (
      log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC &&
      log.topics?.length >= 4 &&
      log.topics[1] === ZERO_ADDRESS_TOPIC
    ) {
      // topics[3] is the tokenId (agentId) — indexed uint256
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
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet First</h1>
        <p className="text-gray-500">Use the Connect Wallet button in the navbar to get started.</p>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Already Registered!</h1>
        <p className="text-gray-500 mb-4">You already have a ShieldWorker identity.</p>
        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const handleStep1 = async () => {
    try {
      const metadataURI = `https://shieldworker.xyz/metadata/${account.address}.json`;
      const txResult = await registerIdentity(metadataURI);

      // sendTransaction only returns { transactionHash } — we need logs
      // waitForReceipt returns the full receipt with logs
      const receipt = await waitForReceipt(txResult);

      // Parse agentId from ERC-721 Transfer event in tx receipt
      const mintedAgentId = parseAgentIdFromReceipt(receipt);

      if (mintedAgentId && mintedAgentId > 0n) {
        setAgentId(mintedAgentId);
        toast.success(`Step 1 complete! AgentId #${mintedAgentId} minted.`, {
          action: receipt?.transactionHash
            ? {
                label: "View on Snowtrace",
                onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank"),
              }
            : undefined,
        });
      } else {
        // Fallback: let user enter manually
        toast.info(
          "Identity minted! Please enter your agentId number manually (check wallet or Snowtrace).",
          {
            action: receipt?.transactionHash
              ? {
                  label: "View TX",
                  onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank"),
                }
              : undefined,
          }
        );
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
        description: "Registro completado — bienvenido",
        action: receipt?.transactionHash
          ? {
              label: "View on Snowtrace",
              onClick: () => window.open(snowtraceLink(receipt.transactionHash), "_blank"),
            }
          : undefined,
      });
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Step 2 failed: ${msg}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Register as Worker</h1>
      <p className="text-gray-500 mb-8">Registrarse como trabajador</p>

      <div className="flex items-center gap-2 mb-8">
        <Badge variant={step >= 1 ? "default" : "outline"}>Step 1: Mint Identity</Badge>
        <div className="h-px flex-1 bg-gray-200" />
        <Badge variant={step >= 2 ? "default" : "outline"}>Step 2: Link to ShieldWorker</Badge>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Create On-Chain Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              This mints an agentId NFT in the official ERC-8004 IdentityRegistry.
              You <strong>own</strong> this NFT — it&apos;s your portable, self-sovereign identity.
            </p>
            <Button onClick={handleStep1} disabled={identityPending} className="w-full" size="lg">
              {identityPending ? "Minting Identity..." : "Mint Identity NFT / Crear Identidad"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Link to ShieldWorker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Link your identity to a zone for parametric protection coverage.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Agent ID</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                value={agentId?.toString() ?? ""}
                onChange={(e) => setAgentId(BigInt(e.target.value || "0"))}
                placeholder="Enter your agentId"
              />
              {agentId && agentId > 0n && (
                <p className="text-xs text-green-600 mt-1">
                  AgentId #{agentId.toString()} detected from mint transaction
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Worker Type / Tipo de Trabajo</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={workerType}
                onChange={(e) => setWorkerType(e.target.value)}
              >
                <option value="">Select type...</option>
                {WORKER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Zone / Zona</label>
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

            <Button
              onClick={handleStep2}
              disabled={workerPending || !workerType || !zone || !agentId}
              className="w-full"
              size="lg"
            >
              {workerPending ? "Registering..." : "Complete Registration / Completar Registro"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
