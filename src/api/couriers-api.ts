import { apiFetch } from "@/api/client"

export type CourierLatestLocation = {
  lat: string
  lng: string
  recordedAt: string
}

export async function fetchCourierLatestLocation(
  token: string,
  courierId: string,
): Promise<CourierLatestLocation> {
  return apiFetch<CourierLatestLocation>(
    `/api/couriers/${courierId}/location/latest`,
    { token },
  )
}
