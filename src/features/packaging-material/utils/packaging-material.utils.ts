import type { AuthUser } from "@/lib/auth-context"
import type { PackagingMaterialRequestStatus } from "@/api/packaging-material-requests-api"

export function canReadPackagingMaterials(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_materials.read"))
}

export function canWritePackagingMaterials(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_materials.write"))
}

export function canCreatePackagingRequests(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.create"))
}

export function canReadAllPackagingRequests(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.read_all"))
}

export function canPatchPackagingRequestStatus(user: AuthUser | null | undefined): boolean {
  const permissions = user?.permissions ?? []
  return (
    permissions.includes("packaging_material_requests.approve") ||
    permissions.includes("packaging_material_requests.reject") ||
    permissions.includes("packaging_material_requests.prepare") ||
    permissions.includes("packaging_material_requests.deliver") ||
    permissions.includes("packaging_material_requests.cancel_any")
  )
}

export function resolvePackagingStepIndex(status: PackagingMaterialRequestStatus): number {
  if (status === "PENDING") return 0
  if (status === "APPROVED") return 1
  if (status === "PREPARING" || status === "READY_FOR_DELIVERY") return 2
  return 3
}

