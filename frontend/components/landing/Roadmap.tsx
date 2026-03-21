import { Card, CardContent } from "@/components/ui/card";

const PHASES = [
  { phase: "MVP", status: "live", title: "Hackathon Demo", items: "ERC-8004 identity, $1/week contributions, parametric triggers, batch payouts, admin panel", color: "from-emerald-500 to-emerald-600" },
  { phase: "v2", status: "next", title: "Enhanced Security", items: "Chainlink oracle for real weather data, EncryptedERC for confidential contributions, community validator staking", color: "from-blue-500 to-blue-600" },
  { phase: "v3", status: "planned", title: "Scale & Accessibility", items: "Mobile PWA with account abstraction, Mercado Pago fiat on-ramp, multiple protection plans, cross-border coverage", color: "from-violet-500 to-purple-600" },
  { phase: "v4", status: "vision", title: "DAO & Governance", items: "Governance token, community-driven trigger validation, custom Avalanche L1, reinsurance partnership (Munich Re)", color: "from-amber-500 to-orange-500" },
];

export function Roadmap() {
  return (
    <section className="mb-20 animate-fade-up" style={{ animationDelay: "0.5s" }}>
      <h2 className="text-2xl font-bold text-center mb-2">Roadmap</h2>
      <p className="text-center text-gray-400 text-sm mb-10">From hackathon to production</p>
      <div className="space-y-4 max-w-2xl mx-auto">
        {PHASES.map((item) => (
          <Card key={item.phase} className="glass-card rounded-2xl border-0 hover-lift animate-fade-up">
            <CardContent className="py-5 px-6">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} text-white font-bold text-xs flex items-center justify-center shadow-lg`}>
                  {item.phase}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{item.title}</h3>
                    {item.status === "live" && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Live</span>
                    )}
                    {item.status === "next" && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Next</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.items}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
