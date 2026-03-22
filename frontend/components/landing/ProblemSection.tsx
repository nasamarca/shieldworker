const PROBLEMS = [
  { stat: "42%", label: "Informal Workforce", desc: "9 million workers in Argentina alone have zero social protection — no sick leave, no safety net." },
  { stat: "$301B", label: "Protection Gap", desc: "IDB estimates a $301.3 billion protection gap across LATAM. Existing solutions don't reach them." },
  { stat: "100%", label: "Income Loss", desc: "When disaster strikes, informal workers lose 100% of income from day one. Savings are negative." },
];

export function ProblemSection() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.25s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        The Problem
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-16">
        Why 140 million workers need this
      </h2>
      <div className="grid md:grid-cols-3 gap-12 stagger">
        {PROBLEMS.map((item) => (
          <div key={item.stat} className="text-center md:text-left">
            <p className="text-5xl sm:text-6xl font-extrabold text-gradient mb-3">{item.stat}</p>
            <p className="text-lg font-bold text-gray-900 mb-2">{item.label}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
