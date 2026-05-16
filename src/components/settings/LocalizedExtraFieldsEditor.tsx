import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LocalizedText } from "@/api/system-settings-api"
import type { LocalizedExtraFieldRow } from "@/lib/localized-extra-fields"
import { newLocalizedExtraFieldRowId } from "@/lib/localized-extra-fields"

const emptyRow = (): LocalizedExtraFieldRow => ({
  id: newLocalizedExtraFieldRowId(),
  key: { en: "", ar: "" },
  value: { en: "", ar: "" },
})

export function LocalizedExtraFieldsEditor(props: {
  rows: LocalizedExtraFieldRow[]
  onChange: (rows: LocalizedExtraFieldRow[]) => void
  keyEnLabel: string
  keyArLabel: string
  valueEnLabel: string
  valueArLabel: string
  keyEnPlaceholder?: string
  keyArPlaceholder?: string
  valueEnPlaceholder?: string
  valueArPlaceholder?: string
  addLabel: string
  exampleTitle?: string
  exampleKeyEn?: string
  exampleKeyAr?: string
  exampleValueEn?: string
  exampleValueAr?: string
  rowErrors?: Record<string, { keyEn?: string; keyAr?: string; valueEn?: string; valueAr?: string }>
  disabled?: boolean
}) {
  const {
    rows,
    onChange,
    keyEnLabel,
    keyArLabel,
    valueEnLabel,
    valueArLabel,
    keyEnPlaceholder,
    keyArPlaceholder,
    valueEnPlaceholder,
    valueArPlaceholder,
    addLabel,
    exampleTitle,
    exampleKeyEn,
    exampleKeyAr,
    exampleValueEn,
    exampleValueAr,
    rowErrors = {},
    disabled,
  } = props

  function updateRow(
    id: string,
    patch: { key?: Partial<LocalizedText>; value?: Partial<LocalizedText> },
  ) {
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r
        return {
          ...r,
          key: patch.key ? { ...r.key, ...patch.key } : r.key,
          value: patch.value ? { ...r.value, ...patch.value } : r.value,
        }
      }),
    )
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function addRow() {
    onChange([...rows, emptyRow()])
  }

  const Box = "div" as const

  return (
    <Box className="space-y-3">
      {rows.length === 0 && exampleTitle ? (
        <Box className="rounded-md border border-dashed bg-background/60 p-3 text-xs">
          <p className="mb-2 font-medium text-muted-foreground">{exampleTitle}</p>
          <Box className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">{keyEnLabel}: </span>
              {exampleKeyEn}
            </p>
            <p dir="rtl" className="text-right sm:col-start-2">
              <span className="text-muted-foreground">{keyArLabel}: </span>
              {exampleKeyAr}
            </p>
            <p>
              <span className="text-muted-foreground">{valueEnLabel}: </span>
              {exampleValueEn}
            </p>
            <p dir="rtl" className="text-right">
              <span className="text-muted-foreground">{valueArLabel}: </span>
              {exampleValueAr}
            </p>
          </Box>
        </Box>
      ) : null}

      {rows.length > 0 ? (
        <Box className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <span>{keyEnLabel}</span>
          <span>{keyArLabel}</span>
          <span>{valueEnLabel}</span>
          <span>{valueArLabel}</span>
          <span className="w-9" />
        </Box>
      ) : null}

      {rows.map((row) => {
        const err = rowErrors[row.id]
        return (
          <Box key={row.id} className="rounded-md border bg-background/40 p-3">
            <Box className="flex flex-col gap-2 lg:flex-row lg:items-start">
              <Box className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Box className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground lg:hidden">{keyEnLabel}</label>
                  <Input
                    value={row.key.en}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.id, { key: { en: e.target.value } })}
                    placeholder={keyEnPlaceholder}
                  />
                  {err?.keyEn ? <p className="text-destructive text-xs">{err.keyEn}</p> : null}
                </Box>
                <Box className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground lg:hidden">{keyArLabel}</label>
                  <Input
                    value={row.key.ar}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.id, { key: { ar: e.target.value } })}
                    placeholder={keyArPlaceholder}
                    dir="rtl"
                    className="text-right"
                  />
                  {err?.keyAr ? <p className="text-destructive text-xs">{err.keyAr}</p> : null}
                </Box>
                <Box className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground lg:hidden">{valueEnLabel}</label>
                  <Input
                    value={row.value.en}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.id, { value: { en: e.target.value } })}
                    placeholder={valueEnPlaceholder}
                  />
                  {err?.valueEn ? <p className="text-destructive text-xs">{err.valueEn}</p> : null}
                </Box>
                <Box className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground lg:hidden">{valueArLabel}</label>
                  <Input
                    value={row.value.ar}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.id, { value: { ar: e.target.value } })}
                    placeholder={valueArPlaceholder}
                    dir="rtl"
                    className="text-right"
                  />
                  {err?.valueAr ? <p className="text-destructive text-xs">{err.valueAr}</p> : null}
                </Box>
              </Box>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 self-end lg:self-start"
                disabled={disabled}
                onClick={() => removeRow(row.id)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Box>
          </Box>
        )
      })}

      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        {addLabel}
      </Button>
    </Box>
  )
}
