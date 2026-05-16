import type { LocalizedExtraField, LocalizedText } from "@/api/system-settings-api"

export type LocalizedExtraFieldRow = {
  id: string
  key: LocalizedText
  value: LocalizedText
}

let rowIdCounter = 0

export function newLocalizedExtraFieldRowId(): string {
  rowIdCounter += 1
  return `lef-${rowIdCounter}-${Date.now()}`
}

export function extraFieldsToRows(fields: LocalizedExtraField[] | undefined): LocalizedExtraFieldRow[] {
  if (!fields?.length) return []
  return fields.map((field) => ({
    id: newLocalizedExtraFieldRowId(),
    key: { en: field.key?.en ?? "", ar: field.key?.ar ?? "" },
    value: { en: field.value?.en ?? "", ar: field.value?.ar ?? "" },
  }))
}

export function rowsToExtraFields(rows: LocalizedExtraFieldRow[]): LocalizedExtraField[] {
  const out: LocalizedExtraField[] = []
  for (const row of rows) {
    const key = { en: row.key.en.trim(), ar: row.key.ar.trim() }
    const value = { en: row.value.en.trim(), ar: row.value.ar.trim() }
    if (!key.en && !key.ar && !value.en && !value.ar) continue
    out.push({ key, value })
  }
  return out
}

export function findDuplicateLocalizedLabels(rows: LocalizedExtraFieldRow[]): string[] {
  const seenEn = new Set<string>()
  const seenAr = new Set<string>()
  const dupes: string[] = []
  for (const row of rows) {
    const en = row.key.en.trim().toLowerCase()
    const ar = row.key.ar.trim()
    if (en) {
      if (seenEn.has(en)) dupes.push(row.id)
      seenEn.add(en)
    }
    if (ar) {
      if (seenAr.has(ar)) dupes.push(row.id)
      seenAr.add(ar)
    }
  }
  return dupes
}
