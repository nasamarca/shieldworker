import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatItem {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}

export function LiveStats({ stats }: { stats: StatItem[] }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 stagger">
      {stats.map((stat) => (
        <Card key={stat.title} className="glass-card hover-lift animate-fade-up rounded-2xl border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{stat.icon}</span>
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
