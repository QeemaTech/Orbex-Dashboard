import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, PackageCheck, Printer } from "react-lucid"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import {
  bulkReturnRejectedToMerchant,
  finalizeMerchantOrderReturns,
  getShipmentById,
  getShipmentOrders,
} from "@/api/merchant-orders-api"
import {
  getShipmentLabelRaw,
  markShipmentLabelPrinted,
  patchShipmentAssignedWarehouse,
} from "@/api/shipments-api"
import { getWarehousePickupCouriers, listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { MerchantBatchStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShipmentStatusBadge } from "@/features/customer-service/components/ShipmentStatusBadge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"
import type { DashboardPerspective } from "@/features/shipment-status/status-types"
import { ShipmentTimeline } from "@/features/shipments/components/ShipmentTimeline"
import { WarehouseShipmentOrdersTable } from "@/features/warehouse/components/WarehouseShipmentOrdersTable"
import { formatShipmentStatusEventLine } from "@/features/warehouse/backend-labels"
import type { AuthUser } from "@/lib/auth-context"
import { isMerchantUser, useAuth } from "@/lib/auth-context"
import { isWarehouseScopedMerchantOrderPath } from "@/lib/warehouse-merchant-order-routes"
import { isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { printerService } from "@/services/printer.service"
import { showToast } from "@/lib/toast"

const INVALID_ROUTE_BATCH_ID = new Set(["", "undefined"])

function resolvePerspective(user: AuthUser | null | undefined): DashboardPerspective {
  if (!user) return "operations"
  if (user.role === "ACCOUNTS") return "accounting"
  if (isWarehouseStaff(user) || isWarehouseAdmin(user)) return "warehouse"
  return "operations"
}

function sumMoney(values: Array<string | null | undefined>): number | null {
  let total = 0
  let any = false
  for (const v of values) {
    const n = Number.parseFloat(String(v ?? "").replace(/,/g, "").trim())
    if (Number.isFinite(n)) {
      total += n
      any = true
    }
  }
  return any ? total : null
}

export function MerchantOrderDetailsPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { merchantOrderId: merchantOrderParam = "", warehouseId = "" } = useParams<{
    merchantOrderId?: string
    warehouseId?: string
  }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const qc = useQueryClient()

  const merchantOrderId = (() => {
    try {
      return decodeURIComponent(merchantOrderParam).trim()
    } catch {
      return merchantOrderParam.trim()
    }
  })()

  const hasValidBatchId = !INVALID_ROUTE_BATCH_ID.has(merchantOrderId)

  const isWarehouseRoute = isWarehouseScopedMerchantOrderPath(location.pathname)
  const isCsRoute = location.pathname.startsWith("/cs/")
  const merchantContext = isMerchantUser(user)
  const statusPerspective = resolvePerspective(user)
  const hubPageContextWarehouseId =
    isWarehouseRoute && warehouseId.trim()
      ? warehouseId.trim()
      : user?.warehouseId ?? undefined

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [bulkReturnModalOpen, setBulkReturnModalOpen] = useState(false)
  const [selectedPickupCourierId, setSelectedPickupCourierId] = useState("")

  const listQueryKey = useMemo(
    () => ["merchant-order", "detail", merchantOrderId, token] as const,
    [merchantOrderId, token],
  )

  const q = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      getShipmentById({ token, shipmentId: merchantOrderId, includeEvents: true }),
    enabled: !!token && hasValidBatchId,
  })

  const ordersSummaryQuery = useQuery({
    queryKey: ["merchant-order", "shipments", merchantOrderId, token],
    queryFn: () => getShipmentOrders({ token, shipmentId: merchantOrderId }),
    enabled: !!token && hasValidBatchId,
  })

  const canPrintLabel = user?.permissions?.includes("shipments.label") ?? false
  const canBulkReturnToMerchant =
    (user?.permissions?.includes("warehouses.manage_transfer") ?? false) &&
    !merchantContext
  const canFinalizeReturnsPermission =
    (user?.permissions?.includes("merchant_orders.finalize_returns") ?? false) &&
    !merchantContext
  const [isPrinting, setIsPrinting] = useState(false)

  const bulkReturnMut = useMutation({
    mutationFn: (pickupCourierId: string) =>
      bulkReturnRejectedToMerchant({ token, merchantOrderId, pickupCourierId }),
    onSuccess: async (data) => {
      const c = data.created.length
      const s = data.skipped.length
      if (s > 0 && c > 0) {
        showToast(
          t("merchantOrders.detail.returnRejectedPartial", {
            created: c,
            skipped: s,
          }),
          "success",
        )
      } else {
        showToast(
          t("merchantOrders.detail.returnRejectedSuccess", { count: c }),
          "success",
        )
      }
      setBulkReturnModalOpen(false)
      setSelectedPickupCourierId("")
      await qc.invalidateQueries({ queryKey: listQueryKey })
      await qc.invalidateQueries({
        queryKey: ["merchant-order", "shipments", merchantOrderId, token],
      })
    },
    onError: (err: Error) => {
      showToast(
        err.message || t("merchantOrders.detail.returnRejectedError"),
        "error",
      )
    },
  })

  const finalizeReturnsMut = useMutation({
    mutationFn: () => finalizeMerchantOrderReturns({ token, merchantOrderId }),
    onSuccess: async (data) => {
      showToast(
        t("merchantOrders.detail.finalizeReturnsSuccess", {
          finalized: data.finalizedCount,
          skipped: data.skippedDeliveredCount,
        }),
        "success",
      )
      await qc.invalidateQueries({ queryKey: listQueryKey })
      await qc.invalidateQueries({
        queryKey: ["merchant-order", "shipments", merchantOrderId, token],
      })
    },
    onError: (err: Error) => {
      showToast(
        err.message || t("merchantOrders.detail.finalizeReturnsError"),
        "error",
      )
    },
  })

  const handlePrintAllLabels = useCallback(async () => {
    const shipments = ordersSummaryQuery.data?.shipments
    if (!shipments || shipments.length === 0) return
    if (isPrinting) return

    setIsPrinting(true)
    try {
      await printerService.connect()
      let printed = 0

      for (const shipment of shipments) {
        if (!shipment.trackingNumber) continue
        try {
          const label = await getShipmentLabelRaw({ token, shipmentId: shipment.id })
          if (label?.sbpl) {
            await printerService.printShipmentLabel(label)
            await markShipmentLabelPrinted({ token, shipmentId: shipment.id })
            printed++
          }
        } catch {
          console.error("Failed to print:", shipment.trackingNumber)
        }
      }

      showToast(t("shipments.detail.labelsPrinted", { count: printed }), "success")
    } catch (err) {
      showToast((err as Error).message, "error")
    } finally {
      setIsPrinting(false)
    }
  }, [t, token, ordersSummaryQuery.data, isPrinting])

  const canEditWarehouseAssignment =
    (user?.permissions?.includes("merchant_orders.update") ??
      false) ||
    (user?.permissions?.includes("warehouses.manage") ?? false)

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites", "assignment", token] as const,
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && canEditWarehouseAssignment,
  })
  const assignedWarehouseId = q.data?.assignedWarehouse?.id ?? ""
  const pickupCouriersQuery = useQuery({
    queryKey: ["warehouse-pickup-couriers", token, assignedWarehouseId] as const,
    queryFn: () =>
      getWarehousePickupCouriers({
        token,
        warehouseId: assignedWarehouseId,
      }),
    enabled: Boolean(token && assignedWarehouseId && bulkReturnModalOpen),
  })

  const setWarehouseMut = useMutation({
    mutationFn: async (warehouseId: string) => {
      const wid = warehouseId.trim()
      const targetShipmentId = ordersSummaryQuery.data?.shipments?.[0]?.id ?? merchantOrderId
      return patchShipmentAssignedWarehouse({
        token,
        shipmentId: targetShipmentId,
        assignedWarehouseId: wid ? wid : null,
      })
    },
    onSuccess: async () => {
      showToast(
        t("merchantOrders.detail.warehouseUpdated", {
          defaultValue: "Assigned warehouse updated.",
        }),
        "success",
      )
      await qc.invalidateQueries({ queryKey: listQueryKey })
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to update warehouse", "error")
    },
  })

  const currencyLocale = t("merchantOrders.detail.currencyLocale", { defaultValue: "en-EG" })
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

  const orders = ordersSummaryQuery.data?.shipments ?? []
  const canFinalizeReturns =
    orders.length > 0 &&
    orders.every(
      (line) =>
        line.status === "DELIVERED" ||
        line.status === "OUT_FOR_RETURN_TO_MERCHANT",
    )
  const primaryLineStatusEvents = orders[0]?.statusEvents ?? []
  const ordersTotalValue = sumMoney(orders.map((p) => p.shipmentValue))
  const ordersTotalShipping = sumMoney(orders.map((p) => p.shippingFee))
  const isPrepaidFull = q.data?.shippingPaymentType === "PREPAID_FULL"
  const displayOrdersTotalValue = isPrepaidFull ? 0 : ordersTotalValue
  const displayOrdersTotalShipping = isPrepaidFull ? 0 : ordersTotalShipping
  const orderCount =
    orders.length > 0 ? orders.length : (q.data?.orderCount ?? 0)
  const isMultiOrderBatch = orderCount > 1

  const backHref = isWarehouseRoute
    ? `/warehouses/${encodeURIComponent(warehouseId)}`
    : isCsRoute
      ? "/cs/merchant-orders"
      : "/merchant-orders"

  const tableMode = isWarehouseRoute ? "warehouse" : "compact"

  const currentAssignedWarehouseId = q.data?.assignedWarehouse?.id ?? ""
  const effectiveSelectedWarehouseId =
    selectedWarehouseId !== "" ? selectedWarehouseId : currentAssignedWarehouseId

  return (
    <Layout title={t("merchantOrders.detailTitle")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={backHref}>
              <ArrowLeft className="mr-2 size-4" aria-hidden />
              {t("merchantOrders.back")}
            </Link>
          </Button>
        </div>

        {!hasValidBatchId ? (
          <p className="text-destructive text-sm">
            {t("merchantOrders.invalidBatchId", {
              defaultValue: "Missing or invalid merchant order id.",
            })}
          </p>
        ) : null}
        {hasValidBatchId && q.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("merchantOrders.loading")}</p>
        ) : null}
        {hasValidBatchId && q.error ? (
          <p className="text-destructive text-sm">{(q.error as Error).message}</p>
        ) : null}

        {hasValidBatchId && q.data ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <PackageCheck
                        className="text-primary size-5 shrink-0"
                        aria-hidden
                      />
                      {t("merchantOrders.detailTitle")}
                    </CardTitle>
                    <CardDescription>
                      {t("merchantOrders.detail.batchSubtitle")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {q.data.isResolved ? (
                      <Badge variant="default">
                        {t("merchantOrders.detail.resolvedBadge")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {t("merchantOrders.detail.notResolvedHint")}
                      </Badge>
                    )}
                    {q.data.isFinished ? (
                      <Badge variant="secondary">
                        {t("merchantOrders.detail.finishedBadge")}
                      </Badge>
                    ) : null}
                    {canBulkReturnToMerchant &&
                    q.data.isResolved &&
                    !q.data.isFinished ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={bulkReturnMut.isPending}
                        onClick={() => {
                          if (!assignedWarehouseId) {
                            showToast(
                              t("merchantOrders.detail.pickupCourierWarehouseRequired", {
                                defaultValue:
                                  "Assign a warehouse first, then choose pickup courier for bulk return.",
                              }),
                              "error",
                            )
                            return
                          }
                          setBulkReturnModalOpen(true)
                        }}
                      >
                        {bulkReturnMut.isPending
                          ? t("common.saving", { defaultValue: "…" })
                          : t("merchantOrders.detail.returnRejectedShipments")}
                      </Button>
                    ) : null}
                    {canFinalizeReturnsPermission && canFinalizeReturns ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={finalizeReturnsMut.isPending}
                        onClick={() => finalizeReturnsMut.mutate()}
                      >
                        {finalizeReturnsMut.isPending
                          ? t("common.saving", { defaultValue: "…" })
                          : t("merchantOrders.detail.finalizeReturns")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isWarehouseRoute ? (
                  <>
                    <div className="grid gap-2 md:grid-cols-2">
                      <p>
                        <strong>{t("cs.table.merchant")}:</strong>{" "}
                        {q.data.merchant?.displayName || "—"}
                      </p>
                      <p>
                        <strong>{t("cs.table.brand")}:</strong>{" "}
                        {q.data.merchant?.businessName || "—"}
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <strong>{t("warehouse.table.batchPipelineStatus")}:</strong>{" "}
                        <MerchantBatchStatusWithWarehouse
                          transferStatus={q.data.transferStatus}
                          assignedWarehouseId={q.data.assignedWarehouse?.id}
                          assignedWarehouseName={
                            merchantContext ? undefined : q.data.assignedWarehouse?.name
                          }
                          contextWarehouseId={hubPageContextWarehouseId}
                        />
                      </p>
                      <p>
                        <strong>{t("warehouse.table.orderCount")}:</strong>{" "}
                        {ordersSummaryQuery.isLoading
                          ? "…"
                          : String(orders.length || (q.data.orderCount ?? 0))}
                      </p>
                      <p>
                        <strong>{t("warehouse.table.totalValue")}:</strong>{" "}
                        {displayOrdersTotalValue == null
                          ? "—"
                          : formatMoney(String(displayOrdersTotalValue))}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {t("warehouse.merchantOrderBatchOrdersHint", {
                        defaultValue:
                          "Recipient details and delivery status are shown per customer order — open the table below.",
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-2">
                      <p>
                        <strong>{t("cs.table.merchant")}:</strong>{" "}
                        {q.data.merchant?.displayName || "—"}
                      </p>
                      <p>
                        <strong>{t("cs.table.brand")}:</strong>{" "}
                        {q.data.merchant?.businessName || "—"}
                      </p>
                      <p>
                        <strong>{t("merchantOrders.detail.assignedWarehouse")}:</strong>{" "}
                        {q.data.assignedWarehouse?.name ?? "—"}
                      </p>
                      {canEditWarehouseAssignment ? (
                        <div className="md:col-span-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className="text-sm font-medium">
                              {t("merchantOrders.detail.changeAssignedWarehouse", {
                                defaultValue: "Change assigned warehouse",
                              })}
                            </label>
                            <div className="flex flex-1 flex-wrap items-center gap-2">
                              <select
                                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full max-w-[420px] rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                value={effectiveSelectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                disabled={warehousesQuery.isLoading || setWarehouseMut.isPending}
                              >
                                <option value="">
                                  {t("merchantOrders.detail.unassignedWarehouse", {
                                    defaultValue: "Unassigned",
                                  })}
                                </option>
                                {(warehousesQuery.data?.warehouses ?? []).map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.name}
                                    {w.governorate ? ` · ${w.governorate}` : ""}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  setWarehouseMut.isPending ||
                                  (effectiveSelectedWarehouseId ?? "") ===
                                  (currentAssignedWarehouseId ?? "")
                                }
                                onClick={() => setWarehouseMut.mutate(effectiveSelectedWarehouseId)}
                              >
                                {setWarehouseMut.isPending
                                  ? t("common.saving", { defaultValue: "Saving..." })
                                  : t("common.save", { defaultValue: "Save" })}
                              </Button>
                            </div>
                          </div>
                          {warehousesQuery.error ? (
                            <p className="text-destructive mt-2 text-sm">
                              {(warehousesQuery.error as Error).message}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="flex flex-wrap items-center gap-2">
                        <strong>{t("warehouse.table.batchPipelineStatus")}:</strong>{" "}
                        <MerchantBatchStatusWithWarehouse
                          transferStatus={q.data.transferStatus}
                          assignedWarehouseId={q.data.assignedWarehouse?.id}
                          assignedWarehouseName={
                            merchantContext ? undefined : q.data.assignedWarehouse?.name
                          }
                          contextWarehouseId={hubPageContextWarehouseId}
                        />
                      </p>
                      <p>
                        <strong>{t("warehouse.table.orderCount")}:</strong>{" "}
                        {ordersSummaryQuery.isLoading
                          ? "…"
                          : String(orders.length || (q.data.orderCount ?? 0))}
                      </p>
                      <p>
                        <strong>{t("warehouse.table.totalValue")}:</strong>{" "}
                        {displayOrdersTotalValue == null
                          ? "—"
                          : formatMoney(String(displayOrdersTotalValue))}
                      </p>
                      <p>
                        <strong>{t("merchantOrders.detail.shippingFee")}:</strong>{" "}
                        {ordersSummaryQuery.isLoading
                          ? "…"
                          : displayOrdersTotalShipping == null
                            ? "—"
                            : formatMoney(String(displayOrdersTotalShipping))}
                      </p>
                      {isMultiOrderBatch ? null : (
                        <>
                          <p>
                            <strong>{t("cs.table.courier")}:</strong>{" "}
                            {q.data.courier?.fullName || "—"}
                          </p>
                          <p>
                            <strong>{t("merchantOrders.detail.courierPhone")}:</strong>{" "}
                            {q.data.courier?.contactPhone || "—"}
                          </p>
                        </>
                      )}
                    </div>
                    {isMultiOrderBatch ? (
                      <p className="text-muted-foreground text-sm">
                        {t("merchantOrders.detail.multiOrderCourierStatusHint", {
                          defaultValue:
                            "Courier and delivery status are per customer order. Use the table below for each recipient.",
                        })}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-sm">
                      {t("merchantOrders.detail.batchOrdersHint")}
                    </p>
                    {isMultiOrderBatch ? null : (
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{t("cs.table.status")}:</strong>
                        <ShipmentStatusBadge
                          status={getPerspectiveStatusKey(statusPerspective, q.data)}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-wrap justify-center gap-3 border-border/60 border-t pt-4">
                  <p className="text-muted-foreground text-sm">
                    {t("merchantOrders.detail.batchOrdersHint")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card id="customer-orders">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{t("merchantOrders.detail.customerOrdersTitle")}</CardTitle>
                    <CardDescription>
                      {t("merchantOrders.detail.customerOrdersDescription")}
                    </CardDescription>
                  </div>
                  {canPrintLabel ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrintAllLabels}
                      disabled={isPrinting || !ordersSummaryQuery.data?.shipments.length}
                    >
                      <Printer className="mr-2 size-4" />
                      {isPrinting
                        ? t("common.printing", { defaultValue: "Printing..." })
                        : t("shipments.detail.printAll", { defaultValue: "Print All Labels" })}
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <WarehouseShipmentOrdersTable
                  token={token}
                  shipmentId={merchantOrderId}
                  warehouseId={isWarehouseRoute ? warehouseId : undefined}
                  mode={tableMode}
                  isPrepaidFull={isPrepaidFull}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("merchantOrders.detail.batchTimelineTitle")}</CardTitle>
                <CardDescription>{t("merchantOrders.detail.batchTimelineHint")}</CardDescription>
              </CardHeader>
              <CardContent>
                {(q.data.statusEvents ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("merchantOrders.detail.timelineEmpty")}
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {(q.data.statusEvents ?? []).map((event) => (
                      <li key={event.id} className="border-border/60 border-b pb-2 last:border-0">
                        {formatShipmentStatusEventLine(t, event)}
                        <span className="text-muted-foreground ml-2">
                          {new Date(event.createdAt).toLocaleString(i18n.language)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("merchantOrders.detail.lineTimelineTitle")}</CardTitle>
                <CardDescription>{t("merchantOrders.detail.lineTimelineSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!ordersSummaryQuery.data ? (
                  <p className="text-muted-foreground text-sm">{t("merchantOrders.loading")}</p>
                ) : primaryLineStatusEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("merchantOrders.detail.timelineEmpty")}
                  </p>
                ) : (
                  <ShipmentTimeline
                    events={primaryLineStatusEvents}
                    contextWarehouseId={hubPageContextWarehouseId}
                  />
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
      <Dialog
        open={bulkReturnModalOpen}
        onOpenChange={(open) => {
          setBulkReturnModalOpen(open)
          if (!open) setSelectedPickupCourierId("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("merchantOrders.detail.bulkReturnPickupCourierTitle", {
                defaultValue: "Choose pickup courier",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("merchantOrders.detail.bulkReturnPickupCourierDescription", {
                defaultValue:
                  "Bulk return to merchant will create tasks and RETURN manifest(s) using this pickup courier.",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("merchantOrders.detail.pickupCourier", { defaultValue: "Pickup courier" })}
            </label>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={selectedPickupCourierId}
              onChange={(e) => setSelectedPickupCourierId(e.target.value)}
              disabled={pickupCouriersQuery.isLoading || bulkReturnMut.isPending}
            >
              <option value="">
                {t("merchantOrders.detail.selectPickupCourier", {
                  defaultValue: "Select pickup courier",
                })}
              </option>
              {(pickupCouriersQuery.data?.couriers ?? []).map((courier) => (
                <option key={courier.id} value={courier.id}>
                  {courier.fullName?.trim() || "—"}
                </option>
              ))}
            </select>
            {pickupCouriersQuery.error ? (
              <p className="text-destructive text-sm">
                {(pickupCouriersQuery.error as Error).message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkReturnModalOpen(false)}
              disabled={bulkReturnMut.isPending}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="button"
              disabled={
                bulkReturnMut.isPending ||
                !selectedPickupCourierId ||
                pickupCouriersQuery.isLoading
              }
              onClick={() => bulkReturnMut.mutate(selectedPickupCourierId)}
            >
              {bulkReturnMut.isPending
                ? t("common.saving", { defaultValue: "…" })
                : t("merchantOrders.detail.returnRejectedShipments")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  )
}

