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
  slug: string
  description: string | null
  isSystem: boolean
  builtInRank: number | null
  permissions: string[]
}

export async function listPermissions(token: string): Promise<PermissionRow[]> {
  const res = await apiFetch<{ permissions: PermissionRow[] }>("/api/rbac/permissions", {
    token,
  })
  return res.permissions
}

export async function listRoles(token: string): Promise<RoleRow[]> {
  const res = await apiFetch<{ roles: RoleRow[] }>("/api/rbac/roles", {
    token,
  })
  return res.roles
}

export async function createRole(params: {
  token: string
  body: { name: string; slug: string; description?: string; permissions?: string[] }
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
  body: { name?: string; description?: string | null }
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

export async function listUserRoles(params: { token: string; userId: string }) {
  const res = await apiFetch<{ roles: Array<{ roleId: string; slug: string; name: string }> }>(
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
