const STEPS = [
  { step: "01", title: "Register", subtitle: "Registrarse", desc: "Get your on-chain identity via ERC-8004. You own your agentId NFT — portable, self-sovereign." },
  { step: "02", title: "Contribute", subtitle: "Contribuir", desc: "Pay $1/week to the community fund. Your coverage activates instantly for 7 days." },
  { step: "03", title: "Trigger", subtitle: "Evento", desc: "A weather event is verified in your zone — heavy rain, flood, or heatwave." },
  { step: "04", title: "Payout", subtitle: "Pago automático", desc: "Receive proportional USDC payout instantly. Zero paperwork, zero delays." },
];

export function HowItWorks() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.2s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        How It Works
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-16">
        Four steps to protection
      </h2>
      <div className="grid md:grid-cols-4 gap-8 stagger">
        {STEPS.map((item) => (
          <div key={item.step} className="group">
            <p className="text-5xl font-extrabold text-gray-100 group-hover:text-blue-100 transition-colors mb-4">
              {item.step}
            </p>
            <h3 className="text-lg font-bold text-gray-900 mb-0.5">{item.title}</h3>
            <p className="text-sm text-blue-600 mb-3">{item.subtitle}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
