import { useQuery } from "@tanstack/react-query"
import { Package, Phone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { ApiError } from "@/api/client"
import { getPublicTracking } from "@/api/public-tracking-api"
import { ShipmentTrackingTimeline } from "@/features/tracking/components/ShipmentTrackingTimeline"
import { backendOrderDeliveryLabel } from "@/features/warehouse/backend-labels"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function safeDecodeTrackingParam(raw: string | undefined): string {
  const s = raw?.trim()
  if (!s) return ""
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function formatMoneyEg(raw: string, locale: string): string {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export function PublicShipmentTrackingPage() {
  const { t, i18n } = useTranslation()
  const { trackingNumber: paramRaw } = useParams<{ trackingNumber: string }>()
  const trackingNumber = safeDecodeTrackingParam(paramRaw)
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const q = useQuery({
    queryKey: ["public-tracking", trackingNumber],
    queryFn: () => getPublicTracking(trackingNumber),
    enabled: Boolean(trackingNumber),
    retry: 1,
  })

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 sm:max-w-2xl sm:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <Package className="size-5" aria-hidden />
            </div>
            <span className="text-sm font-semibold sm:text-base">{t("tracking.brandTitle")}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
        {!trackingNumber ? (
          <p className="text-muted-foreground text-center text-sm">{t("tracking.invalidTrackingParam")}</p>
        ) : q.isLoading ? (
          <p className="text-muted-foreground text-center text-sm">{t("tracking.loading")}</p>
        ) : q.isError ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tracking.errorTitle")}</CardTitle>
              <CardDescription>
                {q.error instanceof ApiError && q.error.status === 404
                  ? t("tracking.notFound")
                  : q.error instanceof Error
                    ? q.error.message
                    : t("tracking.genericError")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : q.data ? (
          <div className="space-y-6">
            <Card className="overflow-hidden shadow-md">
              <CardHeader className="space-y-1 pb-2">
                <CardDescription>{t("tracking.trackingNoLabel")}</CardDescription>
                <CardTitle className="font-mono text-xl tracking-tight sm:text-2xl">
                  {q.data.trackingNumber}
                </CardTitle>
                <p className="text-muted-foreground pt-1 text-sm">
                  {backendOrderDeliveryLabel(t, q.data.status)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 border-t pt-4">
                {q.data.paymentMethod === "CASH" ? (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{t("tracking.codLabel")}</span>
                    <span className="font-semibold tabular-nums">
                      {formatMoneyEg(
                        String(
                          Number.parseFloat(q.data.shipmentValue.replace(/,/g, "")) +
                            Number.parseFloat(q.data.shippingFee.replace(/,/g, "")),
                        ),
                        locale,
                      )}
                    </span>
                  </div>
                ) : null}
                {q.data.currentWarehouse?.name ? (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{t("tracking.warehouseLabel")}</span>
                    <span className="text-end font-medium">{q.data.currentWarehouse.name}</span>
                  </div>
                ) : null}
                {q.data.deliveryCourier?.fullName || q.data.deliveryCourier?.contactPhone ? (
                  <div className="bg-muted/50 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        {t("tracking.courierLabel")}
                      </p>
                      <p className="text-sm font-semibold">
                        {q.data.deliveryCourier?.fullName?.trim() || t("tracking.courierUnassigned")}
                      </p>
                    </div>
                    {q.data.deliveryCourier?.contactPhone?.trim() ? (
                      <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
                        <a href={`tel:${q.data.deliveryCourier.contactPhone.trim()}`}>
                          <Phone className="size-4" aria-hidden />
                          {t("tracking.callCourier")}
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <ShipmentTrackingTimeline status={q.data.status} postponedAt={q.data.postponedAt} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
