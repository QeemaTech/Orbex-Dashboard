import { useCallback, useMemo } from "react"
import { Circle, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"

const mapContainerStyle = {
  width: "100%",
  height: "280px",
  borderRadius: "0.5rem",
}

type LatLng = { lat: number; lng: number }

type DeliveryZoneGoogleMapProps = {
  apiKey: string
  center: LatLng
  radiusMeters: number
  onCenterChange: (next: LatLng) => void
}

export function DeliveryZoneGoogleMap({
  apiKey,
  center,
  radiusMeters,
  onCenterChange,
}: DeliveryZoneGoogleMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  })

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng
      if (!latLng) return
      onCenterChange({ lat: latLng.lat(), lng: latLng.lng() })
    },
    [onCenterChange],
  )

  const circleOptions = useMemo(
    () => ({
      strokeColor: "#2563eb",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#2563eb",
      fillOpacity: 0.22,
      clickable: false,
    }),
    [],
  )

  if (loadError) {
    return (
      <p className="text-destructive text-sm">
        Map failed to load. Check the API key and Maps JavaScript API enablement.
      </p>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className="bg-muted text-muted-foreground flex items-center justify-center rounded-lg text-sm"
        style={{ height: mapContainerStyle.height }}
      >
        Loading map…
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onClick={onMapClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      <Marker position={center} />
      <Circle center={center} radius={radiusMeters} options={circleOptions} />
    </GoogleMap>
  )
}
