import { useTranslation } from "react-i18next"
import { Package, RotateCcw, Clock, CheckCircle, XCircle, Circle } from "lucide-react"
import type { ComponentType } from "react"

import DeliveryIcon from "@/components/icons/DeliveryIcon"
import { cn } from "@/lib/utils"

type ShipmentTask = {
  id: string
  type: string
  status: string
  fromWarehouseId: string | null
  toWarehouseId: string | null
  assignedCourierId: string | null
  assignedCourier: {
    id: string
    fullName: string | null
    contactPhone: string | null
  } | null
  createdAt: string
}

type ShipmentTasksCardProps = {
  tasks: ShipmentTask[]
}

type TaskIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

const TASK_TYPE_CONFIG: Record<string, { icon: TaskIcon; labelKey: string; color: string }> = {
  DELIVERY: { icon: DeliveryIcon, labelKey: "shipments.tasks.typeDelivery", color: "text-blue-600" },
  TRANSFER: { icon: RotateCcw, labelKey: "shipments.tasks.typeTransfer", color: "text-purple-600" },
  RETURN_TO_MERCHANT: { icon: RotateCcw, labelKey: "shipments.tasks.typeReturn", color: "text-amber-600" },
}

const TASK_STATUS_CONFIG: Record<string, { icon: typeof Circle; labelKey: string; color: string; bgColor: string }> = {
  PLANNED: { icon: Circle, labelKey: "shipments.tasks.statusPlanned", color: "text-muted-foreground", bgColor: "bg-muted" },
  IN_PROGRESS: { icon: Clock, labelKey: "shipments.tasks.statusInProgress", color: "text-amber-600", bgColor: "bg-amber-100" },
  DONE: { icon: CheckCircle, labelKey: "shipments.tasks.statusDone", color: "text-green-600", bgColor: "bg-green-100" },
  CANCELLED: { icon: XCircle, labelKey: "shipments.tasks.statusCancelled", color: "text-red-600", bgColor: "bg-red-100" },
}

function formatTaskTypeLabel(type: string, t: (key: string) => string): string {
  const config = TASK_TYPE_CONFIG[type]
  if (config) {
    return t(config.labelKey)
  }
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTaskStatusLabel(status: string, t: (key: string) => string): string {
  const config = TASK_STATUS_CONFIG[status]
  if (config) {
    return t(config.labelKey)
  }
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTimestamp(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

function getTaskTypeIcon(type: string): TaskIcon {
  return TASK_TYPE_CONFIG[type]?.icon ?? Package
}

function getTaskStatusConfig(status: string) {
  return TASK_STATUS_CONFIG[status] ?? TASK_STATUS_CONFIG["PLANNED"]
}

export function ShipmentTasksCard({ tasks }: ShipmentTasksCardProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 p-6 text-center">
        <p className="text-muted-foreground text-sm">
          {t("shipments.tasks.noTasks", { defaultValue: "No warehouse tasks assigned" })}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const TypeIcon = getTaskTypeIcon(task.type)
        const statusConfig = getTaskStatusConfig(task.status)
        const StatusIcon = statusConfig.icon
        const typeColor = TASK_TYPE_CONFIG[task.type]?.color ?? "text-foreground"
        const statusBgColor = statusConfig.bgColor

        return (
          <div
            key={task.id}
            className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background">
              <TypeIcon className={cn("size-5", typeColor)} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <p className={cn("text-sm font-medium", typeColor)}>
                  {formatTaskTypeLabel(task.type, t)}
                </p>
                <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusBgColor, statusConfig.color)}>
                  <StatusIcon className="size-3" aria-hidden />
                  {formatTaskStatusLabel(task.status, t)}
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                {formatTimestamp(task.createdAt, locale)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("shipments.tasks.assignedCourier", { defaultValue: "Assigned courier" })}:{" "}
                {task.assignedCourier?.fullName?.trim() || "—"}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}