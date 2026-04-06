import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Boxes, ExternalLink, PhoneCall } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ShipmentOrderRow } from "@/api/shipments-api"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { openWhatsAppForOrder } from "@/features/customer-service/lib/whatsapp"

type Props = {
  order: ShipmentOrderRow
  backHref: string
  backLabel: string
  /** Shipment (transfer) detail page for this batch. */
  shipmentDetailHref: string
  /** Batch customer-orders list (`/orders/:shipmentId` or `/cs/orders/:shipmentId`). */
  batchOrdersListHref: string
  variant?: "default" | "warehouse" | "cs"
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-x-4 sm:gap-y-1">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  )
}

export function OrderDetailView({
  order,
  backHref,
  backLabel,
  shipmentDetailHref,
  batchOrdersListHref,
  variant = "default",
}: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"
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

  const formatDateTime = (iso: string | null | undefined): string => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  }

  const hasPhone = !!order.customer.phonePrimary?.trim()
  const courierPhone = order.deliveryCourier?.contactPhone?.trim()

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
                {order.trackingNumber?.trim()
                  ? order.trackingNumber
                  : t("orders.detail.unnamedTracking")}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {t("orders.detail.orderId")}: {order.id}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {t("orders.columns.deliveryStatus")}
              </span>
              <BackendStatusBadge kind="orderDelivery" value={order.deliveryStatus} />
              <span className="text-muted-foreground text-xs font-medium">
                {t("orders.columns.paymentStatus")}
              </span>
              <BackendStatusBadge kind="orderPayment" value={order.paymentStatus} />
            </div>
          </div>
        </CardHeader>
        <div className="bg-border h-px w-full" />
        <CardContent className="space-y-6 pt-6">
          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t("orders.detail.sectionCustomer")}
            </h3>
            <dl className="space-y-3">
              <DetailRow label={t("adminOrders.colCustomer")} value={order.customer.customerName} />
              <DetailRow
                label={t("adminOrders.colPhone")}
                value={order.customer.phonePrimary || "—"}
              />
              <DetailRow
                label={t("cs.table.address", { defaultValue: "Address" })}
                value={order.customer.addressText?.trim() || "—"}
              />
              <DetailRow
                label={t("cs.table.product", { defaultValue: "Product type" })}
                value={order.productType?.trim() || "—"}
              />
              {order.description ? (
                <DetailRow label={t("orders.detail.description")} value={order.description} />
              ) : null}
              {order.notes ? (
                <DetailRow label={t("orders.detail.notes")} value={order.notes} />
              ) : null}
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t("orders.detail.sectionFinancial")}
            </h3>
            <dl className="space-y-3">
              <DetailRow label={t("adminOrders.colValue")} value={formatMoney(order.shipmentValue)} />
              <DetailRow
                label={t("shipments.detail.shippingFee", { defaultValue: "Shipping fee" })}
                value={formatMoney(order.shippingFee)}
              />
              <DetailRow label={t("orders.detail.commission")} value={formatMoney(order.commissionFee)} />
              <DetailRow
                label={t("dashboard.table.paymentMethod", { defaultValue: "Payment method" })}
                value={order.paymentMethod || "—"}
              />
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t("orders.detail.sectionLogistics")}
            </h3>
            <dl className="space-y-3">
              <DetailRow
                label={t("warehouse.table.courier", { defaultValue: "Courier" })}
                value={order.deliveryCourier?.fullName?.trim() || "—"}
              />
              <DetailRow
                label={t("shipments.detail.courierPhone", { defaultValue: "Courier phone" })}
                value={courierPhone || "—"}
              />
              <DetailRow label={t("orders.detail.createdAt")} value={formatDateTime(order.createdAt)} />
              <DetailRow label={t("orders.detail.updatedAt")} value={formatDateTime(order.updatedAt)} />
            </dl>
          </section>

          <div className="bg-border h-px w-full" />

          <section className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">{t("orders.detail.actions")}</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="default" size="sm" asChild>
                <Link to={shipmentDetailHref}>
                  <ExternalLink className="mr-2 size-4" aria-hidden />
                  {t("adminOrders.openTransfer")}
                </Link>
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={batchOrdersListHref}>
                  <Boxes className="mr-2 size-4" aria-hidden />
                  {t("adminOrders.viewBatchOrders")}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPhone}
                title={!hasPhone ? t("cs.actions.whatsappDisabledHint") : undefined}
                onClick={() => {
                  if (hasPhone) openWhatsAppForOrder(order)
                }}
              >
                {t("cs.actions.whatsappMenu")}
              </Button>
              {hasPhone ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={`tel:${order.customer.phonePrimary}`}>{t("cs.actions.callCustomer")}</a>
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
              <p className="text-muted-foreground text-xs">{t("orders.detail.warehouseHint")}</p>
            ) : null}
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
