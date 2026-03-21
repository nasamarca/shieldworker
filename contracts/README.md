# ShieldWorker — Smart Contracts

Community protection fund (fondo de proteccion comunitaria) for LATAM's 140 million informal workers. Powered by Avalanche ERC-8004 + x402.

Built for [Aleph Hackathon March 2026](https://dorahacks.io/hackathon/aleph-hackathon) — Avalanche Bounty Track.

---

## The Problem

In Latin America, **140 million informal workers** (46.7% of the workforce) have zero social protection — no insurance, no pension, no sick leave. When a street vendor's merchandise is destroyed by a storm, she loses everything with nothing to fall back on.

- **$301.3 billion** social protection gap (IDB Invest)
- **9 million** informal workers in Argentina alone (42% of workforce)
- **57.5%** of youth workers are informal
- **Zero** existing blockchain solutions combining identity + protection for informal workers

## The Solution

ShieldWorker is a decentralized mutual aid fund where informal workers can:

1. **Register** an on-chain identity via ERC-8004 (self-sovereign, portable)
2. **Contribute** $1/week to a community protection fund via x402 (gasless micropayments)
3. **Receive** automatic $50 USDC parametric payouts when trigger events are verified (e.g., heavy rain in their zone)

No bank account needed. No paperwork. No intermediaries.

> **Important**: ShieldWorker is NOT insurance. It is structured as a mutual aid fund. Under Argentina's Ley 20.091, offering insurance without SSN authorization is illegal.

---

## Architecture

```
OFFICIAL (already deployed on Avalanche Fuji):
├── ERC-8004 IdentityRegistry    (0x8004A818BFB912233c491871b3d84c89A494BD9e)
├── ERC-8004 ReputationRegistry  (0x8004B663056A597Dffe9eCcC1965A193B7388713)
└── Fuji Testnet USDC            (0x5425890298aed601595a70AB815c96711a31Bc65)

CUSTOM (deployed by ShieldWorker):
├── ShieldWorkerRegistry.sol     — Verifies agentId ownership, stores zone mapping
├── ProtectionPool.sol           — Contributions, coverage tracking, payouts
└── ClaimManager.sol             — Parametric triggers, batch payouts
```

### How It Works

```
Worker Registration (2-step, self-sovereign identity):
  1. Worker calls IdentityRegistry.register() → gets agentId NFT (owned by worker)
  2. Worker calls ShieldWorkerRegistry.registerWorker() → links agentId to zone

Contribution (x402 + relayer):
  3. Worker pays $1 USDC via x402 → Thirdweb facilitator settles to backend wallet
  4. Backend wallet calls ProtectionPool.contributeFor() → coverage activated (7 days)

Trigger + Payout:
  5. Admin submits trigger: ClaimManager.submitTrigger("heavy_rain", "flores")
  6. Contract matches affected workers with active coverage in zone
  7. Admin executes: ClaimManager.executeBatchPayout() → $50 USDC per worker
```

### Key Design Decisions

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| 2-step registration | Worker mints agentId NFT directly in IdentityRegistry | Self-sovereign identity — worker owns their NFT, not the contract |
| contributeFor() + RELAYER_ROLE | Backend relayer activates coverage after x402 settlement | x402 uses EIP-3009 (USDC transfer only), cannot call smart contract functions |
| Paginated batch payouts | Max 20 workers per batch | Prevents block gas limit issues |
| Per-event payout cap | $500 USDC max per trigger | Prevents pool drain from single event |
| isActive() computed, not stored | Coverage checked via `expiresAt > block.timestamp` | Saves ~20,000 gas per contribution (no SSTORE for bool) |

---

## Tech Stack

| Component | Technology |
|:----------|:-----------|
| Language | Solidity 0.8.34 |
| Framework | Foundry |
| Libraries | OpenZeppelin v5.x (AccessControl, ReentrancyGuardTransient, Pausable, SafeERC20) |
| Chain | Avalanche C-Chain (Fuji Testnet, Chain ID: 43113) |
| Identity | ERC-8004 (official IdentityRegistry via [ava-labs/8004-boilerplate](https://github.com/ava-labs/8004-boilerplate)) |
| Payments | x402 via Thirdweb SDK v5 (from [ava-labs/x402-starter-kit](https://github.com/ava-labs/x402-starter-kit)) |
| Token | USDC (Fuji: 0x5425890298aed601595a70AB815c96711a31Bc65) |

---

## Contracts

### ShieldWorkerRegistry.sol

Zone-based worker registry. Does NOT mint agentId NFTs — workers register directly with the official ERC-8004 IdentityRegistry, then call `registerWorker()` to link their identity to ShieldWorker zone data.

| Function | Access | Description |
|:---------|:-------|:------------|
| `registerWorker(agentId, type, zone, uri)` | Public | Link agentId to ShieldWorker zone (verifies NFT ownership) |
| `getWorker(agentId)` | View | Get worker profile |
| `getWorkersByZone(zone)` | View | Get all agentIds in a zone (for claim matching) |
| `isRegistered(agentId)` | View | Check if agentId has a worker profile |
| `updateStreak(agentId, streak, amount)` | ProtectionPool only | Update contribution streak |
| `updatePayoutStats(agentId, amount)` | ProtectionPool only | Update payout statistics |

### ProtectionPool.sol

Community protection fund. Receives USDC contributions, tracks 7-day rolling coverage, executes parametric payouts.

| Function | Access | Description |
|:---------|:-------|:------------|
| `contribute(agentId)` | Public | Direct contribution (worker approves + calls) |
| `contributeFor(agentId)` | RELAYER_ROLE | Relayer contribution after x402 settlement |
| `executePayout(agentId, amount)` | CLAIM_MANAGER_ROLE | Send USDC payout to worker |
| `isActive(agentId)` | View | Check if worker has active coverage |
| `getCoverage(agentId)` | View | Get coverage details (expiresAt, count) |
| `getPoolBalance()` | View | Get total USDC in pool |
| `seedPool(amount)` | ADMIN_ROLE | Seed pool with USDC (additive only, no withdraw) |
| `pause() / unpause()` | ADMIN_ROLE | Emergency circuit breaker |

### ClaimManager.sol

Parametric trigger events and paginated batch payouts.

| Function | Access | Description |
|:---------|:-------|:------------|
| `submitTrigger(eventType, zone)` | ORACLE_ROLE | Submit trigger, auto-match affected workers |
| `executeBatchPayout(triggerId, offset, limit)` | ORACLE_ROLE | Paginated payout (max 20/batch) |
| `getTrigger(triggerId)` | View | Get trigger event details |
| `getAffectedWorkers(triggerId)` | View | Get affected worker list |
| `isWorkerPaid(triggerId, agentId)` | View | Check double-payout prevention |

### Access Control

```
ADMIN (deployer)
  ├── ADMIN_ROLE on ProtectionPool      → pause, unpause, seed pool
  ├── RELAYER_ROLE on ProtectionPool    → contributeFor() after x402 settlement
  ├── ORACLE_ROLE on ClaimManager       → submit triggers, execute payouts
  └── DEFAULT_ADMIN_ROLE on all         → grant/revoke roles
```

---

## Security

### Invariants

1. One identity per wallet (`addressToAgentId` enforced)
2. Only registered workers can receive contributions
3. Coverage expires after 7 days (`expiresAt` checked before payout)
4. Payouts only to workers with active coverage in affected zone
5. Per-event payout cap ($500 USDC) prevents pool drain
6. No double payouts per trigger per worker (`triggerWorkerPaid` mapping)
7. Pool funds can only leave via `executePayout()` (no admin withdrawal function)
8. No PII on-chain (Ley 25.326 compliant)

### Patterns

| Pattern | Where | Why |
|:--------|:------|:----|
| ReentrancyGuardTransient | All state-changing functions | TSTORE-based, 98% cheaper than classic |
| Checks-Effects-Interactions | executePayout, executeBatchPayout | State updated before external calls |
| SafeERC20 | All USDC transfers | Safe handling of non-standard ERC-20 |
| Pausable | ProtectionPool contributions | Emergency circuit breaker |
| AccessControl | All admin/oracle/relayer functions | Role-based permissions |
| Custom Errors | All reverts | ~200 gas savings per revert vs require strings |

---

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Fuji AVAX for gas ([faucet](https://faucet.avax.network))
- Fuji USDC for pool seeding ([Circle faucet](https://faucet.circle.com))

### Setup

```bash
# Clone and install
git clone https://github.com/<username>/shieldworker.git
cd shieldworker/contracts
forge install

# Configure environment
cp .env.example .env
# Edit .env with your values (see .env.example for descriptions)
```

### Build

```bash
forge build
```

### Test

```bash
# Run all tests
forge test -vv

# Run specific test
forge test --match-test test_full_flow -vvvv
```

### Deploy to Fuji

```bash
# Load env and deploy
source .env
forge script script/Deploy.s.sol --rpc-url $FUJI_RPC_URL --broadcast
```

### Format

```bash
forge fmt
```

---

## Deployed Contracts (Fuji Testnet)

| Contract | Address |
|:---------|:--------|
| ERC-8004 IdentityRegistry (official) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 ReputationRegistry (official) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Fuji Testnet USDC (official) | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| ShieldWorkerRegistry | *deployed during hackathon* |
| ProtectionPool | *deployed during hackathon* |
| ClaimManager | *deployed during hackathon* |

---

## Regulatory Compliance

| Regulation | Compliance |
|:-----------|:-----------|
| **Ley 20.091** (Argentina Insurance Law) | ShieldWorker is a "fondo de proteccion comunitaria" (mutual aid), NOT insurance |
| **Ley 25.326** (Data Protection) | No PII on-chain. Worker metadata stored off-chain via agentURI |
| **Ley 20.337** (Cooperatives) | Production: register as Asociacion Mutual with INAES |

---

## Roadmap (Post-Hackathon)

- **EncryptedERC** — Confidential contribution/income history ([course](https://build.avax.network/academy/blockchain/encrypted-erc))
- **Chainlink Oracle** — Real weather data triggers (replace admin attestation)
- **Custom Avalanche L1** — Lower gas for daily micro-contributions
- **Mobile PWA** — Account abstraction + Mercado Pago integration
- **Legal Entity** — Asociacion Mutual (INAES) as protocol wrapper
- **Reinsurance** — Munich Re LATAM parametric program partnership

---

## License

MIT

---

*Built with care for the 140 million invisible workers of Latin America.*
*Aleph Hackathon March 2026 — Avalanche Bounty Track.*
