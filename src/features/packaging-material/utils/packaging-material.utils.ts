import type { AuthUser } from "@/lib/auth-context"
import type { PackagingMaterialRequestStatus } from "@/api/packaging-material-requests-api"
import { legalNextPackagingStatuses } from "@/features/packaging-material/utils/packaging-request-status-policy"

export function canReadPackagingMaterials(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_materials.read"))
}

export function canWritePackagingMaterials(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_materials.write"))
}

export function canReadPackagingMaterialStock(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_materials.stock.read"))
}

export function canWritePackagingMaterialStock(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_materials.stock.write"))
}

export function canCreatePackagingRequests(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.create"))
}

export function canReadAllPackagingRequests(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.read_all"))
}

export function canReadOwnPackagingRequests(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.read_own"))
}

export function canPatchPackagingRequestStatus(user: AuthUser | null | undefined): boolean {
  const permissions = user?.permissions ?? []
  return (
    permissions.includes("packaging_material_requests.approve") ||
    permissions.includes("packaging_material_requests.reject") ||
    permissions.includes("packaging_material_requests.prepare") ||
    permissions.includes("packaging_material_requests.deliver") ||
    permissions.includes("packaging_material_requests.cancel_any") ||
    permissions.includes("packaging_material_requests.cancel_own")
  )
}

export function canRecordPackagingRequestPayment(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.record_payment"))
}

export function canApprovePackagingRequestLines(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.approve"))
}

export function canDeliverPackagingRequest(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.deliver"))
}

export function canRejectPackagingRequest(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.reject"))
}

export function canPreparePackagingRequest(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.prepare"))
}

export function canCancelAnyPackagingRequest(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.cancel_any"))
}

export function canCancelOwnPackagingRequest(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.permissions?.includes("packaging_material_requests.cancel_own"))
}

/** @deprecated Prefer backend-driven `allowedNextStatuses`. */
export function patchablePackagingNextStatuses(
  current: PackagingMaterialRequestStatus,
  user: AuthUser | null | undefined,
  request?: { merchantId: string },
): PackagingMaterialRequestStatus[] {
  return legalNextPackagingStatuses(current).filter((to) => {
    if (to === "APPROVED" || to === "DELIVERED") return false
    if (to === "REJECTED" && !canRejectPackagingRequest(user)) return false
    if (to === "PREPARING" || to === "READY_FOR_DELIVERY") {
      if (!canPreparePackagingRequest(user)) return false
    }
    if (to === "CANCELLED") {
      if (canCancelAnyPackagingRequest(user)) return true
      if (
        canCancelOwnPackagingRequest(user) &&
        user?.merchantId &&
        request?.merchantId === user.merchantId
      ) {
        return true
      }
      return false
    }
    return true
  })
}

export function resolvePackagingStepIndex(status: PackagingMaterialRequestStatus): number {
  if (status === "PENDING") return 0
  if (status === "APPROVED") return 1
  if (status === "PREPARING" || status === "READY_FOR_DELIVERY") return 2
  return 3
}

