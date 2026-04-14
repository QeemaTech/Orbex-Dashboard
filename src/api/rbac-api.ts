import { apiFetch } from "@/api/client"

export type PermissionRow = {
  id: string
  key: string
  label: string
  category: string
}

export type RoleRow = {
  id: string
  name: string
  nameAr: string | null
  slug: string
  description: string | null
  descriptionAr: string | null
  isSystem: boolean
  builtInRank: number | null
  permissions: string[]
  displayName: string
  displayDescription: string | null
  requiresWarehouse: boolean
  requiresAdminWarehouse: boolean
}

export async function listPermissions(token: string): Promise<PermissionRow[]> {
  const res = await apiFetch<{ permissions: PermissionRow[] }>("/api/rbac/permissions", {
    token,
  })
  return res.permissions
}

export async function listRoles(token: string, lang?: string): Promise<RoleRow[]> {
  const url = lang ? `/api/rbac/roles?lang=${lang}` : "/api/rbac/roles"
  const res = await apiFetch<{ roles: RoleRow[] }>(url, { token })
  return res.roles
}

export async function createRole(params: {
  token: string
  body: { name: string; nameAr?: string; description?: string; descriptionAr?: string; permissions?: string[] }
}): Promise<RoleRow> {
  const res = await apiFetch<{ role: RoleRow }>("/api/rbac/roles", {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
  return res.role
}

export async function updateRole(params: {
  token: string
  id: string
  body: { name?: string; nameAr?: string; description?: string; descriptionAr?: string }
}): Promise<RoleRow> {
  const res = await apiFetch<{ role: RoleRow }>(`/api/rbac/roles/${params.id}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify(params.body),
  })
  return res.role
}

export async function deleteRole(params: { token: string; id: string }): Promise<void> {
  await apiFetch<void>(`/api/rbac/roles/${params.id}`, {
    method: "DELETE",
    token: params.token,
  })
}

export async function setRolePermissions(params: {
  token: string
  id: string
  permissions: string[]
}): Promise<void> {
  await apiFetch<void>(`/api/rbac/roles/${params.id}/permissions`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ permissions: params.permissions }),
  })
}

export type UserAssignedRoleRow = {
  roleId: string
  slug: string
  name: string
  nameAr: string | null
  description: string | null
  descriptionAr: string | null
}

export async function listUserRoles(params: { token: string; userId: string }) {
  const res = await apiFetch<{ roles: UserAssignedRoleRow[] }>(
    `/api/rbac/users/${params.userId}/roles`,
    { token: params.token },
  )
  return res.roles
}

export async function addUserRole(params: { token: string; userId: string; roleId: string }) {
  await apiFetch<void>(`/api/rbac/users/${params.userId}/roles`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ roleId: params.roleId }),
  })
}

export async function removeUserRole(params: { token: string; userId: string; roleId: string }) {
  await apiFetch<void>(`/api/rbac/users/${params.userId}/roles/${params.roleId}`, {
    method: "DELETE",
    token: params.token,
  })
}

export type AuditEntry = {
  id: string
  actorUserId: string | null
  action: string
  targetType: string
  targetId: string | null
  diffJson: unknown
  createdAt: string
}

export async function listAudit(params: {
  token: string
  page: number
  pageSize: number
}): Promise<{ entries: AuditEntry[]; total: number; page: number; pageSize: number }> {
  return apiFetch(`/api/rbac/audit?page=${params.page}&pageSize=${params.pageSize}`, {
    token: params.token,
  })
}
