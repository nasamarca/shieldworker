export function RealImpact() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.3s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        Real Impact
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-16">
        Mar&iacute;a&apos;s story
      </h2>
      <div className="grid md:grid-cols-2 gap-0 max-w-3xl mx-auto rounded-2xl overflow-hidden border border-gray-100">
        {/* Without */}
        <div className="bg-gray-50 p-8 sm:p-10">
          <p className="text-xs font-bold tracking-widest uppercase text-red-500 mb-6">Without ShieldWorker</p>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold mt-0.5">✕</span>
              <span>Storm destroys merchandise — <strong>$200 loss</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold mt-0.5">✕</span>
              <span>No protection, zero savings</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold mt-0.5">✕</span>
              <span>2-3 weeks to recover</span>
            </li>
          </ul>
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total loss</p>
            <p className="text-3xl font-extrabold text-gray-900">$650–830</p>
          </div>
        </div>
        {/* With */}
        <div className="bg-white p-8 sm:p-10">
          <p className="text-xs font-bold tracking-widest uppercase text-emerald-600 mb-6">With ShieldWorker</p>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
              <span>Contributes <strong>$1/week</strong> (~$4/month)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
              <span>Storm triggers automatic payout</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
              <span><strong>$50 USDC</strong> received in 2 seconds</span>
            </li>
          </ul>
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Savings</p>
            <p className="text-3xl font-extrabold text-emerald-600">$500–680</p>
          </div>
        </div>
      </div>
    </section>
  );
}
