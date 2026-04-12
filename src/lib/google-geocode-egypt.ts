/**
 * Google Maps Geocoding for Egypt (language=ar). Requires `google.maps` script loaded.
 */

function pickArabicLocality(components: google.maps.GeocoderAddressComponent[]): string {
  const order = [
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_3",
    "sublocality",
    "neighborhood",
  ] as const
  for (const typ of order) {
    const c = components.find((x) => x.types.includes(typ))
    if (c?.long_name) return c.long_name
  }
  return ""
}

export function extractArabicLabel(result: google.maps.GeocoderResult): string {
  const fromComp = pickArabicLocality(result.address_components)
  if (fromComp) return fromComp
  const fa = result.formatted_address ?? ""
  const first = fa.split(",")[0]?.trim()
  return first || fa
}

export function geocodeEgyptPlace(opts: {
  cityEn?: string
  governorateEn: string
}): Promise<{
  lat: number
  lng: number
  labelAr: string
} | null> {
  if (typeof google === "undefined" || !google.maps?.Geocoder) {
    return Promise.resolve(null)
  }
  const geo = new google.maps.Geocoder()
  const line = opts.cityEn
    ? `${opts.cityEn}, ${opts.governorateEn}, Egypt`
    : `${opts.governorateEn}, Egypt`
  return new Promise((resolve) => {
    geo.geocode(
      {
        address: line,
        region: "EG",
        language: "ar",
        componentRestrictions: { country: "eg" },
      },
      (results, status) => {
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          resolve(null)
          return
        }
        const loc = results[0].geometry.location
        resolve({
          lat: loc.lat(),
          lng: loc.lng(),
          labelAr: extractArabicLabel(results[0]),
        })
      },
    )
  })
}
