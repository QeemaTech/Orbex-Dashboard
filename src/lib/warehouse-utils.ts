export function isMainBranch(warehouse: { mainBranchId: string | null }): boolean {
  return !warehouse.mainBranchId
}