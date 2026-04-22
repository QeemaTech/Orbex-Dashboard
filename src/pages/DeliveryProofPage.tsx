import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import QRCode from "qrcode"

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

export function DeliveryProofPage() {
  const { t } = useTranslation()
  const { token: paramRaw } = useParams<{ token: string }>()
  const token = safeToken(paramRaw)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const scanUrl = apiUrl(`/api/shipments/public/${encodeURIComponent(token)}/deliver`)
    QRCode.toDataURL(scanUrl, { width: 280, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setError(t("deliveryProof.qrError")))
  }, [token, t])

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center px-4 gap-6">
      {!token ? (
        <p className="text-muted-foreground text-center text-sm">{t("deliveryProof.invalidToken")}</p>
      ) : error ? (
        <p className="text-muted-foreground text-center text-sm">{error}</p>
      ) : !qrDataUrl ? (
        <p className="text-muted-foreground text-center text-sm">{t("deliveryProof.qrLoading")}</p>
      ) : (
        <>
          <h1 className="text-xl font-semibold">{t("deliveryProof.scanTitle")}</h1>
          <p className="text-muted-foreground text-center text-sm">{t("deliveryProof.scanHint")}</p>
          <img src={qrDataUrl} alt={t("deliveryProof.qrAlt")} className="border rounded-lg" />
        </>
      )}
    </div>
  )
}