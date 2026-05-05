import { useQuery } from "@tanstack/react-query"
import { useCallback, useLayoutEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import { getShipmentLabel } from "@/api/shipments-api"
import { ApiError } from "@/api/client"
import { useAuth } from "@/lib/auth-context"
import { ShipmentLabelSheet } from "@/features/shipments/components/ShipmentLabelSheet"

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

export function ShipmentLabelPrintPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { shipmentId = "" } = useParams<{ shipmentId: string }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const autoPrintDoneRef = useRef(false)

  const labelQuery = useQuery({
    queryKey: ["shipment", "label", shipmentId, token],
    queryFn: () => getShipmentLabel({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
    retry: false,
  })

  const label = labelQuery.data

  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const returnTo = useMemo(
    () => safeReturnPath(new URLSearchParams(location.search).get("returnTo")),
    [location.search],
  )

  useLayoutEffect(() => {
    document.documentElement.classList.add("label-print-page")
    document.body.classList.add("label-print-page")
    return () => {
      document.documentElement.classList.remove("label-print-page")
      document.body.classList.remove("label-print-page")
    }
  }, [])

  useLayoutEffect(() => {
    autoPrintDoneRef.current = false
  }, [shipmentId, label?.trackingNumber, labelQuery.dataUpdatedAt])

  const printAll = useCallback(() => {
    window.print()
  }, [])

  if (!token) {
    return (
      <div className="no-print p-6 text-sm">
        <Link to="/login">{t("auth.login", { defaultValue: "Log in" })}</Link>
      </div>
    )
  }

  const defaultCloseHref = location.pathname.startsWith("/cs/")
    ? `/cs/shipments/${encodeURIComponent(shipmentId)}`
    : `/shipments/${encodeURIComponent(shipmentId)}`
  const closeHref = returnTo ?? defaultCloseHref

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
        <Link className="underline" to={closeHref}>
          {t("shipments.label.backToShipment", { defaultValue: "Back to shipment" })}
        </Link>
      </div>
    )
  }

  if (!label) return null

  const onBarcodesReady = () => {
    if (!shipmentId) return
    if (autoPrintDoneRef.current) return
    autoPrintDoneRef.current = true
    window.setTimeout(() => {
      window.print()
    }, 400)
  }

  return (
    <div className="label-print-root" dir="rtl">
      <div className="no-print mb-3 flex justify-center gap-2">
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

      <div className="label-print-page-container">
        <ShipmentLabelSheet
          label={label}
          locale={locale}
          sheetIndex={1}
          sheetTotal={1}
          onBarcodesReady={onBarcodesReady}
        />
      </div>
    </div>
  )
}