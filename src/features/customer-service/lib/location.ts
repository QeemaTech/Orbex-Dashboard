export type ShipmentLocationPayload = {
  locationText: string
  locationLink: string | null
}

export type GeoCoordinates = {
  lat: number
  lng: number
}

const LOCATION_MARKER = "<!--orbex_location="
const LOCATION_MARKER_END = "-->"

function clean(value: string | null | undefined): string {
  return (value ?? "").trim()
}

export function extractShipmentLocation(
  notes: string | null | undefined,
): ShipmentLocationPayload {
  const raw = notes ?? ""
  const start = raw.indexOf(LOCATION_MARKER)
  if (start < 0) return { locationText: "", locationLink: null }
  const end = raw.indexOf(LOCATION_MARKER_END, start)
  if (end < 0) return { locationText: "", locationLink: null }
  const json = raw
    .slice(start + LOCATION_MARKER.length, end)
    .trim()
  try {
    const parsed = JSON.parse(json) as {
      locationText?: string
      locationLink?: string | null
    }
    return {
      locationText: clean(parsed.locationText),
      locationLink: clean(parsed.locationLink) || null,
    }
  } catch {
    return { locationText: "", locationLink: null }
  }
}

function stripLocationMarker(notes: string | null | undefined): string {
  const raw = notes ?? ""
  return raw.replace(/<!--orbex_location=.*?-->/g, "").trim()
}

export function upsertShipmentLocationNotes(
  notes: string | null | undefined,
  payload: ShipmentLocationPayload,
): string | null {
  const locationText = clean(payload.locationText)
  const locationLink = clean(payload.locationLink) || null
  const base = stripLocationMarker(notes)
  if (!locationText && !locationLink) {
    return base || null
  }
  const marker = `${LOCATION_MARKER}${JSON.stringify({
    locationText,
    locationLink,
  })}${LOCATION_MARKER_END}`
  return base ? `${base}\n${marker}` : marker
}

function toFiniteNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function toCoordinates(latRaw: string, lngRaw: string): GeoCoordinates | null {
  const lat = toFiniteNumber(latRaw)
  const lng = toFiniteNumber(lngRaw)
  if (lat == null || lng == null) return null
  return isValidCoordinates(lat, lng) ? { lat, lng } : null
}

function extractFromText(value: string): GeoCoordinates | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  return toCoordinates(match[1], match[2])
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeUrlCandidate(value: string): string {
  const compact = value.trim()
  if (!compact) return compact
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(compact)) return compact
  if (compact.startsWith("//")) return `https:${compact}`
  if (/^(www\.)?(maps\.app\.goo\.gl|google\.[^/\s]+|maps\.[^/\s]+)/i.test(compact)) {
    return `https://${compact}`
  }
  return compact
}

function extractFromGoogleMapsUrl(value: string): GeoCoordinates | null {
  const normalized = normalizeUrlCandidate(value)
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return null
  }

  const path = `${parsed.pathname}${parsed.hash}`
  const atMatch = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    const coords = toCoordinates(atMatch[1], atMatch[2])
    if (coords) return coords
  }

  const dataMatch = `${parsed.pathname}${parsed.search}${parsed.hash}`.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  )
  if (dataMatch) {
    const coords = toCoordinates(dataMatch[1], dataMatch[2])
    if (coords) return coords
  }

  const queryKeys = ["q", "query", "ll", "destination", "origin", "daddr", "saddr"]
  for (const key of queryKeys) {
    const raw = parsed.searchParams.get(key)
    if (!raw) continue
    const decoded = decodeSafe(raw)
    const coords = extractFromText(decoded) ?? extractFromText(raw)
    if (coords) return coords
  }

  return null
}

export function parseCoordinatesFromLocationInput(
  input: string | null | undefined,
): GeoCoordinates | null {
  const raw = clean(input)
  if (!raw) return null
  const decoded = decodeSafe(raw)

  if (decoded.startsWith("geo:")) {
    const geoPayload = decoded.slice(4).split("?")[0]
    const geoCoords = extractFromText(geoPayload)
    if (geoCoords) return geoCoords
  }

  const fromUrl = extractFromGoogleMapsUrl(decoded)
  if (fromUrl) return fromUrl

  return extractFromText(decoded)
}

/** Warehouse hub coordinates from API string fields. */
export function parseWarehouseLatLng(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
): GeoCoordinates | null {
  const lat = toFiniteNumber(latitude ?? null)
  const lng = toFiniteNumber(longitude ?? null)
  if (lat == null || lng == null) return null
  return isValidCoordinates(lat, lng) ? { lat, lng } : null
}

export function googleMapsSearchUrl(coords: GeoCoordinates): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}`
}
