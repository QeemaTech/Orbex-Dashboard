import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

function statusColorClass(status: string): string {
  switch (status) {
    case "PENDING_ASSIGNMENT":
      return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
    case "CONFIRMED_BY_CS":
      return "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    case "IN_WAREHOUSE":
      return "border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
    case "OUT_FOR_DELIVERY":
      return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    case "ASSIGNED":
      return "border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
    case "DELIVERED":
      return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    case "REJECTED":
      return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
    case "POSTPONED":
      return "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
    case "PENDING_CONFIRMATION":
    case "PENDING_PICKUP":
    case "CREATED":
      return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
    case "CONFIRMED":
    case "RECEIVED_IN_WAREHOUSE":
    case "PICKED_UP":
      return "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    case "DELAYED":
      return "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
    case "RETURNED":
    case "RETURNED_TO_WAREHOUSE":
      return "border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
    case "RETURN_TO_MERCHANT":
      return "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
    case "RESCHEDULED":
      return "border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
    case "DAMAGED_OR_MISSING":
    case "DAMAGED":
      return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
    case "OVERDUE":
      return "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
    case "PENDING_COLLECTION":
    case "POS_PENDING":
    case "ON_HOLD":
      return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    case "COLLECTED":
    case "READY_FOR_SETTLEMENT":
    case "SETTLED":
      return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    default:
      return "border-muted bg-muted/40 text-foreground"
  }
}

export function ShipmentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const key = `cs.shipmentStatus.${status}`
  return (
    <Badge variant="outline" className={`font-medium ${statusColorClass(status)}`}>
      {t(key, { defaultValue: status })}
    </Badge>
  )
}
