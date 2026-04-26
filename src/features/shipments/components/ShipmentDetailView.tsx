import { Boxes, ExternalLink, MessageSquareText, PhoneCall, Printer } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import type { ShipmentOrderRow } from "@/api/merchant-orders-api"
import { uploadShipmentPaymentProof } from "@/api/shipments-api"
import { apiUrl } from "@/api/client"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { OrderDeliveryStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { showToast } from "@/lib/toast"
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

function parseMoney(raw: string | null | undefined): number | null {
  const n = Number.parseFloat(String(raw ?? "").replace(/,/g, "").trim())
  return Number.isFinite(n) ? n : null
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 rounded-md border px-3 py-2 sm:grid-cols-[minmax(160px,220px)_1fr] sm:items-start sm:gap-3 sm:px-4 sm:py-3">
      <dt className="text-muted-foreground text-sm font-medium leading-5 sm:text-[0.95rem]">
        {label}
      </dt>
      <dd className="text-foreground text-sm font-semibold leading-6 break-words sm:text-base">
        {value}
      </dd>
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
  const canUploadProof = Boolean(accessToken && user?.permissions?.includes("shipments.update_status"))
  const needsPaymentProof = shipment.paymentMethod === "INSTAPAY" || shipment.paymentMethod === "E_WALLET"
  const latestProof = useMemo(() => {
    const proofs = shipment.paymentProofs ?? []
    return proofs.length > 0 ? proofs[0] : null
  }, [shipment.paymentProofs])
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [localProof, setLocalProof] = useState<typeof latestProof>(null)

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

  const handleUploadProof = async () => {
    if (!accessToken) return
    if (!needsPaymentProof) return
    if (!proofFile) {
      showToast(t("shipments.paymentProof.fileRequired", { defaultValue: "Please select an image first." }), "error")
      return
    }
    const pm = shipment.paymentMethod === "E_WALLET" ? "E_WALLET" : "INSTAPAY"
    try {
      setProofUploading(true)
      const out = await uploadShipmentPaymentProof({
        token: accessToken,
        shipmentId: shipment.id,
        paymentMethod: pm,
        file: proofFile,
      })
      setLocalProof(out)
      setProofFile(null)
      showToast(t("shipments.paymentProof.uploadSuccess", { defaultValue: "Payment proof uploaded." }), "success")
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("shipments.paymentProof.uploadFailed", { defaultValue: "Upload failed." }),
        "error",
      )
    } finally {
      setProofUploading(false)
    }
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
          <section className="mx-auto w-full max-w-4xl space-y-3">
            <h3 className="text-foreground text-base font-semibold sm:text-lg">
              {t("shipments.detail.sectionCustomer")}
            </h3>
            <dl className="space-y-2 sm:space-y-3 [&>div:nth-child(odd)]:bg-muted/30">
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

          <section className="mx-auto w-full max-w-4xl space-y-3">
            <h3 className="text-foreground text-base font-semibold sm:text-lg">
              {t("shipments.detail.sectionFinancial")}
            </h3>
            <dl className="space-y-2 sm:space-y-3 [&>div:nth-child(odd)]:bg-muted/30">
              <DetailRow label={t("adminOrders.colValue")} value={formatMoney(shipment.shipmentValue, locale)} />
              <DetailRow
                label={t("shipments.detail.shippingFee")}
                value={formatMoney(shipment.shippingFee, currencyLocale)}
              />
              {shipment.serviceFee !== undefined ? (
                <DetailRow
                  label={t("shipments.detail.serviceFee", { defaultValue: "Service fee" })}
                  value={formatMoney(shipment.serviceFee, currencyLocale)}
                />
              ) : null}
              <DetailRow label={t("shipments.detail.commission")} value={formatMoney(shipment.commissionFee, locale)} />
              {shipment.serviceFee !== undefined ? (
                <DetailRow
                  label={t("shipments.detail.customerTotal", { defaultValue: "Customer total" })}
                  value={(() => {
                    const v = parseMoney(shipment.shipmentValue)
                    const s = parseMoney(shipment.shippingFee)
                    const f = parseMoney(shipment.serviceFee)
                    if (v == null || s == null || f == null) return "—"
                    return formatMoney(String(v + s + f), currencyLocale)
                  })()}
                />
              ) : null}
              <DetailRow
                label={t("dashboard.table.paymentMethod", { defaultValue: "Payment method" })}
                value={shipment.paymentMethod || "—"}
              />
            </dl>
          </section>

          {needsPaymentProof ? (
            <section className="mx-auto w-full max-w-4xl space-y-3">
              <h3 className="text-foreground text-base font-semibold sm:text-lg">
                {t("shipments.paymentProof.title", { defaultValue: "Payment proof" })}
              </h3>
              <div className="space-y-2 rounded-md border p-4">
                <p className="text-muted-foreground text-sm">
                  {t("shipments.paymentProof.hint", {
                    defaultValue: "Instapay/E-wallet deliveries require an uploaded proof image before delivery.",
                  })}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setProofFile(f)
                    }}
                    disabled={!canUploadProof || proofUploading}
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={!canUploadProof || proofUploading}
                    onClick={() => void handleUploadProof()}
                  >
                    {proofUploading
                      ? t("shipments.paymentProof.uploading", { defaultValue: "Uploading…" })
                      : t("shipments.paymentProof.upload", { defaultValue: "Upload proof" })}
                  </Button>
                </div>

                {localProof || latestProof ? (
                  <div className="flex flex-col gap-2 pt-2">
                    <p className="text-sm font-medium">
                      {t("shipments.paymentProof.latest", { defaultValue: "Latest proof" })}
                    </p>
                    <a
                      className="text-primary text-sm underline"
                      href={apiUrl((localProof ?? latestProof)!.imageUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {(localProof ?? latestProof)!.imageUrl}
                    </a>
                    <img
                      src={apiUrl((localProof ?? latestProof)!.imageUrl)}
                      alt={t("shipments.paymentProof.imageAlt", { defaultValue: "Payment proof" })}
                      className="max-h-64 w-auto rounded-md border object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <p className="text-destructive text-sm">
                    {t("shipments.paymentProof.missing", { defaultValue: "No payment proof uploaded yet." })}
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="mx-auto w-full max-w-4xl space-y-3">
            <h3 className="text-foreground text-base font-semibold sm:text-lg">
              {t("shipments.detail.sectionLogistics")}
            </h3>
            <dl className="space-y-2 sm:space-y-3 [&>div:nth-child(odd)]:bg-muted/30">
              <DetailRow
                label={t("warehouse.table.pickupCourier", { defaultValue: "Pickup courier" })}
                value={shipment.pickupCourier?.fullName?.trim() || "—"}
              />
              <DetailRow
                label={t("warehouse.table.courier", { defaultValue: "Delivery courier" })}
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

