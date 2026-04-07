import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, PackageCheck } from "react-lucid"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import {
  getShipmentById,
  getShipmentOrders,
  type CsShipmentRow,
} from "@/api/shipments-api"
import { Layout } from "@/components/layout/Layout"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
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
import { WarehouseShipmentOrdersTable } from "@/features/warehouse/components/WarehouseShipmentOrdersTable"
import { formatShipmentStatusEventLine } from "@/features/warehouse/backend-labels"
import type { UserRole } from "@/lib/auth-context"
import { useAuth } from "@/lib/auth-context"

function isWarehouseTransfersPath(pathname: string): boolean {
  return /^\/warehouses\/[^/]+\/transfers\//.test(pathname)
}

function resolvePerspective(role: UserRole | undefined): DashboardPerspective {
  if (role === "ACCOUNTS") return "accounting"
  if (role === "WAREHOUSE" || role === "WAREHOUSE_ADMIN") return "warehouse"
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

export function ShipmentDetailsPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { shipmentId: shipmentParam = "", warehouseId = "" } = useParams<{
    shipmentId?: string
    warehouseId?: string
  }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const shipmentId = (() => {
    try {
      return decodeURIComponent(shipmentParam).trim()
    } catch {
      return shipmentParam.trim()
    }
  })()

  const isWarehouseRoute = isWarehouseTransfersPath(location.pathname)
  const isCsRoute = location.pathname.startsWith("/cs/")
  const statusPerspective = resolvePerspective(user?.role)

  const [mapOpen, setMapOpen] = useState(false)
  const [mapCourierId, setMapCourierId] = useState<string | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationRow, setLocationRow] = useState<CsShipmentRow | null>(null)

  const listQueryKey = useMemo(
    () => ["shipment", "detail", shipmentId, token] as const,
    [shipmentId, token],
  )

  const q = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      getShipmentById({ token, shipmentId, includeEvents: true }),
    enabled: !!token && !!shipmentId,
  })

  const ordersSummaryQuery = useQuery({
    queryKey: ["shipment", "orders", shipmentId, token],
    queryFn: () => getShipmentOrders({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
  })

  const openMap = useCallback((courierId: string) => {
    setMapCourierId(courierId)
    setMapOpen(true)
  }, [])

  const openAddLocation = useCallback((row: CsShipmentRow) => {
    setLocationRow(row)
    setLocationOpen(true)
  }, [])

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

  const orders = ordersSummaryQuery.data?.shipments ?? []
  const ordersTotalValue = sumMoney(orders.map((p) => p.shipmentValue))
  const ordersTotalShipping = sumMoney(orders.map((p) => p.shippingFee))
  const orderCount =
    orders.length > 0 ? orders.length : (q.data?.orderCount ?? 0)
  const isMultiOrderBatch = orderCount > 1

  const backHref = isWarehouseRoute
    ? `/warehouses/${encodeURIComponent(warehouseId)}`
    : isCsRoute
      ? "/cs/orders"
      : "/shipments"

  const tableMode = isWarehouseRoute ? "warehouse" : "compact"

  return (
    <Layout title={t("shipments.detailTitle")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={backHref}>
              <ArrowLeft className="mr-2 size-4" aria-hidden />
              {t("shipments.back")}
            </Link>
          </Button>
        </div>

        {q.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("shipments.loading")}</p>
        ) : null}
        {q.error ? (
          <p className="text-destructive text-sm">{(q.error as Error).message}</p>
        ) : null}

        {q.data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <PackageCheck className="text-primary size-5 shrink-0" aria-hidden />
                  {t("shipments.detailTitle")}
                </CardTitle>
                <CardDescription>
                  {t("shipments.detail.batchSubtitle")}
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
                      <p>
                        <strong>{t("warehouse.table.trackingNumber")}:</strong>{" "}
                        {q.data.trackingNumber || "—"}
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <strong>{t("warehouse.table.batchTransfer")}:</strong>{" "}
                        <BackendStatusBadge
                          kind="transfer"
                          value={q.data.transferStatus ?? ""}
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
                      {t("warehouse.transferOrdersHint", {
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
                        <strong>{t("shipments.detail.assignedWarehouse")}:</strong>{" "}
                        {q.data.assignedWarehouse?.name ?? "—"}
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <strong>{t("warehouse.table.batchTransfer")}:</strong>{" "}
                        <BackendStatusBadge
                          kind="transfer"
                          value={q.data.transferStatus ?? ""}
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
                        <strong>{t("shipments.detail.shippingFee")}:</strong>{" "}
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
                            <strong>{t("shipments.detail.courierPhone")}:</strong>{" "}
                            {q.data.courier?.contactPhone || "—"}
                          </p>
                        </>
                      )}
                    </div>
                    {isMultiOrderBatch ? (
                      <p className="text-muted-foreground text-sm">
                        {t("shipments.detail.multiOrderCourierStatusHint", {
                          defaultValue:
                            "Courier and delivery status are per customer order. Use the table below for each recipient.",
                        })}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-sm">
                      {t("shipments.detail.batchOrdersHint")}
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
                <CardTitle>{t("shipments.detail.customerOrdersTitle")}</CardTitle>
                <CardDescription>
                  {t("shipments.detail.customerOrdersDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarehouseShipmentOrdersTable
                  token={token}
                  shipmentId={shipmentId}
                  mode={tableMode}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("shipments.detail.timelineTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                {(q.data.statusEvents ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("shipments.detail.timelineEmpty")}
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
