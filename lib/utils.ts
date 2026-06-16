import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number, opts?: { compact?: boolean }) {
  const compact = opts?.compact ?? true;
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, opts?: { compact?: boolean }) {
  const compact = opts?.compact ?? true;
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, opts?: { signed?: boolean }) {
  const sign = opts?.signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function changeTone(value: number) {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-muted";
}
