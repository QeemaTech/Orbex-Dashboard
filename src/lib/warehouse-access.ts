import type { AuthUser } from "@/lib/auth-context"

/**
 * Hub site admin: `warehouse.admin_user_id` → `adminWarehouse` on `/me` / login.
 * Only source of truth — do not use legacy `User.role` or RBAC slugs here.
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
