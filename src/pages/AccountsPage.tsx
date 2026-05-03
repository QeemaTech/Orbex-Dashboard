import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Banknote, Filter as FilterIcon, RefreshCcw } from "lucide-react"

import {
  listAccountingShipments,
  type AccountingShipmentRow,
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
import { isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { cn } from "@/lib/utils"

const TABS: ReadonlyArray<AccountingShipmentTab> = [
  "DELIVERED",
  "IN_TRANSIT",
  "POSTPONED",
  "REJECTED",
] as const

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

type FilterState = {
  search: string
  merchantId: string
  courierId: string
  from: string
  to: string
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  merchantId: "",
  courierId: "",
  from: "",
  to: "",
}

export function AccountsPage() {
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

  const [tab, setTab] = useState<AccountingShipmentTab>("DELIVERED")
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  const queryKey = [
    "accounting-shipments",
    tab,
    appliedFilters,
    scopedWarehouseId,
    page,
  ] as const

  const listQuery = useQuery({
    queryKey,
    queryFn: () =>
      listAccountingShipments({
        token,
        tab,
        search: appliedFilters.search || undefined,
        merchantId: appliedFilters.merchantId || undefined,
        courierId: appliedFilters.courierId || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
        warehouseId: scopedWarehouseId,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!token,
  })

  function applyFilters() {
    setAppliedFilters(draftFilters)
    setPage(1)
  }

  function resetFilters() {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  function changeTab(next: AccountingShipmentTab) {
    setTab(next)
    setPage(1)
  }

  const totalPages = Math.max(
    1,
    Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE),
  )

  return (
    <Layout title={t("accounts.pageTitle")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Banknote className="text-primary size-6" aria-hidden />
              <h1 className="text-2xl font-semibold">{t("accounts.pageTitle")}</h1>
            </div>
            <p className="text-muted-foreground text-sm">{t("accounts.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts/balances">{t("accounts.balances.title")}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts/payout-requests">{t("accounts.payoutRequests.admin.title")}</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
          {TABS.map((key) => {
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
                onClick={() => changeTab(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FilterIcon className="size-4" aria-hidden />
              {t("accounts.filters.title")}
            </CardTitle>
            <CardDescription>
              {tab !== "DELIVERED"
                ? t("accounts.filters.deliveredOnly")
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              <Input
                placeholder={t("accounts.filters.search")}
                value={draftFilters.search}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, search: e.target.value })
                }
              />
              <Input
                placeholder={t("accounts.filters.merchantId")}
                value={draftFilters.merchantId}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, merchantId: e.target.value })
                }
              />
              <Input
                placeholder={t("accounts.filters.courierId")}
                value={draftFilters.courierId}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, courierId: e.target.value })
                }
              />
              <Input
                type="date"
                value={draftFilters.from}
                aria-label={t("accounts.filters.from")}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, from: e.target.value })
                }
              />
              <Input
                type="date"
                value={draftFilters.to}
                aria-label={t("accounts.filters.to")}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, to: e.target.value })
                }
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={applyFilters} size="sm">
                {t("accounts.filters.apply")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                <RefreshCcw className="me-1 size-4" aria-hidden />
                {t("accounts.filters.reset")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-0 py-0">
            {listQuery.isError ? (
              <p className="text-destructive px-4 py-3 text-sm" role="alert">
                {(listQuery.error as Error).message ||
                  t("accounts.feedback.loadFailed")}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <Table className="min-w-[60rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accounts.table.merchant")}</TableHead>
                    <TableHead>{t("accounts.table.customer")}</TableHead>
                    <TableHead>{t("accounts.table.courier")}</TableHead>
                    <TableHead>{t("accounts.table.trackingNumber")}</TableHead>
                    <TableHead className="text-end">
                      {t("accounts.table.shipmentValue")}
                    </TableHead>
                    <TableHead className="text-end">
                      {t("accounts.table.shippingFee")}
                    </TableHead>
                    <TableHead>{t("accounts.table.paymentMethod")}</TableHead>
                    <TableHead>{t("accounts.table.paymentStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground py-6 text-center">
                        {t("common.loading")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!listQuery.isLoading && (listQuery.data?.items.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground py-6 text-center">
                        {t("accounts.table.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {(listQuery.data?.items ?? []).map((row) => (
                    <AccountingRowView key={row.id} row={row} locale={locale} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {t("accounts.pagination.page", { page, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("accounts.pagination.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || listQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("accounts.pagination.next")}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

type AccountingRowProps = {
  row: AccountingShipmentRow
  locale: string
}

function AccountingRowView({ row, locale }: AccountingRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <Link
            to={`/accounts/merchants/${encodeURIComponent(row.merchant.id)}`}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {row.merchant.displayName}
          </Link>
          <span className="text-muted-foreground text-xs">
            {row.merchant.phone}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{row.customer.customerName}</span>
          <span className="text-muted-foreground text-xs">
            {row.customer.phonePrimary}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {row.courier ? (
          <Link
            to={`/accounts/couriers/${encodeURIComponent(row.courier.id)}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {row.courier.fullName ?? row.courier.id}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {row.trackingNumber ?? "—"}
      </TableCell>
      <TableCell className="text-end tabular-nums">
        {formatEGP(row.shipmentValue, locale)}
      </TableCell>
      <TableCell className="text-end tabular-nums">
        {formatEGP(row.shippingFee, locale)}
      </TableCell>
      <TableCell>{row.paymentMethod}</TableCell>
      <TableCell>{row.paymentStatus}</TableCell>
    </TableRow>
  )
}
