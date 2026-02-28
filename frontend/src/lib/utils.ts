import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency ──────────────────────────────────────────────────────────────────

export function formatEGP(amount: number): string {
  return `${amount.toLocaleString("en-EG")} EGP`;
}

export function formatPrice(
  amount: number,
  period: string,
  currency: string = "EGP"
): string {
  const formatted = amount.toLocaleString("en-EG");
  if (period && period !== "one-time") {
    return `${formatted} ${currency}/${period}`;
  }
  return `${formatted} ${currency}`;
}

// ── Date ──────────────────────────────────────────────────────────────────────

export function formatDate(date: string): string {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export function formatRelativeTime(date: string): string {
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true });
  } catch {
    return date;
  }
}

// ── Text ──────────────────────────────────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Property ──────────────────────────────────────────────────────────────────

export function bedroomsLabel(count: number): string {
  if (count === 0) return "Studio";
  return `${count} ${count === 1 ? "Bedroom" : "Bedrooms"}`;
}

export function propertyTypeLabel(type: string): string {
  switch (type) {
    case "rent":
      return "For Rent";
    case "buy":
      return "For Sale";
    case "shared":
      return "Shared";
    default:
      return type;
  }
}

// ── Location ─────────────────────────────────────────────────────────────────

export function formatLocation(
  location: string,
  fullAddress?: string
): string {
  if (fullAddress) return fullAddress;
  return location;
}
