import JsBarcode from "jsbarcode"
import { useLayoutEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import type { ShipmentLabelResponse } from "@/api/shipments-api"

function trackingSpaced(tracking: string): string {
  return tracking.split("").join(" ")
}

function trackingShortBadge(tracking: string): string {
  const t = tracking.trim()
  if (t.length <= 8) return t
  const parts = t.split(/[-_/]/).filter(Boolean)
  if (parts.length >= 2 && parts[0]!.length <= 4) {
    return `${parts[0]}-${parts[1]?.slice(0, 2) ?? ""}`.slice(0, 12)
  }
  return t.slice(0, 8)
}

function numericTail(tracking: string): string {
  const m = tracking.replace(/\s/g, "").match(/(\d{4,})$/)
  return m ? m[1]! : tracking.replace(/\D/g, "").slice(-8) || tracking
}

function formatLabelDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export type ShipmentLabelSheetProps = {
  label: ShipmentLabelResponse
  locale: string
  sheetIndex: number
  sheetTotal: number
  /** Fired after barcodes render for this sheet (for parent auto-print coordination). */
  onBarcodesReady?: () => void
}

export function ShipmentLabelSheet({
  label,
  locale,
  sheetIndex,
  sheetTotal,
  onBarcodesReady,
}: ShipmentLabelSheetProps) {
  const { t } = useTranslation()
  const svgMainRef = useRef<SVGSVGElement | null>(null)
  const svgSmallRef = useRef<SVGSVGElement | null>(null)
  const onBarcodesReadyRef = useRef(onBarcodesReady)
  onBarcodesReadyRef.current = onBarcodesReady

  const codText = (l: ShipmentLabelResponse): string => {
    if (l.codAmount == null || !Number.isFinite(l.codAmount)) {
      return t("shipments.label.codDash", { defaultValue: "مبلغ التحصيل: —" })
    }
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(l.codAmount)
    return t("shipments.label.codAmount", {
      defaultValue: "مبلغ التحصيل: {{amount}} ج.م",
      amount: formatted,
    })
  }

  useLayoutEffect(() => {
    if (!label.trackingNumber?.trim()) return
    const main = svgMainRef.current
    const small = svgSmallRef.current
    if (!main || !small) return
    try {
      JsBarcode(main as unknown as HTMLElement, label.trackingNumber, {
        format: "CODE128",
        displayValue: false,
        lineColor: "#000000",
        background: "#ffffff",
        margin: 0,
        marginTop: 2,
        marginBottom: 2,
        height: 52,
        width: 1.85,
      })
      JsBarcode(small as unknown as HTMLElement, label.trackingNumber, {
        format: "CODE128",
        displayValue: false,
        lineColor: "#000000",
        background: "#ffffff",
        margin: 0,
        height: 28,
        width: 1.2,
      })
    } catch {
      /* ignore barcode render errors */
    }
    onBarcodesReadyRef.current?.()
  }, [label.trackingNumber])

  return (
    <article className="label-print-sheet" aria-label="Shipment label">
      <div className="label-barcode-block">
        <svg ref={svgMainRef} role="img" aria-label="Barcode" />
        <div className="label-tracking-human" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
          {trackingSpaced(label.trackingNumber)}
        </div>
      </div>

      <div className="label-header-3">
        <div className="label-brand" dir="ltr">
          Orbex
        </div>
        <div className="label-hub" dir="auto">
          {label.warehouseName}
        </div>
        <div className="label-delivery-ar">توصيل</div>
      </div>

      <div className="label-cod-row">
        <div className="label-id-badge" dir="ltr">
          {trackingShortBadge(label.trackingNumber)}
        </div>
        <div className="label-cod-ar">{codText(label)}</div>
      </div>

      <div className="label-two-col">
        <div className="label-col">
          <div className="label-col-title">التاجر:</div>
          <div className="label-col-value">{label.merchantName}</div>
        </div>
        <div className="label-col">
          <div className="label-col-title">توصيل إلى:</div>
          <div className="label-col-value">{label.customerName}</div>
          <div className="label-col-value" dir="ltr" style={{ marginTop: 4, unicodeBidi: "plaintext" }}>
            {label.phone}
          </div>
        </div>
      </div>

      <div className="label-full label-address-block">
        <div className="label-kv">
          <span className="label-k">المنطقة | </span>
          <span className="label-v">{label.governorate}</span>
        </div>
        <div className="label-kv">
          <span className="label-k">العنوان | </span>
          <span className="label-v" dir="auto">
            {label.address}
          </span>
        </div>
        <div className="label-kv">
          <span className="label-k">علامة مميزة | </span>
          <span className="label-v">—</span>
        </div>
      </div>

      <div className="label-boxes">
        <div className="label-mini-box">فتح الشحنة: لا</div>
        <div className="label-mini-box">{label.itemsCount} قطع</div>
      </div>

      <div className="label-full label-desc-block">
        <div className="label-kv">
          <span className="label-k">وصف الشحنة | </span>
          <span className="label-v">—</span>
        </div>
        <div className="label-kv">
          <span className="label-k">الوزن | </span>
          <span className="label-v">—</span>
        </div>
        <div className="label-kv">
          <span className="label-k">عدد الوحدات | </span>
          <span className="label-v">{label.itemsCount}</span>
        </div>
      </div>

      <div className="label-footer-grid">
        <div className="label-footer-notes">
          <span className="label-k">ملاحظات | </span>
          {label.notes}
        </div>
      </div>

      <div className="label-full label-return-block">
        <span className="label-k">عنوان المرتجع | </span>
        <span className="label-v">—</span>
      </div>

      <div className="label-footer-barcode">
        <div>
          <div style={{ fontSize: 7, marginBottom: 2 }} dir="ltr">
            Tracking Number
          </div>
          <svg ref={svgSmallRef} role="img" aria-label="Tracking barcode" />
          <div dir="ltr" style={{ fontSize: 9, fontWeight: 600, textAlign: "center", unicodeBidi: "plaintext" }}>
            {numericTail(label.trackingNumber)}
          </div>
        </div>
      </div>

      <div className="label-bottom-line" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
        <span />
        <span>Created: {formatLabelDate(label.createdAt, locale)}</span>
        <span>
          {sheetIndex}/{sheetTotal}
        </span>
      </div>
    </article>
  )
}
