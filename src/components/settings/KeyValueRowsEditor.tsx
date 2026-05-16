import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { KeyValueRow } from "@/lib/key-value-rows"
import { newKeyValueRowId } from "@/lib/key-value-rows"

export function KeyValueRowsEditor(props: {
  rows: KeyValueRow[]
  onChange: (rows: KeyValueRow[]) => void
  keyLabel: string
  valueLabel: string
  keyPlaceholder?: string
  valuePlaceholder?: string
  addLabel: string
  exampleTitle?: string
  exampleKey?: string
  exampleValue?: string
  rowErrors?: Record<string, { key?: string; value?: string }>
  disabled?: boolean
}) {
  const {
    rows,
    onChange,
    keyLabel,
    valueLabel,
    keyPlaceholder,
    valuePlaceholder,
    addLabel,
    exampleTitle,
    exampleKey,
    exampleValue,
    rowErrors = {},
    disabled,
  } = props

  function updateRow(id: string, patch: Partial<Pick<KeyValueRow, "key" | "value">>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function addRow() {
    onChange([...rows, { id: newKeyValueRowId(), key: "", value: "" }])
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && exampleTitle ? (
        <div className="rounded-md border border-dashed bg-background/60 p-3 text-xs">
          <p className="mb-2 font-medium text-muted-foreground">{exampleTitle}</p>
          {exampleKey && exampleValue ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">{keyLabel}: </span>
                <span className="font-mono">{exampleKey}</span>
              </div>
              <div className="min-w-0 truncate">
                <span className="text-muted-foreground">{valueLabel}: </span>
                <span className="font-mono">{exampleValue}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_auto]">
          <span>{keyLabel}</span>
          <span>{valueLabel}</span>
          <span className="w-9" />
        </div>
      ) : null}

      {rows.map((row) => {
        const err = rowErrors[row.id]
        return (
          <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground sm:hidden">{keyLabel}</label>
                <Input
                  value={row.key}
                  disabled={disabled}
                  onChange={(e) => updateRow(row.id, { key: e.target.value })}
                  placeholder={keyPlaceholder}
                />
                {err?.key ? <p className="text-destructive text-xs">{err.key}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground sm:hidden">{valueLabel}</label>
                <Input
                  value={row.value}
                  disabled={disabled}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder={valuePlaceholder}
                />
                {err?.value ? <p className="text-destructive text-xs">{err.value}</p> : null}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 self-end sm:self-start"
              disabled={disabled}
              onClick={() => removeRow(row.id)}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}
