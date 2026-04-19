import type { AuthUser } from "@/lib/auth-context"

function rbacSlugs(user: AuthUser): Set<string> {
  return new Set([
    ...(user.roles ?? []),
    ...(user.rbacRoles?.map((r) => r.slug) ?? []),
  ])
}

/** Legacy or RBAC identity as hub operator (not necessarily assigned yet). Excludes site admins. */
export function isWarehouseStaffRole(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (isWarehouseSiteAdmin(user)) return false
  if (user.role === "WAREHOUSE") return true
  const slugs = rbacSlugs(user)
  return slugs.has("warehouse_staff") || slugs.has("warehouse")
}

/** Site admin: legacy role or RBAC `warehouse_admin`. */
export function isWarehouseSiteAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.role === "WAREHOUSE_ADMIN") return true
  return rbacSlugs(user).has("warehouse_admin")
}

/**
 * Operator scoped to a single hub via `warehouseId` (legacy `WAREHOUSE` or RBAC `warehouse_staff` / `warehouse`).
 * Excludes warehouse site admins.
 */
export function isWarehouseSiteStaff(user: AuthUser | null | undefined): boolean {
  if (!user?.warehouseId) return false
  return isWarehouseStaffRole(user)
}
