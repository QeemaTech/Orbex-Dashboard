import { useQuery } from "@tanstack/react-query"
import { useLayoutEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import JsBarcode from "jsbarcode"

import { getShipmentLabel, type ShipmentLabelResponse } from "@/api/shipments-api"
import { ApiError } from "@/api/client"
import { useAuth } from "@/lib/auth-context"

import "./label-print.css"

function trackingSpaced(tracking: string): string {
  return tracking.split("").join(" ")
}

/** Short code for badge (e.g. prefix before long numeric tail). */
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

export function ShipmentLabelPrintPage() {
  const { t, i18n } = useTranslation()
  const { shipmentId = "" } = useParams<{ shipmentId: string }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const svgMainRef = useRef<SVGSVGElement | null>(null)
  const svgSmallRef = useRef<SVGSVGElement | null>(null)
  const [barcodesDrawn, setBarcodesDrawn] = useState(false)

  const labelQuery = useQuery({
    queryKey: ["shipment", "label", shipmentId, token],
    queryFn: () => getShipmentLabel({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
    retry: false,
  })

  const label = labelQuery.data

  useLayoutEffect(() => {
    setBarcodesDrawn(false)
    if (!label?.trackingNumber) return
    const main = svgMainRef.current
    const small = svgSmallRef.current
    if (!main || !small) return
    try {
      JsBarcode(main, label.trackingNumber, {
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
      JsBarcode(small, label.trackingNumber, {
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
    setBarcodesDrawn(true)
  }, [label?.trackingNumber])

  useLayoutEffect(() => {
    if (!label || !barcodesDrawn || !shipmentId) return
    const t = window.setTimeout(() => {
      window.print()
    }, 400)
    return () => window.clearTimeout(t)
  }, [label, barcodesDrawn, shipmentId])

  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

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

  if (!token) {
    return (
      <div className="no-print p-6 text-sm">
        <Link to="/login">{t("auth.login", { defaultValue: "Log in" })}</Link>
      </div>
    )
  }

  if (labelQuery.isLoading) {
    return (
      <div className="label-print-root no-print flex min-h-dvh items-center justify-center text-sm">
        {t("common.loading", { defaultValue: "Loading…" })}
      </div>
    )
  }

  if (labelQuery.isError) {
    const err = labelQuery.error
    const msg =
      err instanceof ApiError
        ? err.message
        : t("shipments.label.loadError", { defaultValue: "Could not load label." })
    return (
      <div className="label-print-root no-print space-y-3 p-6 text-sm">
        <p>{msg}</p>
        <Link className="underline" to={`/shipments/${encodeURIComponent(shipmentId)}`}>
          {t("shipments.label.backToShipment", { defaultValue: "Back to shipment" })}
        </Link>
      </div>
    )
  }

  if (!label) return null

  return (
    <div className="label-print-root" dir="rtl">
      <div className="no-print mb-3 flex justify-center gap-2">
        <button
          type="button"
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm"
          onClick={() => window.print()}
        >
          {t("shipments.label.printAgain", { defaultValue: "Print again" })}
        </button>
        <Link
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm no-underline"
          to={`/shipments/${encodeURIComponent(shipmentId)}`}
        >
          {t("shipments.label.close", { defaultValue: "Close" })}
        </Link>
      </div>

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

        <div className="label-full">
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
          <div className="label-mini-box">
            {label.itemsCount} قطع
          </div>
        </div>

        <div className="label-full">
          <span className="label-k">وصف الشحنة | </span>
          <span className="label-v">—</span>
        </div>

        <div className="label-footer-grid">
          <div className="label-footer-notes">
            <span className="label-k">ملاحظات | </span>
            {label.notes}
          </div>
          <div className="label-footer-meta" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
            Order ref: {shipmentId.slice(0, 8)}…
          </div>
        </div>

        <div className="label-full">
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
          <div style={{ alignSelf: "end", textAlign: "end" }} dir="ltr">
            <div
              style={{
                background: "#333",
                color: "#fff",
                fontSize: 8,
                fontWeight: 700,
                padding: "4px 6px",
                marginBottom: 4,
                display: "inline-block",
              }}
            >
              {label.warehouseName !== "—" ? label.warehouseName.slice(0, 14) : "—"}
            </div>
          </div>
        </div>

        <div className="label-bottom-line" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
          <span />
          <span>Created: {formatLabelDate(label.createdAt, locale)}</span>
          <span>1/1</span>
        </div>
      </article>
    </div>
  )
}
