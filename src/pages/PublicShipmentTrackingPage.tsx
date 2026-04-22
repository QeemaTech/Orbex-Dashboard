import { useQuery } from "@tanstack/react-query"
import { AlertCircle, Loader2, Package, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { ApiError } from "@/api/client"
import { getPublicTracking } from "@/api/public-tracking-api"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicTrackingShipmentCard } from "@/features/tracking/components/PublicTrackingShipmentCard"
import { ShipmentTrackingTimeline } from "@/features/tracking/components/ShipmentTrackingTimeline"
import { cn } from "@/lib/utils"

function safeDecodeTrackingParam(raw: string | undefined): string {
  const s = raw?.trim()
  if (!s) return ""
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export function PublicShipmentTrackingPage() {
  const { t, i18n } = useTranslation()
  const { trackingNumber: paramRaw } = useParams<{ trackingNumber: string }>()
  const trackingNumber = safeDecodeTrackingParam(paramRaw)
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"
  const isRtl = i18n.language.startsWith("ar")

  const q = useQuery({
    queryKey: ["public-tracking", trackingNumber],
    queryFn: () => getPublicTracking(trackingNumber),
    enabled: Boolean(trackingNumber),
    retry: 1,
  })

  return (
    <div
      className={cn(
        "text-foreground relative min-h-dvh overflow-hidden",
        "bg-gradient-to-b from-[#e8f0fb] via-[#f3f7fc] to-[#eef4fb]",
        "dark:from-background dark:via-background dark:to-background",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgb(16 52 93 / 18%), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgb(41 121 184 / 12%), transparent)`,
        }}
      />

      <header className="relative border-b border-[#10345d]/10 bg-white/75 shadow-[var(--shadow-soft)] backdrop-blur-md dark:border-border dark:bg-card/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4 sm:max-w-2xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-[var(--shadow-soft)] ring-2 ring-white/60 dark:ring-white/10">
              <Package className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-foreground truncate text-base font-bold tracking-tight sm:text-lg">
                  {t("tracking.brandTitle")}
                </span>
                <Sparkles className="text-chart-3 size-4 shrink-0 opacity-80" aria-hidden />
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                {t("tracking.pageSubtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main
        className="relative mx-auto max-w-lg px-4 py-8 sm:max-w-2xl sm:px-6 sm:py-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {!trackingNumber ? (
          <Card className="border-dashed shadow-md">
            <CardHeader className="text-center">
              <div className="bg-muted text-muted-foreground mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                <AlertCircle className="size-6" aria-hidden />
              </div>
              <CardTitle className="text-base">{t("tracking.invalidTrackingParam")}</CardTitle>
            </CardHeader>
          </Card>
        ) : q.isLoading ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="text-primary size-9 animate-spin" aria-hidden />
              <p className="text-muted-foreground text-sm font-medium">{t("tracking.loading")}</p>
            </div>
            <div className="bg-card/80 space-y-3 rounded-2xl border p-5 shadow-inner">
              <div className="bg-muted h-4 w-2/3 animate-pulse rounded-md" />
              <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
              <div className="bg-muted h-24 w-full animate-pulse rounded-xl" />
            </div>
          </div>
        ) : q.isError ? (
          <Card className="overflow-hidden border-rose-200/80 bg-rose-50/50 shadow-[var(--shadow-soft)] dark:border-rose-900/40 dark:bg-rose-950/25">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="bg-destructive/15 text-destructive flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <AlertCircle className="size-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg">{t("tracking.errorTitle")}</CardTitle>
                  <CardDescription className="text-foreground/80 mt-1.5 text-sm leading-relaxed">
                    {q.error instanceof ApiError && q.error.status === 404
                      ? t("tracking.notFound")
                      : q.error instanceof Error
                        ? q.error.message
                        : t("tracking.genericError")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="text-muted-foreground border-t border-rose-200/60 px-6 pb-6 pt-0 text-xs dark:border-rose-900/50">
              {t("tracking.errorSupportHint")}
            </div>
          </Card>
        ) : q.data ? (
          <div className="space-y-6">
            <PublicTrackingShipmentCard data={q.data} t={t} locale={locale} />
            <ShipmentTrackingTimeline status={q.data.status} postponedAt={q.data.postponedAt} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
