import { Card, CardContent } from "@/components/ui/card";

const PROBLEMS = [
  { stat: "42%", label: "Informal Workforce", desc: "9 million workers in Argentina alone have zero social protection — no sick leave, no insurance, no safety net.", color: "text-red-500" },
  { stat: "$301B", label: "Protection Gap", desc: "IDB estimates a $301.3 billion protection gap across LATAM. Existing solutions don't reach informal workers.", color: "text-amber-500" },
  { stat: "100%", label: "Income Loss", desc: "When disaster strikes, informal workers lose 100% of income from day one. Average savings are negative.", color: "text-blue-500" },
];

export function ProblemSection() {
  return (
    <section className="mb-20 animate-fade-up" style={{ animationDelay: "0.35s" }}>
      <h2 className="text-2xl font-bold text-center mb-2">The Problem / El Problema</h2>
      <p className="text-center text-gray-400 text-sm mb-10">Why 140 million workers need this</p>
      <div className="grid md:grid-cols-3 gap-6 stagger">
        {PROBLEMS.map((item) => (
          <Card key={item.stat} className="glass-card rounded-2xl border-0 hover-lift animate-fade-up">
            <CardContent className="pt-6 pb-6">
              <p className={`text-3xl font-extrabold mb-2 ${item.color}`}>{item.stat}</p>
              <p className="font-semibold text-gray-800 mb-1">{item.label}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
