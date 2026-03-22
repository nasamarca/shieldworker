export function Architecture() {
  return (
    <section className="pb-32 animate-fade-up" style={{ animationDelay: "0.4s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        Architecture
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
        How the pieces connect
      </h2>
      <p className="text-center text-gray-500 max-w-lg mx-auto mb-16 text-sm leading-relaxed">
        Four smart contracts working together — identity, contributions, and
        parametric payouts, all settled in USDC on Avalanche.
      </p>

      {/* ── Contract Flow Diagram ────────────────────────────── */}
      <div className="max-w-3xl mx-auto mb-20">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8 sm:p-12">
          {/* Row 1: Identity */}
          <div className="flex flex-col items-center mb-8">
            <div className="rounded-xl border border-blue-200 bg-white px-6 py-4 text-center shadow-sm max-w-sm w-full">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-blue-600 mb-1">ERC-8004 Official</p>
              <p className="font-bold text-gray-900 text-sm">IdentityRegistry</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">0x8004...9BD9e</p>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <svg className="w-3 h-3 text-gray-300" viewBox="0 0 12 12"><path d="M6 0 L12 6 L6 12 L0 6 Z" fill="currentColor" /></svg>
          </div>

          {/* Row 2: Registry */}
          <div className="flex flex-col items-center mb-8">
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 text-center shadow-sm max-w-sm w-full">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1">Zone Mapping</p>
              <p className="font-bold text-gray-900 text-sm">ShieldWorkerRegistry</p>
              <p className="text-xs text-gray-400 mt-1">Worker type + zone + streak data</p>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <svg className="w-3 h-3 text-gray-300" viewBox="0 0 12 12"><path d="M6 0 L12 6 L6 12 L0 6 Z" fill="currentColor" /></svg>
          </div>

          {/* Row 3: Pool + ClaimManager side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-emerald-600 mb-1">Contributions + Payouts</p>
              <p className="font-bold text-gray-900 text-sm">ProtectionPool</p>
              <p className="text-xs text-gray-400 mt-1">$1 in, $50 out per trigger</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-amber-600 mb-1">Parametric Triggers</p>
              <p className="font-bold text-gray-900 text-sm">ClaimManager</p>
              <p className="text-xs text-gray-400 mt-1">Weather event &rarr; batch payout</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── x402 Payment Flow ────────────────────────────────── */}
      <div className="max-w-3xl mx-auto">
        <h3 className="font-bold text-center text-gray-900 mb-2">x402 Payment Flow</h3>
        <p className="text-center text-xs text-gray-400 mb-8">How a $1 contribution works behind the scenes</p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: "1", title: "Request", desc: "Worker clicks \"Contribute\" — app sends GET to /api/contribute", color: "gray" },
            { step: "2", title: "402 Response", desc: "Server returns HTTP 402 with USDC payment requirements", color: "blue" },
            { step: "3", title: "Sign & Pay", desc: "Wallet signs USDC authorization — Thirdweb facilitator settles on-chain", color: "purple" },
            { step: "4", title: "Coverage Active", desc: "Relayer calls contributeFor() — 7-day coverage activated instantly", color: "emerald" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className={`w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-sm font-bold
                ${item.color === "gray" ? "bg-gray-100 text-gray-600" : ""}
                ${item.color === "blue" ? "bg-blue-50 text-blue-600" : ""}
                ${item.color === "purple" ? "bg-purple-50 text-purple-600" : ""}
                ${item.color === "emerald" ? "bg-emerald-50 text-emerald-600" : ""}
              `}>
                {item.step}
              </div>
              <p className="font-semibold text-sm text-gray-900 mb-1">{item.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
