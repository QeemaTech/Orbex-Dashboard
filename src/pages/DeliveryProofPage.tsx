import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { apiUrl } from "@/api/client"

function safeToken(raw: string | undefined): string {
  const s = raw?.trim()
  if (!s) return ""
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/**
 * Legacy dashboard URL `/delivery-proof/:token` — forwards the browser to the API
 * so confirmation is a single GET (same URL as the QR payload).
 */
export function DeliveryProofPage() {
  const { t } = useTranslation()
  const { token: paramRaw } = useParams<{ token: string }>()
  const token = safeToken(paramRaw)

  useEffect(() => {
    if (!token) return
    const scan = apiUrl(`/api/delivery-proof/scan/${encodeURIComponent(token)}`)
    window.location.replace(scan)
  }, [token])

  return (
    <div className="bg-background text-foreground flex min-h-dvh items-center justify-center px-4">
      {!token ? (
        <p className="text-muted-foreground text-center text-sm">{t("deliveryProof.invalidToken")}</p>
      ) : (
        <p className="text-muted-foreground text-center text-sm">{t("deliveryProof.redirecting")}</p>
      )}
    </div>
  )
}
