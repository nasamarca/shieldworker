const CONTRACTS = [
  {
    name: "IdentityRegistry",
    tag: "ERC-8004 Official",
    address: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    desc: "Self-sovereign agent identity NFTs",
  },
  {
    name: "ShieldWorkerRegistry",
    tag: "Custom",
    address: "0x123090915d5a05c2d962e4Ed4d4916E20c22C20E",
    desc: "Worker profiles, zones, and streak data",
  },
  {
    name: "ProtectionPool",
    tag: "Custom",
    address: "0x6affa88497703f6c7E87AaeA0a65c19c771F1504",
    desc: "USDC contributions and parametric payouts",
  },
  {
    name: "ClaimManager",
    tag: "Custom",
    address: "0xFff8a77B1Dd38C7430578664aA274556D40f9975",
    desc: "Weather triggers and batch payout execution",
  },
  {
    name: "USDC",
    tag: "Testnet",
    address: "0x5425890298aed601595a70AB815c96711a31Bc65",
    desc: "Circle USDC on Avalanche Fuji",
  },
];

export function ContractDeployments() {
  return (
    <section className="pb-24 animate-fade-up" style={{ animationDelay: "0.42s" }}>
      <div className="section-divider mb-16" />
      <p className="text-sm font-medium tracking-widest uppercase text-gray-400 text-center mb-4">
        Deployments
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
        Verified on-chain
      </h2>
      <p className="text-center text-gray-500 max-w-md mx-auto mb-12 text-sm leading-relaxed">
        All contracts deployed and operational on Avalanche Fuji (C-Chain, chainId 43113).
      </p>

      <div className="max-w-2xl mx-auto space-y-3">
        {CONTRACTS.map((c) => (
          <a
            key={c.address}
            href={`https://testnet.snowtrace.io/address/${c.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50 px-6 py-4 transition-all duration-200"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  {c.tag}
                </span>
              </div>
              <p className="text-xs text-gray-400">{c.desc}</p>
            </div>
            <div className="shrink-0 ml-4 text-right">
              <p className="font-mono text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                {c.address.slice(0, 6)}...{c.address.slice(-4)}
              </p>
              <p className="text-[10px] text-gray-300 group-hover:text-blue-400 transition-colors mt-0.5">
                View on Snowtrace &rarr;
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
