import { apiFetch } from "@/api/client"

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ""
}

export const packagingMaterialUnitTypes = [
  "PIECE",
  "METER",
  "GRAM",
  "KG",
  "LITER",
  "ROLL",
  "PACK",
  "BOX",
] as const

export type PackagingMaterialUnitType = (typeof packagingMaterialUnitTypes)[number]

export type PackagingMaterial = {
  id: string
  arabicName: string
  englishName: string
  sku: string
  unitType: PackagingMaterialUnitType
  purchaseCost: string | null
  sellingPrice: string
  minimumRequestQuantity: string | null
  defaultWarehouseId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ListPackagingMaterialsParams = {
  token: string
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
  defaultWarehouseId?: string
}

export type ListPackagingMaterialsResponse = {
  materials: PackagingMaterial[]
  total: number
  page: number
  pageSize: number
}

export type CreatePackagingMaterialInput = {
  arabicName: string
  englishName: string
  sku?: string
  unitType: PackagingMaterialUnitType
  purchaseCost?: number | string | null
  sellingPrice: number | string
  minimumRequestQuantity?: number | string | null
  defaultWarehouseId?: string | null
  isActive?: boolean
}

export type UpdatePackagingMaterialInput = Partial<CreatePackagingMaterialInput>

export async function listPackagingMaterials(
  params: ListPackagingMaterialsParams,
): Promise<ListPackagingMaterialsResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    isActive: params.isActive,
    defaultWarehouseId: params.defaultWarehouseId,
  })
  return apiFetch<ListPackagingMaterialsResponse>(`/api/packaging-materials${query}`, {
    token: params.token,
  })
}

export async function getPackagingMaterialById(params: {
  token: string
  id: string
}): Promise<PackagingMaterial> {
  return apiFetch<PackagingMaterial>(`/api/packaging-materials/${encodeURIComponent(params.id)}`, {
    token: params.token,
  })
}

export async function createPackagingMaterial(params: {
  token: string
  body: CreatePackagingMaterialInput
}): Promise<PackagingMaterial> {
  return apiFetch<PackagingMaterial>("/api/packaging-materials", {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export async function updatePackagingMaterial(params: {
  token: string
  id: string
  body: UpdatePackagingMaterialInput
}): Promise<PackagingMaterial> {
  return apiFetch<PackagingMaterial>(`/api/packaging-materials/${encodeURIComponent(params.id)}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

