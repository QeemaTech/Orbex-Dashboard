import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import {
  getCourierAccountSummary,
  listAccountingShipments,
  type AccountingShipmentTab,
} from "@/api/accounting-api"
import DeliveryIcon from "@/components/icons/DeliveryIcon"
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
  const [ledgerTab, setLedgerTab] = useState<AccountingShipmentTab>("DELIVERED")
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [ledgerPage, setLedgerPage] = useState(1)

  const query = useQuery({
    queryKey: ["accounting-courier-summary", courierId, from, to],
    queryFn: () =>
      getCourierAccountSummary(token, courierId, { from, to }),
    enabled: !!token && !!courierId,
  })

  const ledgerQuery = useQuery({
    queryKey: [
      "accounting-courier-ledger",
      courierId,
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
        courierId,
        search: ledgerSearch || undefined,
        from,
        to,
        page: ledgerPage,
        pageSize: 25,
      }),
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
            <DeliveryIcon className="text-primary size-5" aria-hidden />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.ledger.title")}</CardTitle>
            <CardDescription>{t("accounts.ledger.courierHint")}</CardDescription>
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
                    <TableHead>{t("accounts.table.merchant")}</TableHead>
                    <TableHead>{t("accounts.table.status")}</TableHead>
                    <TableHead>{t("accounts.table.paymentStatus")}</TableHead>
                    <TableHead className="text-end">{t("accounts.table.shipmentValue")}</TableHead>
                    <TableHead className="text-end">{t("accounts.ledger.commission")}</TableHead>
                    <TableHead className="text-end">{t("accounts.ledger.netDue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ledgerQuery.data?.items ?? []).map((row) => {
                    const value = Number(row.shipmentValue)
                    const comm = Number(row.courierCommissionFee ?? "0")
                    const netDue = value - comm
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.trackingNumber ?? row.id}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.merchant.displayName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.status}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.paymentStatus}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.shipmentValue, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.courierCommissionFee, locale)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-semibold">
                          {formatEGP(netDue.toFixed(2), locale)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(ledgerQuery.data?.items?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground text-center">
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
