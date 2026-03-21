import { Card, CardContent } from "@/components/ui/card";

const TECH = [
  { name: "ERC-8004", desc: "Self-sovereign worker identity NFT", icon: "🪪" },
  { name: "x402 Protocol", desc: "HTTP-native micro-payments", icon: "💳" },
  { name: "Avalanche C-Chain", desc: "Sub-second finality, low gas", icon: "🔺" },
  { name: "USDC", desc: "Stable payouts in real currency", icon: "💵" },
];

export function TechStack() {
  return (
    <section className="mb-20 animate-fade-up" style={{ animationDelay: "0.45s" }}>
      <h2 className="text-2xl font-bold text-center mb-2">Built With</h2>
      <p className="text-center text-gray-400 text-sm mb-10">Avalanche-native technology stack</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        {TECH.map((tech) => (
          <Card key={tech.name} className="glass-card rounded-2xl border-0 hover-lift animate-fade-up text-center">
            <CardContent className="pt-6 pb-5">
              <span className="text-2xl block mb-2">{tech.icon}</span>
              <p className="font-semibold text-sm text-gray-800">{tech.name}</p>
              <p className="text-xs text-gray-500 mt-1">{tech.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
