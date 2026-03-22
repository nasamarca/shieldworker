interface StatItem {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}

export function LiveStats({ stats }: { stats: StatItem[] }) {
  return (
    <section className="pb-24">
      <div className="section-divider mb-16" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
        {stats.map((stat) => (
          <div key={stat.title} className="text-center">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-3">
              {stat.title}
            </p>
            <p className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
