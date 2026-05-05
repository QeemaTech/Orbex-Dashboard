import { useQuery } from "@tanstack/react-query"
import { useLayoutEffect, useRef, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { getShipmentLabel } from "@/api/shipments-api"
import { ApiError } from "@/api/client"
import { ShipmentLabelSheet } from "@/features/shipments/components/ShipmentLabelSheet"
import { useAuth } from "@/lib/auth-context"

import "./label-print.css"

export function ShipmentLabelPrintPage() {
  const { t, i18n } = useTranslation()
  const { shipmentId = "" } = useParams<{ shipmentId: string }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const autoPrintDoneRef = useRef(false)
  const [barcodesDrawn, setBarcodesDrawn] = useState(false)

  const labelQuery = useQuery({
    queryKey: ["shipment", "label", shipmentId, token],
    queryFn: () => getShipmentLabel({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
    retry: false,
  })

  const label = labelQuery.data

  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  useLayoutEffect(() => {
    setBarcodesDrawn(false)
  }, [shipmentId, label?.trackingNumber])

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

  const printCurrentPage = useCallback(() => {
    window.print()
  }, [])

  useLayoutEffect(() => {
    if (!label || !barcodesDrawn || !shipmentId) return
    if (autoPrintDoneRef.current) return
    autoPrintDoneRef.current = true
    const timer = window.setTimeout(() => {
      printCurrentPage()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [label, barcodesDrawn, shipmentId, printCurrentPage])

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
          onClick={printCurrentPage}
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
        <ShipmentLabelSheet
          label={label}
          locale={locale}
          sheetIndex={1}
          sheetTotal={1}
          onBarcodesReady={() => setBarcodesDrawn(true)}
        />
      </div>
    </div>
  )
}
