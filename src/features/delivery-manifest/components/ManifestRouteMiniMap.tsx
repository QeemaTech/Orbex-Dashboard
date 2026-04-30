import { memo, useMemo } from "react"
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api"

import type { LatLng, ManifestRoute } from "@/api/delivery-manifests-api"
import { useGoogleMapsLoader } from "@/features/delivery-zones/hooks/useGoogleMapsLoader"

type Props = {
  apiKey: string
  route?: ManifestRoute
}

const containerStyle = { width: "180px", height: "90px", borderRadius: "12px" }

function normalizePath(path: LatLng[] | undefined): google.maps.LatLngLiteral[] {
  if (!path?.length) return []
  return path
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
}

export const ManifestRouteMiniMap = memo(function ManifestRouteMiniMap({
  apiKey,
  route,
}: Props) {
  const { isLoaded } = useGoogleMapsLoader(apiKey)
  const path = useMemo(() => normalizePath(route?.path), [route?.path])

  const center = useMemo(() => {
    const first = path[0]
    return first ?? { lat: 30.0444, lng: 31.2357 } // Cairo fallback
  }, [path])

  if (!apiKey.trim()) {
    return <div className="bg-muted h-[90px] w-[180px] rounded-xl border" />
  }

  if (!isLoaded) {
    return <div className="bg-muted h-[90px] w-[180px] animate-pulse rounded-xl border" />
  }

  if (!route || route.status !== "READY" || path.length < 2) {
    return <div className="bg-muted h-[90px] w-[180px] rounded-xl border" />
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={11}
      options={{
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: "none",
      }}
    >
      {route.warehouse ? (
        <Marker
          position={{ lat: route.warehouse.lat, lng: route.warehouse.lng }}
          title="Warehouse"
        />
      ) : null}

      <Polyline
        path={path}
        options={{
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 3,
        }}
      />
    </GoogleMap>
  )
})

