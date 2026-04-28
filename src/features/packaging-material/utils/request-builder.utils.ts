import type { PackagingRequestBuilderItem } from "@/features/packaging-material/types"

function nextRow(): PackagingRequestBuilderItem {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    packagingMaterialId: "",
    requestedQuantity: "",
  }
}

export function createInitialBuilderRows(): PackagingRequestBuilderItem[] {
  return [nextRow()]
}

