import { useQuery } from "@tanstack/react-query"
import { Boxes } from "react-lucid"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import { getDashboardKpis, listShipments } from "@/api/merchant-orders-api"
import type { CsShipmentRow } from "@/api/merchant-orders-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { backendShipmentTransferLabel } from "@/features/warehouse/backend-labels"
import { useAuth } from "@/lib/auth-context"

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatEGP(amountStr: string | undefined, locale: string) {
  const n = Number.parseFloat(String(amountStr ?? "0").replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function MerchantOrdersListPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const [searchParams, setSearchParams] = useSearchParams()
  const warehouseId = searchParams.get("warehouseId") ?? ""
  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites-shipments", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && user?.role === "ADMIN",
  })

  const listQueryKey = useMemo(
    () =>
      [
        "admin-shipments-list",
        token,
        page,
        pageSize,
        warehouseId,
      ] as const,
    [token, page, pageSize, warehouseId],
  )

  const shipmentsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      listShipments({
        token,
        page,
        pageSize,
        assignedWarehouseId: warehouseId || undefined,
        expand: "merchant,courier",
      }),
    enabled: !!token,
  })

  const kpiQuery = useQuery({
    queryKey: [
      "dashboard-kpis",
      "shipments-list",
      token,
      warehouseId,
    ] as const,
    queryFn: () =>
      getDashboardKpis({
        token,
        trendDays: 14,
        recentTake: 8,
        assignedWarehouseId: warehouseId || undefined,
      }),
    enabled: !!token,
  })

  const setWarehouse = useCallback(
    (next: string) => {
      const p = new URLSearchParams(searchParams)
      if (next) p.set("warehouseId", next)
      else p.delete("warehouseId")
      p.set("page", "1")
      setSearchParams(p)
    },
    [searchParams, setSearchParams],
  )

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams)
    p.set("page", String(n))
    setSearchParams(p)
  }

  const totalPages = Math.max(
    1,
    Math.ceil((shipmentsQuery.data?.total ?? 0) / pageSize),
  )

  const transferBreakdown = kpiQuery.data?.transferStatusBreakdown ?? []
  const totals = kpiQuery.data?.totals

  const detailPrefix = location.pathname.startsWith("/cs/")
    ? "/cs/merchant-orders"
    : "/merchant-orders"

  const onRowClick = (row: CsShipmentRow) => {
    void navigate(
      `${detailPrefix}/${encodeURIComponent(row.shipmentId)}`,
    )
  }

  return (
    <Layout title={t("merchantOrdersList.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Boxes className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("merchantOrdersList.pageTitle")}</CardTitle>
              <CardDescription>{t("merchantOrdersList.description")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm font-medium" htmlFor="shipments-warehouse-filter">
              {t("merchantOrdersList.filterWarehouse")}
            </label>
            <select
              id="shipments-warehouse-filter"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-[280px]"
              value={warehouseId}
              onChange={(e) => setWarehouse(e.target.value)}
              disabled={warehousesQuery.isLoading}
            >
              <option value="">{t("merchantOrdersList.allWarehouses")}</option>
              {(warehousesQuery.data?.warehouses ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.governorate ? ` · ${w.governorate}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t("merchantOrdersList.kpiTotalMerchantOrders")}
            value={totals?.totalShipments ?? 0}
            icon={Boxes}
            accent="primary"
            hideTrend
          />
          {transferBreakdown.slice(0, 3).map((row) => (
            <StatCard
              key={row.transferStatus}
              title={backendShipmentTransferLabel(t, row.transferStatus)}
              value={row.count}
              icon={Boxes}
              accent="success"
              hideTrend
            />
          ))}
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("merchantOrdersList.tableCardTitle")}
            </CardTitle>
            <CardDescription>{t("merchantOrdersList.tableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {shipmentsQuery.error ? (
              <p className="text-destructive text-sm">
                {(shipmentsQuery.error as Error).message}
              </p>
            ) : null}

            {shipmentsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("merchantOrdersList.loading")}</p>
            ) : null}

            {shipmentsQuery.data ? (
              <div className="overflow-x-auto rounded-lg border [-webkit-overflow-scrolling:touch]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("merchantOrdersList.colMerchant")}</TableHead>
                      <TableHead>{t("merchantOrdersList.colWarehouse")}</TableHead>
                      <TableHead className="text-end tabular-nums">
                        {t("merchantOrdersList.colOrderCount")}
                      </TableHead>
                      <TableHead className="text-end tabular-nums">
                        {t("merchantOrdersList.colTotalValue")}
                      </TableHead>
                      <TableHead>{t("merchantOrdersList.colTransferStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipmentsQuery.data.shipments.map((row) => (
                      <TableRow
                        key={row.shipmentId}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => onRowClick(row)}
                      >
                        <TableCell className="font-medium">
                          {row.merchant?.displayName ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.assignedWarehouse?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {row.orderCount ?? "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.totalShipmentValue ?? row.shipmentValue, locale)}
                        </TableCell>
                        <TableCell>
                          <BackendStatusBadge
                            kind="transfer"
                            value={row.transferStatus ?? ""}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {t("cs.pagination.summary", {
                  total: shipmentsQuery.data?.total ?? 0,
                  page,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t("cs.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t("cs.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

