import type { AuthUser } from "@/lib/auth-context"

/**
 * Platform operators (`super_admin`, `admin`) — can browse any hub without `adminWarehouse` / `warehouseId`.
 * Matches backend hub-scope bypass (`users.write` / `settings.manage_system`); excludes `warehouse_admin`.
 */
export function hasPlatformWarehouseScope(user: AuthUser | null | undefined): boolean {
  const p = user?.permissions
  if (!p?.length) return false
  return p.includes("users.write") || p.includes("settings.manage_system")
}

/**
 * Hub site admin: `warehouse.admin_user_id` → `adminWarehouse` on `/me` / login.
 * Use {@link hasPlatformWarehouseScope} for RBAC platform access; do not use legacy `User.role`.
 */
export function isWarehouseAdmin(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.adminWarehouse?.id)
}

/**
 * Hub operator (assigned to a site, not the admin user).
 * Requires `warehouseId` and not an admin link.
 */
export function isWarehouseStaff(user: AuthUser | null | undefined): boolean {
  if (!user?.warehouseId) return false
  return !isWarehouseAdmin(user)
}

/** @deprecated Use `isWarehouseAdmin` (DB `adminWarehouse` only). */
export function isWarehouseSiteAdmin(user: AuthUser | null | undefined): boolean {
  return isWarehouseAdmin(user)
}

/** @deprecated Use `isWarehouseStaff` (assignment + not admin). */
export function isWarehouseSiteStaff(user: AuthUser | null | undefined): boolean {
  return isWarehouseStaff(user)
}

/**
 * @deprecated Removed role/RBAC; use `isWarehouseStaff` for nav.
 * Kept only if a caller still needs a name during migration — same as `isWarehouseStaff`.
 */
export function isWarehouseStaffRole(user: AuthUser | null | undefined): boolean {
  return isWarehouseStaff(user)
}
