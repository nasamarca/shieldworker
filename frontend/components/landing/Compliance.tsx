import { Card, CardContent } from "@/components/ui/card";

const BADGES = [
  "Ley 20.091 Compliant",
  "Ley 25.326 (Data Protection)",
  "No PII On-Chain",
  "Mutual Aid Model",
];

export function Compliance() {
  return (
    <section className="mb-20 animate-fade-up" style={{ animationDelay: "0.55s" }}>
      <Card className="glass-card rounded-2xl border-0">
        <CardContent className="p-8 text-center">
          <h2 className="text-lg font-bold mb-3">Regulatory Compliance</h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto mb-4">
            ShieldWorker is a <strong>fondo de protecci&oacute;n comunitaria</strong> (community protection fund),
            not insurance. Compliant with Argentina&apos;s Ley 20.091 (insurance regulation) and
            Ley 25.326 (data protection). No personal data stored on-chain.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {BADGES.map((badge) => (
              <span key={badge} className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                {badge}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
