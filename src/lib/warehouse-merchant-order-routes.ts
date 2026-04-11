/**
 * Warehouse UI routes for merchant-order (batch) detail.
 * API fields still use `transferStatus` etc.; only the URL segment is named for clarity.
 */
export const WAREHOUSE_MERCHANT_ORDERS_SEGMENT = "merchant-orders" as const

export function warehouseMerchantOrderDetailPath(
  warehouseId: string,
  merchantOrderId: string,
): string {
  return `/warehouses/${encodeURIComponent(warehouseId)}/${WAREHOUSE_MERCHANT_ORDERS_SEGMENT}/${encodeURIComponent(merchantOrderId)}`
}

const WAREHOUSE_MERCHANT_ORDER_PATH_RE =
  /^\/warehouses\/[^/]+\/merchant-orders\//

/** Bookmarks may still use the old `/transfers/` segment. */
const LEGACY_WAREHOUSE_TRANSFERS_PATH_RE =
  /^\/warehouses\/[^/]+\/transfers\//

export function isWarehouseScopedMerchantOrderPath(pathname: string): boolean {
  return (
    WAREHOUSE_MERCHANT_ORDER_PATH_RE.test(pathname) ||
    LEGACY_WAREHOUSE_TRANSFERS_PATH_RE.test(pathname)
  )
}
