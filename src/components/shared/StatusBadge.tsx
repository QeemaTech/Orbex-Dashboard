import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ShipmentStatus } from "@/types/dashboard"

const statusStyles: Record<ShipmentStatus, string> = {
  delivered:
    "border-transparent bg-success/15 text-success hover:bg-success/20",
  rejected:
    "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/20",
  postponed:
    "border-transparent bg-warning/15 text-warning hover:bg-warning/20",
  in_transit:
    "border-transparent bg-primary/15 text-primary hover:bg-primary/20",
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
      className={cn("font-medium", statusStyles[status], className)}
    >
      {t(`status.${status}`)}
    </Badge>
  )
}
