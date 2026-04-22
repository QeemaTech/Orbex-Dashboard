import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ShipmentOrderRow } from "@/api/merchant-orders-api"
import {
  createShipmentPlannedTask,
  type ShipmentPlannedTaskType,
} from "@/api/shipments-api"
import { getWarehouseCouriers, listWarehouseSites } from "@/api/warehouse-api"
import { Button } from "@/components/ui/button"
import { showToast } from "@/lib/toast"

type AssignShipmentTaskModalProps = {
  open: boolean
  token: string
  shipment: ShipmentOrderRow | null
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
}

export function AssignShipmentTaskModal({
  open,
  token,
  shipment,
  onOpenChange,
  onAssigned,
}: AssignShipmentTaskModalProps) {
  const { t } = useTranslation()
  const [taskType, setTaskType] = useState<ShipmentPlannedTaskType>("DELIVERY")
  const [courierId, setCourierId] = useState("")
  const [toWarehouseId, setToWarehouseId] = useState("")

  useEffect(() => {
    if (!open || !shipment) return
    setTaskType("DELIVERY")
    setCourierId(shipment.deliveryCourierId ?? "")
    setToWarehouseId("")
  }, [open, shipment])

  const couriersQuery = useQuery({
    queryKey: ["warehouse-couriers-assign-task", token, shipment?.regionId ?? ""],
    queryFn: () =>
      getWarehouseCouriers({
        token,
        regionId: shipment?.regionId ?? undefined,
      }),
    enabled: open && !!token && !!shipment,
  })

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites-assign-task", token],
    queryFn: () => listWarehouseSites(token),
    enabled: open && !!token && !!shipment,
  })

  const planningWarehouseId =
    shipment?.currentWarehouseId ??
    shipment?.currentWarehouse?.id ??
    shipment?.assignedWarehouseId ??
    null

  const canSubmit = useMemo(() => {
    if (!shipment) return false
    if (taskType === "DELIVERY") return !!courierId.trim()
    if (taskType === "TRANSFER") {
      return (
        !!toWarehouseId.trim() &&
        toWarehouseId !== planningWarehouseId &&
        !!courierId.trim()
      )
    }
    return true
  }, [shipment, taskType, courierId, toWarehouseId, planningWarehouseId])

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!shipment) throw new Error(t("shipments.planTask.errors.generic"))
      if (taskType === "DELIVERY") {
        return createShipmentPlannedTask({
          token,
          shipmentId: shipment.id,
          body: {
            type: "DELIVERY",
            assignedCourierId: courierId.trim(),
          },
        })
      }
      if (taskType === "TRANSFER") {
        return createShipmentPlannedTask({
          token,
          shipmentId: shipment.id,
          body: {
            type: "TRANSFER",
            assignedCourierId: courierId.trim(),
            toWarehouseId: toWarehouseId.trim(),
          },
        })
      }
      return createShipmentPlannedTask({
        token,
        shipmentId: shipment.id,
        body: {
          type: "RETURN_TO_MERCHANT",
          assignedCourierId: courierId.trim() ? courierId.trim() : null,
        },
      })
    },
    onSuccess: () => {
      showToast(t("shipments.planTask.success"), "success")
      onAssigned()
      onOpenChange(false)
    },
    onError: (err) => {
      showToast((err as Error).message, "error")
    },
  })

  if (!open || !shipment) return null

  const couriers = couriersQuery.data?.couriers ?? []
  const sites = sitesQuery.data?.warehouses ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("shipments.planTask.title", {
        defaultValue: "Assign a task",
      })}
    >
      <div className="bg-card flex w-full max-w-lg flex-col rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {t("shipments.planTask.title", { defaultValue: "Assign a task" })}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("shipments.planTask.close", { defaultValue: "Close" })}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-muted-foreground text-sm">
            {shipment.trackingNumber || shipment.id}
          </p>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="assign-task-type">
              {t("shipments.planTask.fieldType")}
            </label>
            <select
              id="assign-task-type"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as ShipmentPlannedTaskType)}
              disabled={createTaskMutation.isPending}
            >
              <option value="DELIVERY">{t("shipments.planTask.typeDelivery")}</option>
              <option value="TRANSFER">{t("shipments.planTask.typeTransfer")}</option>
              <option value="RETURN_TO_MERCHANT">{t("shipments.planTask.typeReturn")}</option>
            </select>
          </div>

          {taskType === "TRANSFER" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="assign-task-warehouse">
                {t("shipments.planTask.fieldDestinationWarehouse")}
              </label>
              <select
                id="assign-task-warehouse"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                disabled={createTaskMutation.isPending || sitesQuery.isLoading}
              >
                <option value="">{t("shipments.planTask.pickWarehouse")}</option>
                {sites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {[w.name, w.governorate].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="assign-task-courier">
              {taskType === "RETURN_TO_MERCHANT"
                ? t("shipments.planTask.fieldCourierOptional")
                : t("shipments.planTask.fieldCourierRequired")}
            </label>
            <select
              id="assign-task-courier"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
              disabled={createTaskMutation.isPending || couriersQuery.isLoading}
            >
              <option value="">{t("shipments.planTask.pickCourier")}</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.fullName?.trim(), c.contactPhone].filter(Boolean).join(" · ") || c.id}
                </option>
              ))}
            </select>
          </div>

          {createTaskMutation.isError ? (
            <p className="text-destructive text-xs">
              {(createTaskMutation.error as Error).message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            type="button"
            onClick={() => createTaskMutation.mutate()}
            disabled={!canSubmit || createTaskMutation.isPending}
          >
            {createTaskMutation.isPending
              ? t("common.processing")
              : t("shipments.planTask.submit")}
          </Button>
        </div>
      </div>
    </div>
  )
}
