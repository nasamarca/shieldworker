// ShieldWorker constants — must match smart contract values

export const COVERAGE_DURATION_DAYS = 7;
export const DEFAULT_CONTRIBUTION = 1_000_000n; // 1 USDC (6 decimals)
export const DEFAULT_PAYOUT = 50_000_000n; // 50 USDC (6 decimals)
export const USDC_DECIMALS = 6;

export const WORKER_TYPES = [
  { value: "street_vendor", label: "Street Vendor / Vendedor Ambulante" },
  { value: "domestic", label: "Domestic Worker / Empleada Doméstica" },
  { value: "construction", label: "Construction / Albañil" },
  { value: "gig", label: "Gig Worker / Delivery & Ride-hailing" },
] as const;

export const ZONES = [
  { value: "flores", label: "Flores" },
  { value: "palermo", label: "Palermo" },
  { value: "la_boca", label: "La Boca" },
  { value: "once", label: "Once" },
  { value: "san_telmo", label: "San Telmo" },
] as const;

export const EVENT_TYPES = [
  { value: "heavy_rain", label: "Heavy Rain / Lluvia Fuerte" },
  { value: "flood", label: "Flood / Inundación" },
  { value: "heatwave", label: "Heatwave / Ola de Calor" },
] as const;
