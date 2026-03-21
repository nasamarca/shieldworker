# Deployment addresses (auto-generated)

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
