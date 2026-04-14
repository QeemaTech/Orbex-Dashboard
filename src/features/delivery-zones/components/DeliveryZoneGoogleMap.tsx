import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import { Circle, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"

const DEFAULT_MAP_HEIGHT = "clamp(340px, 56vh, 680px)"

export type DeliveryZoneMapHandle = {
  flyTo: (lat: number, lng: number, zoom: number) => void
}

type LatLng = { lat: number; lng: number }

type DeliveryZoneGoogleMapProps = {
  apiKey: string
  center: LatLng
  radiusMeters: number
  onCenterChange: (next: LatLng) => void
  /** CSS height, e.g. `min(520px, 55vh)` */
  mapHeight?: string
  initialZoom?: number
}

export const DeliveryZoneGoogleMap = forwardRef<
  DeliveryZoneMapHandle,
  DeliveryZoneGoogleMapProps
>(function DeliveryZoneGoogleMap(
  {
    apiKey,
    center,
    radiusMeters,
    onCenterChange,
    mapHeight = DEFAULT_MAP_HEIGHT,
    initialZoom = 12,
  },
  ref,
) {
  const mapRef = useRef<google.maps.Map | null>(null)

  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: mapHeight,
      borderRadius: "0.5rem",
    }),
    [mapHeight],
  )

  const { isLoaded, loadError } = useJsApiLoader({
    id: "orbex-delivery-zones-maps",
    googleMapsApiKey: apiKey,
  })

  useImperativeHandle(
    ref,
    () => ({
      flyTo(lat: number, lng: number, zoom: number) {
        const m = mapRef.current
        if (!m) return
        m.panTo({ lat, lng })
        m.setZoom(zoom)
      },
    }),
    [],
  )

  useEffect(() => {
    const m = mapRef.current
    if (!m) return
    m.panTo(center)
  }, [center.lat, center.lng])

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng
      if (!latLng) return
      onCenterChange({ lat: latLng.lat(), lng: latLng.lng() })
    },
    [onCenterChange],
  )

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

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
      zoom={initialZoom}
      onLoad={onLoad}
      onClick={onMapClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      <Marker position={center} />
      <Circle center={center} radius={radiusMeters} options={circleOptions} />
    </GoogleMap>
  )
})
