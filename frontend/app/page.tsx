"use client";

import { client } from "@/lib/thirdweb";
import { usePoolStats } from "@/hooks/useShieldWorker";
import { formatUSDC } from "@/lib/format";
import {
  HeroSection,
  LiveStats,
  HowItWorks,
  ProblemSection,
  RealImpact,
  TechStack,
  Architecture,
  ContractDeployments,
  Roadmap,
  Compliance,
  CtaSection,
  Footer,
} from "@/components/landing";

export default function Home() {
  const { poolBalance, totalContributions, totalPayouts, totalWorkers } = usePoolStats(client);

  const stats = [
    { title: "Workers Registered", value: totalWorkers.toString(), subtitle: "Trabajadores registrados", icon: "👷" },
    { title: "Pool Balance", value: formatUSDC(poolBalance), subtitle: "Fondo de protección", icon: "🏦" },
    { title: "Total Contributions", value: formatUSDC(totalContributions), subtitle: "Aportes totales", icon: "💰" },
    { title: "Total Payouts", value: formatUSDC(totalPayouts), subtitle: "Asistencias pagadas", icon: "🤝" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <HeroSection />
      <LiveStats stats={stats} />
      <HowItWorks />
      <ProblemSection />
      <RealImpact />
      <TechStack />
      <Architecture />
      <ContractDeployments />
      <Roadmap />
      <Compliance />
      <CtaSection />
      <Footer />
    </div>
  );
}
