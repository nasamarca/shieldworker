import { Card, CardContent } from "@/components/ui/card";

export function RealImpact() {
  return (
    <section className="mb-20 animate-fade-up" style={{ animationDelay: "0.4s" }}>
      <Card className="glass-card rounded-2xl border-0 overflow-hidden">
        <CardContent className="p-8 md:p-10">
          <h2 className="text-xl font-bold mb-6 text-center">Real Impact: Mar&iacute;a&apos;s Story</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="font-semibold text-red-600 text-sm uppercase tracking-wide">Without ShieldWorker</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> Storm destroys merchandise ($200 loss)</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> No protection, zero savings</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> 2-3 weeks to recover</li>
                <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span> Total loss: <strong>$650-830</strong></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-emerald-600 text-sm uppercase tracking-wide">With ShieldWorker</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Contributes $1/week (~$4/month)</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Storm triggers automatic payout</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> <strong>$50 USDC</strong> received in 2 seconds</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Savings vs without: <strong className="text-emerald-600">$500-680</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
