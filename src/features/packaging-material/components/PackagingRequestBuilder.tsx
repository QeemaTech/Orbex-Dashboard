import { Plus, Trash2 } from "react-lucid"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PackagingMaterial } from "@/api/packaging-materials-api"
import type {
  PackagingRequestBuilderFieldError,
  PackagingRequestBuilderItem,
  PackagingRequestBuilderValidationResult,
} from "@/features/packaging-material/types"
import { createInitialBuilderRows } from "@/features/packaging-material/utils/request-builder.utils"

function nextRow(): PackagingRequestBuilderItem {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    packagingMaterialId: "",
    requestedQuantity: "",
  }
}

export function PackagingRequestBuilder(props: {
  materials: PackagingMaterial[]
  value: PackagingRequestBuilderItem[]
  onChange: (rows: PackagingRequestBuilderItem[]) => void
  disabled?: boolean
  validation?: PackagingRequestBuilderValidationResult
  touchedRowKeys?: Set<string>
  resolveErrorMessage?: (error: PackagingRequestBuilderFieldError) => string
  onTouchRow?: (rowKey: string) => void
}) {
  const rows = props.value.length > 0 ? props.value : createInitialBuilderRows()

  function updateRow(key: string, patch: Partial<PackagingRequestBuilderItem>) {
    props.onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addRow() {
    props.onChange([...rows, nextRow()])
  }

  function removeRow(key: string) {
    if (rows.length <= 1) return
    props.onChange(rows.filter((row) => row.key !== key))
  }

  const total = rows.reduce((sum, row) => {
    const material = props.materials.find((item) => item.id === row.packagingMaterialId)
    const quantity = Number(row.requestedQuantity || 0)
    const price = Number(material?.sellingPrice ?? 0)
    if (!Number.isFinite(quantity) || quantity <= 0) return sum
    return sum + quantity * price
  }, 0)

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const selected = props.materials.find((item) => item.id === row.packagingMaterialId)
        const rowSubtotal = Number(row.requestedQuantity || 0) * Number(selected?.sellingPrice ?? 0)
        const rowValidation = props.validation?.rows[row.key]
        const showErrors = props.touchedRowKeys?.has(row.key) ?? false
        const materialError = showErrors ? rowValidation?.material : undefined
        const quantityError = showErrors ? rowValidation?.quantity : undefined
        return (
          <div key={row.key} className="grid grid-cols-12 gap-2 rounded-lg border p-3">
            <div className="col-span-12 sm:col-span-5">
              <label className="mb-1 block text-xs font-medium">Material #{index + 1}</label>
              <select
                className={`bg-background h-10 w-full rounded-md border px-3 text-sm ${
                  materialError ? "border-destructive" : "border-input"
                }`}
                value={row.packagingMaterialId}
                onChange={(event) => {
                  props.onTouchRow?.(row.key)
                  updateRow(row.key, { packagingMaterialId: event.target.value })
                }}
                disabled={props.disabled}
              >
                <option value="">Select material…</option>
                {props.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.englishName} ({material.sku})
                  </option>
                ))}
              </select>
              {materialError && props.resolveErrorMessage ? (
                <p className="mt-1 text-xs text-destructive">
                  {props.resolveErrorMessage(materialError)}
                </p>
              ) : null}
            </div>
            <div className="col-span-12 sm:col-span-3">
              <label className="mb-1 block text-xs font-medium">Quantity</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.requestedQuantity}
                onChange={(event) => {
                  props.onTouchRow?.(row.key)
                  updateRow(row.key, { requestedQuantity: event.target.value })
                }}
                disabled={props.disabled}
                className={quantityError ? "border-destructive" : undefined}
              />
              {quantityError && props.resolveErrorMessage ? (
                <p className="mt-1 text-xs text-destructive">
                  {props.resolveErrorMessage(quantityError)}
                </p>
              ) : null}
            </div>
            <div className="col-span-9 sm:col-span-3">
              <label className="mb-1 block text-xs font-medium">Subtotal</label>
              <div className="border-input bg-muted flex h-10 items-center rounded-md border px-3 text-sm">
                {Number.isFinite(rowSubtotal) ? rowSubtotal.toFixed(2) : "0.00"}
              </div>
            </div>
            <div className="col-span-3 sm:col-span-1 flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.key)}
                disabled={props.disabled || rows.length <= 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addRow} disabled={props.disabled}>
          <Plus className="size-4" />
          Add item
        </Button>
        <p className="text-sm font-semibold">Estimated total: {total.toFixed(2)}</p>
      </div>
    </div>
  )
}

