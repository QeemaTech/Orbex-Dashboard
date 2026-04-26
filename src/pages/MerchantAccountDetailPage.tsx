import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Download, ShoppingBag } from "lucide-react"

import {
  getMerchantAccountSummary,
  createMerchantPayoutRequest,
  listMerchantPayoutRequests,
  listAccountingShipments,
  type AccountingShipmentTab,
} from "@/api/accounting-api"
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
import { showToast } from "@/lib/toast"

const LEDGER_TABS: ReadonlyArray<AccountingShipmentTab> = [
  "DELIVERED",
  "IN_TRANSIT",
  "POSTPONED",
  "REJECTED",
] as const

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
  const canRequestPayout = Boolean(user?.permissions?.includes("accounts.request_payout"))
  const qc = useQueryClient()

  const [from, setFrom] = useState<string>(startOfMonthISO())
  const [to, setTo] = useState<string>(endOfMonthISO())
  const [ledgerTab, setLedgerTab] = useState<AccountingShipmentTab>("DELIVERED")
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [ledgerPage, setLedgerPage] = useState(1)
  const [deductionPercent, setDeductionPercent] = useState<string>("10")

  const query = useQuery({
    queryKey: ["accounting-merchant-summary", merchantId, from, to],
    queryFn: () => getMerchantAccountSummary(token, merchantId, { from, to }),
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
    queryFn: () =>
      listAccountingShipments({
        token,
        tab: ledgerTab,
        merchantId,
        search: ledgerSearch || undefined,
        from,
        to,
        page: ledgerPage,
        pageSize: 25,
      }),
    enabled: !!token && !!merchantId,
  })

  const createPayoutMut = useMutation({
    mutationFn: async () => {
      const pct = Number(deductionPercent)
      return createMerchantPayoutRequest({
        token,
        merchantId,
        periodFrom: from,
        periodTo: to,
        deliveryDeductionPercent: pct,
      })
    },
    onSuccess: async () => {
      showToast(t("accounts.payoutRequests.requested"), "success")
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-merchant-payout-requests", merchantId] }),
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
    const pct = Number(deductionPercent)
    if (!summary || !Number.isFinite(pct)) return null
    const gross = Number(summary.totalCollected)
    if (!Number.isFinite(gross)) return null
    const deduction = (gross * pct) / 100
    const net = gross - deduction
    return {
      gross: gross.toFixed(2),
      deduction: deduction.toFixed(2),
      net: net.toFixed(2),
      pct,
    }
  }, [summary, deductionPercent])

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

        {canRequestPayout ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("accounts.payoutRequests.requestTitle")}</CardTitle>
              <CardDescription>{t("accounts.payoutRequests.requestHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <label className="text-muted-foreground text-xs font-medium">
                    {t("accounts.payoutRequests.deliveryDeductionPercent")}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={deductionPercent}
                    onChange={(e) => setDeductionPercent(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-muted-foreground text-xs font-medium">
                    {t("accounts.payoutRequests.gross")}
                  </label>
                  <p className="tabular-nums">{formatEGP(payoutPreview?.gross ?? "0", locale)}</p>
                </div>
                <div className="grid gap-1">
                  <label className="text-muted-foreground text-xs font-medium">
                    {t("accounts.payoutRequests.net")}
                  </label>
                  <p className="text-primary tabular-nums font-semibold">
                    {formatEGP(payoutPreview?.net ?? "0", locale)}
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

        <Card>
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
                      <TableCell className="font-medium">{r.status}</TableCell>
                      <TableCell className="text-muted-foreground">
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
                  {(payoutHistoryQuery.data?.items?.length ?? 0) === 0 ? (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.ledger.title")}</CardTitle>
            <CardDescription>{t("accounts.ledger.hint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {LEDGER_TABS.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={ledgerTab === key ? "default" : "outline"}
                    onClick={() => {
                      setLedgerTab(key)
                      setLedgerPage(1)
                    }}
                  >
                    {t(
                      key === "DELIVERED"
                        ? "accounts.tabs.delivered"
                        : key === "IN_TRANSIT"
                          ? "accounts.tabs.inTransit"
                          : key === "POSTPONED"
                            ? "accounts.tabs.postponed"
                            : "accounts.tabs.rejected",
                    )}
                  </Button>
                ))}
              </div>
              <Input
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value)
                  setLedgerPage(1)
                }}
                placeholder={t("accounts.ledger.search")}
                className="max-w-sm"
              />
            </div>
          </CardContent>
          <CardContent className="px-0">
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
                          {row.trackingNumber ?? row.id}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.customer.customerName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.status}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.paymentStatus}
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
                  {(ledgerQuery.data?.items?.length ?? 0) === 0 ? (
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
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {t("accounts.pagination.page")} {ledgerPage} /{" "}
              {Math.max(1, Math.ceil((ledgerQuery.data?.total ?? 0) / 25))} ·{" "}
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
                disabled={ledgerPage >= Math.max(1, Math.ceil((ledgerQuery.data?.total ?? 0) / 25))}
                onClick={() =>
                  setLedgerPage((p) =>
                    Math.min(
                      Math.max(1, Math.ceil((ledgerQuery.data?.total ?? 0) / 25)),
                      p + 1,
                    ),
                  )
                }
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
