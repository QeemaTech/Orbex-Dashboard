import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ShipmentStatus } from "@/types/dashboard"

const statusStyles: Record<ShipmentStatus, string> = {
  delivered:
    "border-transparent bg-success/14 text-success hover:bg-success/22",
  rejected:
    "border-transparent bg-destructive/14 text-destructive hover:bg-destructive/22",
  postponed:
    "border-transparent bg-warning/16 text-warning hover:bg-warning/24",
  in_transit:
    "border-transparent bg-primary/14 text-primary hover:bg-primary/22",
}

export interface StatusBadgeProps {
  status: ShipmentStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors",
        statusStyles[status],
        className
      )}
    >
      {t(`status.${status}`)}
    </Badge>
  )
}
