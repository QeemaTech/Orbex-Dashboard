import { useQuery } from "@tanstack/react-query"
import { PackageCheck } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"

import { getShipmentById, getShipmentPackages, listShipments } from "@/api/shipments-api"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import { Layout } from "@/components/layout/Layout"
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
import { parseWarehouseLatLng } from "@/features/customer-service/lib/location"
import { backendShipmentTransferLabel } from "@/features/warehouse/backend-labels"
import { useAuth } from "@/lib/auth-context"

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ShipmentDetailsPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const location = useLocation()
  const { shipmentId: shipmentParam = "" } = useParams()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const [mapCourierId, setMapCourierId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
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

  const shipmentName = (() => {
    try {
      return decodeURIComponent(shipmentParam).trim()
    } catch {
      return shipmentParam.trim()
    }
  })()
  const isWarehouseRoute = location.pathname.startsWith("/warehouse/")
  const isIdParam = uuidRegex.test(shipmentName)
  const statusPerspective: DashboardPerspective = isWarehouseRoute
    ? "warehouse"
    : "operations"
  const shouldUseDirectId = isWarehouseRoute || isIdParam

  const matchedShipmentQuery = useQuery({
    queryKey: ["shipment-detail-match", shipmentName, token],
    queryFn: async () => {
      const result = await listShipments({
        token,
        page: 1,
        pageSize: 1,
        customerName: shipmentName,
      })
      return result.shipments[0] ?? null
    },
    enabled: !!token && !!shipmentName && !shouldUseDirectId,
  })
  const matchedShipmentId = shouldUseDirectId
    ? shipmentName
    : matchedShipmentQuery.data?.shipmentId ??
      matchedShipmentQuery.data?.id ??
      ""
  const q = useQuery({
    queryKey: ["shipment-detail", matchedShipmentId, token],
    queryFn: () =>
      getShipmentById({ token, shipmentId: matchedShipmentId, includeEvents: true }),
    enabled: !!token && !!matchedShipmentId,
  })

  const packagesSummaryQuery = useQuery({
    queryKey: ["shipment-packages-summary", matchedShipmentId, token],
    queryFn: () =>
      getShipmentPackages({ token, shipmentId: matchedShipmentId }),
    enabled: !!token && !!matchedShipmentId && isWarehouseRoute,
  })

  const packagesTotalValue = (() => {
    const list = packagesSummaryQuery.data?.packages ?? []
    let sum = 0
    for (const p of list) {
      const n = Number.parseFloat(String(p.shipmentValue ?? "").replace(/,/g, "").trim())
      if (Number.isFinite(n)) sum += n
    }
    return list.length === 0 ? null : sum
  })()

  const showNotFound =
    (shouldUseDirectId && !q.isLoading && !q.error && !q.data) ||
    (!shouldUseDirectId &&
      !matchedShipmentQuery.isLoading &&
      !matchedShipmentQuery.error &&
      !matchedShipmentQuery.data)

  return (
    <Layout
      title={
        isWarehouseRoute
          ? t("warehouse.transferDetailTitle")
          : t("shipments.detailTitle")
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => nav(-1)}>
            {t("shipments.back")}
          </Button>
          {matchedShipmentId ? (
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link
                to={
                  isWarehouseRoute
                    ? `/warehouse/shipments/${matchedShipmentId}/packages`
                    : location.pathname.startsWith("/cs/")
                      ? `/cs/shipments/${matchedShipmentId}/packages`
                      : `/shipments/${matchedShipmentId}/packages`
                }
              >
                {t("shipments.viewPackages", { defaultValue: "View packages" })}
              </Link>
            </Button>
          ) : null}
        </div>
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="text-primary size-5" aria-hidden />
              {t("shipments.detailTitle")}
            </CardTitle>
            <CardDescription>
              {isWarehouseRoute
                ? t("warehouse.transferDetailSubtitle")
                : q.data?.customerName || shipmentName || "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {matchedShipmentQuery.isLoading || q.isLoading ? (
              <p>{t("shipments.loading")}</p>
            ) : null}
            {matchedShipmentQuery.error ? (
              <p className="text-destructive">
                {(matchedShipmentQuery.error as Error).message}
              </p>
            ) : null}
            {showNotFound ? (
              <p className="text-destructive">
                {t("shipments.detail.notFound", { defaultValue: "Shipment not found." })}
              </p>
            ) : null}
            {q.error ? (
              <p className="text-destructive">{(q.error as Error).message}</p>
            ) : null}
            {q.data ? (
              <>
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
                      <p>
                        <strong>{t("warehouse.table.batchTransfer")}:</strong>{" "}
                        {q.data.transferStatus
                          ? backendShipmentTransferLabel(t, q.data.transferStatus)
                          : "—"}
                      </p>
                      <p>
                        <strong>{t("warehouse.table.packageCount")}:</strong>{" "}
                        {packagesSummaryQuery.isLoading
                          ? "…"
                          : String(packagesSummaryQuery.data?.packages.length ?? 0)}
                      </p>
                      <p>
                        <strong>{t("warehouse.table.totalValue")}:</strong>{" "}
                        {packagesTotalValue == null
                          ? "—"
                          : formatMoney(String(packagesTotalValue))}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {t("warehouse.transferPackagesHint", {
                        defaultValue:
                          "Recipient and courier assignment are managed per package — open the packages list.",
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
                        <strong>{t("cs.table.customer")}:</strong> {q.data.customerName}
                      </p>
                      <p>
                        <strong>{t("cs.table.phone")}:</strong> {q.data.phonePrimary}
                      </p>
                      <p>
                        <strong>{t("cs.table.product")}:</strong> {q.data.productType || "—"}
                      </p>
                      <p>
                        <strong>{t("cs.table.value")}:</strong> {formatMoney(q.data.shipmentValue)}
                      </p>
                      <p>
                        <strong>{t("shipments.detail.shippingFee")}:</strong>{" "}
                        {formatMoney(q.data.shippingFee)}
                      </p>
                      <p>
                        <strong>{t("warehouse.table.trackingNumber")}:</strong>{" "}
                        {q.data.trackingNumber || "—"}
                      </p>
                      <p>
                        <strong>{t("cs.table.courier")}:</strong>{" "}
                        {q.data.courier?.fullName || "—"}
                      </p>
                      <p>
                        <strong>{t("shipments.detail.courierPhone")}:</strong>{" "}
                        {q.data.courier?.contactPhone || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>{t("cs.table.status")}:</strong>
                      <ShipmentStatusBadge
                        status={getPerspectiveStatusKey(statusPerspective, q.data)}
                      />
                    </div>
                    <p><strong>{t("cs.table.address")}:</strong> {q.data.addressText}</p>
                    {q.data.locationText ? (
                      <p><strong>{t("cs.addLocation.locationTextLabel")}:</strong> {q.data.locationText}</p>
                    ) : null}
                    {parseWarehouseLatLng(q.data.customerLat, q.data.customerLng) ? (
                      <p className="flex flex-wrap items-center gap-2">
                        <strong>{t("cs.table.customerLocation")}:</strong>
                        <CoordinatesMapLink
                          latitude={q.data.customerLat}
                          longitude={q.data.customerLng}
                        />
                      </p>
                    ) : null}
                    {q.data.locationLink ? (
                      <p>
                        <strong>{t("cs.addLocation.locationLinkLabel")}:</strong>{" "}
                        <a
                          href={q.data.locationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {q.data.locationLink}
                        </a>
                      </p>
                    ) : null}
                    <div className="rounded-lg border bg-card p-3">
                      <CsShipmentRowActions
                        row={q.data}
                        token={token}
                        listQueryKey={["shipment-detail", matchedShipmentId, token]}
                        onOpenMap={(courierId) => {
                          setMapCourierId(courierId)
                          setMapOpen(true)
                        }}
                        onOpenAddLocation={() => setLocationOpen(true)}
                        showWhatsApp={!isWarehouseRoute}
                        showAddLocation={!isWarehouseRoute}
                        layout="inline"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2 rounded-lg border bg-card p-3">
                  <h3 className="font-semibold">{t("shipments.detail.timelineTitle")}</h3>
                  {(q.data.statusEvents ?? []).length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("shipments.detail.timelineEmpty")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(q.data.statusEvents ?? []).map((event) => (
                        <li key={event.id} className="rounded border p-2 text-sm">
                          <div className="font-medium">
                            {event.fromCoreStatus != null
                              ? `${event.fromCoreStatus}/${event.fromSubStatus ?? ""}`
                              : t("shipments.detail.timelineStart")}{" "}
                            {"->"}{" "}
                            {event.toCoreStatus}/{event.toSubStatus}
                          </div>
                          {event.note ? (
                            <p className="text-muted-foreground">{event.note}</p>
                          ) : null}
                          <p className="text-muted-foreground text-xs">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <CsCourierMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        courierId={mapCourierId}
        token={token}
      />
      {!isWarehouseRoute ? (
        <CsAddLocationDialog
          open={locationOpen}
          onOpenChange={setLocationOpen}
          row={q.data ?? null}
          token={token}
          listQueryKey={["shipment-detail", matchedShipmentId, token]}
        />
      ) : null}
    </Layout>
  )
}
