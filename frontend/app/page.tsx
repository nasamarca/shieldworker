"use client";

import Link from "next/link";
import { client } from "@/lib/thirdweb";
import { usePoolStats } from "@/hooks/useShieldWorker";
import { formatUSDC } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { poolBalance, totalContributions, totalPayouts, totalWorkers } = usePoolStats(client);

  const stats = [
    { title: "Workers Registered", value: totalWorkers.toString(), subtitle: "Trabajadores registrados" },
    { title: "Pool Balance", value: formatUSDC(poolBalance), subtitle: "Fondo de protección" },
    { title: "Total Contributions", value: formatUSDC(totalContributions), subtitle: "Aportes totales" },
    { title: "Total Payouts", value: formatUSDC(totalPayouts), subtitle: "Asistencias pagadas" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          140M workers.{" "}
          <span className="text-blue-600">Zero protection.</span>
          <br />
          Until now.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          ShieldWorker is a decentralized community protection fund for Latin America&apos;s
          informal workers. Contribute $1/week, receive automatic payouts when disaster strikes.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          Fondo de protección comunitaria — no es un seguro.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Register as Worker / Registrarse
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Register / Registrarse", desc: "Get your on-chain identity via ERC-8004. You own your agentId NFT." },
            { step: "2", title: "Contribute / Contribuir", desc: "Pay $1/week to the community fund. Coverage activates for 7 days." },
            { step: "3", title: "Trigger Event", desc: "Weather event verified in your zone (e.g., heavy rain in Flores)." },
            { step: "4", title: "Auto Payout", desc: "Receive proportional USDC payout instantly. Zero paperwork." },
          ].map((item) => (
            <Card key={item.step} className="text-center">
              <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="text-center text-sm text-gray-400">
        <p>Built on Avalanche C-Chain • ERC-8004 Identity • x402 Payments • Aleph Hackathon 2026</p>
      </section>
    </div>
  );
}
