import type { MouseEvent } from "react"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { getShipmentById, getShipmentOrders } from "@/api/merchant-orders-api"
import { assignWarehouseShipment, getWarehouseCouriers } from "@/api/warehouse-api"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { showToast } from "@/lib/toast"
import type { ShipmentOrderRow } from "@/api/merchant-orders-api"
import { useAuth } from "@/lib/auth-context"
import { warehouseShipmentLineDetailPath } from "@/lib/warehouse-merchant-order-routes"

function isOtherHubInWarehouse(
  p: ShipmentOrderRow,
  userWarehouseId: string | null | undefined,
): boolean {
  if (p.status !== "IN_WAREHOUSE") return false
  if (p.currentWarehouseId == null || userWarehouseId == null) return false
  return p.currentWarehouseId !== userWarehouseId
}

const WAREHOUSE_COL_COUNT = 10
const COMPACT_COL_COUNT = 6

type Props = {
  token: string
  shipmentId: string
  /** When set (warehouse merchant-order page), line detail opens with hub in URL for plan task context. */
  warehouseId?: string
  /** Warehouse hub: full columns including assignment. Other routes: read-only compact list. */
  mode?: "warehouse" | "compact"
}

/**
 * Customer shipments under a merchant order (batch). Row click opens line detail.
 * Warehouse mode: assignment controls; clicks on the assign cell do not navigate.
 */
export function WarehouseShipmentOrdersTable({
  token,
  shipmentId,
  warehouseId: warehouseIdProp,
  mode = "warehouse",
}: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const ordersBase = location.pathname.startsWith("/cs/") ? "/cs/shipments" : "/shipments"
  const queryClient = useQueryClient()
  const [assignOrderId, setAssignOrderId] = useState("")
  const [assignCourierInput, setAssignCourierInput] = useState("")
  const [assignLeg, setAssignLeg] = useState<"delivery" | "pickup">("delivery")

  const shipmentDetailQuery = useQuery({
    queryKey: ["shipment-detail-for-orders", shipmentId, token],
    queryFn: () => getShipmentById({ token, shipmentId }),
    enabled: !!token && !!shipmentId && mode === "warehouse",
  })

  const regionKey = shipmentDetailQuery.data?.regionId ?? "none"

  const couriersQuery = useQuery({
    queryKey: ["warehouse-couriers-orders", token, regionKey],
    queryFn: () =>
      getWarehouseCouriers({
        token,
        regionId: regionKey === "none" ? undefined : regionKey,
      }),
    enabled: !!token && mode === "warehouse",
  })

  const ordersQuery = useQuery({
    queryKey: ["orders", "list", shipmentId, token],
    queryFn: () => getShipmentOrders({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
  })

  const assignMutation = useMutation({
    mutationFn: (payload: {
      shipmentId: string
      shipmentLineId?: string
      courierId: string
      leg?: "pickup" | "delivery"
    }) =>
      assignWarehouseShipment({
        token,
        shipmentId: payload.shipmentId,
        courierId: payload.courierId,
        leg: payload.leg,
        ...(payload.shipmentLineId
          ? { shipmentLineId: payload.shipmentLineId }
          : {}),
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.assignmentSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["orders", "list", shipmentId, token],
        }),
        queryClient.invalidateQueries({
          queryKey: ["warehouse-queue", token],
        }),
        queryClient.invalidateQueries({
          queryKey: ["shipment-detail", shipmentId, token],
        }),
      ])
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const currencyLocale = t("shipments.detail.currencyLocale", { defaultValue: "en-EG" })
  const formatMoney = (raw: string | null | undefined): string => {
    const n = Number.parseFloat(String(raw ?? "").replace(/,/g, "").trim())
    if (!Number.isFinite(n)) return "—"
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n)
  }

  if (!shipmentId) return null

  const goToOrder = (orderId: string) => {
    if (
      mode === "warehouse" &&
      warehouseIdProp?.trim() &&
      !location.pathname.startsWith("/cs/")
    ) {
      void navigate(
        warehouseShipmentLineDetailPath(warehouseIdProp.trim(), orderId),
      )
      return
    }
    void navigate(`${ordersBase}/${encodeURIComponent(orderId)}`)
  }

  const stopAssignClick = (e: MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation()
  }

  return (
    <div className="space-y-3">
      {ordersQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("shipments.loading")}</p>
      ) : null}
      {ordersQuery.error ? (
        <p className="text-destructive text-sm">{(ordersQuery.error as Error).message}</p>
      ) : null}
      {ordersQuery.data ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("warehouse.table.trackingNumber", { defaultValue: "Tracking" })}
                </TableHead>
                <TableHead>{t("cs.table.customer", { defaultValue: "Customer" })}</TableHead>
                <TableHead>{t("cs.table.phone", { defaultValue: "Phone" })}</TableHead>
                {mode === "warehouse" ? (
                  <>
                    <TableHead>{t("cs.table.address", { defaultValue: "Address" })}</TableHead>
                    <TableHead>{t("cs.table.product", { defaultValue: "Product" })}</TableHead>
                  </>
                ) : null}
                <TableHead>{t("shipments.columns.deliveryStatus")}</TableHead>
                <TableHead>{t("shipments.columns.paymentStatus")}</TableHead>
                <TableHead>{t("cs.table.value", { defaultValue: "Value" })}</TableHead>
                {mode === "warehouse" ? (
                  <>
                    <TableHead>{t("warehouse.table.courier", { defaultValue: "Courier" })}</TableHead>
                    <TableHead>{t("warehouse.orders.assignColumn", { defaultValue: "Assign" })}</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.data.shipments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={mode === "warehouse" ? WAREHOUSE_COL_COUNT : COMPACT_COL_COUNT}
                    className="text-muted-foreground text-center text-sm"
                  >
                    {t("shipments.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ordersQuery.data.shipments.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => goToOrder(p.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {p.trackingNumber || "—"}
                    </TableCell>
                    <TableCell>{p.customer.customerName}</TableCell>
                    <TableCell>{p.customer.phonePrimary}</TableCell>
                    {mode === "warehouse" ? (
                      <>
                        <TableCell className="max-w-[10rem] text-xs whitespace-normal">
                          {p.customer.addressText || "—"}
                        </TableCell>
                        <TableCell className="text-xs">{p.productType || "—"}</TableCell>
                      </>
                    ) : null}
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        <BackendStatusBadge kind="orderDelivery" value={p.status} />
                        {isOtherHubInWarehouse(p, user?.warehouseId) ? (
                          <>
                            <span className="text-muted-foreground text-[10px] leading-tight">
                              {t("warehouse.shipment.otherLocationLabel", {
                                defaultValue: "In Warehouse (Other Location)",
                              })}
                            </span>
                            <span className="text-foreground text-[11px] font-medium leading-tight">
                              {p.currentWarehouse?.name ?? "—"}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <BackendStatusBadge kind="orderPayment" value={p.paymentStatus} />
                    </TableCell>
                    <TableCell>{formatMoney(p.shipmentValue)}</TableCell>
                    {mode === "warehouse" ? (
                      <>
                        <TableCell className="text-xs">
                          {p.deliveryCourier?.fullName ?? "—"}
                        </TableCell>
                        <TableCell onClick={stopAssignClick}>
                          <div className="flex min-w-[12rem] flex-col gap-1">
                            <select
                              className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                              value=""
                              onChange={(e) => {
                                const v = e.target.value
                                if (!v) return
                                setAssignOrderId(p.id)
                                setAssignCourierInput(v)
                              }}
                            >
                              <option value="">{t("warehouse.queue.pickCourier")}</option>
                              {(couriersQuery.data?.couriers ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {(c.servesShipmentRegion ? "★ " : "") +
                                    (c.fullName ?? c.id.slice(0, 8))}
                                </option>
                              ))}
                            </select>
                            <Input
                              className="h-8 text-xs"
                              placeholder={t("warehouse.queue.courierIdPlaceholder")}
                              value={assignOrderId === p.id ? assignCourierInput : ""}
                              onChange={(e) => {
                                setAssignOrderId(p.id)
                                setAssignCourierInput(e.target.value)
                              }}
                            />
                            <select
                              className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                              value={assignOrderId === p.id ? assignLeg : "delivery"}
                              title={t("warehouse.queue.assignLegHint")}
                              onChange={(e) => {
                                setAssignOrderId(p.id)
                                setAssignLeg(e.target.value as "delivery" | "pickup")
                              }}
                            >
                              <option value="delivery">
                                {t("warehouse.queue.assignLegDelivery")}
                              </option>
                              <option value="pickup">
                                {t("warehouse.queue.assignLegPickup")}
                              </option>
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={
                                assignMutation.isPending ||
                                assignOrderId !== p.id ||
                                !assignCourierInput.trim()
                              }
                              onClick={() =>
                                assignMutation.mutate({
                                  shipmentId,
                                  courierId: assignCourierInput.trim(),
                                  leg: assignLeg,
                                  ...(assignLeg === "delivery"
                                    ? { shipmentLineId: p.id }
                                    : {}),
                                })
                              }
                            >
                              {t("warehouse.queue.assign")}
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
