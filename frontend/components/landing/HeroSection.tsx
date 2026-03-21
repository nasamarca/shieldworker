import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="text-center mb-20 animate-fade-up">
      <div className="inline-block mb-6 px-4 py-1.5 rounded-full glass-card text-sm text-blue-700 font-medium">
        Powered by Avalanche x ERC-8004 x x402
      </div>
      <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
        140M workers.{" "}
        <span className="text-gradient">Zero protection.</span>
        <br />
        Until now.
      </h1>
      <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-4">
        ShieldWorker is a decentralized community protection fund for Latin America&apos;s
        informal workers. Contribute $1/week, receive automatic payouts when disaster strikes.
      </p>
      <p className="text-sm text-gray-400 mb-10">
        Fondo de protección comunitaria — no es un seguro.
      </p>
      <div className="flex gap-4 justify-center">
        <Link href="/register">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all">
            Register as Worker / Registrarse
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg" variant="outline" className="glass-card hover-lift">
            View Dashboard
          </Button>
        </Link>
      </div>
    </section>
  );
}
