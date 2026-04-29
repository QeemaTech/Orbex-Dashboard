import { apiFetch } from "@/api/client"

import type { PackagingMaterial } from "@/api/packaging-materials-api"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ""
}

export type PackagingMaterialStockRow = {
  id: string
  warehouseId: string
  packagingMaterialId: string
  availableQuantity: string
  reservedQuantity: string
  lastUpdated: string
  warehouse: { id: string; name: string }
  packagingMaterial: Pick<
    PackagingMaterial,
    "id" | "arabicName" | "englishName" | "sku" | "unitType"
  >
}

export type ListPackagingMaterialStockParams = {
  token: string
  page?: number
  pageSize?: number
  warehouseId?: string
  packagingMaterialId?: string
}

export type ListPackagingMaterialStockResponse = {
  stock: PackagingMaterialStockRow[]
  total: number
  page: number
  pageSize: number
}

export type UpsertPackagingMaterialStockInput = {
  warehouseId: string
  packagingMaterialId: string
  availableQuantity: string | number
  reservedQuantity?: string | number
}

export async function listPackagingMaterialStock(
  params: ListPackagingMaterialStockParams,
): Promise<ListPackagingMaterialStockResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    warehouseId: params.warehouseId,
    packagingMaterialId: params.packagingMaterialId,
  })
  return apiFetch<ListPackagingMaterialStockResponse>(`/api/packaging-materials/stock${query}`, {
    token: params.token,
  })
}

export async function upsertPackagingMaterialStock(params: {
  token: string
  body: UpsertPackagingMaterialStockInput
}): Promise<PackagingMaterialStockRow> {
  return apiFetch<PackagingMaterialStockRow>("/api/packaging-materials/stock", {
    method: "PUT",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

