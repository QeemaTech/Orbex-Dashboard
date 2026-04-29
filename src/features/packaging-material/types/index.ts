import type {
  PackagingMaterial,
  PackagingMaterialUnitType,
} from "@/api/packaging-materials-api"
import type {
  PackagingMaterialRequest,
  PackagingMaterialRequestItem,
  PackagingMaterialRequestStatus,
} from "@/api/packaging-material-requests-api"
import type { PackagingMaterialStockRow } from "@/api/packaging-material-stock-api"

export type PackagingMaterialFormValues = {
  arabicName: string
  englishName: string
  sku: string
  unitType: PackagingMaterialUnitType
  sellingPrice: string
  minimumRequestQuantity: string
  defaultWarehouseId: string
  isActive: boolean
}

export type PackagingRequestBuilderItem = {
  key: string
  packagingMaterialId: string
  requestedQuantity: string
}

export type PackagingRequestBuilderErrorCode =
  | "required_material"
  | "duplicate_material"
  | "required_quantity"
  | "invalid_quantity"
  | "minimum_quantity"

export type PackagingRequestBuilderFieldError = {
  code: PackagingRequestBuilderErrorCode
  minimumQuantity?: string
}

export type PackagingRequestBuilderRowValidation = {
  material?: PackagingRequestBuilderFieldError
  quantity?: PackagingRequestBuilderFieldError
}

export type PackagingRequestBuilderValidationResult = {
  rows: Record<string, PackagingRequestBuilderRowValidation>
  hasBlockingErrors: boolean
}

export type PackagingRequestDetails = {
  request: PackagingMaterialRequest
  items: PackagingMaterialRequestItem[]
}

export type PackagingInventoryRow = PackagingMaterialStockRow
export type PackagingMaterialRow = PackagingMaterial
export type PackagingRequestRow = PackagingMaterialRequest
export type PackagingRequestStepStatus = PackagingMaterialRequestStatus

