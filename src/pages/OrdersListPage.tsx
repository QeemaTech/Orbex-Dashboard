import { useQuery } from "@tanstack/react-query"
import { Sparkles } from "react-lucid"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { listOrders } from "@/api/orders-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CsShipmentFilters,
  type CsFilterValues,
} from "@/features/customer-service/components/CsShipmentFilters"
import { AdminOrdersTable } from "@/features/shipments/components/AdminOrdersTable"
import { OrderKpiStatRow } from "@/features/shipments/components/OrderKpiStatRow"
import { useAuth } from "@/lib/auth-context"

/** Customer order lines (`GET /api/orders`); row opens **order** detail at `/orders/:orderId`. */
export function OrdersListPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: CsFilterValues = useMemo(
    () => ({
      merchantName: searchParams.get("merchantName") ?? "",
      courierName: searchParams.get("courierName") ?? "",
      unassignedOnly: searchParams.get("unassignedOnly") === "true",
      regionName: searchParams.get("regionName") ?? "",
      phoneSearch: searchParams.get("phoneSearch") ?? "",
      trackingNumber: searchParams.get("trackingNumber") ?? "",
      status: searchParams.get("status") ?? "",
      subStatus: searchParams.get("subStatus") ?? "",
      paymentStatus: searchParams.get("paymentStatus") ?? "",
      createdFrom: searchParams.get("createdFrom") ?? "",
      createdTo: searchParams.get("createdTo") ?? "",
      overdueOnly: searchParams.get("overdueOnly") === "true",
    }),
    [searchParams],
  )

  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20

  const listQueryKey = useMemo(
    () =>
      [
        "orders-lines-list",
        token,
        page,
        pageSize,
        filters.merchantName,
        filters.courierName,
        filters.unassignedOnly,
        filters.regionName,
        filters.phoneSearch,
        filters.trackingNumber,
        filters.status,
        filters.subStatus,
        filters.paymentStatus,
        filters.createdFrom,
        filters.createdTo,
        filters.overdueOnly,
      ] as const,
    [
      token,
      page,
      pageSize,
      filters.merchantName,
      filters.courierName,
      filters.unassignedOnly,
      filters.regionName,
      filters.phoneSearch,
      filters.trackingNumber,
      filters.status,
      filters.subStatus,
      filters.paymentStatus,
      filters.createdFrom,
      filters.createdTo,
      filters.overdueOnly,
    ],
  )

  const ordersQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      listOrders({
        token,
        page,
        pageSize,
        merchantName: filters.merchantName || undefined,
        courierName: filters.courierName || undefined,
        unassignedOnly: filters.unassignedOnly,
        regionName: filters.regionName || undefined,
        phoneSearch: filters.phoneSearch || undefined,
        trackingNumber: filters.trackingNumber || undefined,
        status: filters.status || undefined,
        subStatus: filters.subStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
        overdueOnly: filters.overdueOnly,
      }),
    enabled: !!token,
  })

  const setFilters = useCallback(
    (next: CsFilterValues) => {
      const p = new URLSearchParams(searchParams)
      if (next.merchantName) p.set("merchantName", next.merchantName)
      else p.delete("merchantName")
      if (next.courierName) {
        p.set("courierName", next.courierName)
      } else p.delete("courierName")
      if (next.unassignedOnly) p.set("unassignedOnly", "true")
      else p.delete("unassignedOnly")
      if (next.regionName) p.set("regionName", next.regionName)
      else p.delete("regionName")
      p.delete("merchantId")
      p.delete("assignedCourierId")
      p.delete("regionId")
      if (next.phoneSearch) p.set("phoneSearch", next.phoneSearch)
      else p.delete("phoneSearch")
      if (next.trackingNumber) p.set("trackingNumber", next.trackingNumber)
      else p.delete("trackingNumber")
      p.delete("coreSubIn")
      if (next.status) p.set("status", next.status)
      else p.delete("status")
      if (next.subStatus) p.set("subStatus", next.subStatus)
      else p.delete("subStatus")
      if (next.paymentStatus) p.set("paymentStatus", next.paymentStatus)
      else p.delete("paymentStatus")
      if (next.createdFrom) p.set("createdFrom", next.createdFrom)
      else p.delete("createdFrom")
      if (next.createdTo) p.set("createdTo", next.createdTo)
      else p.delete("createdTo")
      if (next.overdueOnly) p.set("overdueOnly", "true")
      else p.delete("overdueOnly")
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
    Math.ceil((ordersQuery.data?.total ?? 0) / pageSize),
  )

  return (
    <Layout title={t("ordersList.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("ordersList.pageTitle")}</CardTitle>
              <CardDescription>{t("ordersList.description")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <OrderKpiStatRow
          token={token}
          filters={filters}
          queryKeyPrefix="orders-list-page"
        />

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("ordersList.tableCardTitle")}
            </CardTitle>
            <CardDescription>{t("ordersList.tableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <CsShipmentFilters values={filters} onChange={setFilters} />

            {ordersQuery.error ? (
              <p className="text-destructive text-sm">
                {(ordersQuery.error as Error).message}
              </p>
            ) : null}

            {ordersQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("ordersList.loading")}</p>
            ) : null}

            {ordersQuery.data && ordersQuery.data.shipments.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border [-webkit-overflow-scrolling:touch]">
                <AdminOrdersTable rows={ordersQuery.data.shipments} />
              </div>
            ) : null}

            {ordersQuery.data &&
            ordersQuery.data.shipments.length === 0 &&
            !ordersQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("ordersList.empty")}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {t("cs.pagination.summary", {
                  total: ordersQuery.data?.total ?? 0,
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
