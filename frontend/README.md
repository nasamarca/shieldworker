# ShieldWorker — Frontend

Web interface for the ShieldWorker community protection fund. Built with Next.js + Thirdweb SDK + shadcn/ui.

## Pages

| Route | Purpose |
|:------|:--------|
| `/` | Landing — pool stats, how-it-works, CTAs |
| `/register` | 2-step worker registration (mint ERC-8004 agentId → link to zone) |
| `/contribute` | Coverage status + contribute $1 USDC |
| `/dashboard` | Worker profile, reputation, payout history |
| `/admin` | Submit trigger events + execute batch payouts (ORACLE_ROLE only) |

## Setup

```bash
pnpm install
cp .env.example .env.local
# Add your Thirdweb Client ID to .env.local
pnpm dev
```

## Tech Stack

- **Next.js 16** (App Router)
- **Thirdweb SDK v5** (wallet connect + contract interactions)
- **shadcn/ui** (UI components)
- **Tailwind CSS v4**
- **Sonner** (toast notifications)
- **Avalanche Fuji** (Chain ID: 43113)

## Connected Contracts

All contract ABIs and addresses in `lib/contracts/`. Deployed addresses auto-generated from `contracts/deployments/fuji-43113.json`.

---

*Built for Aleph Hackathon March 2026 — Avalanche Bounty Track*
