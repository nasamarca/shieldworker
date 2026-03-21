export { addresses, CHAIN_ID } from "./addresses";

import ShieldWorkerRegistryABI from "./abis/ShieldWorkerRegistry.json";
import ProtectionPoolABI from "./abis/ProtectionPool.json";
import ClaimManagerABI from "./abis/ClaimManager.json";
import IIdentityRegistryABI from "./abis/IIdentityRegistry.json";

export const abis = {
  identityRegistry: IIdentityRegistryABI,
  shieldWorkerRegistry: ShieldWorkerRegistryABI,
  protectionPool: ProtectionPoolABI,
  claimManager: ClaimManagerABI,
} as const;
