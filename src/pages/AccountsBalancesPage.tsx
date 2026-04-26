import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Building2 } from "lucide-react"

import {
  listCourierBalances,
  listMerchantBalances,
  type CourierBalanceRow,
  type MerchantBalanceRow,
} from "@/api/accounting-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"

const PAGE_SIZE = 25

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
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

export function AccountsBalancesPage() {
  const { t, i18n } = useTranslation()
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const scopedWarehouseId = useMemo<string | undefined>(() => {
    if (!user) return undefined
    if (isWarehouseAdmin(user)) return user.adminWarehouse?.id ?? undefined
    if (isWarehouseStaff(user)) return user.warehouseId ?? undefined
    return undefined
  }, [user])

  const [search, setSearch] = useState("")
  const [from, setFrom] = useState(startOfMonthISO())
  const [to, setTo] = useState(endOfMonthISO())
  const [merchantPage, setMerchantPage] = useState(1)
  const [courierPage, setCourierPage] = useState(1)

  const merchantQuery = useQuery({
    queryKey: [
      "accounting-merchant-balances",
      scopedWarehouseId,
      search,
      from,
      to,
      merchantPage,
    ],
    queryFn: () =>
      listMerchantBalances({
        token,
        warehouseId: scopedWarehouseId,
        search: search || undefined,
        from,
        to,
        page: merchantPage,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!token,
  })

  const courierQuery = useQuery({
    queryKey: [
      "accounting-courier-balances",
      scopedWarehouseId,
      search,
      from,
      to,
      courierPage,
    ],
    queryFn: () =>
      listCourierBalances({
        token,
        warehouseId: scopedWarehouseId,
        search: search || undefined,
        from,
        to,
        page: courierPage,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!token,
  })

  const merchantTotal = merchantQuery.data?.total ?? 0
  const merchantTotalPages = Math.max(1, Math.ceil(merchantTotal / PAGE_SIZE))
  const courierTotal = courierQuery.data?.total ?? 0
  const courierTotalPages = Math.max(1, Math.ceil(courierTotal / PAGE_SIZE))

  return (
    <Layout title={t("accounts.balances.title")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="text-primary size-5" aria-hidden />
            <h1 className="text-xl font-semibold">{t("accounts.balances.title")}</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts">{t("accounts.balances.backToShipments")}</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.balances.filters")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setMerchantPage(1)
                setCourierPage(1)
              }}
              placeholder={t("accounts.balances.searchPlaceholder")}
            />
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setMerchantPage(1)
                setCourierPage(1)
              }}
              aria-label={t("accounts.filters.from")}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setMerchantPage(1)
                setCourierPage(1)
              }}
              aria-label={t("accounts.filters.to")}
            />
          </CardContent>
        </Card>

        {merchantQuery.isLoading || courierQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : null}
        {merchantQuery.isError || courierQuery.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {((merchantQuery.error ?? courierQuery.error) as Error).message}
          </p>
        ) : null}

        <MerchantBalancesTable
          rows={(merchantQuery.data?.items ?? []) as MerchantBalanceRow[]}
          locale={locale}
        />

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("accounts.pagination.page")} {merchantPage} / {merchantTotalPages} ·{" "}
            {merchantTotal} {t("accounts.pagination.total")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={merchantPage <= 1}
              onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
            >
              {t("accounts.pagination.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={merchantPage >= merchantTotalPages}
              onClick={() =>
                setMerchantPage((p) => Math.min(merchantTotalPages, p + 1))
              }
            >
              {t("accounts.pagination.next")}
            </Button>
          </div>
        </div>

        <CourierBalancesTable
          rows={(courierQuery.data?.items ?? []) as CourierBalanceRow[]}
          locale={locale}
        />

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("accounts.pagination.page")} {courierPage} / {courierTotalPages} ·{" "}
            {courierTotal} {t("accounts.pagination.total")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={courierPage <= 1}
              onClick={() => setCourierPage((p) => Math.max(1, p - 1))}
            >
              {t("accounts.pagination.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={courierPage >= courierTotalPages}
              onClick={() =>
                setCourierPage((p) => Math.min(courierTotalPages, p + 1))
              }
            >
              {t("accounts.pagination.next")}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function MerchantBalancesTable({
  rows,
  locale,
}: {
  rows: MerchantBalanceRow[]
  locale: string
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("accounts.balances.merchantsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[56rem]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("accounts.table.merchant")}</TableHead>
                <TableHead>{t("accounts.table.merchantPhone")}</TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.totalShipmentValue")}
                </TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.totalShippingFees")}
                </TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.totalCollected")}
                </TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.totalCommission")}
                </TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.remaining")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.merchant.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/accounts/merchants/${encodeURIComponent(r.merchant.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.merchant.displayName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.merchant.phone}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatEGP(r.totalShipmentValue, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatEGP(r.totalShippingFees, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatEGP(r.totalCollected, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatEGP(r.totalCommission, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-semibold">
                    {formatEGP(r.remaining, locale)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
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
    </Card>
  )
}

function CourierBalancesTable({
  rows,
  locale,
}: {
  rows: CourierBalanceRow[]
  locale: string
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("accounts.balances.couriersTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("accounts.table.courier")}</TableHead>
                <TableHead>{t("accounts.balances.columns.phone")}</TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.totalCollected")}
                </TableHead>
                <TableHead className="text-end">
                  {t("accounts.balances.columns.totalCommission")}
                </TableHead>
                <TableHead className="text-end">{t("accounts.balances.columns.netDue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.courier.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/accounts/couriers/${encodeURIComponent(r.courier.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.courier.fullName ?? r.courier.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.courier.contactPhone ?? "—"}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatEGP(r.totalCollected, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatEGP(r.totalCommissionDue, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-semibold">
                    {formatEGP(r.netDue, locale)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    {t("accounts.table.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

