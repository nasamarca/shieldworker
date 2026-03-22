import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="text-center min-h-[calc(100vh-4rem)] flex flex-col justify-center pb-12 animate-fade-up">
      <p className="text-sm font-medium tracking-widest uppercase text-blue-600 mb-6">
        Avalanche &middot; ERC-8004 &middot; x402
      </p>
      <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
        140M workers.
        <br />
        <span className="text-gradient">Zero protection.</span>
        <br />
        Until now.
      </h1>
      <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-4 leading-relaxed">
        A decentralized community protection fund for Latin America&apos;s
        informal workers. $1/week. Automatic payouts.
      </p>
      <p className="text-sm text-gray-400 mb-12">
        Fondo de protección comunitaria — no es un seguro.
      </p>
      <div className="flex gap-4 justify-center">
        <Link href="/register">
          <Button size="lg" className="h-12 px-8 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-sm transition-all">
            Get Started
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg" variant="outline" className="h-12 px-8 text-sm font-medium rounded-full border-gray-200 hover:bg-gray-50 transition-all">
            View Dashboard
          </Button>
        </Link>
      </div>
    </section>
  );
}
