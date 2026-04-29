import { Circle, Polygon } from "@react-google-maps/api"

import type { DeliveryZoneRow } from "@/api/delivery-zones-api"

type LatLng = google.maps.LatLngLiteral

type DeliveryZoneGeometryOverlayProps = {
  zone: DeliveryZoneRow
  highlighted?: boolean
  onHover?: (zoneId: string | null) => void
}

type GeoJsonPolygon = {
  type: "Polygon"
  coordinates: number[][][]
}

type GeoJsonMultiPolygon = {
  type: "MultiPolygon"
  coordinates: number[][][][]
}

function toLatLngPath(ring: number[][]): LatLng[] {
  return ring
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map((pair) => ({ lng: Number(pair[0]), lat: Number(pair[1]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
}

function polygonPathsFromGeoJson(geo: unknown): LatLng[][] {
  if (!geo || typeof geo !== "object") return []
  const feature = geo as { type?: string; geometry?: unknown }
  const source =
    feature.type === "Feature" && feature.geometry ? feature.geometry : geo
  if (!source || typeof source !== "object") return []
  const g = source as { type?: string; coordinates?: unknown }
  if (!g.type || !g.coordinates) return []

  if (g.type === "Polygon") {
    const poly = g as GeoJsonPolygon
    return poly.coordinates.map(toLatLngPath).filter((p) => p.length >= 3)
  }
  if (g.type === "MultiPolygon") {
    const m = g as GeoJsonMultiPolygon
    return m.coordinates
      .flatMap((polygon) => polygon.map(toLatLngPath))
      .filter((p) => p.length >= 3)
  }
  return []
}

function toNumber(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function DeliveryZoneGeometryOverlay({
  zone,
  highlighted = false,
  onHover,
}: DeliveryZoneGeometryOverlayProps) {
  const strokeColor = highlighted ? "#0f766e" : "#2563eb"
  const fillColor = highlighted ? "#0f766e" : "#2563eb"
  const polygonPaths = polygonPathsFromGeoJson(zone.polygonGeoJson)
  const hasPolygon = polygonPaths.length > 0
  const geometryType = zone.geometryType ?? "CIRCLE"

  const lat = toNumber(zone.latitude)
  const lng = toNumber(zone.longitude)
  const hasCenter = lat != null && lng != null
  const radius = toNumber(zone.radiusMeters)
  const hasCircle = hasCenter && radius != null && radius > 0

  if (geometryType === "POLYGON") {
    if (!hasPolygon) return null
    return (
      <Polygon
        paths={polygonPaths}
        options={{
          strokeColor,
          strokeOpacity: 0.95,
          strokeWeight: highlighted ? 3 : 2,
          fillColor,
          fillOpacity: highlighted ? 0.24 : 0.16,
          clickable: true,
          zIndex: highlighted ? 20 : 10,
        }}
        onMouseOver={() => onHover?.(zone.id)}
        onMouseOut={() => onHover?.(null)}
      />
    )
  }

  if (!hasCircle) return null
  return (
    <Circle
      center={{ lat: lat!, lng: lng! }}
      radius={radius!}
      options={{
        strokeColor,
        strokeOpacity: 0.95,
        strokeWeight: highlighted ? 3 : 2,
        fillColor,
        fillOpacity: highlighted ? 0.24 : 0.16,
        clickable: true,
        zIndex: highlighted ? 19 : 9,
      }}
      onMouseOver={() => onHover?.(zone.id)}
      onMouseOut={() => onHover?.(null)}
    />
  )
}
