import { useTranslation } from "react-i18next"
import { AlertTriangle, Check, Package, CircleDot, X } from "lucide-react"
import type { ComponentType } from "react"

import DeliveryIcon from "@/components/icons/DeliveryIcon"
import { cn } from "@/lib/utils"

export type TimelineStepVisual = "pending" | "active" | "complete" | "failed"

export type ShipmentTrackingTimelineProps = {
  status: string
  postponedAt: string | null
  /** Optional hub name shown next to the active “warehouse” step (public tracking has no id for “this warehouse”). */
  currentWarehouseName?: string | null
}

type TimelineIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

const WAREHOUSE_STATUSES = new Set([
  "PENDING_PICKUP",
  "PICKED_UP",
  "IN_WAREHOUSE",
  "RETURNED_TO_WAREHOUSE",
])

function deriveTimeline(
  statusRaw: string,
  postponedAt: string | null,
): {
  warehouse: TimelineStepVisual
  outForDelivery: TimelineStepVisual
  delivered: TimelineStepVisual
  showPostponed: boolean
} {
  const s = statusRaw.trim().toUpperCase()
  const showPostponed =
    s === "POSTPONED" ||
    (Boolean(postponedAt?.trim()) && s !== "DELIVERED")

  if (s === "DELIVERED") {
    return {
      warehouse: "complete",
      outForDelivery: "complete",
      delivered: "complete",
      showPostponed,
    }
  }

  if (s === "REJECTED" || s === "RETURNED_TO_MERCHANT") {
    return {
      warehouse: "complete",
      outForDelivery: "complete",
      delivered: "failed",
      showPostponed,
    }
  }

  if (s === "OUT_FOR_DELIVERY" || s === "ASSIGNED" || s === "POSTPONED") {
    return {
      warehouse: "complete",
      outForDelivery: "active",
      delivered: "pending",
      showPostponed,
    }
  }

  if (WAREHOUSE_STATUSES.has(s)) {
    return {
      warehouse: "active",
      outForDelivery: "pending",
      delivered: "pending",
      showPostponed,
    }
  }

  return {
    warehouse: "active",
    outForDelivery: "pending",
    delivered: "pending",
    showPostponed,
  }
}

function StepIcon({
  visual,
  icon: Icon,
}: {
  visual: TimelineStepVisual
  icon: TimelineIcon
}) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-colors",
        visual === "complete" && "border-primary bg-primary text-primary-foreground",
        visual === "active" && "border-primary bg-background text-primary ring-2 ring-primary/25",
        visual === "pending" && "border-muted-foreground/30 bg-muted text-muted-foreground",
        visual === "failed" && "border-destructive bg-destructive/10 text-destructive",
      )}
    >
      {visual === "complete" ? (
        <Check className="size-5" strokeWidth={2.5} aria-hidden />
      ) : visual === "failed" ? (
        <X className="size-5" strokeWidth={2.5} aria-hidden />
      ) : (
        <Icon className="size-5" aria-hidden />
      )}
    </div>
  )
}

function TimelineStep({
  visual,
  title,
  description,
  icon,
  isLast,
}: {
  visual: TimelineStepVisual
  title: string
  description?: string
  icon: TimelineIcon
  isLast: boolean
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <StepIcon visual={visual} icon={icon} />
        {!isLast ? (
          <div
            className={cn(
              "my-1 w-0.5 flex-1 min-h-[2rem] sm:min-h-[2.5rem]",
              visual === "complete" ? "bg-primary" : "bg-border",
            )}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pb-6 pt-1 sm:pb-8">
        <p
          className={cn(
            "text-sm font-semibold sm:text-base",
            visual === "pending" && "text-muted-foreground",
            visual === "active" && "text-foreground",
            visual === "complete" && "text-foreground",
            visual === "failed" && "text-destructive",
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

export function ShipmentTrackingTimeline({
  status,
  postponedAt,
  currentWarehouseName,
}: ShipmentTrackingTimelineProps) {
  const { t } = useTranslation()
  const { warehouse, outForDelivery, delivered, showPostponed } = deriveTimeline(status, postponedAt)

  const warehouseStepTitle =
    warehouse === "active" && currentWarehouseName?.trim()
      ? `${t("tracking.stepWarehouse")} ${t("warehouse.context.atNamedWarehouse", {
          name: currentWarehouseName.trim(),
        })}`
      : t("tracking.stepWarehouse")

  return (
    <div className="space-y-4">
      {showPostponed ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-sm leading-snug">{t("tracking.postponedNotice")}</p>
        </div>
      ) : null}

      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-foreground mb-4 text-sm font-semibold sm:text-base">
          {t("tracking.timelineHeading")}
        </h2>
        <div>
          <TimelineStep
            visual={warehouse}
            title={warehouseStepTitle}
            description={t("tracking.stepWarehouseHint")}
            icon={Package}
            isLast={false}
          />
          <TimelineStep
            visual={outForDelivery}
            title={t("tracking.stepOutForDelivery")}
            description={t("tracking.stepOutHint")}
            icon={DeliveryIcon}
            isLast={false}
          />
          <TimelineStep
            visual={delivered}
            title={t("tracking.stepDelivered")}
            description={
              delivered === "failed"
                ? t("tracking.stepDeliveredFailedHint")
                : t("tracking.stepDeliveredHint")
            }
            icon={CircleDot}
            isLast
          />
        </div>
      </div>
    </div>
  )
}
