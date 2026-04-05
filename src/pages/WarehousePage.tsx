import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Boxes, Search } from "react-lucid"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import {
  assignWarehouseShipment,
  getWarehouseCouriers,
  getWarehouseStats,
  getWarehouseTracking,
  listWarehouseQueue,
  listWarehouseSites,
  receiveWarehouseReturn,
  scanPayloadFromInput,
  scanShipmentIn,
  scanShipmentOut,
} from "@/api/warehouse-api"
import { ShipmentStatusBadge } from "@/features/customer-service/components/ShipmentStatusBadge"
import { Layout } from "@/components/layout/Layout"
import { StatCard } from "@/components/shared/StatCard"
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
import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"

const warehouseStatusFilters = [
  "",
  "PENDING_PICKUP",
  "RECEIVED_IN_WAREHOUSE",
  "OUT_FOR_DELIVERY",
  "REJECTED",
  "DELAYED",
] as const

type WarehouseStatusFilter = (typeof warehouseStatusFilters)[number]

function toWarehouseQueueQuery(value: WarehouseStatusFilter): {
  status?: string
  subStatus?: string
  coreSubIn?: string
} {
  switch (value) {
    case "":
      return {}
    case "PENDING_PICKUP":
      return { coreSubIn: "PENDING:NONE,PENDING:CONFIRMED" }
    case "RECEIVED_IN_WAREHOUSE":
      return { status: "IN_WAREHOUSE", subStatus: "NONE" }
    case "OUT_FOR_DELIVERY":
      return { coreSubIn: "OUT_FOR_DELIVERY:NONE,OUT_FOR_DELIVERY:ASSIGNED" }
    case "REJECTED":
      return { status: "RETURNED", subStatus: "REJECTED" }
    case "DELAYED":
      return { status: "RETURNED", subStatus: "DELAYED" }
  }
}

function warehouseRowTone(row: { status?: string; subStatus?: string }): string {
  const s = row.status?.toUpperCase() ?? ""
  const u = row.subStatus?.toUpperCase() ?? ""
  if (s === "DELIVERED") {
    return "bg-emerald-50/80 dark:bg-emerald-950/30"
  }
  if (s === "RETURNED" && u === "REJECTED") {
    return "bg-rose-50/80 dark:bg-rose-950/30"
  }
  if (s === "RETURNED" && u === "DELAYED") {
    return "bg-amber-50/70 dark:bg-amber-950/25"
  }
  return ""
}

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

function toPercentFromMax(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.round((value / max) * 100)
}

function AwaitingScanIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v13.5A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V9.75a2.25 2.25 0 0 0-.659-1.591l-4.5-4.5A2.25 2.25 0 0 0 14.25 3H5.25Zm4.2 5.25a.9.9 0 1 1 0 1.8h-2.7a.9.9 0 1 1 0-1.8h2.7Zm0 3.6a.9.9 0 1 1 0 1.8h-2.7a.9.9 0 1 1 0-1.8h2.7Zm4.05-1.65a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" />
    </svg>
  )
}

function WarehouseBoxIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M11.992 1.5a2 2 0 0 1 1.01.274l7.5 4.25A2 2 0 0 1 21.5 7.77v8.46a2 2 0 0 1-1.01 1.746l-7.5 4.25a2 2 0 0 1-1.98 0l-7.5-4.25A2 2 0 0 1 2.5 16.23V7.77a2 2 0 0 1 1.01-1.746l7.5-4.25a2 2 0 0 1 .982-.274Zm0 2.306L6.146 7.11l5.846 3.312 5.846-3.312-5.846-3.304ZM4.5 9.49v6.52l6.492 3.675v-6.519L4.5 9.49Zm15 0-6.508 3.676v6.519L19.5 16.01V9.49Z" />
    </svg>
  )
}

function AssignmentTruckIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M3.75 4.5A2.25 2.25 0 0 0 1.5 6.75v8.5A2.25 2.25 0 0 0 3.75 17.5h.882a2.625 2.625 0 0 1 5.236 0h3.264a2.625 2.625 0 0 1 5.236 0h1.132a1.5 1.5 0 0 0 1.5-1.5V11.7a2.25 2.25 0 0 0-.45-1.35l-2.4-3.2A2.25 2.25 0 0 0 16.35 6.3H14.25v-1.8H3.75Zm10.5 4.05h2.1l1.8 2.4h-3.9v-2.4Zm-7 10.2a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Zm8.5 0a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" />
    </svg>
  )
}

function ReturnsIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M12 3.75a8.25 8.25 0 1 0 6.69 13.08.9.9 0 0 0-1.46-1.05A6.45 6.45 0 1 1 18.45 12h-1.8a.9.9 0 0 0-.636 1.536l3.15 3.15a.9.9 0 0 0 1.272 0l3.15-3.15A.9.9 0 0 0 22.95 12h-2.7A8.25 8.25 0 0 0 12 3.75Zm-.9 4.2a.9.9 0 0 0-1.8 0v4.2a.9.9 0 0 0 .4.75l3 2.1a.9.9 0 0 0 1.03-1.476l-2.63-1.84V7.95Z" />
    </svg>
  )
}

export function WarehousePage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<WarehouseStatusFilter>("")
  const [returnsOnly, setReturnsOnly] = useState(false)
  const [returnsCourierFilterId, setReturnsCourierFilterId] = useState("")
  const [page, setPage] = useState(1)
  const [trackingInput, setTrackingInput] = useState("")
  const [courierIdInput, setCourierIdInput] = useState("")
  const [returnDiscountInput, setReturnDiscountInput] = useState("")
  const [selectedShipmentId, setSelectedShipmentId] = useState("")
  const [assignLeg, setAssignLeg] = useState<"delivery" | "pickup">("delivery")
  const [trackingResult, setTrackingResult] = useState<string>("")
  const [filterWarehouseId, setFilterWarehouseId] = useState("")

  const canFilterByWarehouse =
    user?.role === "WAREHOUSE_ADMIN" || user?.role === "ADMIN"
  const isWarehouseNetworkAdmin = user?.role === "WAREHOUSE_ADMIN"

  const warehouseListFilter = useMemo(() => toWarehouseQueueQuery(status), [status])

  const queueQueryKey = useMemo(
    () =>
      [
        "warehouse-queue",
        token,
        page,
        search,
        warehouseListFilter.status ?? "",
        warehouseListFilter.subStatus ?? "",
        warehouseListFilter.coreSubIn ?? "",
        returnsOnly,
        returnsOnly ? returnsCourierFilterId : "",
        canFilterByWarehouse ? filterWarehouseId : "",
      ] as const,
    [
      token,
      page,
      search,
      warehouseListFilter,
      returnsOnly,
      returnsCourierFilterId,
      canFilterByWarehouse,
      filterWarehouseId,
    ],
  )

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && canFilterByWarehouse,
  })

  const statsQuery = useQuery({
    queryKey: ["warehouse-stats", token, canFilterByWarehouse ? filterWarehouseId : ""],
    queryFn: () =>
      getWarehouseStats(
        token,
        canFilterByWarehouse && filterWarehouseId
          ? filterWarehouseId
          : undefined,
      ),
    enabled: !!token,
    refetchInterval: 15000,
  })

  const queueQuery = useQuery({
    queryKey: queueQueryKey,
    queryFn: () =>
      listWarehouseQueue({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        status: warehouseListFilter.status,
        subStatus: warehouseListFilter.subStatus,
        coreSubIn: warehouseListFilter.coreSubIn,
        returnsOnly,
        courierId:
          returnsOnly && returnsCourierFilterId.trim()
            ? returnsCourierFilterId.trim()
            : undefined,
        warehouseId:
          canFilterByWarehouse && filterWarehouseId
            ? filterWarehouseId
            : undefined,
      }),
    enabled: !!token,
    refetchInterval: 10000,
  })

  const assignRegionKey = useMemo(() => {
    if (!selectedShipmentId || !queueQuery.data?.shipments) return "none"
    const sel = queueQuery.data.shipments.find((s) => s.id === selectedShipmentId)
    return sel?.regionId ?? "none"
  }, [selectedShipmentId, queueQuery.data?.shipments])

  const couriersForAssignQuery = useQuery({
    queryKey: ["warehouse-couriers", token, assignRegionKey],
    queryFn: () =>
      getWarehouseCouriers({
        token,
        regionId: assignRegionKey === "none" ? undefined : assignRegionKey,
      }),
    enabled: !!token,
  })

  const couriersForReturnsFilterQuery = useQuery({
    queryKey: ["warehouse-couriers-returns", token],
    queryFn: () => getWarehouseCouriers({ token }),
    enabled: !!token && returnsOnly,
  })

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-queue", token] }),
    ])
  }

  const scanInMutation = useMutation({
    mutationFn: () => {
      const payload = scanPayloadFromInput(trackingInput)
      return scanShipmentIn({ token, ...payload })
    },
    onSuccess: async () => {
      showToast(t("warehouse.feedback.scanInSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const scanOutMutation = useMutation({
    mutationFn: () => {
      const payload = scanPayloadFromInput(trackingInput)
      return scanShipmentOut({ token, ...payload })
    },
    onSuccess: async () => {
      showToast(t("warehouse.feedback.scanOutSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const assignMutation = useMutation({
    mutationFn: (payload: {
      shipmentId: string
      courierId: string
      leg?: "pickup" | "delivery"
    }) =>
      assignWarehouseShipment({
        token,
        shipmentId: payload.shipmentId,
        courierId: payload.courierId,
        leg: payload.leg,
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.assignmentSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const receiveReturnMutation = useMutation({
    mutationFn: () => {
      const payload = scanPayloadFromInput(trackingInput)
      return receiveWarehouseReturn({
        token,
        ...payload,
        returnDiscountAmount:
          returnDiscountInput.trim() === ""
            ? undefined
            : Number(returnDiscountInput),
      })
    },
    onSuccess: async () => {
      showToast(t("warehouse.feedback.returnSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const trackingMutation = useMutation({
    mutationFn: () =>
      getWarehouseTracking({
        token,
        trackingNumber: scanPayloadFromInput(trackingInput).trackingNumber ?? "",
      }),
    onSuccess: (data) => {
      const row = data as {
        customerName: string
        status: string
        subStatus: string
        updatedAt: string
      }
      const whKey = getPerspectiveStatusKey("warehouse", {
        status: row.status,
        subStatus: row.subStatus,
      })
      setTrackingResult(
        `${row.customerName} · ${t(`cs.shipmentStatus.${whKey}`)} · ${formatDateTime(
          row.updatedAt,
          locale,
        )}`,
      )
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
      setTrackingResult("")
    },
  })

  const totalPages = Math.max(
    1,
    Math.ceil((queueQuery.data?.total ?? 0) / (queueQuery.data?.pageSize ?? 20)),
  )
  const stats = statsQuery.data
  const statValues = [
    stats?.awaitingScanIn ?? 0,
    stats?.inWarehouse ?? 0,
    stats?.inWarehouseCsPending ?? 0,
    stats?.readyForAssignment ?? 0,
    stats?.assigned ?? 0,
    stats?.returnsPending ?? 0,
    stats?.returnsReceivedToday ?? 0,
    ...(isWarehouseNetworkAdmin && stats?.totalWarehouses !== undefined
      ? [stats.totalWarehouses, stats.activeWarehouses ?? 0]
      : []),
  ]
  const maxStatValue = Math.max(...statValues, 0)

  return (
    <Layout title={t("warehouse.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
              <Boxes className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("warehouse.pageTitle")}</CardTitle>
              <CardDescription>{t("warehouse.subtitle")}</CardDescription>
              {isWarehouseNetworkAdmin ? (
                <p className="pt-1">
                  <Link
                    to="/warehouse/sites"
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {t("warehouse.sites.openDirectory")}
                  </Link>
                </p>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        {canFilterByWarehouse ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("warehouse.filter.title")}</CardTitle>
              <CardDescription>{t("warehouse.filter.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="text-muted-foreground mb-2 block text-sm">
                {t("warehouse.filter.warehouseLabel")}
              </label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 max-w-md rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                value={filterWarehouseId}
                onChange={(e) => {
                  setFilterWarehouseId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t("warehouse.filter.allWarehouses")}</option>
                {(sitesQuery.data?.warehouses ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.governorate}
                    {w.code ? ` · ${w.code}` : ""})
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isWarehouseNetworkAdmin &&
          stats?.totalWarehouses !== undefined &&
          !filterWarehouseId ? (
            <>
              <StatCard
                title={t("warehouse.stats.totalWarehouses")}
                value={stats.totalWarehouses}
                percentage={toPercentFromMax(stats.totalWarehouses, maxStatValue)}
                icon={WarehouseBoxIcon}
                accent="primary"
              />
              <StatCard
                title={t("warehouse.stats.activeWarehouses")}
                value={stats.activeWarehouses ?? 0}
                percentage={toPercentFromMax(stats.activeWarehouses ?? 0, maxStatValue)}
                icon={AwaitingScanIcon}
                accent="success"
              />
            </>
          ) : null}
          <StatCard
            title={t("warehouse.stats.awaitingScanIn")}
            value={stats?.awaitingScanIn ?? 0}
            percentage={toPercentFromMax(stats?.awaitingScanIn ?? 0, maxStatValue)}
            icon={AwaitingScanIcon}
            accent="warning"
          />
          <StatCard
            title={t("warehouse.stats.inWarehouse")}
            value={stats?.inWarehouse ?? 0}
            percentage={toPercentFromMax(stats?.inWarehouse ?? 0, maxStatValue)}
            icon={WarehouseBoxIcon}
            accent="primary"
          />
          <StatCard
            title={t("warehouse.stats.inWarehouseCsPending")}
            value={stats?.inWarehouseCsPending ?? 0}
            percentage={toPercentFromMax(
              stats?.inWarehouseCsPending ?? 0,
              maxStatValue,
            )}
            icon={AwaitingScanIcon}
            accent="warning"
          />
          <StatCard
            title={t("warehouse.stats.readyForAssignment")}
            value={stats?.readyForAssignment ?? 0}
            percentage={toPercentFromMax(stats?.readyForAssignment ?? 0, maxStatValue)}
            icon={AssignmentTruckIcon}
            accent="success"
          />
          <StatCard
            title={t("warehouse.stats.assigned")}
            value={stats?.assigned ?? 0}
            percentage={toPercentFromMax(stats?.assigned ?? 0, maxStatValue)}
            icon={AssignmentTruckIcon}
            accent="primary"
          />
          <StatCard
            title={t("warehouse.stats.returnsPending")}
            value={stats?.returnsPending ?? 0}
            percentage={toPercentFromMax(stats?.returnsPending ?? 0, maxStatValue)}
            icon={ReturnsIcon}
            accent="destructive"
          />
          <StatCard
            title={t("warehouse.stats.returnsReceivedToday")}
            value={stats?.returnsReceivedToday ?? 0}
            percentage={toPercentFromMax(stats?.returnsReceivedToday ?? 0, maxStatValue)}
            icon={ReturnsIcon}
            accent="success"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.operations.title")}</CardTitle>
            <CardDescription>{t("warehouse.operations.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder={t("warehouse.operations.trackingPlaceholder")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => scanInMutation.mutate()}
                disabled={!trackingInput.trim() || scanInMutation.isPending}
              >
                {t("warehouse.operations.scanIn")}
              </Button>
              <Button
                type="button"
                onClick={() => scanOutMutation.mutate()}
                disabled={!trackingInput.trim() || scanOutMutation.isPending}
              >
                {t("warehouse.operations.scanOut")}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                value={returnDiscountInput}
                onChange={(e) => setReturnDiscountInput(e.target.value)}
                placeholder={t("warehouse.operations.discountPlaceholder")}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => receiveReturnMutation.mutate()}
                disabled={!trackingInput.trim() || receiveReturnMutation.isPending}
              >
                {t("warehouse.operations.receiveReturn")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const p = scanPayloadFromInput(trackingInput)
                  if (p.shipmentId) {
                    showToast(t("warehouse.operations.trackNeedsTracking"), "error")
                    return
                  }
                  if (!p.trackingNumber) return
                  trackingMutation.mutate()
                }}
                disabled={!trackingInput.trim() || trackingMutation.isPending}
              >
                <Search className="size-5" aria-hidden />
                {t("warehouse.operations.track")}
              </Button>
            </div>

            {trackingResult ? (
              <p className="text-muted-foreground text-sm">{trackingResult}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.queue.title")}</CardTitle>
            <CardDescription>{t("warehouse.queue.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t("warehouse.queue.searchPlaceholder")}
              />
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as WarehouseStatusFilter)
                  setPage(1)
                }}
              >
                {warehouseStatusFilters.map((value) => (
                  <option key={value || "all"} value={value}>
                    {value
                      ? t(`cs.shipmentStatus.${value}`)
                      : t("warehouse.queue.allStatuses")}
                  </option>
                ))}
              </select>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={returnsOnly}
                  onChange={(e) => {
                    setReturnsOnly(e.target.checked)
                    if (!e.target.checked) setReturnsCourierFilterId("")
                    setPage(1)
                  }}
                />
                {t("warehouse.queue.returnsOnly")}
              </label>
            </div>

            {returnsOnly ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-muted-foreground text-sm whitespace-nowrap">
                  {t("warehouse.queue.filterReturnsByCourier")}
                </label>
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-[12rem] rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                  value={returnsCourierFilterId}
                  onChange={(e) => {
                    setReturnsCourierFilterId(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">{t("warehouse.queue.allCouriers")}</option>
                  {(couriersForReturnsFilterQuery.data?.couriers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName ?? c.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {queueQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}

            {queueQuery.error ? (
              <p className="text-destructive text-sm">
                {(queueQuery.error as Error).message}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[64rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.table.trackingNumber")}</TableHead>
                    <TableHead>{t("warehouse.table.customer")}</TableHead>
                    <TableHead>{t("warehouse.table.merchant")}</TableHead>
                    <TableHead>{t("warehouse.table.status")}</TableHead>
                    <TableHead>{t("warehouse.table.courier")}</TableHead>
                    <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                    <TableHead>{t("warehouse.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queueQuery.data?.shipments ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      className={`hover:bg-muted/50 cursor-pointer ${warehouseRowTone(row)}`}
                      onClick={() => nav(`/warehouse/shipments/${encodeURIComponent(row.id)}`)}
                    >
                      <TableCell>{row.trackingNumber ?? "—"}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.merchant?.displayName ?? "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <ShipmentStatusBadge
                          status={getPerspectiveStatusKey("warehouse", {
                            ...row,
                            outboundCsPending: row.outboundCsPending,
                          })}
                        />
                      </TableCell>
                      <TableCell>{row.courier?.fullName ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <select
                            className="border-input bg-background h-9 max-w-[11rem] rounded-md border px-2 text-xs"
                            value=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              const v = e.target.value
                              if (!v) return
                              setSelectedShipmentId(row.id)
                              setCourierIdInput(v)
                            }}
                          >
                            <option value="">{t("warehouse.queue.pickCourier")}</option>
                            {(couriersForAssignQuery.data?.couriers ?? []).map((c) => (
                              <option key={c.id} value={c.id}>
                                {(c.servesShipmentRegion ? "★ " : "") +
                                  (c.fullName ?? c.id.slice(0, 8))}
                              </option>
                            ))}
                          </select>
                          <Input
                            className="w-36"
                            placeholder={t("warehouse.queue.courierIdPlaceholder")}
                            value={selectedShipmentId === row.id ? courierIdInput : ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setSelectedShipmentId(row.id)
                              setCourierIdInput(e.target.value)
                            }}
                          />
                          <select
                            className="border-input bg-background h-9 max-w-[9rem] rounded-md border px-2 text-xs"
                            value={selectedShipmentId === row.id ? assignLeg : "delivery"}
                            title={t("warehouse.queue.assignLegHint")}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              setSelectedShipmentId(row.id)
                              setAssignLeg(e.target.value as "delivery" | "pickup")
                            }}
                          >
                            <option value="delivery">
                              {t("warehouse.queue.assignLegDelivery")}
                            </option>
                            <option value="pickup">
                              {t("warehouse.queue.assignLegPickup")}
                            </option>
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedShipmentId(row.id)
                              assignMutation.mutate({
                                shipmentId: row.id,
                                courierId: courierIdInput.trim(),
                                leg: assignLeg,
                              })
                            }}
                            disabled={
                              assignMutation.isPending ||
                              selectedShipmentId !== row.id ||
                              !courierIdInput.trim()
                            }
                          >
                            {t("warehouse.queue.assign")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {t("warehouse.queue.pagination", {
                  page,
                  total: queueQuery.data?.total ?? 0,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  {t("cs.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((v) => v + 1)}
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
