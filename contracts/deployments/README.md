# Deployment addresses (auto-generated)

## Deployment successful

All **three custom** ShieldWorker contracts are **live on Avalanche Fuji** (chain ID `43113`).

| Contract               | Address                                    | Explorer                                                                                                                                    |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ShieldWorkerRegistry   | `0x123090915d5a05c2d962e4Ed4d4916E20c22C20E` | [Snowtrace](https://testnet.snowtrace.io/address/0x123090915d5a05c2d962e4Ed4d4916E20c22C20E)                                                 |
| ProtectionPool         | `0x6affa88497703f6c7E87AaeA0a65c19c771F1504` | [Snowtrace](https://testnet.snowtrace.io/address/0x6affa88497703f6c7E87AaeA0a65c19c771F1504)                                                 |
| ClaimManager           | `0xFff8a77B1Dd38C7430578664aA274556D40f9975` | [Snowtrace](https://testnet.snowtrace.io/address/0xFff8a77B1Dd38C7430578664aA274556D40f9975)                                                 |

### Official references

| Contract           | Address                                    |
| ------------------ | ------------------------------------------ |
| IdentityRegistry   | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| USDC (Fuji)        | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| Relayer            | `0xf71031D28003c1d5acb051694347f392E782d5d2` |

---

## Contract verification

All contracts are verified on [testnet.snowscan.xyz](https://testnet.snowscan.xyz) via RouteScan.

To verify after a fresh deploy, run the three commands below from `contracts/` with `source .env` loaded first.

> **Verifier URL:** `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan`

```bash
cd contracts
source .env

# 1. ShieldWorkerRegistry
forge verify-contract 0x123090915d5a05c2d962e4Ed4d4916E20c22C20E \
  src/ShieldWorkerRegistry.sol:ShieldWorkerRegistry \
  --chain 43113 \
  --verifier-url "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan" \
  --etherscan-api-key "$SNOWTRACE_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address)" \
    0x8004A818BFB912233c491871b3d84c89A494BD9e)

# 2. ProtectionPool
forge verify-contract 0x6affa88497703f6c7E87AaeA0a65c19c771F1504 \
  src/ProtectionPool.sol:ProtectionPool \
  --chain 43113 \
  --verifier-url "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan" \
  --etherscan-api-key "$SNOWTRACE_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" \
    0x5425890298aed601595a70AB815c96711a31Bc65 \
    0x123090915d5a05c2d962e4Ed4d4916E20c22C20E \
    0x8004A818BFB912233c491871b3d84c89A494BD9e)

# 3. ClaimManager
forge verify-contract 0xFff8a77B1Dd38C7430578664aA274556D40f9975 \
  src/ClaimManager.sol:ClaimManager \
  --chain 43113 \
  --verifier-url "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan" \
  --etherscan-api-key "$SNOWTRACE_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    0x6affa88497703f6c7E87AaeA0a65c19c771F1504 \
    0x123090915d5a05c2d962e4Ed4d4916E20c22C20E)
```

---

## Machine-readable addresses

`fuji-<chainId>.json` files are **written by** `script/Deploy.s.sol` when you run `forge script` (simulation or `--broadcast`). **Do not edit them by hand** — redeploy or re-run the script to refresh.

After a successful deploy you should see:

```text
Deployment addresses written to: .../deployments/fuji-43113.json
```

To regenerate locally (same chain as your RPC):

```bash
cd contracts
source .env
forge script script/Deploy.s.sol --rpc-url "$FUJI_RPC_URL"
# or broadcast:
forge script script/Deploy.s.sol --rpc-url "$FUJI_RPC_URL" --broadcast --verify
```

`chainId` comes from `block.chainid` (e.g. `43113` on Fuji).

The JSON is **flat** (one object): `network`, `chainId`, `deployer`, `relayer`, `explorer`, `generatedBy`, plus contract addresses (`identityRegistry`, `usdc`, `shieldWorkerRegistry`, `protectionPool`, `claimManager`).
