const BADGES = [
  "Ley 20.091 Compliant",
  "Ley 25.326 (Data Protection)",
  "No PII On-Chain",
  "Mutual Aid Model",
];

export function Compliance() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.45s" }}>
      <div className="section-divider mb-16" />
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-4">
          Compliance
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
          Regulatory aware
        </h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          ShieldWorker is a <strong>fondo de protecci&oacute;n comunitaria</strong> (community protection fund),
          not insurance. Compliant with Argentina&apos;s insurance regulation and data protection laws.
          No personal data stored on-chain.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {BADGES.map((badge) => (
            <span key={badge} className="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 text-xs font-medium">
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
