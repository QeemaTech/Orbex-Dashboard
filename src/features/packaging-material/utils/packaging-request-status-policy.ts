import type { PackagingMaterialRequestStatus } from "@/api/packaging-material-requests-api"

const REQUEST_TRANSITIONS: Record<
  PackagingMaterialRequestStatus,
  PackagingMaterialRequestStatus[]
> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PREPARING", "CANCELLED", "REJECTED"],
  PREPARING: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
}

export function legalNextPackagingStatuses(
  from: PackagingMaterialRequestStatus,
): PackagingMaterialRequestStatus[] {
  return [...REQUEST_TRANSITIONS[from]]
}
