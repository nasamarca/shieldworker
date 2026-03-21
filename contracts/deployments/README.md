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
forge script script/Deploy.s.sol --rpc-url "$FUJI_RPC_URL" --broadcast
```

`chainId` comes from `block.chainid` (e.g. `43113` on Fuji).

The JSON is **flat** (one object): `network`, `chainId`, `deployer`, `relayer`, `explorer`, `generatedBy`, plus contract addresses (`identityRegistry`, `usdc`, `shieldWorkerRegistry`, `protectionPool`, `claimManager`).
