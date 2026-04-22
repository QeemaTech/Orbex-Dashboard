import { cn } from "@/lib/utils"

export function publicTrackingStatusPillClass(statusRaw: string): string {
  const s = statusRaw.trim().toUpperCase()
  if (s === "DELIVERED") {
    return "border-emerald-500/35 bg-emerald-500/12 text-emerald-900 dark:text-emerald-100"
  }
  if (s === "REJECTED" || s === "RETURNED_TO_MERCHANT") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100"
  }
  if (s === "OUT_FOR_DELIVERY" || s === "ASSIGNED" || s === "POSTPONED") {
    return "border-amber-500/40 bg-amber-500/12 text-amber-950 dark:text-amber-50"
  }
  if (
    s === "IN_WAREHOUSE" ||
    s === "PICKED_UP" ||
    s === "PENDING_PICKUP" ||
    s === "RETURNED_TO_WAREHOUSE"
  ) {
    return "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100"
  }
  return "border-primary/25 bg-primary/10 text-primary"
}

export function formatCodTotalEg(
  shipmentValue: string,
  shippingFee: string,
  locale: string,
): string {
  const n =
    Number.parseFloat(shipmentValue.replace(/,/g, "")) +
    Number.parseFloat(shippingFee.replace(/,/g, ""))
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export function trackingPillCn(statusRaw: string): string {
  return cn(
    "inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
    publicTrackingStatusPillClass(statusRaw),
  )
}
