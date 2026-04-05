import { apiFetch } from "@/api/client"

/** Roles creatable from the admin Users page (non-admin staff). */
export type ManagedStaffRole =
  | "WAREHOUSE"
  | "WAREHOUSE_ADMIN"
  | "CUSTOMER_SERVICE"
  | "SALES"
  | "ACCOUNTS"

export type UserPublicRow = {
  id: string
  email: string
  fullName: string
  role: string
  warehouseId: string | null
  warehouse: { id: string; name: string } | null
  adminWarehouse: { id: string; name: string } | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UserListResponse = {
  users: UserPublicRow[]
  total: number
  page: number
  pageSize: number
}

export type ManagedStaffUserStatsResponse = {
  byRole: Record<ManagedStaffRole, number>
  activeOnly: true
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const u = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    u.set(key, String(value))
  }
  const query = u.toString()
  return query ? `?${query}` : ""
}

export async function listUsers(params: {
  token: string
  page?: number
  pageSize?: number
  managedStaffOnly?: boolean
  /** Email or full name (partial match). */
  search?: string
  role?: string
  isActive?: boolean
}): Promise<UserListResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    managedStaffOnly: params.managedStaffOnly === true ? "true" : undefined,
    search: params.search,
    role: params.role,
    isActive:
      params.isActive === true
        ? "true"
        : params.isActive === false
          ? "false"
          : undefined,
  })
  return apiFetch<UserListResponse>(`/api/users${query}`, {
    token: params.token,
  })
}

export async function getManagedStaffUserStats(params: {
  token: string
}): Promise<ManagedStaffUserStatsResponse> {
  return apiFetch<ManagedStaffUserStatsResponse>("/api/users/stats", {
    token: params.token,
  })
}

export async function getUserById(params: {
  token: string
  id: string
}): Promise<UserPublicRow> {
  return apiFetch<UserPublicRow>(`/api/users/${params.id}`, {
    token: params.token,
  })
}

export type CreateStaffUserBody = {
  email: string
  fullName: string
  password: string
  role: ManagedStaffRole
  warehouseId?: string
  adminWarehouseId?: string
  isActive?: boolean
}

export async function createStaffUser(params: {
  token: string
  body: CreateStaffUserBody
}): Promise<UserPublicRow> {
  return apiFetch<UserPublicRow>("/api/users", {
    method: "POST",
    token: params.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params.body),
  })
}

export type UpdateUserBody = {
  email?: string
  fullName?: string
  password?: string
  role?: ManagedStaffRole
  warehouseId?: string | null
  adminWarehouseId?: string | null
  isActive?: boolean
}

export async function updateUser(params: {
  token: string
  id: string
  body: UpdateUserBody
}): Promise<UserPublicRow> {
  return apiFetch<UserPublicRow>(`/api/users/${params.id}`, {
    method: "PATCH",
    token: params.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params.body),
  })
}

export async function deactivateUser(params: {
  token: string
  id: string
}): Promise<UserPublicRow> {
  return apiFetch<UserPublicRow>(`/api/users/${params.id}`, {
    method: "DELETE",
    token: params.token,
  })
}
