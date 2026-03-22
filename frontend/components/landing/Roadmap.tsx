const PHASES = [
  { phase: "MVP", status: "live" as const, title: "Hackathon Demo", items: "ERC-8004 identity, $1/week contributions, parametric triggers, batch payouts, admin panel" },
  { phase: "v2", status: "next" as const, title: "Enhanced Security", items: "Chainlink oracle for real weather data, EncryptedERC for confidential contributions, community validators" },
  { phase: "v3", status: "planned" as const, title: "Scale & Access", items: "Mobile PWA with account abstraction, Mercado Pago fiat on-ramp, multiple protection plans" },
  { phase: "v4", status: "vision" as const, title: "DAO Governance", items: "Governance token, community-driven validation, custom Avalanche L1, reinsurance (Munich Re)" },
];

export function Roadmap() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.4s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        Roadmap
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-16">
        From hackathon to production
      </h2>
      <div className="max-w-2xl mx-auto space-y-0">
        {PHASES.map((item, i) => (
          <div key={item.phase} className="flex gap-6 stagger">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                item.status === "live"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : item.status === "next"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}>
                {item.phase}
              </div>
              {i < PHASES.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
            </div>
            {/* Content */}
            <div className="pb-10">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                {item.status === "live" && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">Live</span>
                )}
                {item.status === "next" && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">Next</span>
                )}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{item.items}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
