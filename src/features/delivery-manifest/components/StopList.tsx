import { useTranslation } from "react-i18next"

import type { ManifestRouteStop } from "@/api/delivery-manifests-api"
import { Button } from "@/components/ui/button"

type Props = {
  stops: ManifestRouteStop[]
  selectedOrder?: number
  onSelectOrder?: (order: number) => void
}

function stopHeading(s: ManifestRouteStop, t: (k: string, o?: Record<string, string | number>) => string): string {
  if (s.labelParts) {
    return s.labelParts.merchantName?.trim()
      ? s.labelParts.merchantName.trim()
      : t("warehouse.pickupManifests.routeStopUnknownMerchant", { defaultValue: "Merchant" })
  }
  if (s.label?.trim()) return s.label.trim()
  return s.shipmentId
}

export function StopList({ stops, selectedOrder, onSelectOrder }: Props) {
  const { t } = useTranslation()
  if (!stops.length) return null

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Stops in suggested order</p>
      <div className="space-y-1">
        {stops
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => {
            const selected = selectedOrder === s.order
            const batchLine =
              s.labelParts != null
                ? t("warehouse.pickupManifests.shipmentsCount", {
                    count: s.labelParts.shipmentCount,
                    defaultValue: "{{count}} shipments",
                  })
                : null
            return (
              <Button
                key={`${s.shipmentId}-${s.order}`}
                type="button"
                variant={selected ? "secondary" : "outline"}
                className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                onClick={() => onSelectOrder?.(s.order)}
              >
                <div className="flex w-full gap-2">
                  <span className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                    {s.order}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{stopHeading(s, t)}</p>
                    {batchLine ? (
                      <p className="text-muted-foreground text-xs font-medium">{batchLine}</p>
                    ) : null}
                    <p className="text-muted-foreground line-clamp-2 text-xs">{s.address}</p>
                  </div>
                </div>
              </Button>
            )
          })}
      </div>
    </div>
  )
}

