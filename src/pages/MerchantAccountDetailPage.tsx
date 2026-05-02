import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Download,
  Phone,
  ShoppingBag,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  getMerchantAccountSummary,
  createMerchantPayoutRequest,
  listMerchantPayoutRequests,
  listAccountingShipments,
  type AccountingShipmentTab,
  type MerchantPayoutRequestStatus,
} from "@/api/accounting-api"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
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
import { ShipmentStatusBadge } from "@/features/customer-service/components/ShipmentStatusBadge"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const LEDGER_TABS: ReadonlyArray<AccountingShipmentTab> = [
  "DELIVERED",
  "IN_TRANSIT",
  "POSTPONED",
  "REJECTED",
] as const

const LEDGER_PAGE_SIZE = 25

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

function monthRangeUTC(year: number, monthIndex: number): { from: string; to: string } {
  const from = isoDate(new Date(Date.UTC(year, monthIndex, 1)))
  const to = isoDate(new Date(Date.UTC(year, monthIndex + 1, 0)))
  return { from, to }
}

/** API bounds: inclusive calendar days as full UTC intervals (fixes same-day truncation). */
function apiPeriodBounds(
  fromDay: string,
  toDay: string,
): { from: string; to: string } {
  const isoDay = /^\d{4}-\d{2}-\d{2}$/
  return {
    from: isoDay.test(fromDay.trim()) ? `${fromDay.trim()}T00:00:00.000Z` : fromDay.trim(),
    to: isoDay.test(toDay.trim()) ? `${toDay.trim()}T23:59:59.999Z` : toDay.trim(),
  }
}

function csvEscape(v: string | number): string {
  const s = String(v)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function payoutStatusBadgeClass(status: MerchantPayoutRequestStatus): string {
  switch (status) {
    case "PAID":
      return "border-success/45 bg-success/12 text-success"
    case "APPROVED":
      return "border-primary/40 bg-primary/10 text-primary"
    case "REJECTED":
      return "border-destructive/40 bg-destructive/10 text-destructive"
    case "PENDING":
    default:
      return "border-warning/45 bg-warning/12 text-warning"
  }
}

export function MerchantAccountDetailPage() {
  const { t, i18n } = useTranslation()
  const { merchantId = "" } = useParams()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const locale = resolveNumberLocale(i18n.language)
  const canExport = Boolean(user?.permissions?.includes("accounts.export"))
  const canRequestPayout = Boolean(user?.permissions?.includes("accounts.request_payout"))
  const canOpenBalances = Boolean(
    user?.role === "ADMIN" || user?.permissions?.includes("accounts.read"),
  )
  const qc = useQueryClient()

  const [from, setFrom] = useState<string>(startOfMonthISO())
  const [to, setTo] = useState<string>(endOfMonthISO())
  const [ledgerTab, setLedgerTab] = useState<AccountingShipmentTab>("DELIVERED")
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [ledgerPage, setLedgerPage] = useState(1)

  useEffect(() => {
    setLedgerPage(1)
  }, [from, to])

  const query = useQuery({
    queryKey: ["accounting-merchant-summary", merchantId, from, to],
    queryFn: () =>
      getMerchantAccountSummary(token, merchantId, apiPeriodBounds(from, to)),
    enabled: !!token && !!merchantId,
  })

  const payoutHistoryQuery = useQuery({
    queryKey: ["accounting-merchant-payout-requests", merchantId],
    queryFn: () => listMerchantPayoutRequests({ token, merchantId, page: 1, pageSize: 50 }),
    enabled: !!token && !!merchantId,
  })

  const ledgerQuery = useQuery({
    queryKey: [
      "accounting-merchant-ledger",
      merchantId,
      ledgerTab,
      ledgerSearch,
      from,
      to,
      ledgerPage,
    ],
    queryFn: () => {
      const { from: fromApi, to: toApi } = apiPeriodBounds(from, to)
      return listAccountingShipments({
        token,
        tab: ledgerTab,
        merchantId,
        search: ledgerSearch || undefined,
        from: fromApi,
        to: toApi,
        page: ledgerPage,
        pageSize: LEDGER_PAGE_SIZE,
      })
    },
    enabled: !!token && !!merchantId,
  })

  const createPayoutMut = useMutation({
    mutationFn: async () => {
      return createMerchantPayoutRequest({
        token,
        merchantId,
        periodFrom: from,
        periodTo: to,
        deliveryDeductionPercent: 0,
      })
    },
    onSuccess: async () => {
      showToast(t("accounts.payoutRequests.requested"), "success")
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-merchant-payout-requests", merchantId] }),
        qc.invalidateQueries({ queryKey: ["accounting-merchant-summary", merchantId] }),
      ])
    },
    onError: (e) => {
      showToast((e as Error).message || t("accounts.payoutRequests.requestFailed"), "error")
    },
  })

  const summary = query.data?.summary
  const daily = query.data?.daily ?? []

  const merchantLabel = useMemo(
    () => summary?.merchant.displayName ?? merchantId,
    [summary, merchantId],
  )

  const payoutPreview = useMemo(() => {
    if (!summary) return null
    const codFace = Number(summary.totalCollected)
    let payable = Number(summary.remaining)
    if (!Number.isFinite(codFace) || !Number.isFinite(payable)) return null
    payable = Math.max(0, payable)
    return {
      codFace: codFace.toFixed(2),
      payableNet: payable.toFixed(2),
    }
  }, [summary])

  const chartRows = useMemo(() => {
    const slice = daily.length > 45 ? daily.slice(-45) : daily
    return slice.map((row) => ({
      ...row,
      label: new Date(`${row.date}T12:00:00.000Z`).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
      collectedN: Number(row.collected),
      netN: Number(row.net),
    }))
  }, [daily, locale])

  const ledgerTotalPages = Math.max(
    1,
    Math.ceil((ledgerQuery.data?.total ?? 0) / LEDGER_PAGE_SIZE),
  )

  function applyPresetThisMonth() {
    const d = new Date()
    const { from: f, to: t2 } = monthRangeUTC(d.getUTCFullYear(), d.getUTCMonth())
    setFrom(f)
    setTo(t2)
  }

  function applyPresetLastMonth() {
    const d = new Date()
    let y = d.getUTCFullYear()
    let m = d.getUTCMonth() - 1
    if (m < 0) {
      m = 11
      y -= 1
    }
    const { from: f, to: t2 } = monthRangeUTC(y, m)
    setFrom(f)
    setTo(t2)
  }

  function applyPresetLast90Days() {
    const end = new Date()
    const endStr = isoDate(end)
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    )
    start.setUTCDate(start.getUTCDate() - 89)
    setFrom(isoDate(start))
    setTo(endStr)
  }

  /** From a fixed early cutoff through today — matches backend shipment `createdAt` filter. */
  function applyPresetAllTime() {
    setFrom("2000-01-01")
    setTo(isoDate(new Date()))
  }

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
      `# ${t("accounts.merchantDetail.packagingFees")}: ${summary.totalPackagingFees}`,
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
    const csv = [summaryHeader, headers.map(csvEscape).join(","), ...rows].join("\n")

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/accounts">
                  <ArrowLeft className="me-1 size-4" aria-hidden />
                  {t("accounts.merchantDetail.backToAccounts")}
                </Link>
              </Button>
              {canOpenBalances ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/accounts/balances">{t("accounts.merchantDetail.openBalances")}</Link>
                </Button>
              ) : null}
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
            <div className="from-primary/12 border-primary/25 flex flex-wrap items-start gap-4 rounded-2xl border bg-gradient-to-br to-card px-5 py-4 shadow-sm">
              <div className="bg-primary/15 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
                <ShoppingBag className="size-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">{merchantLabel}</h1>
                {summary?.merchant.businessName ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Building2 className="size-4 shrink-0 opacity-70" aria-hidden />
                    <span>{summary.merchant.businessName}</span>
                  </p>
                ) : null}
                {summary?.merchant.phone ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Phone className="size-4 shrink-0 opacity-70" aria-hidden />
                    <span className="tabular-nums">{summary.merchant.phone}</span>
                  </p>
                ) : null}
                <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                  {t("accounts.merchantDetail.subtitle")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("accounts.merchantDetail.period")}</CardTitle>
            <CardDescription>{t("accounts.ledger.hint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={applyPresetThisMonth}>
                {t("accounts.merchantDetail.periodPresets.thisMonth")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={applyPresetLastMonth}>
                {t("accounts.merchantDetail.periodPresets.lastMonth")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={applyPresetLast90Days}>
                {t("accounts.merchantDetail.periodPresets.last90Days")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={applyPresetAllTime}>
                {t("accounts.merchantDetail.periodPresets.allTime")}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  {t("accounts.filters.from")}
                </label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={t("accounts.filters.from")}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  {t("accounts.filters.to")}
                </label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={t("accounts.filters.to")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {query.isLoading ? <SummaryGridSkeleton /> : null}
        {query.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {(query.error as Error).message}
          </p>
        ) : null}

        {summary ? (
          <>
            <div>
              <h2 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                <BarChart3 className="size-4" aria-hidden />
                {t("accounts.merchantDetail.summarySection")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  label={t("accounts.merchantDetail.packagingFees")}
                  value={formatEGP(summary.totalPackagingFees, locale)}
                />
                <SummaryStat
                  label={t("accounts.merchantDetail.remaining")}
                  value={formatEGP(summary.remaining, locale)}
                  highlight
                />
              </div>
            </div>

            {canRequestPayout ? (
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{t("accounts.payoutRequests.requestTitle")}</CardTitle>
                  <CardDescription>{t("accounts.payoutRequests.requestHint")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="grid gap-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t("accounts.payoutRequests.codFaceTotal")}
                      </label>
                      <p className="text-foreground py-2 text-lg font-semibold tabular-nums">
                        {formatEGP(payoutPreview?.codFace ?? "0", locale)}
                      </p>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t("accounts.payoutRequests.payableBalance")}
                      </label>
                      <p className="text-primary py-2 text-lg font-semibold tabular-nums">
                        {formatEGP(payoutPreview?.payableNet ?? "0", locale)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => createPayoutMut.mutate()}
                    disabled={!summary || createPayoutMut.isPending || !payoutPreview}
                  >
                    {createPayoutMut.isPending
                      ? t("common.processing")
                      : t("accounts.payoutRequests.requestButton")}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {chartRows.length > 0 ? (
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{t("accounts.merchantDetail.chartTitle")}</CardTitle>
                  {daily.length > 45 ? (
                    <CardDescription>
                      {t("accounts.merchantDetail.chartWindow", { count: 45 })}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="h-[min(320px,50vh)] min-h-[220px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickMargin={6} />
                      <YAxis tick={{ fontSize: 11 }} width={44} />
                      <Tooltip
                        formatter={(value) =>
                          formatEGP(String(value ?? 0), locale)
                        }
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid color-mix(in oklch, var(--border) 80%, transparent)",
                        }}
                      />
                      <Legend />
                      <Bar
                        name={t("accounts.merchantDetail.chartCollected")}
                        dataKey="collectedN"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        name={t("accounts.merchantDetail.chartNet")}
                        dataKey="netN"
                        fill="var(--success)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            {daily.length > 0 ? (
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{t("accounts.merchantDetail.daily")}</CardTitle>
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
          </>
        ) : null}

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.payoutRequests.historyTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {payoutHistoryQuery.isLoading ? (
              <p className="text-muted-foreground px-6 text-sm">{t("common.loading")}</p>
            ) : null}
            {payoutHistoryQuery.isError ? (
              <p className="text-destructive px-6 text-sm" role="alert">
                {(payoutHistoryQuery.error as Error).message}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <Table className="min-w-[56rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accounts.payoutRequests.status")}</TableHead>
                    <TableHead>{t("accounts.payoutRequests.period")}</TableHead>
                    <TableHead className="text-end">{t("accounts.payoutRequests.shipments")}</TableHead>
                    <TableHead className="text-end">{t("accounts.payoutRequests.net")}</TableHead>
                    <TableHead>{t("accounts.payoutRequests.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payoutHistoryQuery.data?.items ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("font-semibold", payoutStatusBadgeClass(r.status))}
                        >
                          {t(`accounts.payoutRequests.payoutStatuses.${r.status}`, {
                            defaultValue: r.status,
                          })}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {r.periodFrom.slice(0, 10)} → {r.periodTo.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {r.shipmentCount.toLocaleString(locale)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-semibold">
                        {formatEGP(r.netPayable, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.createdAt.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(payoutHistoryQuery.data?.items?.length ?? 0) === 0 &&
                  !payoutHistoryQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center">
                        {t("accounts.payoutRequests.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.ledger.title")}</CardTitle>
            <CardDescription>{t("accounts.ledger.hint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 border-border/60 border-b pb-3 sm:border-0 sm:pb-0">
                {LEDGER_TABS.map((key) => {
                  const label = t(
                    key === "DELIVERED"
                      ? "accounts.tabs.delivered"
                      : key === "IN_TRANSIT"
                        ? "accounts.tabs.inTransit"
                        : key === "POSTPONED"
                          ? "accounts.tabs.postponed"
                          : "accounts.tabs.rejected",
                  )
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setLedgerTab(key)
                        setLedgerPage(1)
                      }}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        ledgerTab === key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <Input
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value)
                  setLedgerPage(1)
                }}
                placeholder={t("accounts.ledger.search")}
                className="max-w-full sm:max-w-sm"
              />
            </div>
          </CardContent>
          <CardContent className="px-0 pb-6">
            {ledgerQuery.isLoading ? (
              <p className="text-muted-foreground px-6 text-sm">{t("common.loading")}</p>
            ) : null}
            {ledgerQuery.isError ? (
              <p className="text-destructive px-6 text-sm" role="alert">
                {(ledgerQuery.error as Error).message}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <Table className="min-w-[62rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accounts.table.trackingNumber")}</TableHead>
                    <TableHead>{t("accounts.table.customer")}</TableHead>
                    <TableHead>{t("accounts.table.status")}</TableHead>
                    <TableHead>{t("accounts.table.paymentStatus")}</TableHead>
                    <TableHead className="text-end">{t("accounts.table.shipmentValue")}</TableHead>
                    <TableHead className="text-end">{t("accounts.table.shippingFee")}</TableHead>
                    <TableHead className="text-end">{t("accounts.ledger.commission")}</TableHead>
                    <TableHead className="text-end">{t("accounts.ledger.net")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ledgerQuery.data?.items ?? []).map((row) => {
                    const value = Number(row.shipmentValue)
                    const fee = Number(row.shippingFee)
                    const comm = Number(row.commissionFee ?? "0")
                    const net = value - fee - comm
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/shipments/${encodeURIComponent(row.id)}`}
                            className="text-primary font-mono text-xs underline-offset-4 hover:underline"
                          >
                            {row.trackingNumber ?? row.id.slice(0, 8) + "…"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{row.customer.customerName}</span>
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {row.customer.phonePrimary}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ShipmentStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          <ShipmentStatusBadge status={row.paymentStatus} />
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.shipmentValue, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.shippingFee, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.commissionFee, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-semibold">
                          {formatEGP(net.toFixed(2), locale)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(ledgerQuery.data?.items?.length ?? 0) === 0 && !ledgerQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground text-center">
                        {t("accounts.table.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardContent className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              {t("accounts.pagination.page", { page: ledgerPage, total: ledgerTotalPages })} ·{" "}
              {ledgerQuery.data?.total ?? 0} {t("accounts.pagination.total")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              >
                {t("accounts.pagination.prev")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={ledgerPage >= ledgerTotalPages}
                onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
              >
                {t("accounts.pagination.next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

function SummaryGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/40 h-[5.5rem] animate-pulse rounded-xl border border-border/50"
        />
      ))}
    </div>
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
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        highlight && "border-primary/35 ring-primary/12 bg-primary/[0.03] ring-1",
      )}
    >
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tabular-nums tracking-tight sm:text-xl",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}
