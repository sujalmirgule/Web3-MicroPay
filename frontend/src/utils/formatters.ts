import { ethers } from "ethers";

/**
 * Format Wei (as string, bigint, or number) to a human-readable ETH string.
 */
export function formatEth(wei: string | bigint | number | undefined, displayDecimals = 6): string {
  if (wei === undefined || wei === null || wei === "") return "0.0";
  try {
    const formatted = ethers.formatEther(BigInt(wei.toString()));
    const parts = formatted.split(".");
    if (parts.length === 1) return parts[0];
    const decimal = parts[1].slice(0, displayDecimals);
    return `${parts[0]}.${decimal}`;
  } catch {
    return "0.0";
  }
}

/**
 * Format Gwei to ETH or human string
 */
export function formatGwei(gwei: string | bigint | number): string {
  try {
    return ethers.formatUnits(BigInt(gwei.toString()), "gwei");
  } catch {
    return "0";
  }
}

/**
 * Parse an ETH string to Wei BigInt
 */
export function parseEthToWei(eth: string): bigint {
  if (!eth || isNaN(Number(eth)) || Number(eth) < 0) {
    throw new Error("Invalid ETH amount");
  }
  return ethers.parseEther(eth);
}

/**
 * Truncate an Ethereum address for UI display (e.g. 0x1234...5678)
 */
export function truncateAddress(address: string | undefined): string {
  if (!address) return "";
  if (!address.startsWith("0x") || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Truncate a transaction hash or channel ID (e.g. 0xabcd...ef01)
 */
export function truncateHash(hash: string | undefined, head = 8, tail = 6): string {
  if (!hash) return "";
  if (hash.length <= head + tail) return hash;
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

/**
 * Format unix timestamp or ISO string to standard locale format
 */
export function formatTimestamp(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return "—";
  let date: Date;
  if (typeof timestamp === "number") {
    // If timestamp is in seconds, convert to ms
    date = timestamp < 1e11 ? new Date(timestamp * 1000) : new Date(timestamp);
  } else if (typeof timestamp === "string") {
    const num = Number(timestamp);
    if (!isNaN(num) && num > 0) {
      date = num < 1e11 ? new Date(num * 1000) : new Date(num);
    } else {
      date = new Date(timestamp);
    }
  } else {
    date = timestamp;
  }

  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return relative time like "5 mins ago", "in 2 days"
 */
export function formatRelativeTime(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return "—";
  let ts: number;
  if (typeof timestamp === "number") {
    ts = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  } else if (typeof timestamp === "string") {
    const num = Number(timestamp);
    ts = !isNaN(num) && num > 0 ? (num < 1e11 ? num * 1000 : num) : new Date(timestamp).getTime();
  } else {
    ts = timestamp.getTime();
  }

  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isFuture = diffMs < 0;

  if (diffSec < 60) return isFuture ? "in a few seconds" : "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return isFuture ? `in ${mins}m` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isFuture ? `in ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isFuture ? `in ${days}d` : `${days}d ago`;
}

/**
 * Generate Sepolia or testnet block explorer URL.
 * Never outputs fake links for empty or undefined hashes!
 */
export function getExplorerUrl(
  type: "tx" | "address" | "block",
  value: string | undefined,
  chainId = 11155111
): string | null {
  if (!value || value === "0x" || value === ethers.ZeroAddress) return null;

  let base = "";
  if (chainId === 11155111) {
    base = "https://sepolia.etherscan.io";
  } else if (chainId === 84532) {
    base = "https://sepolia.basescan.org";
  } else if (chainId === 421614) {
    base = "https://sepolia.arbiscan.io";
  } else if (chainId === 1) {
    base = "https://etherscan.io";
  } else {
    return null;
  }

  return `${base}/${type}/${value}`;
}

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

export function getStatusBadgeInfo(status: string | undefined): { label: string; variant: BadgeVariant } {
  switch (status?.toUpperCase()) {
    case "OPEN":
    case "ACTIVE":
    case "CONFIRMED":
    case "SETTLED":
    case "DELIVERED":
      return { label: status, variant: "success" };

    case "PENDING":
    case "SUBMITTED":
    case "MINED":
    case "DISPUTED":
      return { label: status, variant: "warning" };

    case "FAILED":
    case "DEAD_LETTER":
    case "EXPIRED":
      return { label: status, variant: "error" };

    case "CLOSED":
      return { label: status, variant: "neutral" };

    default:
      return { label: status || "UNKNOWN", variant: "neutral" };
  }
}
