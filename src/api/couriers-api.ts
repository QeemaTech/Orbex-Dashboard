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

export type CourierAdminRow = {
  courierId: string
  userId: string
  email: string
  fullName: string
  contactPhone: string | null
  profilePhotoUrl: string | null
  driverLicenseUrl: string | null
  vehicleLicenseUrl: string | null
  isActive: boolean
  regions: Array<{ id: string; name: string }>
  createdAt: string
  updatedAt: string
}

export type ListCouriersResult = {
  couriers: CourierAdminRow[]
  total: number
  page: number
  pageSize: number
}

export async function listCouriers(params: {
  token: string
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}): Promise<ListCouriersResult> {
  const query = new URLSearchParams()
  if (params.page) query.set("page", String(params.page))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))
  if (params.search) query.set("search", params.search)
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive))

  return apiFetch<ListCouriersResult>(`/api/users/couriers?${query.toString()}`, {
    token: params.token,
  })
}

export type CreateCourierBody = {
  email: string
  fullName: string
  password: string
  role: "COURIER"
  courier: {
    fullName?: string | null
    contactPhone?: string | null
    profilePhotoUrl: string
    driverLicenseUrl: string
    vehicleLicenseUrl: string
    isActive?: boolean
  }
  regionIds?: string[]
}

export async function createCourier(params: {
  token: string
  body: CreateCourierBody
}): Promise<unknown> {
  return apiFetch("/api/users", {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export type UpdateCourierBody = {
  fullName?: string | null
  contactPhone?: string | null
  profilePhotoUrl?: string
  driverLicenseUrl?: string
  vehicleLicenseUrl?: string
  isActive?: boolean
  regionIds?: string[]
}

export async function updateCourier(params: {
  token: string
  courierId: string
  body: UpdateCourierBody
}): Promise<CourierAdminRow> {
  return apiFetch<CourierAdminRow>(`/api/users/couriers/${params.courierId}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export async function deactivateCourier(params: {
  token: string
  userId: string
}): Promise<void> {
  await apiFetch(`/api/users/${params.userId}`, {
    method: "DELETE",
    token: params.token,
  })
}

export async function uploadCourierDocument(params: {
  token: string
  file: File
}): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append("file", params.file)

  return apiFetch<{ url: string }>("/api/users/upload-doc", {
    method: "POST",
    token: params.token,
    body: formData,
  })
}
