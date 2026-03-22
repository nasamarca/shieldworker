interface StatItem {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}

export function LiveStats({ stats }: { stats: StatItem[] }) {
  return (
    <section className="pb-28">
      <div className="section-divider mb-16" />

      {/* Section header */}
      <div className="flex items-center justify-center gap-2 mb-12">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <p className="text-xs font-semibold tracking-widest uppercase text-emerald-600">
          Live from Avalanche
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="group relative rounded-2xl border border-gray-100 bg-white hover:border-gray-200 p-6 sm:p-8 text-center transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/60 overflow-hidden"
          >
            {/* Subtle gradient glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-emerald-50/0 group-hover:from-blue-50/40 group-hover:to-emerald-50/30 transition-all duration-500 pointer-events-none" />

            <div className="relative">
              {/* Label */}
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
                {stat.title}
              </p>

              {/* Value — large, gradient on hover */}
              <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 group-hover:text-gradient mb-2 transition-colors duration-300 tabular-nums">
                {stat.value}
              </p>

              {/* Subtitle */}
              <p className="text-xs text-gray-400 font-medium">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* On-chain badge */}
      <div className="flex justify-center mt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-100">
          <span className="text-xs text-gray-400">Avalanche Fuji</span>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-xs text-gray-400">Chain ID 43113</span>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-xs text-gray-400">Real-time on-chain data</span>
        </div>
      </div>
    </section>
  );
}
