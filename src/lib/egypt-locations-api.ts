/**
 * Egyptian governorates & cities via CountriesNow (free, no API key).
 * @see https://countriesnow.space/
 */

const BASE = "https://countriesnow.space/api/v0.1/countries"

type StatesResponse = {
  error: boolean
  msg?: string
  data?: {
    name?: string
    states?: Array<{ name: string; state_code?: string }>
  }
}

type CitiesResponse = {
  error: boolean
  msg?: string
  data?: string[]
}

export async function fetchEgyptGovernorates(): Promise<string[]> {
  const res = await fetch(`${BASE}/states`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: "Egypt" }),
  })
  if (!res.ok) {
    throw new Error(`Governorates request failed: ${res.status}`)
  }
  const json = (await res.json()) as StatesResponse
  if (json.error) {
    throw new Error(json.msg ?? "Governorates API error")
  }
  const states = json.data?.states
  if (!Array.isArray(states)) {
    throw new Error("Unexpected governorates response")
  }
  return [...states.map((s) => s.name)].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  )
}

export async function fetchCitiesForGovernorate(governorate: string): Promise<string[]> {
  const trimmed = governorate.trim()
  if (!trimmed) return []
  const res = await fetch(`${BASE}/state/cities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: "Egypt", state: trimmed }),
  })
  if (!res.ok) {
    throw new Error(`Cities request failed: ${res.status}`)
  }
  const json = (await res.json()) as CitiesResponse
  if (json.error) {
    return []
  }
  const list = json.data
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
}

export const EGYPT_LOCATIONS_CUSTOM_CITY = "__custom_city__"
