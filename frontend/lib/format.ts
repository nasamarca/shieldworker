import { USDC_DECIMALS } from "./constants";

export function formatUSDC(amount: bigint): string {
  const value = Number(amount) / 10 ** USDC_DECIMALS;
  return `$${value.toFixed(2)}`;
}

export function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function snowtraceLink(txHash: string): string {
  return `https://testnet.snowtrace.io/tx/${txHash}`;
}

export function snowtraceAddressLink(address: string): string {
  return `https://testnet.snowtrace.io/address/${address}`;
}
