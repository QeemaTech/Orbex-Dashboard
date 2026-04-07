import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Kind = "transfer" | "orderDelivery" | "orderPayment"

const PREFIX: Record<Kind, string> = {
  transfer: "backend.shipmentTransferStatus",
  orderDelivery: "backend.orderDeliveryStatus",
  orderPayment: "backend.orderPaymentStatus",
}

function badgeClass(kind: Kind, raw: string): string {
  const s = raw.trim().toUpperCase()
  const green =
    "border-success/40 bg-success/12 text-success dark:border-success/45 dark:bg-success/18 dark:text-green-100"
  const red =
    "border-destructive/40 bg-destructive/12 text-destructive dark:border-destructive/45 dark:bg-destructive/18 dark:text-red-100"
  const orange =
    "border-warning/45 bg-warning/14 text-warning dark:border-warning/50 dark:bg-warning/18 dark:text-orange-100"
  if (kind === "transfer") {
    if (s === "DELIVERED") return green
    if (s === "PARTIALLY_DELIVERED")
      return "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
    if (s === "IN_WAREHOUSE")
      return "border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
    if (s === "PICKED_UP")
      return "border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
    if (s === "PENDING_PICKUP" || s === "PENDING")
      return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
    if (s === "ON_THE_WAY_TO_WAREHOUSE")
      return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    if (s === "ASSIGNED")
      return "border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
    return "border-muted bg-muted/40 text-foreground"
  }
  if (kind === "orderDelivery") {
    if (s === "DELIVERED") return green
    if (s === "REJECTED") return red
    if (s === "POSTPONED") return orange
    if (s === "OUT_FOR_DELIVERY" || s === "ASSIGNED")
      return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    if (s === "IN_WAREHOUSE" || s === "CONFIRMED_BY_CS")
      return "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    if (
      s === "PENDING_PICKUP" ||
      s === "PICKED_UP" ||
      s === "PENDING"
    )
      return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
    if (s === "RETURNED" || s === "RETURNED_TO_WAREHOUSE" || s === "RETURNED_TO_MERCHANT")
      return "border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
    return "border-muted bg-muted/40 text-foreground"
  }
  if (s === "COLLECTED" || s === "SETTLED") return green
  if (s === "READY_FOR_SETTLEMENT")
    return "border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
  if (s === "PENDING_COLLECTION")
    return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
  if (s === "POS_PENDING" || s === "ON_HOLD")
    return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
  return "border-muted bg-muted/40 text-foreground"
}

export function BackendStatusBadge({
  kind,
  value,
  className,
}: {
  kind: Kind
  value: string | null | undefined
  className?: string
}) {
  const { t } = useTranslation()
  const v = (value ?? "").trim()
  if (!v) return <span className="text-muted-foreground">—</span>
  const key = `${PREFIX[kind]}.${v}`
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", badgeClass(kind, v), className)}
    >
      {t(key, { defaultValue: t("backend.enumUnknown") })}
    </Badge>
  )
}
