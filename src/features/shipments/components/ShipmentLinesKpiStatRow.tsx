import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { getDashboardKpis } from "@/api/merchant-orders-api"
import { StatCard } from "@/components/shared/StatCard"
import type { CsFilterValues } from "@/features/customer-service/components/CsShipmentFilters"

function toPercent(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0
  return Math.round((part / total) * 100)
}

function TotalShipmentsIcon({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string
  "aria-hidden"?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M11.99 1.5a2 2 0 0 1 1.01.274l7.5 4.25A2 2 0 0 1 21.5 7.77v8.46a2 2 0 0 1-1.01 1.746l-7.5 4.25a2 2 0 0 1-1.98 0l-7.5-4.25A2 2 0 0 1 2.5 16.23V7.77a2 2 0 0 1 1.01-1.746l7.5-4.25a2 2 0 0 1 .98-.274Zm0 2.3L6.14 7.11l5.86 3.32 5.86-3.32-5.87-3.31ZM4.5 9.49v6.52l6.5 3.68v-6.52L4.5 9.49Zm15 0-6.5 3.68v6.52l6.5-3.68V9.49Z" />
    </svg>
  )
}

function DeliveredIcon({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string
  "aria-hidden"?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M12 2.25a9.75 9.75 0 1 0 9.75 9.75A9.75 9.75 0 0 0 12 2.25Zm4.334 7.968-4.96 5.677a1.125 1.125 0 0 1-1.66.038l-2.05-2.05a1.125 1.125 0 0 1 1.59-1.59l1.2 1.2 4.184-4.788a1.125 1.125 0 1 1 1.696 1.513Z" />
    </svg>
  )
}

function RejectedIcon({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string
  "aria-hidden"?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M12 2.25a9.75 9.75 0 1 0 9.75 9.75A9.75 9.75 0 0 0 12 2.25Zm3.53 12.22a1.125 1.125 0 1 1-1.59 1.59L12 14.06l-1.94 1.94a1.125 1.125 0 0 1-1.59-1.59L10.41 12 8.47 10.06a1.125 1.125 0 0 1 1.59-1.59L12 10.41l1.94-1.94a1.125 1.125 0 0 1 1.59 1.59L13.59 12l1.94 1.94Z" />
    </svg>
  )
}

function PostponedIcon({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string
  "aria-hidden"?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M12 2.25a9.75 9.75 0 0 0-8.44 14.63A1.5 1.5 0 0 0 4.86 17.6h14.28a1.5 1.5 0 0 0 1.3-.72A9.75 9.75 0 0 0 12 2.25Zm0 13.5a1.125 1.125 0 1 1 0-2.25 1.125 1.125 0 0 1 0 2.25Zm1.41-4.74a1.688 1.688 0 0 0-.66.8 1.125 1.125 0 1 1-2.1-.82 3.938 3.938 0 0 1 1.57-1.96c.34-.23.53-.46.53-.74a1.12 1.12 0 0 0-2.24 0 1.125 1.125 0 1 1-2.25 0 3.37 3.37 0 1 1 6.74 0 3.03 3.03 0 0 1-1.59 2.72Z" />
    </svg>
  )
}

export type ShipmentLinesKpiStatRowProps = {
  token: string
  filters: CsFilterValues
  queryKeyPrefix: string
}

/** KPI strip for the customer-shipment list: denominators use `totalOrders` where applicable. */
export function ShipmentLinesKpiStatRow({
  token,
  filters,
  queryKeyPrefix,
}: ShipmentLinesKpiStatRowProps) {
  const { t } = useTranslation()

  const kpiQuery = useQuery({
    queryKey: [
      "dashboard-kpis",
      queryKeyPrefix,
      token,
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
    queryFn: () =>
      getDashboardKpis({
        token,
        trendDays: 14,
        recentTake: 8,
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

  const totals = kpiQuery.data?.totals
  const totalShipments = totals?.totalOrders ?? 0
  const totalMerchantOrders = totals?.totalShipments ?? 0

  return (
    <div className="grid gap-5 md:gap-6 xl:grid-cols-4">
      <StatCard
        title={t("shipmentsList.kpiTotalShipments")}
        value={totalShipments}
        percentage={totalShipments > 0 ? 100 : 0}
        icon={TotalShipmentsIcon}
        accent="primary"
      />
      <StatCard
        title={t("dashboard.stats.delivered")}
        value={totals?.delivered ?? 0}
        percentage={toPercent(totals?.delivered ?? 0, totalMerchantOrders)}
        icon={DeliveredIcon}
        accent="success"
      />
      <StatCard
        title={t("dashboard.stats.rejected")}
        value={totals?.rejected ?? 0}
        percentage={toPercent(totals?.rejected ?? 0, totalMerchantOrders)}
        icon={RejectedIcon}
        accent="destructive"
      />
      <StatCard
        title={t("dashboard.stats.postponed")}
        value={totals?.postponed ?? 0}
        percentage={toPercent(totals?.postponed ?? 0, totalMerchantOrders)}
        icon={PostponedIcon}
        accent="warning"
      />
    </div>
  )
}

