# ShieldWorker

**Decentralized Community Protection Fund for Latin America's Informal Workers**

Built for [Aleph Hackathon March 2026](https://dorahacks.io/hackathon/alephhackathonm26/detail) — Avalanche Bounty Track (Crypto Track + Avalanche x402 + ERC-8004).

> ShieldWorker is NOT insurance. It is structured as a **mutual aid fund** (fondo de proteccion comunitaria) to comply with Argentina's Ley 20.091.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [x402 Payment Flow](#x402-payment-flow)
- [Security](#security)
- [Deployed Contracts](#deployed-contracts)
- [Getting Started](#getting-started)
- [Regulatory Compliance](#regulatory-compliance)
- [Roadmap](#roadmap)
- [Key Design Decisions](#key-design-decisions)
- [License](#license)

---

## The Problem

In Latin America, **140 million informal workers** (46.7% of the workforce) operate completely outside any social protection system. They have zero access to unemployment coverage, pension contributions, sick leave, or accident protection.

When a street vendor's merchandise is destroyed by a storm or a construction worker is injured, they lose 100% of their income from day one — with average savings that are **negative** (IDB data).

| Metric | Value | Source |
|:-------|:------|:-------|
| Informal workers in LATAM | 140 million | ILO 2025 |
| % of LATAM workforce | 46.7% | ILO 2025 |
| Social protection gap | $301.3 billion | IDB Invest |
| Argentina informal workers | 9 million (42%) | ILO/OECD |
| Income gap vs formal | 45% lower | OECD 2025 |
| Poverty rate vs formal | 5x higher | OECD/Brazil |
| Youth informality rate | 57.5% | ILO |

### Why Existing Solutions Fall Short

| Solution | Limitation |
|:---------|:----------|
| **Etherisc** | Parametric crop insurance for farmers only — not urban informal workers |
| **BIMA/MicroEnsure** | Telco micro-insurance — no blockchain, no transparency, no portable identity |
| **ImpactMarket** (Celo) | UBI distribution only — no protection mechanism, no worker identity |
| **Monotributo Social** (Argentina gov) | Limited reach, excludes accident/property/unemployment coverage |
| **Nexus Mutual / InsurAce** | DeFi protocol risk only — not for humans |

**ShieldWorker's unique position:** The ONLY solution combining on-chain worker identity (ERC-8004) + micro-contribution payments (x402) + parametric automatic payouts for informal workers.

---

## The Solution

ShieldWorker is a decentralized mutual aid fund where informal workers can:

1. **Register** an on-chain self-sovereign identity via ERC-8004 (agentId NFT they own)
2. **Contribute** $1/week to a community protection fund via x402 gasless micropayments
3. **Receive** automatic $50 USDC parametric payouts when trigger events (e.g., heavy rain) are confirmed in their zone

No bank account needed. No paperwork. No intermediaries.

---

## How It Works

### Worker Flow (e.g., Maria — Street Vendor in Buenos Aires)

```
Step 1: Register Identity
  Worker → IdentityRegistry.register() → gets agentId NFT (ERC-8004, self-sovereign)
  Worker → ShieldWorkerRegistry.registerWorker() → links agentId to zone ("flores") & type ("street_vendor")

Step 2: Contribute Weekly
  Worker pays $1 USDC via x402 → Thirdweb facilitator settles to backend wallet
  Backend wallet → ProtectionPool.contributeFor() → coverage activated for 7 days

Step 3: Trigger Event
  Admin/Oracle → ClaimManager.submitTrigger("heavy_rain", "flores")
  Contract auto-queries all workers in zone with active coverage

Step 4: Automatic Payout
  Admin → ClaimManager.executeBatchPayout() → $50 USDC per affected worker
  Maria receives $50 USDC directly — no paperwork, no delays
```

### Admin/Oracle Flow

1. Submit parametric trigger event (event type + zone)
2. Contract automatically identifies affected workers with active coverage
3. Execute paginated batch payouts (max 20 workers/batch to prevent gas limit issues)
4. Track payout progress and affected worker list

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│                  Next.js 16 (App Router) + TypeScript                  │
│              Tailwind CSS v4 + Thirdweb SDK v5 + Sonner                │
│                                                                        │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌─────────┐ │
│  │ Landing  │ │ Register  │ │ Contribute │ │ Dashboard │ │  Admin  │ │
│  │    /     │ │ /register │ │ /contribute│ │ /dashboard│ │ /admin  │ │
│  └────┬─────┘ └─────┬─────┘ └──────┬─────┘ └─────┬─────┘ └────┬────┘ │
│       │             │              │              │            │       │
├───────┼─────────────┼──────────────┼──────────────┼────────────┼───────┤
│       │             │         ┌────┴─────┐        │            │       │
│       │             │         │  x402    │        │            │       │
│       │             │         │  API     │        │            │       │
│       │             │         │  Route   │        │            │       │
│       │             │         └────┬─────┘        │            │       │
├───────┴─────────────┴──────────────┴──────────────┴────────────┴───────┤
│                                                                        │
│                  Avalanche C-Chain (Fuji Testnet)                       │
│                  Chain ID: 43113 | EVM: Cancun                         │
│                                                                        │
│  ┌────────────────┐   ┌──────────────────────────────────────────────┐ │
│  │  USDC (Fuji)   │   │         ShieldWorkerRegistry                 │ │
│  │  (ERC-20)      │   │  registerWorker() — link agentId to zone     │ │
│  │  decimals: 6   │   │  getWorkersByZone() — for claim matching     │ │
│  └────────────────┘   └──────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─────────────────────────┐   ┌────────────────────────────────────┐ │
│  │    ProtectionPool       │   │       ClaimManager                  │ │
│  │                         │   │                                     │ │
│  │  contribute(agentId)    │   │  submitTrigger(type, zone)          │ │
│  │  contributeFor(agentId) │   │  executeBatchPayout(id, off, n)     │ │
│  │  isActive(agentId)      │   │    → paginated (max 20/batch)      │ │
│  │  executePayout()        │   │    → calls Pool.executePayout()     │ │
│  │  seedPool() / pause()   │   │                                     │ │
│  └─────────────────────────┘   └────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              OFFICIAL (pre-deployed on Fuji)                      │  │
│  │  ERC-8004 IdentityRegistry   — self-sovereign agent identity      │  │
│  │  ERC-8004 ReputationRegistry — portable reputation                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cross-Contract Communication

```
ShieldWorkerRegistry ←──── ProtectionPool (updateStreak)
ShieldWorkerRegistry ←──── ClaimManager (updatePayoutStats)
ProtectionPool ←────────── ClaimManager (executePayout, isActive)
IdentityRegistry ←──────── ShieldWorkerRegistry (verifies agentId ownership)
```

---

## Tech Stack

### Smart Contracts

| Component | Technology |
|:----------|:-----------|
| Language | Solidity 0.8.34 (pinned pragma) |
| Framework | Foundry (forge build/test/deploy) |
| Libraries | OpenZeppelin v5.x (AccessControl, ReentrancyGuardTransient, Pausable, SafeERC20) |
| Chain | Avalanche C-Chain (Fuji Testnet, Chain ID: 43113) |
| EVM Target | Cancun (TSTORE/TLOAD support) |
| Identity | ERC-8004 via [ava-labs/8004-boilerplate](https://github.com/ava-labs/8004-boilerplate) |
| Payments | x402 via [ava-labs/x402-starter-kit](https://github.com/ava-labs/x402-starter-kit) |
| Token | USDC (6 decimals) |

### Frontend

| Component | Technology |
|:----------|:-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Runtime | React 19 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Base UI React |
| Web3 SDK | Thirdweb SDK v5 (wallet connection, contract reads/writes, x402) |
| Icons | Lucide React |
| Notifications | Sonner |
| Package Manager | pnpm |

---

## Project Structure

```
shieldworker/
├── contracts/
│   ├── src/
│   │   ├── ShieldWorkerRegistry.sol          # Zone-based worker registry (2-step registration)
│   │   ├── ProtectionPool.sol                # USDC contributions, coverage tracking, payouts
│   │   ├── ClaimManager.sol                  # Parametric triggers, paginated batch payouts
│   │   └── interfaces/
│   │       ├── Errors.sol                    # Custom error definitions
│   │       └── IIdentityRegistry.sol         # ERC-8004 IdentityRegistry interface
│   ├── script/
│   │   └── Deploy.s.sol                      # Full deployment + role setup script
│   ├── test/
│   │   └── Integration.t.sol                 # Full flow integration tests
│   ├── deployments/
│   │   └── fuji-43113.json                   # Auto-generated deployment addresses
│   ├── lib/                                  # Foundry dependencies (OZ, forge-std)
│   └── foundry.toml
├── frontend/
│   ├── app/
│   │   ├── page.tsx                          # Landing page
│   │   ├── layout.tsx                        # Root layout
│   │   ├── providers.tsx                     # Thirdweb provider
│   │   ├── register/page.tsx                 # 2-step worker registration
│   │   ├── contribute/page.tsx               # Contribution & x402 payment flow
│   │   ├── dashboard/page.tsx                # Worker profile, history, stats
│   │   ├── admin/page.tsx                    # Trigger events & batch payouts
│   │   ├── api/contribute/route.ts           # x402 HTTP 402 payment handler
│   │   └── globals.css
│   ├── components/
│   │   ├── landing/                          # Hero, Problem, HowItWorks, LiveStats, etc.
│   │   ├── layout/Navbar.tsx                 # Navigation with wallet connect
│   │   └── ui/                               # shadcn/ui components
│   ├── hooks/
│   │   ├── useShieldWorker.ts                # Read hooks (coverage, stats, history)
│   │   └── useShieldActions.ts               # Write hooks (register, contribute, trigger)
│   ├── lib/
│   │   ├── contracts/                        # ABIs & deployed addresses
│   │   ├── constants.ts                      # Coverage duration, amounts, zones, types
│   │   ├── format.ts                         # USDC formatting, date utils, explorer links
│   │   └── thirdweb.ts                       # Thirdweb client initialization
│   ├── package.json
│   └── pnpm-lock.yaml
└── docs/
    ├── PRD.md                                # Product Requirements Document
    ├── ARCHITECTURE.md                       # System architecture & design decisions
    ├── BRAINSTORM.md                         # Initial brainstorming
    ├── DEMO-SCRIPT.md                        # Demo flow for presentation
    ├── PITCH-DECK.md                         # Pitch deck outline
    └── VIDEO-SCRIPT.md                       # Video script for submission
```

---

## Smart Contracts

### ShieldWorkerRegistry.sol

Zone-based worker registry with a **2-step self-sovereign identity model**. Workers mint their agentId NFT directly from the official ERC-8004 IdentityRegistry (they own it), then link it to ShieldWorker zone data.

| Function | Access | Description |
|:---------|:-------|:------------|
| `registerWorker(agentId, type, zone, uri)` | Public | Link agentId to zone (verifies NFT ownership) |
| `getWorker(agentId)` | View | Get worker profile |
| `getWorkersByZone(zone)` | View | Get all agentIds in a zone |
| `isRegistered(agentId)` | View | Check registration status |
| `updateStreak(agentId, streak, amount)` | ProtectionPool | Update contribution streak |
| `updatePayoutStats(agentId, amount)` | ClaimManager | Update payout statistics |

### ProtectionPool.sol

Community protection fund. Receives USDC contributions, tracks **7-day rolling coverage**, and executes parametric payouts.

| Function | Access | Description |
|:---------|:-------|:------------|
| `contribute(agentId)` | Public | Direct contribution (worker approves USDC + calls) |
| `contributeFor(agentId)` | RELAYER_ROLE | Relayer contribution after x402 settlement |
| `executePayout(agentId, amount)` | CLAIM_MANAGER_ROLE | Send USDC payout to worker |
| `isActive(agentId)` | View | Computed coverage check (`expiresAt > block.timestamp`) |
| `getCoverage(agentId)` | View | Get coverage details |
| `getPoolBalance()` | View | Total USDC in pool |
| `seedPool(amount)` | ADMIN_ROLE | Seed pool with initial USDC |
| `pause() / unpause()` | ADMIN_ROLE | Emergency circuit breaker |

**Constants:**
- `COVERAGE_DURATION`: 7 days per $1 contribution
- `DEFAULT_CONTRIBUTION`: 1 USDC (1,000,000 — 6 decimals)
- `DEFAULT_PAYOUT`: 50 USDC (50,000,000)
- `MAX_PAYOUT_PER_EVENT`: 500 USDC (prevents pool drain)

### ClaimManager.sol

Parametric trigger events with paginated batch payouts.

| Function | Access | Description |
|:---------|:-------|:------------|
| `submitTrigger(eventType, zone)` | ORACLE_ROLE | Create trigger, auto-match affected workers |
| `executeBatchPayout(triggerId, offset, limit)` | ORACLE_ROLE | Paginated payout (max 20/batch) |
| `getTrigger(triggerId)` | View | Get trigger event details |
| `getAffectedWorkers(triggerId)` | View | Get affected worker list |
| `isWorkerPaid(triggerId, agentId)` | View | Double-payout prevention check |

**Supported Trigger Types:** `heavy_rain`, `flood`, `heatwave`
**Supported Zones:** `flores`, `palermo`, `la_boca`, `once`, `san_telmo`

### Access Control

```
ADMIN (deployer)
  ├── ADMIN_ROLE on ProtectionPool       → pause, unpause, seed pool
  ├── RELAYER_ROLE on ProtectionPool     → contributeFor() after x402 settlement
  ├── ORACLE_ROLE on ClaimManager        → submit triggers, execute payouts
  └── DEFAULT_ADMIN_ROLE on all          → grant/revoke roles
```

---

## Frontend

### Pages

| Route | Purpose |
|:------|:--------|
| `/` | Landing page — hero, problem statement, how-it-works, live on-chain stats, tech stack, architecture, contract addresses, roadmap, compliance, CTA |
| `/register` | 2-step registration — Step 1: mint agentId NFT via IdentityRegistry; Step 2: link to ShieldWorker zone |
| `/contribute` | Coverage activation — toggle between direct USDC approve+transfer or x402 gasless payment |
| `/dashboard` | Worker profile — coverage status, contribution streak, contribution & payout history |
| `/admin` | Oracle panel — submit trigger events, execute batch payouts, track affected workers |

### Custom Hooks

**`useShieldWorker.ts`** — Read-only hooks:
- `useWorkerByAddress()` — Get agentId and profile for connected wallet
- `useCoverage()` — Coverage status and `isActive` for a worker
- `usePoolStats()` — Pool balance, total contributions, total payouts, worker count
- `useContributionHistory()` / `usePayoutHistory()` — Event logs
- `useTriggerList()` / `useAffectedWorkers()` — Trigger data
- `useIsAdmin()` — Check ORACLE_ROLE

**`useShieldActions.ts`** — Write hooks:
- `useRegisterIdentity()` — Mint agentId on IdentityRegistry
- `useRegisterWorker()` — Link agentId to ShieldWorker zone
- `useApproveUSDC()` / `useContribute()` — Direct contribution flow
- `useContributeX402()` — x402 gasless contribution
- `useSubmitTrigger()` / `useExecuteBatchPayout()` — Admin actions

---

## x402 Payment Flow

ShieldWorker integrates the [x402 HTTP Payment Protocol](https://github.com/ava-labs/x402-starter-kit) for gasless USDC micro-contributions.

```
┌──────────┐     GET /api/contribute     ┌──────────────┐
│  Worker   │ ──────────────────────────▶ │  Next.js API  │
│  Browser  │ ◀────── HTTP 402 ────────── │  Route        │
│           │    (PaymentRequired headers) │               │
│           │                              │               │
│           │  Sign USDC payment (x402)    │               │
│           │ ──────────────────────────▶ │               │
│           │                              │  Thirdweb     │
│           │                              │  Facilitator  │
│           │                              │  settles USDC │
│           │                              │       │       │
│           │                              │       ▼       │
│           │                              │  contributeFor│
│           │                              │  (via relayer)│
│           │ ◀────── 200 OK ──────────── │               │
│           │   Coverage activated!        │               │
└──────────┘                              └──────────────┘
```

The x402 flow enables workers to contribute without holding AVAX for gas — the Thirdweb facilitator handles USDC settlement, and the backend relayer calls `contributeFor()` on their behalf.

---

## Security

### Invariants

1. **One identity per wallet** — `addressToAgentId` enforced in registry
2. **Only registered workers** can receive contributions and payouts
3. **Coverage expires after 7 days** — `expiresAt` checked before payout
4. **Zone matching** — payouts only to workers with active coverage in the affected zone
5. **Per-event payout cap** — $500 USDC maximum prevents pool drain
6. **No double payouts** — `triggerWorkerPaid` mapping per trigger per worker
7. **No admin withdrawal** — pool funds can only leave via `executePayout()`
8. **No PII on-chain** — worker metadata stored off-chain via `agentURI` (Ley 25.326 compliant)

### Security Patterns

| Pattern | Where | Why |
|:--------|:------|:----|
| ReentrancyGuardTransient | All state-changing functions | TSTORE-based, 98% cheaper than classic ReentrancyGuard |
| Checks-Effects-Interactions | executePayout, executeBatchPayout | State updated before external calls |
| SafeERC20 | All USDC transfers | Safe handling of non-standard ERC-20 return values |
| Pausable | ProtectionPool | Emergency circuit breaker |
| AccessControl | All privileged functions | Role-based permission model |
| Custom Errors | All reverts | ~200 gas savings per revert vs require strings |
| Pinned Pragma | All contracts | No floating pragma — deterministic compilation |

---

## Deployed Contracts

### Avalanche Fuji Testnet (Chain ID: 43113)

**Official (pre-deployed):**

| Contract | Address |
|:---------|:--------|
| ERC-8004 IdentityRegistry | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://testnet.snowtrace.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) |
| ERC-8004 ReputationRegistry | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://testnet.snowtrace.io/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) |
| Fuji Testnet USDC | [`0x5425890298aed601595a70AB815c96711a31Bc65`](https://testnet.snowtrace.io/address/0x5425890298aed601595a70AB815c96711a31Bc65) |

**Custom (deployed by ShieldWorker):**

| Contract | Address |
|:---------|:--------|
| ShieldWorkerRegistry | [`0x123090915d5a05c2d962e4Ed4d4916E20c22C20E`](https://testnet.snowtrace.io/address/0x123090915d5a05c2d962e4Ed4d4916E20c22C20E) |
| ProtectionPool | [`0x6affa88497703f6c7E87AaeA0a65c19c771F1504`](https://testnet.snowtrace.io/address/0x6affa88497703f6c7E87AaeA0a65c19c771F1504) |
| ClaimManager | [`0xFff8a77B1Dd38C7430578664aA274556D40f9975`](https://testnet.snowtrace.io/address/0xFff8a77B1Dd38C7430578664aA274556D40f9975) |

**Operational Wallets:**

| Wallet | Address | Role |
|:-------|:--------|:-----|
| Deployer | `0xb6f2dBE7F3dD93B57aa762CC16aFdF71017B1991` | DEFAULT_ADMIN_ROLE |
| Relayer | `0xf71031D28003c1d5acb051694347f392E782d5d2` | RELAYER_ROLE (x402 facilitator) |

---

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) — Solidity framework
- [Node.js](https://nodejs.org/) 20+ — JavaScript runtime
- [pnpm](https://pnpm.io/) — Package manager
- Fuji AVAX for gas — [Avalanche Faucet](https://faucet.avax.network)
- Fuji USDC for testing — [Circle Faucet](https://faucet.circle.com)

### Smart Contracts

```bash
cd contracts

# Install dependencies
forge install

# Build
forge build

# Run tests
forge test -vv

# Run specific test with trace
forge test --match-test test_full_flow -vvvv

# Format
forge fmt

# Deploy to Fuji
source .env
forge script script/Deploy.s.sol --rpc-url $FUJI_RPC_URL --broadcast
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local with Thirdweb credentials
# NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
# THIRDWEB_SECRET_KEY=your_secret_key

# Run development server
pnpm dev

# Build for production
pnpm build
```

### Environment Variables

**Contracts (`contracts/.env`):**
```
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
DEPLOYER_PRIVATE_KEY=0x...
SNOWTRACE_API_KEY=...
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
THIRDWEB_SECRET_KEY=...
```

---

## Regulatory Compliance

| Regulation | Compliance Strategy |
|:-----------|:-------------------|
| **Ley 20.091** (Argentina Insurance Law) | Structured as "fondo de proteccion comunitaria" (mutual aid), NOT insurance. No premium, no policy, no claim adjudication. |
| **Ley 25.326** (Data Protection) | No PII on-chain. Worker metadata stored off-chain via `agentURI`. Only zone and worker type stored on-chain. |
| **Ley 20.337** (Cooperatives) | Production path: register as Asociacion Mutual with INAES (Instituto Nacional de Asociativismo y Economia Social). |

---

## Roadmap

### v1 — MVP (Current — Hackathon)

- [x] ERC-8004 self-sovereign identity registration (2-step)
- [x] x402 micro-contribution payments ($1/week)
- [x] 7-day rolling coverage tracking
- [x] Parametric trigger events (admin-attested)
- [x] Paginated batch automatic payouts ($50 USDC)
- [x] On-chain contribution streak (portable reputation)
- [x] Full frontend: landing, register, contribute, dashboard, admin
- [x] Deployed to Avalanche Fuji testnet

### v2 — Production Ready

- [ ] **EncryptedERC** — Confidential contribution/income history
- [ ] **Chainlink Oracle** — Real weather data triggers (replace admin attestation)
- [ ] **Custom Avalanche L1** — Lower gas for daily micro-contributions
- [ ] **Mobile PWA** — Account abstraction + responsive-first design
- [ ] **Fiat On/Off-Ramp** — Mercado Pago integration for LATAM accessibility
- [ ] **ZK Proofs** — Credit verification without exposing financial history
- [ ] **Multiple Protection Plans** — Health, accident, theft (beyond weather)
- [ ] **Community Validator Staking** — Decentralized trigger attestation

### v3 — Scale

- [ ] **Cross-Border Identity Portability** — Workers migrate, identity follows
- [ ] **Savings/Micro-Pension Component** — Long-term financial inclusion
- [ ] **SILO Governance Token / DAO** — Progressive decentralization
- [ ] **Reinsurance Partnership** — Munich Re LATAM parametric program
- [ ] **Legal Entity** — Asociacion Mutual (INAES) as protocol wrapper

### Never

- Custodial wallets — non-custodial always
- Traditional claims process — the whole point is NO paperwork
- Storing health records on-chain — privacy violation (Ley 25.326)

---

## Key Design Decisions

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| 2-step registration | Worker mints agentId NFT directly from IdentityRegistry | Self-sovereign identity — worker owns their NFT, not the contract |
| `contributeFor()` + RELAYER_ROLE | Backend relayer activates coverage after x402 | x402 settles USDC only, cannot call smart contract functions |
| `isActive()` computed, not stored | `expiresAt > block.timestamp` | Saves ~20,000 gas per contribution (no SSTORE for bool) |
| Paginated batch payouts | Max 20 workers per batch | Prevents block gas limit issues |
| Per-event payout cap | $500 USDC max per trigger | Prevents pool drain from a single large event |
| Zone stored as string | Human-readable in events + frontend | More gas, but UX priority for hackathon |
| Admin-triggered claims | Simple for MVP | Production requires Chainlink oracle |
| ReentrancyGuardTransient | TSTORE-based (Cancun EVM) | 98% cheaper than classic ReentrancyGuard |
| Separate Pool + ClaimManager | Separation of concerns | Cleaner architecture, easier to test/audit |
| Non-transferable ERC-721 | `_update` override blocks transfers | Prevents identity selling/trading attacks |

---

## License

MIT

---

*Built with care for the 140 million invisible workers of Latin America.*

*Aleph Hackathon March 2026 — Avalanche Bounty Track.*
