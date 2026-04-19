import { useQuery } from "@tanstack/react-query"
import { useLayoutEffect, useRef, useState, useCallback } from "react"
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

function generatePrintWindow(
  label: ShipmentLabelResponse,
  shipmentId: string,
  locale: string,
  mainBarcodeDataUrl: string,
  smallBarcodeDataUrl: string
): string {
  const codAmount = label.codAmount ?? 0
  const codText = Number.isFinite(codAmount)
    ? `مبلغ التحصيل: ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(codAmount)} ج.م`
    : "مبلغ التحصيل: —"

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${label.trackingNumber}</title>
  <style>
    body { margin: 0; padding: 8px; background: #f0f0f0; font-family: sans-serif; }
    .print-btn { display: block; margin: 0 auto 16px; padding: 10px 24px; font-size: 16px; cursor: pointer; background: #333; color: #fff; border: none; border-radius: 4px; }
    .print-btn:hover { background: #555; }
    @page { size: 4in 6in; margin: 0; }
    .label { width: 384px; height: 576px; margin: 0 auto; background: #fff; font-family: system-ui, sans-serif; font-size: 9px; line-height: 1.35; color: #000; display: flex; flex-direction: column; }
    .barcode-block { padding: 5px 6px 2px; text-align: center; }
    .barcode-block img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    .tracking-human { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; padding: 2px 0 4px; }
    .header-3 { display: grid; grid-template-columns: 1fr 1.4fr 0.6fr; gap: 4px; align-items: center; padding: 6px; border-bottom: 1px solid #000; }
    .brand { font-weight: 800; font-size: 14px; }
    .hub { text-align: center; font-weight: 700; font-size: 9px; word-break: break-word; }
    .delivery-ar { text-align: right; font-weight: 700; font-size: 11px; }
    .cod-row { display: grid; grid-template-columns: auto 1fr; gap: 8px; padding: 6px; align-items: center; }
    .id-badge { background: #1a1a1a; color: #fff; font-weight: 800; font-size: 11px; padding: 6px 10px; min-width: 3.2rem; text-align: center; }
    .cod-ar { font-weight: 800; font-size: 11px; text-align: right; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000; }
    .col { padding: 6px; border-right: 1px solid #000; }
    .col:last-child { border-right: none; }
    .col-title { font-weight: 700; margin-bottom: 2px; }
    .col-value { font-weight: 600; word-break: break-word; }
    .full { padding: 6px; border-bottom: 1px solid #000; }
    .kv { margin-bottom: 4px; }
    .kv:last-child { margin-bottom: 0; }
    .k { font-weight: 700; }
    .v { word-break: break-word; }
    .boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px; border-bottom: 1px solid #000; }
    .mini-box { border: 1px solid #000; border-radius: 4px; padding: 4px 6px; font-weight: 600; text-align: center; }
    .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px; font-size: 8px; }
    .footer-notes { font-weight: 600; word-break: break-word; }
    .footer-meta { text-align: end; color: #333; }
    .footer-barcode { padding: 4px 6px; border-top: 1px solid #000; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-items: end; }
    .footer-barcode img { max-width: 100%; height: auto; }
    .bottom-line { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; padding: 4px 8px 6px; font-size: 8px; border-top: 1px solid #000; }
    .box-label { background: #333; color: #fff; font-size: 8px; font-weight: 700; padding: 4px 6px; margin-bottom: 4px; display: inline-block; }
    @media print {
      body { padding: 0 !important; background: #fff !important; }
      .print-btn { display: none !important; }
      @page { size: 4in 6in; margin: 0; }
    }
  </style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print Label</button>
<div class="label">
  <div class="barcode-block">
    <img src="${mainBarcodeDataUrl}" alt="Barcode"/>
    <div class="tracking-human">${trackingSpaced(label.trackingNumber)}</div>
  </div>
  <div class="header-3">
    <div class="brand">Orbex</div>
    <div class="hub">${label.warehouseName}</div>
    <div class="delivery-ar">توصيل</div>
  </div>
  <div class="cod-row">
    <div class="id-badge">${trackingShortBadge(label.trackingNumber)}</div>
    <div class="cod-ar">${codText}</div>
  </div>
  <div class="two-col">
    <div class="col">
      <div class="col-title">التاجر:</div>
      <div class="col-value">${label.merchantName}</div>
    </div>
    <div class="col">
      <div class="col-title">توصيل إلى:</div>
      <div class="col-value">${label.customerName}</div>
      <div class="col-value" style="margin-top:4px">${label.phone}</div>
    </div>
  </div>
  <div class="full">
    <div class="kv"><span class="k">المنطقة | </span><span class="v">${label.governorate}</span></div>
    <div class="kv"><span class="k">العنوان | </span><span class="v">${label.address}</span></div>
    <div class="kv"><span class="k">علامة مميزة | </span><span class="v">—</span></div>
  </div>
  <div class="boxes">
    <div class="mini-box">فتح الشحنة: لا</div>
    <div class="mini-box">${label.itemsCount} قطع</div>
  </div>
  <div class="full">
    <span class="k">وصف الشحنة | </span><span class="v">—</span>
  </div>
  <div class="footer-grid">
    <div class="footer-notes"><span class="k">ملاحظات | </span>${label.notes || "—"}</div>
    <div class="footer-meta">Order ref: ${shipmentId.slice(0, 8)}…</div>
  </div>
  <div class="full">
    <span class="k">عنوان المرت��ع | </span><span class="v">—</span>
  </div>
  <div class="footer-barcode">
    <div>
      <div style="font-size:7px;margin-bottom:2px">Tracking Number</div>
      <img src="${smallBarcodeDataUrl}" alt="Barcode"/>
      <div style="font-size:9px;font-weight:600;text-align:center">${numericTail(label.trackingNumber)}</div>
    </div>
    <div style="text-align:end">
      <div class="box-label">${label.warehouseName !== "—" ? label.warehouseName.slice(0, 14) : "—"}</div>
    </div>
  </div>
  <div class="bottom-line">
    <span></span>
    <span>Created: ${formatLabelDate(label.createdAt, locale)}</span>
    <span>1/1</span>
  </div>
</div>
</body>
</html>`
}

export function ShipmentLabelPrintPage() {
  const { t, i18n } = useTranslation()
  const { shipmentId = "" } = useParams<{ shipmentId: string }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const svgMainRef = useRef<SVGSVGElement | null>(null)
  const svgSmallRef = useRef<SVGSVGElement | null>(null)
  const autoPrintDoneRef = useRef(false)
  const [barcodesDrawn, setBarcodesDrawn] = useState(false)
  const [barcodeDataUrls, setBarcodeDataUrls] = useState<{ main: string; small: string } | null>(null)

  const labelQuery = useQuery({
    queryKey: ["shipment", "label", shipmentId, token],
    queryFn: () => getShipmentLabel({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
    retry: false,
  })

  const label = labelQuery.data

  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const generateBarcodeDataUrls = useCallback((trackingNumber: string) => {
    try {
      const mainCanvas = document.createElement("canvas")
      JsBarcode(mainCanvas, trackingNumber, {
        format: "CODE128",
        displayValue: false,
        lineColor: "#000000",
        background: "#ffffff",
        margin: 0,
        height: 52,
        width: 1.85,
      })
      const mainDataUrl = mainCanvas.toDataURL("image/png")

      const smallCanvas = document.createElement("canvas")
      JsBarcode(smallCanvas, trackingNumber, {
        format: "CODE128",
        displayValue: false,
        lineColor: "#000000",
        background: "#ffffff",
        margin: 0,
        height: 28,
        width: 1.2,
      })
      const smallDataUrl = smallCanvas.toDataURL("image/png")

      setBarcodeDataUrls({ main: mainDataUrl, small: smallDataUrl })
    } catch {
      console.error("Failed to generate barcodes")
    }
  }, [])

  useLayoutEffect(() => {
    setBarcodesDrawn(false)
    if (!label?.trackingNumber) return
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
    setBarcodesDrawn(true)
    generateBarcodeDataUrls(label.trackingNumber)
  }, [label?.trackingNumber, generateBarcodeDataUrls])

  useLayoutEffect(() => {
    if (!label) return
    document.documentElement.classList.add("label-print-page")
    document.body.classList.add("label-print-page")
    return () => {
      document.documentElement.classList.remove("label-print-page")
      document.body.classList.remove("label-print-page")
    }
  }, [label])

  useLayoutEffect(() => {
    autoPrintDoneRef.current = false
  }, [shipmentId, label?.trackingNumber])

  const openPrintWindow = useCallback(() => {
    if (!label || !barcodeDataUrls) return

    const printWindow = window.open("", "_blank", "width=420,height=650")
    if (printWindow) {
      printWindow.document.write(generatePrintWindow(label, shipmentId, locale, barcodeDataUrls.main, barcodeDataUrls.small))
      printWindow.document.close()
    }
  }, [label, shipmentId, locale, barcodeDataUrls])

  useLayoutEffect(() => {
    if (!label || !barcodesDrawn || !barcodeDataUrls || !shipmentId) return
    if (autoPrintDoneRef.current) return
    autoPrintDoneRef.current = true
    const timer = window.setTimeout(() => {
      openPrintWindow()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [label, barcodesDrawn, barcodeDataUrls, shipmentId, openPrintWindow])

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
          onClick={openPrintWindow}
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

      <div className="label-print-page-container">
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
            <div className="label-mini-box">فتح ا��شح��ة: لا</div>
            <div className="label-mini-box">{label.itemsCount} قطع</div>
          </div>

          <div className="label-full label-desc-block">
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
    </div>
  )
}