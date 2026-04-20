import { Boxes, ExternalLink, MessageSquareText, PhoneCall, Printer } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import type { ShipmentOrderRow } from "@/api/merchant-orders-api"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { OrderDeliveryStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  openWhatsAppForOrder,
  openWhatsAppTrackingMessage,
} from "@/features/customer-service/lib/whatsapp"
import { PlanShipmentWarehouseTask } from "@/features/shipments/components/PlanShipmentWarehouseTask"
import { ShipmentCsConfirmButton } from "@/features/shipments/components/ShipmentCsConfirmButton"
import { ShipmentTimeline } from "@/features/shipments/components/ShipmentTimeline"
import { ShipmentTasksCard } from "@/features/shipments/components/ShipmentTasksCard"

export type ShipmentDetailViewProps = {
  shipment: ShipmentOrderRow
  backHref: string
  backLabel: string
  merchantOrderDetailHref: string
  merchantOrderShipmentsHref: string
  variant?: "default" | "warehouse" | "cs"
  /** Hub opened in the URL (e.g. `/warehouses/:warehouseId/shipments/...`) when line hub fields are missing from API. */
  planTaskContextWarehouseId?: string
}

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatMoney(raw: string | null | undefined, locale: string) {
  const n = Number.parseFloat(String(raw ?? "").replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="text-foreground text-sm font-medium">{value}</dd>
    </div>
  )
}

export function ShipmentDetailView({
  shipment,
  backHref,
  backLabel,
  merchantOrderDetailHref,
  merchantOrderShipmentsHref,
  variant = "default",
  planTaskContextWarehouseId,
}: ShipmentDetailViewProps) {
  const { t, i18n } = useTranslation()
  const { user, accessToken } = useAuth()
  const lineHubContextId =
    planTaskContextWarehouseId?.trim() || user?.warehouseId || undefined
  const locale = resolveNumberLocale(i18n.language)
  const canPrintLabel = Boolean(user?.permissions?.includes("shipments.label"))

  const currencyLocale = t("shipments.detail.currencyLocale", { defaultValue: "en-EG" })
  const formatDateTime = (iso: string | null | undefined): string => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  }

  const hasPhone = !!shipment.customer.phonePrimary?.trim()
  const courierPhone = shipment.deliveryCourier?.contactPhone?.trim()
  const hasTracking = !!shipment.trackingNumber?.trim()
  const sendTrackingDisabled = !hasPhone || !hasTracking || !accessToken
  const sendTrackingTitle = !hasPhone
    ? t("cs.actions.whatsappDisabledHint")
    : !hasTracking
      ? t("cs.actions.sendTrackingMessageNoTrackingHint")
      : !accessToken
        ? t("auth.loginError")
        : undefined

  // Temporary fallback: use frontend label print page until network-direct printer path is stable.
  const openLegacyLabelPrint = () => {
    const href = `/shipments/${encodeURIComponent(shipment.id)}/print`
    window.open(href, "_blank", "noopener,noreferrer")
  }

  // Temporary behavior: redirect print action to legacy frontend flow.
  const handlePrintLabel = async () => {
    openLegacyLabelPrint()
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="sm" asChild>
        <Link to={backHref}>{backLabel}</Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
                <Boxes className="text-primary size-6 shrink-0" aria-hidden />
                {shipment.trackingNumber?.trim()
                  ? shipment.trackingNumber
                  : t("shipments.detail.unnamedTracking")}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {t("shipments.detail.shipmentId")}: {shipment.id}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {t("shipments.columns.deliveryStatus")}
              </span>
              <OrderDeliveryStatusWithWarehouse
                status={shipment.status}
                locationWarehouseId={shipment.currentWarehouseId}
                locationWarehouseName={shipment.currentWarehouse?.name}
                contextWarehouseId={lineHubContextId}
              />
              <span className="text-muted-foreground text-xs font-medium">
                {t("shipments.columns.paymentStatus")}
              </span>
              <BackendStatusBadge kind="orderPayment" value={shipment.paymentStatus} />
            </div>
          </div>
        </CardHeader>
        <div className="bg-border h-px w-full" />
        <CardContent className="space-y-6 pt-6">
          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t("shipments.detail.sectionCustomer")}
            </h3>
            <dl className="space-y-3">
              <DetailRow label={t("adminOrders.colCustomer")} value={shipment.customer.customerName} />
              <DetailRow
                label={t("adminOrders.colPhone")}
                value={shipment.customer.phonePrimary || "—"}
              />
              <DetailRow
                label={t("cs.table.address", { defaultValue: "Address" })}
                value={shipment.customer.addressText?.trim() || "—"}
              />
              <DetailRow
                label={t("cs.table.product", { defaultValue: "Product type" })}
                value={shipment.productType?.trim() || "—"}
              />
              {shipment.description ? (
                <DetailRow label={t("shipments.detail.description")} value={shipment.description} />
              ) : null}
              {shipment.notes ? (
                <DetailRow label={t("shipments.detail.notes")} value={shipment.notes} />
              ) : null}
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t("shipments.detail.sectionFinancial")}
            </h3>
            <dl className="space-y-3">
              <DetailRow label={t("adminOrders.colValue")} value={formatMoney(shipment.shipmentValue, locale)} />
              <DetailRow
                label={t("shipments.detail.shippingFee")}
                value={formatMoney(shipment.shippingFee, currencyLocale)}
              />
              <DetailRow label={t("shipments.detail.commission")} value={formatMoney(shipment.commissionFee, locale)} />
              <DetailRow
                label={t("dashboard.table.paymentMethod", { defaultValue: "Payment method" })}
                value={shipment.paymentMethod || "—"}
              />
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t("shipments.detail.sectionLogistics")}
            </h3>
            <dl className="space-y-3">
              <DetailRow
                label={t("warehouse.table.courier", { defaultValue: "Courier" })}
                value={shipment.deliveryCourier?.fullName?.trim() || "—"}
              />
              <DetailRow
                label={t("shipments.detail.courierPhone")}
                value={courierPhone || "—"}
              />
              <DetailRow label={t("shipments.detail.createdAt")} value={formatDateTime(shipment.createdAt)} />
              <DetailRow label={t("shipments.detail.updatedAt")} value={formatDateTime(shipment.updatedAt)} />
            </dl>
          </section>

          {shipment.statusEvents && shipment.statusEvents.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-foreground text-sm font-semibold">
                {t("shipments.timeline.heading", { defaultValue: "Shipment Timeline" })}
              </h3>
              <ShipmentTimeline
                events={shipment.statusEvents}
                contextWarehouseId={lineHubContextId}
              />
            </section>
          )}

          {shipment.shipmentTasks && shipment.shipmentTasks.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-foreground text-sm font-semibold">
                {t("shipments.tasks.heading", { defaultValue: "Warehouse Tasks" })}
              </h3>
              <ShipmentTasksCard tasks={shipment.shipmentTasks} />
            </section>
          )}

          <div className="bg-border h-px w-full" />

          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">{t("shipments.detail.actions")}</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="default" size="sm" asChild>
                <Link to={merchantOrderDetailHref}>
                  <ExternalLink className="mr-2 size-4" aria-hidden />
                  {t("adminOrders.openMerchantOrder")}
                </Link>
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={merchantOrderShipmentsHref}>
                  <Boxes className="mr-2 size-4" aria-hidden />
                  {t("adminOrders.viewBatchOrders")}
                </Link>
              </Button>
              {hasTracking && canPrintLabel ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void handlePrintLabel()}>
                  <Printer className="mr-2 size-4" aria-hidden />
                  {t("shipments.detail.printLabel", { defaultValue: "Print label" })}
                </Button>
              ) : null}
              <ShipmentCsConfirmButton line={shipment} accessToken={accessToken} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPhone}
                title={!hasPhone ? t("cs.actions.whatsappDisabledHint") : undefined}
                onClick={() => {
                  if (hasPhone) openWhatsAppForOrder(shipment)
                }}
              >
                {t("cs.actions.whatsappMenu")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendTrackingDisabled}
                title={sendTrackingTitle}
                onClick={() => {
                  if (!sendTrackingDisabled && accessToken) {
                    void openWhatsAppTrackingMessage(shipment, accessToken)
                  }
                }}
              >
                <MessageSquareText className="mr-2 size-4" aria-hidden />
                {t("shipments.detail.sendTrackingMessage")}
              </Button>
              {hasPhone ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={`tel:${shipment.customer.phonePrimary}`}>{t("cs.actions.callCustomer")}</a>
                </Button>
              ) : null}
              {courierPhone ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={`tel:${courierPhone}`}>
                    <PhoneCall className="mr-2 size-4" aria-hidden />
                    {t("cs.actions.callCourier")}
                  </a>
                </Button>
              ) : null}
            </div>
            {variant === "warehouse" ? (
              <p className="text-muted-foreground text-xs">{t("shipments.detail.warehouseHint")}</p>
            ) : null}
          </section>
        </CardContent>
      </Card>

      <PlanShipmentWarehouseTask
        shipment={shipment}
        contextWarehouseId={planTaskContextWarehouseId}
      />
    </div>
  )
}

