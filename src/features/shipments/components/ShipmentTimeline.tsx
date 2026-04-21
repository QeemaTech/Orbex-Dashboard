import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  CircleDot,
  Package,
  Warehouse,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  UserCheck,
  ChevronDown,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { orderDeliveryWarehouseHintLabel } from "@/lib/warehouse-location-hint"

export type ShipmentStatusEventPayload = {
  id: string
  fromStatus: string | null
  toStatus: string
  actorUserId: string | null
  note?: string | null
  createdAt: string
  atWarehouseId?: string | null
  atWarehouse?: { id: string; name: string } | null
  fromWarehouseId?: string | null
  fromWarehouse?: { id: string; name: string } | null
  toWarehouseId?: string | null
  toWarehouse?: { id: string; name: string } | null
  postponeCountAfter?: number | null
  assignedCourierName?: string | null
}

type ShipmentTimelineProps = {
  events: ShipmentStatusEventPayload[]
  /** When set, matching `atWarehouseId` shows “in this warehouse”. */
  contextWarehouseId?: string
}

function resolveDateLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CircleDot; labelKey: string; color: string; bgColor: string }
> = {
  PENDING_PICKUP: {
    icon: Package,
    labelKey: "shipments.timeline.pendingPickup",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
  },
  PICKED_UP: {
    icon: Package,
    labelKey: "shipments.timeline.pickedUp",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  IN_WAREHOUSE: {
    icon: Warehouse,
    labelKey: "shipments.timeline.inWarehouse",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  ASSIGNED: {
    icon: UserCheck,
    labelKey: "shipments.timeline.assigned",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  OUT_FOR_DELIVERY: {
    icon: Truck,
    labelKey: "shipments.timeline.outForDelivery",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  DELIVERED: {
    icon: CheckCircle,
    labelKey: "shipments.timeline.delivered",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  REJECTED: {
    icon: XCircle,
    labelKey: "shipments.timeline.rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  POSTPONED: {
    icon: Clock,
    labelKey: "shipments.timeline.postponed",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  RETURNED_TO_WAREHOUSE: {
    icon: RotateCcw,
    labelKey: "shipments.timeline.returnedToWarehouse",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  RETURNED_TO_MERCHANT: {
    icon: RotateCcw,
    labelKey: "shipments.timeline.returnedToMerchant",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
}

function formatStatusLabel(status: string, t: (key: string) => string): string {
  const config = STATUS_CONFIG[status]
  if (config) {
    return t(config.labelKey)
  }
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG["PENDING_PICKUP"]
}

function buildPrimaryLabel(
  event: ShipmentStatusEventPayload,
  t: TFunction,
  contextWarehouseId?: string,
): string {
  const base = formatStatusLabel(event.toStatus, t)
  const pc = event.postponeCountAfter
  if (event.toStatus === "POSTPONED" && pc != null && pc > 0) {
    return `${base} (${t("shipments.timeline.postponeAttempt", { count: pc })})`
  }
  const hint = orderDeliveryWarehouseHintLabel(
    event.toStatus,
    {
      locationWarehouseId: event.atWarehouseId,
      locationWarehouseName: event.atWarehouse?.name,
      contextWarehouseId,
    },
    t,
  )
  if (hint) {
    return `${base} ${hint}`
  }
  if (
    event.toStatus === "ASSIGNED" &&
    (event.fromWarehouse || event.toWarehouse)
  ) {
    const from = event.fromWarehouse?.name?.trim() || "—"
    const to = event.toWarehouse?.name?.trim() || "—"
    return `${base} (${t("shipments.timeline.transferRoute", { from, to })})`
  }
  return base
}

export function ShipmentTimeline({ events, contextWarehouseId }: ShipmentTimelineProps) {
  const { t, i18n } = useTranslation()
  const locale = resolveDateLocale(i18n.language)
  const [isAuditOpen, setIsAuditOpen] = useState(false)

  const formatEventDateTime = (iso: string): string => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  }

  const timelineItems = useMemo(() => {
    if (!events || events.length === 0) {
      return []
    }
    return events.map((event) => ({
      id: event.id,
      status: event.toStatus,
      label: buildPrimaryLabel(event, t, contextWarehouseId),
      timestamp: event.createdAt,
    }))
  }, [events, t, contextWarehouseId])

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
    <div className="space-y-4">
      <div className="flex w-full items-stretch gap-2 overflow-x-auto pb-2">
        {timelineItems.map((item, index) => {
          const config = getStatusConfig(item.status)
          const Icon = config.icon
          const isLast = index === timelineItems.length - 1

          return (
            <div key={item.id} className="flex min-w-[11rem] max-w-[14rem] shrink-0 items-stretch gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex shrink-0 items-start gap-2">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm",
                      config.bgColor,
                    )}
                  >
                    <Icon className={cn("size-5", config.color)} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold leading-tight", config.color)}>{item.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                      {formatEventDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
              {!isLast ? (
                <div
                  className="mt-5 h-0.5 w-6 shrink-0 self-start rounded-full bg-muted-foreground/30"
                  aria-hidden
                />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border/70 bg-background/80 px-3 py-2 text-left transition-colors hover:bg-background"
          aria-expanded={isAuditOpen}
          onClick={() => setIsAuditOpen((prev) => !prev)}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("shipments.timeline.auditHeading")}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isAuditOpen ? "rotate-180" : "rotate-0",
            )}
            aria-hidden
          />
        </button>

        {isAuditOpen ? (
          <ol className="mt-3 space-y-3 text-sm">
            {events.map((event) => {
              const config = getStatusConfig(event.toStatus)
              const Icon = config.icon
              const title = buildPrimaryLabel(event, t, contextWarehouseId)
              return (
                <li key={event.id} className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full shadow-sm",
                      config.bgColor,
                    )}
                  >
                    <Icon className={cn("size-4", config.color)} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium leading-snug">{title}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatEventDateTime(event.createdAt)}
                    </p>
                    {event.fromStatus != null && event.fromStatus !== event.toStatus ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatStatusLabel(event.fromStatus, t)} → {formatStatusLabel(event.toStatus, t)}
                      </p>
                    ) : event.fromStatus === event.toStatus && event.toStatus === "POSTPONED" ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("shipments.timeline.postponed")}
                      </p>
                    ) : null}
                    {event.toStatus === "ASSIGNED" && event.assignedCourierName?.trim() ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("shipments.timeline.assignedCourier", { defaultValue: "Assigned courier" })}:{" "}
                        {event.assignedCourierName.trim()}
                      </p>
                    ) : null}
                    {event.note?.trim() ? (
                      <p className="text-muted-foreground mt-1 text-xs leading-snug break-words">{event.note.trim()}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : null}
      </div>
    </div>
  )
}
