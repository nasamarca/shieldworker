import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  { step: "1", title: "Register / Registrarse", desc: "Get your on-chain identity via ERC-8004. You own your agentId NFT.", color: "from-blue-500 to-blue-600" },
  { step: "2", title: "Contribute / Contribuir", desc: "Pay $1/week to the community fund. Coverage activates for 7 days.", color: "from-emerald-500 to-emerald-600" },
  { step: "3", title: "Trigger Event", desc: "Weather event verified in your zone (e.g., heavy rain in Flores).", color: "from-amber-500 to-orange-500" },
  { step: "4", title: "Auto Payout", desc: "Receive proportional USDC payout instantly. Zero paperwork.", color: "from-violet-500 to-purple-600" },
];

export function HowItWorks() {
  return (
    <section className="mb-20 animate-fade-up" style={{ animationDelay: "0.3s" }}>
      <h2 className="text-2xl font-bold text-center mb-2">How It Works</h2>
      <p className="text-center text-gray-400 text-sm mb-10">4 steps to community protection</p>
      <div className="grid md:grid-cols-4 gap-6 stagger">
        {STEPS.map((item) => (
          <Card key={item.step} className="glass-card hover-lift text-center rounded-2xl border-0 animate-fade-up overflow-hidden">
            <CardContent className="pt-8 pb-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                {item.step}
              </div>
              <h3 className="font-semibold mb-2 text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
