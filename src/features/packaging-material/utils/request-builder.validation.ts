import type { PackagingMaterial } from "@/api/packaging-materials-api"
import type {
  PackagingRequestBuilderItem,
  PackagingRequestBuilderRowValidation,
  PackagingRequestBuilderValidationResult,
} from "@/features/packaging-material/types"

function hasValue(value: string): boolean {
  return value.trim().length > 0
}

function toNumber(value: string): number {
  return Number(value)
}

export function validatePackagingRequestBuilderRows(
  rows: PackagingRequestBuilderItem[],
  materials: PackagingMaterial[],
): PackagingRequestBuilderValidationResult {
  const validations: Record<string, PackagingRequestBuilderRowValidation> = {}
  const materialToRowKeys = new Map<string, string[]>()

  for (const row of rows) {
    if (!hasValue(row.packagingMaterialId)) continue
    materialToRowKeys.set(row.packagingMaterialId, [
      ...(materialToRowKeys.get(row.packagingMaterialId) ?? []),
      row.key,
    ])
  }

  for (const row of rows) {
    const rowValidation: PackagingRequestBuilderRowValidation = {}
    const materialId = row.packagingMaterialId.trim()
    const quantityRaw = row.requestedQuantity.trim()

    if (!materialId) {
      rowValidation.material = { code: "required_material" }
    }

    if (materialId && (materialToRowKeys.get(materialId)?.length ?? 0) > 1) {
      rowValidation.material = { code: "duplicate_material" }
    }

    if (!quantityRaw) {
      rowValidation.quantity = { code: "required_quantity" }
    } else {
      const quantity = toNumber(quantityRaw)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        rowValidation.quantity = { code: "invalid_quantity" }
      } else if (materialId) {
        const selectedMaterial = materials.find((item) => item.id === materialId)
        const minimum = Number(selectedMaterial?.minimumRequestQuantity ?? 0)
        if (Number.isFinite(minimum) && minimum > 0 && quantity < minimum) {
          rowValidation.quantity = {
            code: "minimum_quantity",
            minimumQuantity: minimum.toString(),
          }
        }
      }
    }

    if (rowValidation.material || rowValidation.quantity) {
      validations[row.key] = rowValidation
    }
  }

  return {
    rows: validations,
    hasBlockingErrors: Object.keys(validations).length > 0,
  }
}
