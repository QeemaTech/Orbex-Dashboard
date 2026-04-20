import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, PackageCheck, Printer } from "react-lucid"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import {
  getShipmentById,
  getShipmentOrders,
  type CsShipmentRow,
} from "@/api/merchant-orders-api"
import { getShipmentLabelRaw, markShipmentLabelPrinted } from "@/api/shipments-api"
import { Layout } from "@/components/layout/Layout"
import { MerchantBatchStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CsAddLocationDialog } from "@/features/customer-service/components/CsAddLocationDialog"
import { CsCourierMapDialog } from "@/features/customer-service/components/CsCourierMapDialog"
import { CsShipmentRowActions } from "@/features/customer-service/components/CsShipmentRowActions"
import { ShipmentStatusBadge } from "@/features/customer-service/components/ShipmentStatusBadge"
import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"
import type { DashboardPerspective } from "@/features/shipment-status/status-types"
import { ShipmentTimeline } from "@/features/shipments/components/ShipmentTimeline"
import { WarehouseShipmentOrdersTable } from "@/features/warehouse/components/WarehouseShipmentOrdersTable"
import { formatShipmentStatusEventLine } from "@/features/warehouse/backend-labels"
import type { AuthUser } from "@/lib/auth-context"
import { useAuth } from "@/lib/auth-context"
import { isWarehouseScopedMerchantOrderPath } from "@/lib/warehouse-merchant-order-routes"
import { isWarehouseSiteAdmin, isWarehouseSiteStaff } from "@/lib/warehouse-access"
import { printerService } from "@/services/printer.service"
import { showToast } from "@/lib/toast"

const INVALID_ROUTE_BATCH_ID = new Set(["", "undefined"])

function resolvePerspective(user: AuthUser | null | undefined): DashboardPerspective {
  if (!user) return "operations"
  if (user.role === "ACCOUNTS") return "accounting"
  if (isWarehouseSiteStaff(user) || isWarehouseSiteAdmin(user)) return "warehouse"
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
  const statusPerspective = resolvePerspective(user)
  const hubPageContextWarehouseId =
    isWarehouseRoute && warehouseId.trim()
      ? warehouseId.trim()
      : user?.warehouseId ?? undefined

  const [mapOpen, setMapOpen] = useState(false)
  const [mapCourierId, setMapCourierId] = useState<string | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationRow, setLocationRow] = useState<CsShipmentRow | null>(null)

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

  const openMap = useCallback((courierId: string) => {
    setMapCourierId(courierId)
    setMapOpen(true)
  }, [])

  const canPrintLabel = user?.permissions?.includes("shipments.label") ?? false
  const [isPrinting, setIsPrinting] = useState(false)

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
  }, [token, ordersSummaryQuery.data, isPrinting])

  const openAddLocation = useCallback((row: CsShipmentRow) => {
    setLocationRow(row)
    setLocationOpen(true)
  }, [])

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
  const primaryLineStatusEvents = orders[0]?.statusEvents ?? []
  const ordersTotalValue = sumMoney(orders.map((p) => p.shipmentValue))
  const ordersTotalShipping = sumMoney(orders.map((p) => p.shippingFee))
  const orderCount =
    orders.length > 0 ? orders.length : (q.data?.orderCount ?? 0)
  const isMultiOrderBatch = orderCount > 1

  const backHref = isWarehouseRoute
    ? `/warehouses/${encodeURIComponent(warehouseId)}`
    : isCsRoute
      ? "/cs/merchant-orders"
      : "/merchant-orders"

  const tableMode = isWarehouseRoute ? "warehouse" : "compact"

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
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <PackageCheck className="text-primary size-5 shrink-0" aria-hidden />
                  {t("merchantOrders.detailTitle")}
                </CardTitle>
                <CardDescription>
                  {t("merchantOrders.detail.batchSubtitle")}
                </CardDescription>
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
                          assignedWarehouseName={q.data.assignedWarehouse?.name}
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
                        {ordersTotalValue == null
                          ? "—"
                          : formatMoney(String(ordersTotalValue))}
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
                      <p className="flex flex-wrap items-center gap-2">
                        <strong>{t("warehouse.table.batchPipelineStatus")}:</strong>{" "}
                        <MerchantBatchStatusWithWarehouse
                          transferStatus={q.data.transferStatus}
                          assignedWarehouseId={q.data.assignedWarehouse?.id}
                          assignedWarehouseName={q.data.assignedWarehouse?.name}
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
                        {ordersTotalValue == null
                          ? "—"
                          : formatMoney(String(ordersTotalValue))}
                      </p>
                      <p>
                        <strong>{t("merchantOrders.detail.shippingFee")}:</strong>{" "}
                        {ordersSummaryQuery.isLoading
                          ? "…"
                          : ordersTotalShipping == null
                            ? "—"
                            : formatMoney(String(ordersTotalShipping))}
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
                  <CsShipmentRowActions
                    row={q.data}
                    token={token}
                    listQueryKey={[...listQueryKey]}
                    onOpenMap={openMap}
                    onOpenAddLocation={openAddLocation}
                    showCustomerContact={!isMultiOrderBatch}
                    layout="inline"
                  />
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

      <CsCourierMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        courierId={mapCourierId}
        token={token}
      />
      <CsAddLocationDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        row={locationRow}
        token={token}
        listQueryKey={[...listQueryKey]}
      />
    </Layout>
  )
}

