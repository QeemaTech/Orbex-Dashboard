import { useQuery } from "@tanstack/react-query"
import { Headphones } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { listShipments } from "@/api/shipments-api"
import type { CsShipmentRow } from "@/api/merchant-orders-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CsAddLocationDialog } from "@/features/customer-service/components/CsAddLocationDialog"
import { CsCourierMapDialog } from "@/features/customer-service/components/CsCourierMapDialog"
import {
  CsShipmentFilters,
  type CsFilterValues,
} from "@/features/customer-service/components/CsShipmentFilters"
import { CsShipmentTable } from "@/features/customer-service/components/CsShipmentTable"
import { ShipmentKpiStatRow } from "@/features/shipments/components/ShipmentKpiStatRow"
import { useAuth } from "@/lib/auth-context"

/** CS shipment (delivery-line) queue via `GET /api/shipments`; row opens line detail at `/cs/shipments/:lineId`. */
export function CsShipmentsListPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const [mapCourierId, setMapCourierId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [locationRow, setLocationRow] = useState<CsShipmentRow | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)

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
        "cs-shipment-lines",
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

  const shipmentsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      listShipments({
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
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        overdueOnly: filters.overdueOnly,
      }),
    enabled: !!token,
    refetchInterval: 25_000,
  })

  const tableRows: CsShipmentRow[] = useMemo(
    () =>
      (shipmentsQuery.data?.shipments ?? []).map((row) => ({
        ...row,
        merchantId: row.merchantId ?? "",
        assignedCourierId: row.assignedCourierId ?? row.deliveryCourierId ?? null,
        customerName: row.customerName ?? row.customer.customerName,
        phonePrimary: row.phonePrimary ?? row.customer.phonePrimary,
        phoneSecondary: row.phoneSecondary ?? row.customer.phoneSecondary,
        addressText: row.addressText ?? row.customer.addressText,
        addressConfirmed: row.addressConfirmed ?? row.customer.addressConfirmed,
        customerLat: row.customerLat ?? row.customer.customerLat,
        customerLng: row.customerLng ?? row.customer.customerLng,
        customerLocationReceivedAt:
          row.customerLocationReceivedAt ??
          row.customer.customerLocationReceivedAt,
        subStatus: row.subStatus ?? "NONE",
      })) as CsShipmentRow[],
    [shipmentsQuery.data],
  )

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

  const openMap = useCallback((courierId: string) => {
    setMapCourierId(courierId)
    setMapOpen(true)
  }, [])

  const openAddLocation = useCallback((row: CsShipmentRow) => {
    setLocationRow(row)
    setLocationOpen(true)
  }, [])

  const totalPages = Math.max(
    1,
    Math.ceil((shipmentsQuery.data?.total ?? 0) / pageSize),
  )

  return (
    <Layout title={t("cs.dashboardTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/8 border-primary/15 bg-gradient-to-br via-card to-card shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
            <div className="bg-primary/12 text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
              <Headphones className="size-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight">
                {t("cs.dashboardTitle")}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                {t("cs.dashboardSubtitle")}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <ShipmentKpiStatRow
          token={token}
          filters={filters}
          queryKeyPrefix="cs-shipments-list-page"
        />

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("cs.ordersQueueTitle")}
            </CardTitle>
            <CardDescription>{t("cs.ordersQueueDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <CsShipmentFilters values={filters} onChange={setFilters} />

            {shipmentsQuery.error ? (
              <p className="text-destructive text-sm">
                {(shipmentsQuery.error as Error).message}
              </p>
            ) : null}

            {shipmentsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("cs.loading")}</p>
            ) : null}

            {shipmentsQuery.data ? (
              <div className="overflow-x-auto rounded-lg border [-webkit-overflow-scrolling:touch]">
                <CsShipmentTable
                  rows={tableRows}
                  token={token}
                  listQueryKey={[...listQueryKey]}
                  onOpenMap={openMap}
                  onOpenAddLocation={openAddLocation}
                  detailBasePath="/cs/shipments"
                  perspective="operations"
                />
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

      <CsCourierMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        courierId={mapCourierId}
        token={token}
      />
      <CsAddLocationDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        row={locationRow}
        token={token}
        listQueryKey={[...listQueryKey]}
      />
    </Layout>
  )
}

