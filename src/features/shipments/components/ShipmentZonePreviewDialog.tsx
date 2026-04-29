import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { GoogleMap, Marker } from "@react-google-maps/api"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getDeliveryZone, type DeliveryZoneRow } from "@/api/delivery-zones-api"
import { getDeliveryZoneWarehouseLinks } from "@/api/delivery-zones-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Button } from "@/components/ui/button"
import { DeliveryZoneGeometryOverlay } from "@/features/delivery-zones/components/DeliveryZoneGeometryOverlay"
import { WarehouseMapIndicators } from "@/features/delivery-zones/components/WarehouseMapIndicators"
import { useGoogleMapsLoader } from "@/features/delivery-zones/hooks/useGoogleMapsLoader"

type ShipmentZonePreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  resolvedDeliveryZoneId: string | null | undefined
  customerLat: number
  customerLng: number
}

const fallbackCenter = { lat: 30.0444, lng: 31.2357 }

export function ShipmentZonePreviewDialog({
  open,
  onOpenChange,
  token,
  resolvedDeliveryZoneId,
  customerLat,
  customerLng,
}: ShipmentZonePreviewDialogProps) {
  const { t } = useTranslation()
  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim()
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const zoneQuery = useQuery({
    queryKey: ["delivery-zone", token, resolvedDeliveryZoneId ?? ""],
    queryFn: () => getDeliveryZone(token, resolvedDeliveryZoneId!),
    enabled: open && !!token && !!resolvedDeliveryZoneId,
  })
  const zone = zoneQuery.data?.zone ?? null
  const zoneWarehouseLinksQuery = useQuery({
    queryKey: ["delivery-zone-warehouses", token, resolvedDeliveryZoneId ?? ""],
    queryFn: () => getDeliveryZoneWarehouseLinks(token, resolvedDeliveryZoneId!),
    enabled: open && !!token && !!resolvedDeliveryZoneId,
  })
  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: open && !!token,
  })

  const { isLoaded, loadError } = useGoogleMapsLoader(apiKey)

  const center = useMemo(() => {
    if (Number.isFinite(customerLat) && Number.isFinite(customerLng)) {
      return { lat: customerLat, lng: customerLng }
    }
    return fallbackCenter
  }, [customerLat, customerLng])
  const linkedWarehouseIds = useMemo(() => {
    const links = zoneWarehouseLinksQuery.data
    if (!links) return new Set<string>()
    return new Set([...(links.deliveryWarehouseIds ?? []), ...(links.pickupWarehouseIds ?? [])])
  }, [zoneWarehouseLinksQuery.data])
  const linkedWarehouses = useMemo(() => {
    const warehouses = warehousesQuery.data?.warehouses ?? []
    if (linkedWarehouseIds.size === 0) return []
    return warehouses.filter((warehouse) => linkedWarehouseIds.has(warehouse.id))
  }, [linkedWarehouseIds, warehousesQuery.data?.warehouses])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-3xl rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {t("deliveryZones.preview.title", { defaultValue: "Shipment zone preview" })}
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm">
            <span className="text-muted-foreground">
              {t("deliveryZones.preview.resolvedZone", {
                defaultValue: "Resolved delivery zone",
              })}
              :
            </span>{" "}
            {zone?.name ?? resolvedDeliveryZoneId ?? "—"}
          </p>
          {!apiKey ? (
            <p className="text-muted-foreground text-sm">
              {t("deliveryZones.preview.noMapKey", {
                defaultValue: "Map key is missing.",
              })}
            </p>
          ) : loadError ? (
            <p className="text-destructive text-sm">
              {t("deliveryZones.preview.mapFailed", {
                defaultValue: "Map failed to load.",
              })}
            </p>
          ) : !isLoaded ? (
            <p className="text-muted-foreground text-sm">{t("deliveryZones.loading")}</p>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "360px", borderRadius: "0.5rem" }}
              center={center}
              zoom={12}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              <Marker position={center} />
              <WarehouseMapIndicators warehouses={linkedWarehouses} />
              {zone ? (
                <DeliveryZoneGeometryOverlay
                  zone={zone as DeliveryZoneRow}
                  highlighted={hoveredZone === zone.id}
                  onHover={setHoveredZone}
                />
              ) : null}
            </GoogleMap>
          )}
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-orange-600" />
              <span>
                {t("deliveryZones.preview.mainWarehouseMarker", {
                  defaultValue: "Main warehouse",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-violet-600" />
              <span>
                {t("deliveryZones.preview.subBranchWarehouseMarker", {
                  defaultValue: "Sub-branch warehouse",
                })}
              </span>
            </div>
          </div>
          {zoneQuery.isError ? (
            <p className="text-destructive text-sm">{(zoneQuery.error as Error).message}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
