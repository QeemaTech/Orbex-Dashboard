import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ApiError, formatApiValidationDetails } from "@/api/client"
import { showToast } from "@/lib/toast"

export type WarehouseScanMode = "in" | "out"

type WarehouseScannerProps = {
  /** Hub id for `POST /api/warehouse/scan-in|scan-out` (must match page context). */
  warehouseId: string
  /** Called with trimmed tracking number; should throw ApiError on failure. */
  onScan: (mode: WarehouseScanMode, trackingNumber: string) => Promise<unknown>
  allowScanIn?: boolean
  allowScanOut?: boolean
  disabled?: boolean
}

function messageForApiError(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) {
    const detailText = formatApiValidationDetails(err.details)
    const base =
      err.code != null
        ? (() => {
            switch (err.code) {
              case "NO_ACTIVE_TASK":
                return t("warehouse.scanner.errors.noActiveTask")
              case "INVALID_TRACKING":
                return t("warehouse.scanner.errors.invalidTracking")
              case "WRONG_WAREHOUSE":
                return t("warehouse.scanner.errors.wrongWarehouse")
              case "INVALID_TRANSITION":
                return t("warehouse.scanner.errors.invalidTransition")
              case "CS_DELIVERY_NOT_ALLOWED":
                return t("warehouse.scanner.errors.csDeliveryNotAllowed")
              case "DELIVERY_POSTPONE_LIMIT":
                return t("warehouse.scanner.errors.deliveryPostponeLimit")
              default:
                return err.message
            }
          })()
        : err.message
    if (detailText) {
      return `${base} — ${detailText}`
    }
    return base
  }
  if (err instanceof Error) {
    return err.message
  }
  return t("warehouse.scanner.errors.generic")
}

/**
 * Keyboard-scanner friendly input: stays focused, submits on Enter, blocks double-submit while pending.
 */
export function WarehouseScanner({
  warehouseId,
  onScan,
  allowScanIn = true,
  allowScanOut = true,
  disabled,
}: WarehouseScannerProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [mode, setMode] = useState<WarehouseScanMode>("out")
  const [pending, setPending] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (mode === "in" && !allowScanIn && allowScanOut) {
      setMode("out")
      return
    }
    if (mode === "out" && !allowScanOut && allowScanIn) {
      setMode("in")
    }
  }, [allowScanIn, allowScanOut, mode])

  const handleScan = useCallback(async () => {
    const raw = value.trim()
    if (
      !raw ||
      pending ||
      disabled ||
      !warehouseId.trim() ||
      (mode === "in" && !allowScanIn) ||
      (mode === "out" && !allowScanOut)
    ) {
      return
    }
    setPending(true)
    setLastError(null)
    try {
      await onScan(mode, raw)
      setValue("")
      queueMicrotask(() => inputRef.current?.focus())
    } catch (e) {
      const text = messageForApiError(e, t)
      setLastError(text)
      showToast(text, "error")
      setValue("")
      queueMicrotask(() => inputRef.current?.focus())
    } finally {
      setPending(false)
    }
  }, [value, pending, disabled, warehouseId, mode, allowScanIn, allowScanOut, onScan, t])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground sr-only" htmlFor="warehouse-scan-mode">
          {t("warehouse.scanner.modeLabel")}
        </label>
        <select
          id="warehouse-scan-mode"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as WarehouseScanMode)}
          disabled={disabled || pending || !warehouseId.trim() || (!allowScanIn && !allowScanOut)}
        >
          <option value="out" disabled={!allowScanOut}>{t("warehouse.scanner.modeOut")}</option>
          <option value="in" disabled={!allowScanIn}>{t("warehouse.scanner.modeIn")}</option>
        </select>
        <input
          ref={inputRef}
          className="flex h-9 min-w-[12rem] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("warehouse.scanner.placeholder")}
          value={value}
          disabled={
            disabled ||
            pending ||
            !warehouseId.trim() ||
            (!allowScanIn && !allowScanOut) ||
            (mode === "in" && !allowScanIn) ||
            (mode === "out" && !allowScanOut)
          }
          aria-busy={pending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (!pending) void handleScan()
            }
          }}
        />
      </div>
      {lastError ? (
        <p className="text-destructive text-sm" role="alert" aria-live="assertive">
          {lastError}
        </p>
      ) : null}
    </div>
  )
}
