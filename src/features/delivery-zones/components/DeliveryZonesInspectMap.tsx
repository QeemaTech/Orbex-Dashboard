import { useCallback, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { GoogleMap, Marker } from "@react-google-maps/api"
import { useTranslation } from "react-i18next"

import type { DeliveryZoneRow } from "@/api/delivery-zones-api"
import { getDeliveryZoneWarehouseLinks } from "@/api/delivery-zones-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { DeliveryZoneGeometryOverlay } from "@/features/delivery-zones/components/DeliveryZoneGeometryOverlay"
import { WarehouseMapIndicators } from "@/features/delivery-zones/components/WarehouseMapIndicators"
import { useGoogleMapsLoader } from "@/features/delivery-zones/hooks/useGoogleMapsLoader"

type DeliveryZonesInspectMapProps = {
  apiKey: string
  token: string
  zones: DeliveryZoneRow[]
  inspectedZoneId: string | null
  onInspectZone: (zoneId: string | null) => void
}

function toNumber(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const fallbackCenter = { lat: 30.0444, lng: 31.2357 }

export function DeliveryZonesInspectMap({
  apiKey,
  token,
  zones,
  inspectedZoneId,
  onInspectZone,
}: DeliveryZonesInspectMapProps) {
  const { t } = useTranslation()
  const mapRef = useRef<google.maps.Map | null>(null)
  const { isLoaded, loadError } = useGoogleMapsLoader(apiKey)

  const inspectedZone = useMemo(
    () => zones.find((z) => z.id === inspectedZoneId) ?? null,
    [zones, inspectedZoneId],
  )
  const zoneWarehouseLinksQuery = useQuery({
    queryKey: ["delivery-zone-warehouses", token, inspectedZone?.id ?? ""],
    queryFn: () => getDeliveryZoneWarehouseLinks(token, inspectedZone!.id),
    enabled: !!token && !!inspectedZone?.id,
  })
  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })
  const linkedWarehouseIds = useMemo(() => {
    const links = zoneWarehouseLinksQuery.data
    if (!links) return new Set<string>()
    return new Set([...(links.deliveryWarehouseIds ?? []), ...(links.pickupWarehouseIds ?? [])])
  }, [zoneWarehouseLinksQuery.data])
  const linkedWarehouses = useMemo(() => {
    const all = warehousesQuery.data?.warehouses ?? []
    if (linkedWarehouseIds.size === 0) return []
    return all.filter((warehouse) => linkedWarehouseIds.has(warehouse.id))
  }, [linkedWarehouseIds, warehousesQuery.data?.warehouses])

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map
      if (zones.length === 0) return
      const bounds = new google.maps.LatLngBounds()
      for (const z of zones) {
        const lat = toNumber(z.latitude)
        const lng = toNumber(z.longitude)
        if (lat != null && lng != null) bounds.extend({ lat, lng })
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds)
      }
    },
    [zones],
  )

  const onIdle = useCallback(() => {
    if (!inspectedZone || !mapRef.current) return
    const lat = toNumber(inspectedZone.latitude)
    const lng = toNumber(inspectedZone.longitude)
    if (lat == null || lng == null) return
    mapRef.current.panTo({ lat, lng })
  }, [inspectedZone])

  if (loadError) {
    return <p className="text-destructive text-sm">Map failed to load.</p>
  }
  if (!isLoaded) {
    return (
      <div className="bg-muted text-muted-foreground flex h-[340px] items-center justify-center rounded-lg text-sm">
        Loading map...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "340px", borderRadius: "0.5rem" }}
        center={fallbackCenter}
        zoom={8}
        onLoad={onLoad}
        onIdle={onIdle}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        <WarehouseMapIndicators warehouses={linkedWarehouses} />
        {zones.map((zone) => {
          const lat = toNumber(zone.latitude)
          const lng = toNumber(zone.longitude)
          return (
            <div key={zone.id}>
              <DeliveryZoneGeometryOverlay
                zone={zone}
                highlighted={zone.id === inspectedZoneId}
                onHover={onInspectZone}
              />
              {lat != null && lng != null ? (
                <Marker
                  position={{ lat, lng }}
                  onMouseOver={() => onInspectZone(zone.id)}
                  onMouseOut={() => onInspectZone(null)}
                />
              ) : null}
            </div>
          )
        })}
      </GoogleMap>
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-orange-600" />
          <span>{t("deliveryZones.inspect.mainWarehouseMarker")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-violet-600" />
          <span>{t("deliveryZones.inspect.subBranchWarehouseMarker")}</span>
        </div>
      </div>
    </div>
  )
}
