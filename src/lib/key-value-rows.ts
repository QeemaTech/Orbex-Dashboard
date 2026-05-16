export type KeyValueRow = {
  id: string
  key: string
  value: string
}

let rowIdCounter = 0

export function newKeyValueRowId(): string {
  rowIdCounter += 1
  return `kv-${rowIdCounter}-${Date.now()}`
}

export function recordToKeyValueRows(record: Record<string, string> | undefined): KeyValueRow[] {
  if (!record) return []
  return Object.entries(record).map(([key, value]) => ({
    id: newKeyValueRowId(),
    key,
    value: value ?? "",
  }))
}

export function keyValueRowsToRecord(
  rows: KeyValueRow[],
  opts?: { skipEmptyKeys?: boolean },
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (!key) {
      if (opts?.skipEmptyKeys) continue
      continue
    }
    out[key] = row.value
  }
  return out
}

export function findDuplicateKeys(rows: KeyValueRow[]): string[] {
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const row of rows) {
    const key = row.key.trim().toLowerCase()
    if (!key) continue
    if (seen.has(key)) dupes.push(row.key.trim())
    seen.add(key)
  }
  return dupes
}

const FIELD_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/

export function isValidFieldKey(key: string): boolean {
  const k = key.trim()
  return k.length > 0 && k.length <= 64 && FIELD_KEY_RE.test(k)
}
