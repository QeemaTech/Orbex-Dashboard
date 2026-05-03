/**
 * Deep links for pickup (movement) manifest UI.
 */
export function pickupManifestReturnGroupPath(p: {
  movementManifestId: string
  /** `RETURN_TO_MERCHANT_GROUP.merchantId` (UUID or `orphan:${shipmentId}`). */
  returnGroupMerchantId: string
  /** When set, use warehouse-scoped URL; otherwise global courier-manifests pickup URL. */
  warehouseId: string | undefined
  isGlobalPickupContext: boolean
}): string {
  const mid = encodeURIComponent(p.movementManifestId)
  const gid = encodeURIComponent(p.returnGroupMerchantId)
  const wh = p.warehouseId?.trim()
  if (p.isGlobalPickupContext || !wh) {
    return `/courier-manifests/pickup/${mid}/returns/${gid}`
  }
  return `/warehouses/${encodeURIComponent(wh)}/manifests/pickup/${mid}/returns/${gid}`
}
