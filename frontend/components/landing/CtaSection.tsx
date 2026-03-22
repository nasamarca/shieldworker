import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="pb-24 text-center animate-fade-up" style={{ animationDelay: "0.5s" }}>
      <div className="section-divider mb-16" />
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to join?</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
        Register your on-chain identity and start contributing to the community protection fund today.
      </p>
      <Link href="/register">
        <Button size="lg" className="h-12 px-8 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-sm transition-all">
          Get Started / Comenzar
        </Button>
      </Link>
    </section>
  );
}
