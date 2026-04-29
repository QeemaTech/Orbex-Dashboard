import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import { Circle, GoogleMap, Marker, Polygon } from "@react-google-maps/api"
import { useGoogleMapsLoader } from "@/features/delivery-zones/hooks/useGoogleMapsLoader"

const DEFAULT_MAP_HEIGHT = "clamp(340px, 56vh, 680px)"

export type DeliveryZoneMapHandle = {
  flyTo: (lat: number, lng: number, zoom: number) => void
}

type LatLng = { lat: number; lng: number }

type DeliveryZoneGoogleMapProps = {
  apiKey: string
  geometryType: "CIRCLE" | "POLYGON"
  center: LatLng
  radiusMeters: number
  polygonGeoJson: unknown | null
  onPolygonGeoJsonChange: (next: unknown | null) => void
  onCenterChange: (next: LatLng) => void
  onRadiusMetersChange: (next: number) => void
  /** CSS height, e.g. `min(520px, 55vh)` */
  mapHeight?: string
  initialZoom?: number
}

type GeoJsonPolygon = {
  type: "Polygon"
  coordinates: number[][][]
}

function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}

function createDefaultTriangle(center: LatLng): LatLng[] {
  const latDelta = 0.008
  const lngDelta = 0.01
  return [
    { lat: center.lat + latDelta, lng: center.lng },
    { lat: center.lat - latDelta / 2, lng: center.lng - lngDelta },
    { lat: center.lat - latDelta / 2, lng: center.lng + lngDelta },
  ]
}

function toGeoJsonPolygon(path: LatLng[]): GeoJsonPolygon | null {
  if (path.length < 3) return null
  const ring = path.map((p) => [p.lng, p.lat])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]])
  }
  return { type: "Polygon", coordinates: [ring] }
}

function polygonPathFromGeoJson(geo: unknown): LatLng[] {
  if (!geo || typeof geo !== "object") return []
  const feature = geo as { type?: string; geometry?: unknown }
  const source =
    feature.type === "Feature" && feature.geometry ? feature.geometry : geo
  if (!source || typeof source !== "object") return []
  const polygon = source as { type?: string; coordinates?: unknown }
  if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) return []
  const ring = polygon.coordinates[0]
  if (!Array.isArray(ring)) return []
  const path = ring
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map((pair) => ({ lng: Number(pair[0]), lat: Number(pair[1]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  if (path.length >= 2) {
    const first = path[0]
    const last = path[path.length - 1]
    if (first.lat === last.lat && first.lng === last.lng) {
      return path.slice(0, -1)
    }
  }
  return path
}

export const DeliveryZoneGoogleMap = forwardRef<
  DeliveryZoneMapHandle,
  DeliveryZoneGoogleMapProps
>(function DeliveryZoneGoogleMap(
  {
    apiKey,
    geometryType,
    center,
    radiusMeters,
    polygonGeoJson,
    onPolygonGeoJsonChange,
    onCenterChange,
    onRadiusMetersChange,
    mapHeight = DEFAULT_MAP_HEIGHT,
    initialZoom = 12,
  },
  ref,
) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const previousGeometryTypeRef = useRef<"CIRCLE" | "POLYGON" | null>(null)

  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: mapHeight,
      borderRadius: "0.5rem",
    }),
    [mapHeight],
  )

  const { isLoaded, loadError } = useGoogleMapsLoader(apiKey)

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

  useEffect(() => {
    const previousGeometryType = previousGeometryTypeRef.current
    previousGeometryTypeRef.current = geometryType
    if (geometryType !== "POLYGON") return
    if (previousGeometryType === "POLYGON") return
    const currentPath = polygonPathFromGeoJson(polygonGeoJson)
    if (currentPath.length > 0) return
    onPolygonGeoJsonChange(toGeoJsonPolygon(createDefaultTriangle(center)))
  }, [center, geometryType, onPolygonGeoJsonChange, polygonGeoJson])

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng
      if (!latLng) return
      if (geometryType === "POLYGON") {
        const current = polygonPathFromGeoJson(polygonGeoJson)
        const next = [...current, { lat: latLng.lat(), lng: latLng.lng() }]
        onPolygonGeoJsonChange(toGeoJsonPolygon(next))
        return
      }
      onCenterChange({ lat: latLng.lat(), lng: latLng.lng() })
    },
    [geometryType, onCenterChange, onPolygonGeoJsonChange, polygonGeoJson],
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
      clickable: true,
      editable: true,
      draggable: true,
    }),
    [],
  )

  const polygonPath = useMemo(
    () => polygonPathFromGeoJson(polygonGeoJson),
    [polygonGeoJson],
  )

  const polygonMidpoints = useMemo(() => {
    if (polygonPath.length < 2) return []
    return polygonPath.map((point, index) => {
      const next = polygonPath[(index + 1) % polygonPath.length]
      return { index, point: midpoint(point, next) }
    })
  }, [polygonPath])

  const updatePolygonVertex = useCallback(
    (index: number, nextPoint: LatLng) => {
      const next = [...polygonPath]
      if (index < 0 || index >= next.length) return
      next[index] = nextPoint
      onPolygonGeoJsonChange(toGeoJsonPolygon(next))
    },
    [onPolygonGeoJsonChange, polygonPath],
  )

  const insertPolygonVertex = useCallback(
    (afterIndex: number, nextPoint: LatLng) => {
      const next = [...polygonPath]
      if (afterIndex < -1 || afterIndex >= next.length) return
      next.splice(afterIndex + 1, 0, nextPoint)
      onPolygonGeoJsonChange(toGeoJsonPolygon(next))
    },
    [onPolygonGeoJsonChange, polygonPath],
  )

  const emitPolygonFromInstance = useCallback(() => {
    const polygon = polygonRef.current
    if (!polygon) return
    const path = polygon.getPath()
    const next: LatLng[] = []
    for (let i = 0; i < path.getLength(); i += 1) {
      const p = path.getAt(i)
      next.push({ lat: p.lat(), lng: p.lng() })
    }
    onPolygonGeoJsonChange(toGeoJsonPolygon(next))
  }, [onPolygonGeoJsonChange])

  const onPolygonLoad = useCallback(
    (polygon: google.maps.Polygon) => {
      polygonRef.current = polygon
      const path = polygon.getPath()
      path.addListener("set_at", emitPolygonFromInstance)
      path.addListener("insert_at", emitPolygonFromInstance)
      path.addListener("remove_at", emitPolygonFromInstance)
    },
    [emitPolygonFromInstance],
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
    <div className="space-y-2">
      {geometryType === "POLYGON" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-input bg-background h-8 rounded-md border px-3 text-xs"
            onClick={() => onPolygonGeoJsonChange(null)}
          >
            Clear polygon
          </button>
          <span className="text-muted-foreground text-xs">
            Click map to add points, drag green handles to move points, and use blue midpoint handles to insert new points.
          </span>
        </div>
      ) : null}
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
        {geometryType === "CIRCLE" ? (
          <>
            <Marker
              position={center}
              draggable
              onDragEnd={(e) => {
                const latLng = e.latLng
                if (!latLng) return
                onCenterChange({ lat: latLng.lat(), lng: latLng.lng() })
              }}
            />
            <Circle
              center={center}
              radius={radiusMeters}
              options={circleOptions}
              onLoad={(c) => {
                circleRef.current = c
              }}
              onCenterChanged={() => {
                const circle = circleRef.current
                if (!circle) return
                const next = circle.getCenter()
                if (!next) return
                onCenterChange({ lat: next.lat(), lng: next.lng() })
              }}
              onRadiusChanged={() => {
                const circle = circleRef.current
                if (!circle) return
                const next = circle.getRadius()
                if (!Number.isFinite(next)) return
                onRadiusMetersChange(Math.max(50, Math.round(next)))
              }}
            />
          </>
        ) : null}
        {geometryType === "POLYGON" && polygonPath.length > 0 ? (
          <>
            <Polygon
              path={polygonPath}
              onLoad={onPolygonLoad}
              onDragEnd={emitPolygonFromInstance}
              options={{
                strokeColor: "#0f766e",
                strokeOpacity: 0.95,
                strokeWeight: 2,
                fillColor: "#0f766e",
                fillOpacity: 0.18,
                editable: true,
                draggable: false,
              }}
            />
            {polygonPath.map((point, index) => (
              <Marker
                key={`vertex-${index}`}
                position={point}
                draggable
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: "#0f766e",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 1.5,
                }}
                onDragEnd={(e) => {
                  const latLng = e.latLng
                  if (!latLng) return
                  updatePolygonVertex(index, { lat: latLng.lat(), lng: latLng.lng() })
                }}
              />
            ))}
            {polygonPath.length >= 2
              ? polygonMidpoints.map((mid) => (
                  <Marker
                    key={`mid-${mid.index}`}
                    position={mid.point}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 4,
                      fillColor: "#2563eb",
                      fillOpacity: 0.9,
                      strokeColor: "#ffffff",
                      strokeWeight: 1.5,
                    }}
                    onClick={() => insertPolygonVertex(mid.index, mid.point)}
                  />
                ))
              : null}
          </>
        ) : null}
      </GoogleMap>
    </div>
  )
})
