import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Truck } from "lucide-react"

import { getCourierAccountSummary } from "@/api/accounting-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

function resolveNumberLocale(lng: string) {
  return lng.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatEGP(amount: string, locale: string): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(n)
}

function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfMonthISO(): string {
  const d = new Date()
  return formatISODate(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
  )
}

function endOfMonthISO(): string {
  const d = new Date()
  return formatISODate(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)),
  )
}

export function CourierAccountDetailPage() {
  const { t, i18n } = useTranslation()
  const { courierId = "" } = useParams()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const locale = resolveNumberLocale(i18n.language)

  const [from, setFrom] = useState<string>(startOfMonthISO())
  const [to, setTo] = useState<string>(endOfMonthISO())

  const query = useQuery({
    queryKey: ["accounting-courier-summary", courierId, from, to],
    queryFn: () =>
      getCourierAccountSummary(token, courierId, { from, to }),
    enabled: !!token && !!courierId,
  })

  const summary = query.data
  const courierName = useMemo(
    () => summary?.courier.fullName ?? courierId,
    [summary, courierId],
  )

  return (
    <Layout title={t("accounts.courierDetail.title")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts">
              <ArrowLeft className="me-1 size-4" aria-hidden />
              {t("accounts.courierDetail.backToAccounts")}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Truck className="text-primary size-5" aria-hidden />
            <h1 className="text-xl font-semibold">
              {t("accounts.courierDetail.title")}
            </h1>
            <span className="text-muted-foreground text-sm">· {courierName}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("accounts.courierDetail.period")}
            </CardTitle>
            <CardDescription>
              {summary?.courier.contactPhone ?? ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label={t("accounts.filters.from")}
              />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label={t("accounts.filters.to")}
              />
            </div>
          </CardContent>
        </Card>

        {query.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : null}
        {query.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {(query.error as Error).message}
          </p>
        ) : null}

        {summary ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryStat
              label={t("accounts.courierDetail.totalShipments")}
              value={summary.totalShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.courierDetail.delivered")}
              value={summary.deliveredShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.courierDetail.rejected")}
              value={summary.rejectedShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.courierDetail.postponed")}
              value={summary.postponedShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.courierDetail.totalCollected")}
              value={formatEGP(summary.totalCollected, locale)}
            />
            <SummaryStat
              label={t("accounts.courierDetail.commissionDue")}
              value={formatEGP(summary.totalCommissionDue, locale)}
            />
            <SummaryStat
              label={t("accounts.courierDetail.netDue")}
              value={formatEGP(summary.netDue, locale)}
              highlight
            />
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent className="px-4 py-5">
        <p className="text-muted-foreground text-xs font-medium uppercase">
          {label}
        </p>
        <p
          className={
            "mt-2 text-xl font-semibold tabular-nums " +
            (highlight ? "text-primary" : "text-foreground")
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
