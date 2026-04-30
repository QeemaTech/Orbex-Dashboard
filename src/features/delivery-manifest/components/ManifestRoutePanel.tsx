import { memo, useMemo, useRef, useState } from "react"
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api"

import type { LatLng, ManifestRoute, ManifestRouteStop } from "@/api/delivery-manifests-api"
import { useGoogleMapsLoader } from "@/features/delivery-zones/hooks/useGoogleMapsLoader"
import { StopList } from "@/features/delivery-manifest/components/StopList"

type Props = {
  apiKey: string
  route?: ManifestRoute
  isLoading?: boolean
  error?: string | null
}

function normalizePath(path: LatLng[] | undefined): google.maps.LatLngLiteral[] {
  if (!path?.length) return []
  return path
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
}

function normalizeStops(stops: ManifestRouteStop[] | undefined): ManifestRouteStop[] {
  if (!Array.isArray(stops)) return []
  return stops
    .map((s) => ({
      order: Number(s.order),
      shipmentId: String(s.shipmentId),
      lat: Number(s.lat),
      lng: Number(s.lng),
      address: String(s.address ?? ""),
    }))
    .filter((s) => Number.isFinite(s.order) && Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .sort((a, b) => a.order - b.order)
}

export const ManifestRoutePanel = memo(function ManifestRoutePanel({
  apiKey,
  route,
  isLoading,
  error,
}: Props) {
  const { isLoaded } = useGoogleMapsLoader(apiKey)
  const mapRef = useRef<google.maps.Map | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<number | undefined>(undefined)

  const path = useMemo(() => normalizePath(route?.path), [route?.path])
  const stops = useMemo(() => normalizeStops(route?.orderedStops), [route?.orderedStops])

  const center = useMemo(() => {
    if (route?.warehouse) return { lat: route.warehouse.lat, lng: route.warehouse.lng }
    const first = path[0]
    return first ?? { lat: 30.0444, lng: 31.2357 }
  }, [path, route?.warehouse])

  const status = route?.status ?? "PENDING"
  const canRenderMap = apiKey.trim() && isLoaded && status === "READY" && path.length >= 2

  if (isLoading) {
    return <div className="bg-muted h-[320px] animate-pulse rounded-xl border" />
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>
  }

  if (!route || status === "PENDING") {
    return <p className="text-muted-foreground text-sm">Suggested route is being generated…</p>
  }

  if (status === "FAILED") {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
        <p className="font-medium">Suggested route unavailable</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {route.errorMessage?.trim() || "Route generation failed."}
        </p>
      </div>
    )
  }

  if (!canRenderMap) {
    return <p className="text-muted-foreground text-sm">Map preview unavailable.</p>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-xl border">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "360px" }}
          center={center}
          zoom={12}
          onLoad={(map) => {
            mapRef.current = map
            if (!path.length) return
            const bounds = new google.maps.LatLngBounds()
            for (const p of path) bounds.extend(p)
            map.fitBounds(bounds, 48)
          }}
          options={{
            clickableIcons: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {route.warehouse ? (
            <Marker
              position={{ lat: route.warehouse.lat, lng: route.warehouse.lng }}
              title={route.warehouse.address?.trim() || "Warehouse"}
            />
          ) : null}

          {stops.map((s) => (
            <Marker
              key={`${s.shipmentId}-${s.order}`}
              position={{ lat: s.lat, lng: s.lng }}
              label={{ text: String(s.order), color: "white", fontSize: "12px", fontWeight: "600" }}
              title={s.address}
              onClick={() => setSelectedOrder(s.order)}
            />
          ))}

          <Polyline
            path={path}
            options={{
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 4,
            }}
          />
        </GoogleMap>
      </div>

      <div className="rounded-xl border p-3">
        <StopList
          stops={stops}
          selectedOrder={selectedOrder}
          onSelectOrder={(order) => {
            setSelectedOrder(order)
            const stop = stops.find((s) => s.order === order)
            if (!stop || !mapRef.current) return
            mapRef.current.panTo({ lat: stop.lat, lng: stop.lng })
            mapRef.current.setZoom(14)
          }}
        />
      </div>
    </div>
  )
})

