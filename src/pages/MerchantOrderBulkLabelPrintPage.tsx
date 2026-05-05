import { useQuery } from "@tanstack/react-query"
import { useCallback, useLayoutEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import { getShipmentOrders } from "@/api/merchant-orders-api"
import { getShipmentLabel, type ShipmentLabelResponse } from "@/api/shipments-api"
import { ApiError } from "@/api/client"
import { ShipmentLabelSheet } from "@/features/shipments/components/ShipmentLabelSheet"
import { autoPrintWhenVisible } from "@/lib/auto-print"
import { warehouseMerchantOrderDetailPath } from "@/lib/warehouse-merchant-order-routes"
import { useAuth } from "@/lib/auth-context"

import "./label-print.css"

function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null
  try {
    const d = decodeURIComponent(raw).trim()
    if (!d.startsWith("/") || d.startsWith("//")) return null
    return d
  } catch {
    return null
  }
}

export function MerchantOrderBulkLabelPrintPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { merchantOrderId: rawMerchantOrderId = "", warehouseId = "" } = useParams<{
    merchantOrderId?: string
    warehouseId?: string
  }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const merchantOrderId = useMemo(() => {
    try {
      return decodeURIComponent(rawMerchantOrderId).trim()
    } catch {
      return rawMerchantOrderId.trim()
    }
  }, [rawMerchantOrderId])

  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const returnTo = useMemo(
    () => safeReturnPath(new URLSearchParams(location.search).get("returnTo")),
    [location.search],
  )

  const defaultCloseHref = useMemo(() => {
    const enc = encodeURIComponent(merchantOrderId)
    if (location.pathname.startsWith("/cs/")) return `/cs/merchant-orders/${enc}`
    const wid = warehouseId.trim()
    if (wid) return warehouseMerchantOrderDetailPath(wid, merchantOrderId)
    return `/merchant-orders/${enc}`
  }, [location.pathname, merchantOrderId, warehouseId])

  const closeHref = returnTo ?? defaultCloseHref

  useLayoutEffect(() => {
    document.documentElement.classList.add("label-print-bulk")
    document.body.classList.add("label-print-bulk")
    return () => {
      document.documentElement.classList.remove("label-print-bulk")
      document.body.classList.remove("label-print-bulk")
    }
  }, [])

  const bulkQuery = useQuery({
    queryKey: ["merchant-order", "bulk-label-print", merchantOrderId, token] as const,
    queryFn: async () => {
      const orders = await getShipmentOrders({ token, shipmentId: merchantOrderId })
      const lines = orders.shipments.filter((s) => Boolean(s.trackingNumber?.trim()))
      const orderIndex = new Map(lines.map((l, i) => [l.id, i]))
      const settled = await Promise.all(
        lines.map(async (s) => {
          try {
            const label = await getShipmentLabel({ token, shipmentId: s.id })
            return { ok: true as const, lineId: s.id, label }
          } catch {
            return { ok: false as const, lineId: s.id, trackingNumber: s.trackingNumber }
          }
        }),
      )
      const items: { lineId: string; label: ShipmentLabelResponse }[] = []
      const failedLines: { lineId: string; trackingNumber: string | null }[] = []
      for (const row of settled) {
        if (row.ok) items.push({ lineId: row.lineId, label: row.label })
        else failedLines.push({ lineId: row.lineId, trackingNumber: row.trackingNumber })
      }
      items.sort((a, b) => (orderIndex.get(a.lineId) ?? 0) - (orderIndex.get(b.lineId) ?? 0))
      return {
        items,
        failedLines,
        linesWithoutTracking: orders.shipments.length - lines.length,
        orderLineCount: orders.shipments.length,
        trackedLineCount: lines.length,
      }
    },
    enabled: Boolean(token && merchantOrderId),
    retry: false,
  })

  const items = bulkQuery.data?.items ?? []
  const total = items.length

  const autoPrintDoneRef = useRef(false)
  const readyLineIdsRef = useRef(new Set<string>())
  const autoPrintCleanupRef = useRef<(() => void) | null>(null)

  useLayoutEffect(() => {
    readyLineIdsRef.current.clear()
    autoPrintDoneRef.current = false
    autoPrintCleanupRef.current?.()
    autoPrintCleanupRef.current = null
  }, [merchantOrderId, bulkQuery.dataUpdatedAt])

  const printAll = useCallback(() => {
    window.print()
  }, [])

  const makeOnBarcodesReady = useCallback(
    (lineId: string) => () => {
      readyLineIdsRef.current.add(lineId)
      const n = items.length
      if (n > 0 && readyLineIdsRef.current.size >= n && !autoPrintDoneRef.current) {
        autoPrintDoneRef.current = true
        const delay = 400 + Math.min(n * 80, 1200)
        autoPrintCleanupRef.current?.()
        autoPrintCleanupRef.current = autoPrintWhenVisible({ delayMs: delay })
      }
    },
    [items.length],
  )

  useLayoutEffect(() => {
    return () => {
      autoPrintCleanupRef.current?.()
      autoPrintCleanupRef.current = null
    }
  }, [])

  if (!token) {
    return (
      <div className="no-print p-6 text-sm">
        <Link to="/login">{t("auth.login", { defaultValue: "Log in" })}</Link>
      </div>
    )
  }

  if (!merchantOrderId) {
    return (
      <div className="label-print-root label-print-root--bulk no-print p-6 text-sm">
        {t("merchantOrders.invalidBatchId", {
          defaultValue: "Missing or invalid merchant order id.",
        })}
      </div>
    )
  }

  if (bulkQuery.isLoading) {
    return (
      <div className="label-print-root label-print-root--bulk no-print flex min-h-dvh items-center justify-center text-sm">
        {t("merchantOrders.bulkLabelPrint.loading", { defaultValue: "Loading labels…" })}
      </div>
    )
  }

  if (bulkQuery.isError) {
    const err = bulkQuery.error
    const msg =
      err instanceof ApiError
        ? err.message
        : t("merchantOrders.bulkLabelPrint.loadError", { defaultValue: "Could not load labels." })
    return (
      <div className="label-print-root label-print-root--bulk no-print space-y-3 p-6 text-sm">
        <p>{msg}</p>
        <Link className="underline" to={closeHref}>
          {t("shipments.label.close", { defaultValue: "Close" })}
        </Link>
      </div>
    )
  }

  const {
    failedLines = [],
    linesWithoutTracking = 0,
    orderLineCount = 0,
    trackedLineCount = 0,
  } = bulkQuery.data ?? {}

  if (total === 0) {
    const allTrackedFailed =
      failedLines.length > 0 &&
      trackedLineCount > 0 &&
      failedLines.length === trackedLineCount
    return (
      <div className="label-print-root label-print-root--bulk no-print space-y-3 p-6 text-sm">
        {allTrackedFailed ? (
          <p className="text-destructive">
            {t("merchantOrders.bulkLabelPrint.partialFail", {
              count: failedLines.length,
              defaultValue: "{{count}} label(s) failed to load.",
            })}
          </p>
        ) : (
          <p>
            {t("merchantOrders.bulkLabelPrint.none", {
              defaultValue: "No printable labels (lines need a tracking number).",
            })}
          </p>
        )}
        {linesWithoutTracking > 0 ? (
          <p className="text-muted-foreground">
            {t("merchantOrders.bulkLabelPrint.skippedNoTracking", {
              count: linesWithoutTracking,
              defaultValue: "{{count}} line(s) skipped (no tracking).",
            })}
          </p>
        ) : null}
        {!allTrackedFailed && failedLines.length > 0 ? (
          <p className="text-destructive text-sm">
            {t("merchantOrders.bulkLabelPrint.partialFail", {
              count: failedLines.length,
              defaultValue: "{{count}} label(s) failed to load.",
            })}
          </p>
        ) : null}
        {orderLineCount === 0 ? (
          <p className="text-muted-foreground">
            {t("merchantOrders.bulkLabelPrint.noShipments", {
              defaultValue: "No shipments in this merchant order.",
            })}
          </p>
        ) : null}
        <Link className="underline" to={closeHref}>
          {t("shipments.label.close", { defaultValue: "Close" })}
        </Link>
      </div>
    )
  }

  return (
    <div className="label-print-root label-print-root--bulk" dir="rtl">
      <div className="no-print mb-3 flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm"
            onClick={printAll}
          >
            {t("shipments.label.printAgain", { defaultValue: "Print again" })}
          </button>
          <Link
            className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm no-underline"
            to={closeHref}
          >
            {t("shipments.label.close", { defaultValue: "Close" })}
          </Link>
        </div>
        {failedLines.length > 0 ? (
          <p className="text-destructive max-w-md text-center text-xs">
            {t("merchantOrders.bulkLabelPrint.partialFail", {
              count: failedLines.length,
              defaultValue: "{{count}} label(s) failed to load.",
            })}
          </p>
        ) : null}
        {linesWithoutTracking > 0 ? (
          <p className="text-muted-foreground max-w-md text-center text-xs">
            {t("merchantOrders.bulkLabelPrint.skippedNoTracking", {
              count: linesWithoutTracking,
              defaultValue: "{{count}} line(s) skipped (no tracking).",
            })}
          </p>
        ) : null}
        <p className="max-w-md text-center text-xs text-neutral-600">
          {t("shipments.label.printPortraitHint", {
            defaultValue:
              "Set printer and print dialog paper/label size to 102×152 mm to match this label. If the preview shows wrong strips or page count, toggle Layout (Portrait/Landscape) once while watching the preview.",
          })}
        </p>
      </div>

      {items.map(({ lineId, label }, idx) => (
        <div key={lineId} className="label-print-page-container label-print-bulk-page">
          <ShipmentLabelSheet
            label={label}
            locale={locale}
            sheetIndex={idx + 1}
            sheetTotal={total}
            onBarcodesReady={makeOnBarcodesReady(lineId)}
          />
        </div>
      ))}
    </div>
  )
}
