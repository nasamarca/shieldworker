const TECH = [
  {
    name: "Avalanche C-Chain",
    tag: "Infrastructure",
    desc: "Sub-second finality and minimal gas costs make micro-contributions viable. A $1 weekly payment needs near-zero overhead — Avalanche delivers that.",
    why: "Why not other chains? Ethereum L1 gas would eat the entire $1 contribution. Avalanche gives us speed + cost at mainnet-grade security.",
    icon: "🔺",
  },
  {
    name: "ERC-8004",
    tag: "Identity",
    desc: "Official Avalanche identity standard. Workers mint their own agentId NFT — a self-sovereign, portable identity they own across any protocol.",
    why: "Why not generic ERC-721? ERC-8004 is purpose-built for agent identity with metadata, wallet binding, and cross-protocol portability.",
    icon: "🪪",
  },
  {
    name: "x402 Protocol",
    tag: "Payments",
    desc: "HTTP-native payment protocol. Workers pay via standard HTTP 402 responses — no manual approve + transfer. One click, one signature.",
    why: "Why not just approve + transferFrom? x402 eliminates 2-step UX friction. Workers sign once, Thirdweb facilitator settles on-chain.",
    icon: "💳",
  },
  {
    name: "USDC",
    tag: "Stability",
    desc: "Contributions and payouts denominated in real currency. Workers deal in dollars, not volatile tokens — critical for financial protection.",
    why: "Why not native AVAX? Informal workers need stability. A $50 payout must be worth $50 when they receive it.",
    icon: "💵",
  },
];

export function TechStack() {
  return (
    <section className="pb-32 animate-fade-up" style={{ animationDelay: "0.35s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        Technology
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
        Built on Avalanche
      </h2>
      <p className="text-center text-gray-500 max-w-lg mx-auto mb-16 text-sm leading-relaxed">
        Every technology choice serves the mission: make protection accessible
        to workers who have never had it.
      </p>

      <div className="grid md:grid-cols-2 gap-6 stagger">
        {TECH.map((tech) => (
          <div
            key={tech.name}
            className="group rounded-2xl border border-gray-100 hover:border-gray-200 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/50"
          >
            <div className="flex items-start gap-5 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center text-2xl shrink-0 transition-colors duration-300">
                {tech.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{tech.name}</h3>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {tech.tag}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{tech.desc}</p>
              </div>
            </div>
            <div className="pl-[4.75rem]">
              <p className="text-xs text-gray-400 leading-relaxed italic">{tech.why}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
