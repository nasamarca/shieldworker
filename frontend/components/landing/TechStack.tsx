const TECH = [
  { name: "ERC-8004", desc: "Self-sovereign worker identity NFT — portable across protocols", icon: "🪪" },
  { name: "x402 Protocol", desc: "HTTP-native micro-payments — gasless for workers", icon: "💳" },
  { name: "Avalanche C-Chain", desc: "Sub-second finality, minimal gas costs", icon: "🔺" },
  { name: "USDC", desc: "Stable payouts denominated in real currency", icon: "💵" },
];

export function TechStack() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.35s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        Technology
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-16">
        Built on Avalanche
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
        {TECH.map((tech) => (
          <div key={tech.name} className="text-center group">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center text-2xl mx-auto mb-4 transition-colors">
              {tech.icon}
            </div>
            <p className="font-bold text-sm text-gray-900 mb-1">{tech.name}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{tech.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
