import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { CircleDot, Package, Warehouse, Truck, CheckCircle, XCircle, Clock, RotateCcw, UserCheck } from "lucide-react"

import { cn } from "@/lib/utils"

type StatusEvent = {
  id: string
  fromStatus: string | null
  toStatus: string
  actorUserId: string | null
  createdAt: string
}

type ShipmentTimelineProps = {
  events: StatusEvent[]
  currentStatus: string
}

const STATUS_CONFIG: Record<string, { icon: typeof CircleDot; labelKey: string; color: string; bgColor: string }> = {
  PENDING_PICKUP: { icon: Package, labelKey: "shipments.timeline.pendingPickup", color: "text-slate-500", bgColor: "bg-slate-100" },
  PICKED_UP: { icon: Package, labelKey: "shipments.timeline.pickedUp", color: "text-amber-600", bgColor: "bg-amber-100" },
  IN_WAREHOUSE: { icon: Warehouse, labelKey: "shipments.timeline.inWarehouse", color: "text-blue-600", bgColor: "bg-blue-100" },
  ASSIGNED: { icon: UserCheck, labelKey: "shipments.timeline.assigned", color: "text-cyan-600", bgColor: "bg-cyan-100" },
  OUT_FOR_DELIVERY: { icon: Truck, labelKey: "shipments.timeline.outForDelivery", color: "text-orange-600", bgColor: "bg-orange-100" },
  DELIVERED: { icon: CheckCircle, labelKey: "shipments.timeline.delivered", color: "text-green-600", bgColor: "bg-green-100" },
  REJECTED: { icon: XCircle, labelKey: "shipments.timeline.rejected", color: "text-red-600", bgColor: "bg-red-100" },
  POSTPONED: { icon: Clock, labelKey: "shipments.timeline.postponed", color: "text-amber-600", bgColor: "bg-amber-100" },
  RETURNED_TO_WAREHOUSE: { icon: RotateCcw, labelKey: "shipments.timeline.returnedToWarehouse", color: "text-purple-600", bgColor: "bg-purple-100" },
  RETURNED_TO_MERCHANT: { icon: RotateCcw, labelKey: "shipments.timeline.returnedToMerchant", color: "text-purple-600", bgColor: "bg-purple-100" },
}

function formatStatusLabel(status: string, t: (key: string) => string): string {
  const config = STATUS_CONFIG[status]
  if (config) {
    return t(config.labelKey)
  }
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG["PENDING_PICKUP"]
}

export function ShipmentTimeline({ events }: ShipmentTimelineProps) {
  const { t } = useTranslation()

  const timelineItems = useMemo(() => {
    if (!events || events.length === 0) {
      return []
    }
    return events.map((event) => ({
      id: event.id,
      status: event.toStatus,
      label: formatStatusLabel(event.toStatus, t),
      timestamp: event.createdAt,
    }))
  }, [events, t])

  if (timelineItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 p-6 text-center">
        <p className="text-muted-foreground text-sm">
          {t("shipments.timeline.noHistory", { defaultValue: "No tracking history available" })}
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full items-center overflow-x-auto gap-2 pb-2">
      {timelineItems.map((item, index) => {
        const config = getStatusConfig(item.status)
        const Icon = config.icon
        const isLast = index === timelineItems.length - 1
        const isFirst = index === 0

        return (
          <div key={item.id} className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-2">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full shadow-sm",
                  config.bgColor,
                )}
              >
                <Icon className={cn("size-5", config.color)} aria-hidden />
              </div>
              <div className="shrink-0">
                <p className={cn("text-sm font-semibold", config.color)}>{item.label}</p>
              </div>
            </div>
            {!isLast && (
              <div className="h-0.5 w-8 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
  )
}