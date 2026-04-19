import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ShipmentOrderRow } from "@/api/merchant-orders-api"
import {
  createShipmentPlannedTask,
  type ShipmentPlannedTaskType,
} from "@/api/shipments-api"
import { getWarehouseCouriers, listWarehouseSites } from "@/api/warehouse-api"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

type PlanShipmentWarehouseTaskProps = {
  shipment: ShipmentOrderRow
  /** Hub from route (`/warehouses/:warehouseId/shipments/...`) or parent page; used when API omits `currentWarehouseId`. */
  contextWarehouseId?: string | null
}

function taskErrorMessage(err: unknown, t: (k: string, o?: Record<string, string>) => string): string {
  if (err instanceof ApiError && err.code) {
    const k = `shipments.planTask.errors.${err.code}`
    const translated = t(k)
    if (translated !== k) return translated
  }
  if (err instanceof Error) return err.message
  return t("shipments.planTask.errors.generic")
}

export function PlanShipmentWarehouseTask({
  shipment,
  contextWarehouseId,
}: PlanShipmentWarehouseTaskProps) {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""

  const canPlan = Boolean(user?.permissions?.includes("warehouses.manage_transfer"))

  const [taskType, setTaskType] = useState<ShipmentPlannedTaskType>("DELIVERY")
  const [courierId, setCourierId] = useState("")
  const [toWarehouseId, setToWarehouseId] = useState("")

  /** Line / batch hub, else warehouse from URL, else logged-in operator hub (same as scan-in context). */
  const hubIdForPlan =
    shipment.currentWarehouseId ??
    shipment.currentWarehouse?.id ??
    shipment.assignedWarehouseId ??
    (contextWarehouseId?.trim() || null) ??
    (user?.warehouseId?.trim() || null) ??
    null
  const batchInWarehouse =
    shipment.transferStatus === "IN_WAREHOUSE" ||
    (shipment.transferStatus == null &&
      (shipment.status === "IN_WAREHOUSE" ||
        shipment.status === "POSTPONED" ||
        shipment.status === "REJECTED"))

  /** Backend: DELIVERY/TRANSFER need line IN_WAREHOUSE; RETURN needs POSTPONED or REJECTED. */
  const lineMatchesSelectedTask = (() => {
    if (taskType === "RETURN_TO_MERCHANT") {
      return shipment.status === "POSTPONED" || shipment.status === "REJECTED"
    }
    return shipment.status === "IN_WAREHOUSE"
  })()
  // TODO: re-enable CS confirmation gate for delivery planning when product requires it again.
  // const csConfirmed = Boolean(shipment.csConfirmedAt)

  const couriersQuery = useQuery({
    queryKey: ["warehouse-couriers-plan-task", token, shipment.regionId ?? ""],
    queryFn: () =>
      getWarehouseCouriers({
        token,
        regionId: shipment.regionId ?? undefined,
      }),
    enabled: !!token && canPlan,
  })

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites-plan-task", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && canPlan,
  })

  useEffect(() => {
    if (shipment.deliveryCourierId) {
      setCourierId((c) => c || shipment.deliveryCourierId!)
    }
  }, [shipment.deliveryCourierId])

  const planMutation = useMutation({
    mutationFn: async () => {
      if (taskType === "DELIVERY") {
        return createShipmentPlannedTask({
          token,
          shipmentId: shipment.id,
          body: {
            type: "DELIVERY",
            assignedCourierId: courierId,
          },
        })
      }
      if (taskType === "TRANSFER") {
        return createShipmentPlannedTask({
          token,
          shipmentId: shipment.id,
          body: {
            type: "TRANSFER",
            toWarehouseId,
            assignedCourierId: courierId.trim(),
          },
        })
      }
      return createShipmentPlannedTask({
        token,
        shipmentId: shipment.id,
        body: {
          type: "RETURN_TO_MERCHANT",
          assignedCourierId: courierId.trim() ? courierId : null,
        },
      })
    },
    onSuccess: (data) => {
      showToast(
        t("shipments.planTask.success", {
          type: data.type,
          defaultValue: "Planned warehouse task created.",
        }),
        "success",
      )
      void queryClient.invalidateQueries({
        queryKey: ["shipment", "detail", shipment.id, token],
      })
      void queryClient.invalidateQueries({ queryKey: ["shipment", "detail"] })
    },
    onError: (err) => {
      showToast(taskErrorMessage(err, t), "error")
    },
  })

  const eligibilityHint = useMemo(() => {
    if (!batchInWarehouse) return t("shipments.planTask.hintBatchNotInWarehouse")
    if (taskType === "RETURN_TO_MERCHANT") {
      if (shipment.status !== "POSTPONED" && shipment.status !== "REJECTED") {
        return t("shipments.planTask.hintReturnWrongStatus")
      }
      return null
    }
    if (shipment.status !== "IN_WAREHOUSE") {
      return t("shipments.planTask.hintLineNotInWarehouse")
    }
    return null
  }, [batchInWarehouse, taskType, shipment.status, t])

  const canSubmit = (() => {
    if (!batchInWarehouse || !lineMatchesSelectedTask || planMutation.isPending) {
      return false
    }
    if (taskType === "TRANSFER") {
      if (!hubIdForPlan) return false
      return (
        !!toWarehouseId.trim() &&
        toWarehouseId !== hubIdForPlan &&
        !!courierId.trim()
      )
    }
    if (taskType === "DELIVERY") {
      // return csConfirmed && !!courierId.trim()
      return !!courierId.trim()
    }
    return true
  })()

  if (!canPlan) {
    return null
  }

  const couriers = couriersQuery.data?.couriers ?? []
  const sites = sitesQuery.data?.warehouses ?? []
  const currentWarehouseName =
    sites.find((w) => w.id === hubIdForPlan)?.name ?? hubIdForPlan ?? null

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="text-primary size-5 shrink-0" aria-hidden />
          {t("shipments.planTask.title")}
        </CardTitle>
        <CardDescription>{t("shipments.planTask.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {eligibilityHint ? (
          <p className="text-muted-foreground text-sm" role="status">
            {eligibilityHint}
          </p>
        ) : null}

        <div className="grid gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            {t("shipments.planTask.fieldPlanningWarehouse")}
          </span>
          <div className="text-sm font-medium">
            {currentWarehouseName ?? "—"}
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-muted-foreground text-xs font-medium" htmlFor="plan-task-type">
            {t("shipments.planTask.fieldType")}
          </label>
          <select
            id="plan-task-type"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full max-w-md rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
            value={taskType}
            disabled={planMutation.isPending}
            onChange={(e) => setTaskType(e.target.value as ShipmentPlannedTaskType)}
          >
            <option value="DELIVERY">{t("shipments.planTask.typeDelivery")}</option>
            <option value="TRANSFER">{t("shipments.planTask.typeTransfer")}</option>
            <option value="RETURN_TO_MERCHANT">{t("shipments.planTask.typeReturn")}</option>
          </select>
        </div>

        {taskType === "TRANSFER" ? (
          <div className="grid gap-2">
            <label className="text-muted-foreground text-xs font-medium" htmlFor="plan-task-warehouse">
              {t("shipments.planTask.fieldDestinationWarehouse")}
            </label>
            <select
              id="plan-task-warehouse"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full max-w-md rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
              value={toWarehouseId}
              disabled={planMutation.isPending || sitesQuery.isLoading}
              onChange={(e) => setToWarehouseId(e.target.value)}
            >
              <option value="">{t("shipments.planTask.pickWarehouse")}</option>
              {sites.map((w) => (
                <option key={w.id} value={w.id}>
                  {[w.name, w.governorate].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
            {sitesQuery.error ? (
              <p className="text-destructive text-xs">{(sitesQuery.error as Error).message}</p>
            ) : null}
          </div>
        ) : null}

        {taskType === "DELIVERY" ||
        taskType === "TRANSFER" ||
        taskType === "RETURN_TO_MERCHANT" ? (
          <div className="grid gap-2">
            <label className="text-muted-foreground text-xs font-medium" htmlFor="plan-task-courier">
              {taskType === "DELIVERY"
                ? t("shipments.planTask.fieldCourierRequired")
                : taskType === "TRANSFER"
                  ? t("shipments.planTask.fieldCourierTransfer")
                  : t("shipments.planTask.fieldCourierOptional")}
            </label>
            <select
              id="plan-task-courier"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full max-w-md rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
              value={courierId}
              disabled={planMutation.isPending || couriersQuery.isLoading}
              onChange={(e) => setCourierId(e.target.value)}
            >
              <option value="">{t("shipments.planTask.pickCourier")}</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.fullName?.trim(), c.contactPhone].filter(Boolean).join(" · ") || c.id}
                </option>
              ))}
            </select>
            {couriersQuery.error ? (
              <p className="text-destructive text-xs">{(couriersQuery.error as Error).message}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => planMutation.mutate()}
          >
            {planMutation.isPending ? t("common.processing") : t("shipments.planTask.submit")}
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">{t("shipments.planTask.footerHint")}</p>
      </CardContent>
    </Card>
  )
}
