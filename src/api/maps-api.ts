import { apiFetch } from "@/api/client"

export type ResolvedMapsLinkResponse = {
  finalUrl: string
  coords: { lat: number; lng: number } | null
}

export async function resolveMapsLink(p: {
  token: string
  url: string
}): Promise<ResolvedMapsLinkResponse> {
  return apiFetch<ResolvedMapsLinkResponse>("/api/utils/resolve-maps-link", {
    method: "POST",
    token: p.token,
    body: JSON.stringify({ url: p.url }),
  })
}

