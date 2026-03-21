import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mb-16 text-center animate-fade-up" style={{ animationDelay: "0.6s" }}>
      <h2 className="text-2xl font-bold mb-3">Ready to Join?</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Register your on-chain identity and start contributing to the community protection fund.
      </p>
      <div className="flex gap-4 justify-center">
        <Link href="/register">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20">
            Get Started / Comenzar
          </Button>
        </Link>
      </div>
    </section>
  );
}
