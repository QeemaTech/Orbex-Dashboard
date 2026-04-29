import { useJsApiLoader } from "@react-google-maps/api"

const GOOGLE_MAPS_LOADER_ID = "orbex-google-maps-loader"

export function useGoogleMapsLoader(apiKey: string) {
  const key = apiKey.trim()
  return useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: key || "missing-key",
  })
}
