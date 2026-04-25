import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Download, ShoppingBag } from "lucide-react"

import { getMerchantAccountSummary } from "@/api/accounting-api"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfMonthISO(): string {
  const d = new Date()
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)))
}

function endOfMonthISO(): string {
  const d = new Date()
  return isoDate(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)),
  )
}

function csvEscape(v: string | number): string {
  const s = String(v)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function MerchantAccountDetailPage() {
  const { t, i18n } = useTranslation()
  const { merchantId = "" } = useParams()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const locale = resolveNumberLocale(i18n.language)
  const canExport = Boolean(user?.permissions?.includes("accounts.export"))

  const [from, setFrom] = useState<string>(startOfMonthISO())
  const [to, setTo] = useState<string>(endOfMonthISO())

  const query = useQuery({
    queryKey: ["accounting-merchant-summary", merchantId, from, to],
    queryFn: () => getMerchantAccountSummary(token, merchantId, { from, to }),
    enabled: !!token && !!merchantId,
  })

  const summary = query.data?.summary
  const daily = query.data?.daily ?? []

  const merchantLabel = useMemo(
    () => summary?.merchant.displayName ?? merchantId,
    [summary, merchantId],
  )

  function exportCsv() {
    if (!summary) return
    const headers = [
      t("accounts.merchantDetail.date"),
      t("accounts.merchantDetail.shipments"),
      t("accounts.merchantDetail.delivered"),
      t("accounts.merchantDetail.collectedCol"),
      t("accounts.merchantDetail.commissionCol"),
      t("accounts.merchantDetail.net"),
    ]
    const summaryHeader = [
      `# ${t("accounts.merchantDetail.title")}: ${summary.merchant.displayName}`,
      `# ${t("accounts.merchantDetail.period")}: ${from} -> ${to}`,
      `# ${t("accounts.merchantDetail.collected")}: ${summary.totalCollected}`,
      `# ${t("accounts.merchantDetail.commission")}: ${summary.totalCommission}`,
      `# ${t("accounts.merchantDetail.remaining")}: ${summary.remaining}`,
    ].join("\n")

    const rows = daily.map((row) =>
      [
        row.date,
        row.shipmentCount,
        row.delivered,
        row.collected,
        row.commission,
        row.net,
      ]
        .map(csvEscape)
        .join(","),
    )
    const csv = [
      summaryHeader,
      headers.map(csvEscape).join(","),
      ...rows,
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `accounts-merchant-${summary.merchant.id}-${from}-${to}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Layout title={t("accounts.merchantDetail.title")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/accounts">
                <ArrowLeft className="me-1 size-4" aria-hidden />
                {t("accounts.merchantDetail.backToAccounts")}
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-primary size-5" aria-hidden />
              <h1 className="text-xl font-semibold">
                {t("accounts.merchantDetail.title")}
              </h1>
              <span className="text-muted-foreground text-sm">· {merchantLabel}</span>
            </div>
          </div>
          {canExport ? (
            <Button
              type="button"
              size="sm"
              onClick={exportCsv}
              disabled={!summary || daily.length === 0}
            >
              <Download className="me-1 size-4" aria-hidden />
              {t("accounts.merchantDetail.exportExcel")}
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("accounts.merchantDetail.period")}
            </CardTitle>
            <CardDescription>{summary?.merchant.phone ?? ""}</CardDescription>
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
              label={t("accounts.merchantDetail.totalShipments")}
              value={summary.monthlyShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.delivered")}
              value={summary.deliveredShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.settled")}
              value={summary.settledShipments.toLocaleString(locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.totalValue")}
              value={formatEGP(summary.totalShipmentValue, locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.collected")}
              value={formatEGP(summary.totalCollected, locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.commission")}
              value={formatEGP(summary.totalCommission, locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.shippingFees")}
              value={formatEGP(summary.totalShippingFees, locale)}
            />
            <SummaryStat
              label={t("accounts.merchantDetail.remaining")}
              value={formatEGP(summary.remaining, locale)}
              highlight
            />
          </div>
        ) : null}

        {daily.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("accounts.merchantDetail.daily")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[42rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("accounts.merchantDetail.date")}</TableHead>
                      <TableHead className="text-end">
                        {t("accounts.merchantDetail.shipments")}
                      </TableHead>
                      <TableHead className="text-end">
                        {t("accounts.merchantDetail.delivered")}
                      </TableHead>
                      <TableHead className="text-end">
                        {t("accounts.merchantDetail.collectedCol")}
                      </TableHead>
                      <TableHead className="text-end">
                        {t("accounts.merchantDetail.commissionCol")}
                      </TableHead>
                      <TableHead className="text-end">
                        {t("accounts.merchantDetail.net")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daily.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">{row.date}</TableCell>
                        <TableCell className="text-end tabular-nums">
                          {row.shipmentCount.toLocaleString(locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {row.delivered.toLocaleString(locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.collected, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.commission, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.net, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
