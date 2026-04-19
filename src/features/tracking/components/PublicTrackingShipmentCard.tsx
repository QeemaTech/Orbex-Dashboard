import { Phone } from "lucide-react"
import type { TFunction } from "i18next"

import type { PublicTrackingPayload } from "@/api/public-tracking-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { backendOrderDeliveryLabel } from "@/features/warehouse/backend-labels"
import { formatCodTotalEg, trackingPillCn } from "@/features/tracking/lib/tracking-public-helpers"

export type PublicTrackingShipmentCardProps = {
  data: PublicTrackingPayload
  t: TFunction
  locale: string
}

export function PublicTrackingShipmentCard({ data, t, locale }: PublicTrackingShipmentCardProps) {
  return (
    <Card className="overflow-hidden border-[#10345d]/12 bg-card/95 shadow-[var(--shadow-lift)] ring-1 ring-[#10345d]/8 dark:ring-white/10">
      <CardHeader className="from-primary/[0.06] space-y-3 bg-gradient-to-br to-transparent pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardDescription className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("tracking.trackingNoLabel")}
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-bold tracking-tight text-[#0d223f] dark:text-foreground sm:text-3xl">
              {data.trackingNumber}
            </CardTitle>
          </div>
          <span className={trackingPillCn(data.status)}>
            {backendOrderDeliveryLabel(t, data.status)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 border-t border-border/80 bg-muted/20 pt-5">
        {data.paymentMethod === "CASH" ? (
          <div className="bg-background/80 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-[#10345d]/10 px-4 py-3 text-sm shadow-sm">
            <span className="text-muted-foreground">{t("tracking.codLabel")}</span>
            <span className="text-primary font-bold tabular-nums">
              {formatCodTotalEg(data.shipmentValue, data.shippingFee, locale)}
            </span>
          </div>
        ) : null}
        {data.currentWarehouse?.name ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{t("tracking.warehouseLabel")}</span>
            <span className="text-end font-semibold text-[#0d223f] dark:text-foreground">
              {data.currentWarehouse.name}
            </span>
          </div>
        ) : null}
        {data.deliveryCourier?.fullName || data.deliveryCourier?.contactPhone ? (
          <div className="from-primary/[0.04] flex flex-col gap-3 rounded-xl border border-[#10345d]/12 bg-gradient-to-br to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t("tracking.courierLabel")}
              </p>
              <p className="mt-1 text-sm font-bold">
                {data.deliveryCourier?.fullName?.trim() || t("tracking.courierUnassigned")}
              </p>
            </div>
            {data.deliveryCourier?.contactPhone?.trim() ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 border-[#10345d]/25 bg-white/90 dark:bg-background/80"
                asChild
              >
                <a href={`tel:${data.deliveryCourier.contactPhone.trim()}`}>
                  <Phone className="size-4" aria-hidden />
                  {t("tracking.callCourier")}
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
