import { useMemo, useState } from "react"
import type { ElementType } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Boxes, Search, UserRound, Warehouse } from "react-lucid"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  getWarehouseCouriers,
  getWarehouseSite,
  getWarehouseStats,
  getWarehouseTracking,
  listWarehouseOrders,
  receiveWarehouseReturn,
  scanPayloadFromInput,
  scanShipmentIn,
  scanShipmentOut,
  type WarehouseCourierRow,
  type WarehouseSiteDetail,
} from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
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
import { backendShipmentTransferLabel } from "@/features/warehouse/backend-labels"

/** `MerchantOrder.transferStatus` (batch pipeline); empty = all batches in hub scope. */
const warehouseTransferStatusFilters = [
  "",
  "PENDING_PICKUP",
  "PICKED_UP",
  "IN_WAREHOUSE",
] as const

type WarehouseTransferStatusFilter = (typeof warehouseTransferStatusFilters)[number]

function warehouseTransferRowTone(transferStatus: string): string {
  const s = transferStatus.toUpperCase()
  if (s === "IN_WAREHOUSE") {
    return "bg-sky-50/70 dark:bg-sky-950/25"
  }
  if (s === "PICKED_UP") {
    return "bg-amber-50/70 dark:bg-amber-950/20"
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

// Define stat cards configuration outside component to avoid recreation
const transferStatCards = [
  { 
    statKey: "pending" as const, 
    titleI18nKey: "warehouse.hubStats.pending", 
    icon: AwaitingScanIcon, 
    accent: "warning" as const 
  },
  { 
    statKey: "assigned" as const, 
    titleI18nKey: "warehouse.hubStats.assigned", 
    icon: AssignmentTruckIcon, 
    accent: "primary" as const 
  },
  { 
    statKey: "onTheWayToWarehouse" as const, 
    titleI18nKey: "warehouse.hubStats.onTheWayToWarehouse", 
    icon: WarehouseBoxIcon, 
    accent: "primary" as const 
  },
  { 
    statKey: "inWarehouse" as const, 
    titleI18nKey: "warehouse.hubStats.inWarehouse", 
    icon: Warehouse, 
    accent: "primary" as const 
  },
  { 
    statKey: "partiallyDelivered" as const, 
    titleI18nKey: "warehouse.hubStats.partiallyDelivered", 
    icon: Boxes, 
    accent: "success" as const 
  },
  { 
    statKey: "delivered" as const, 
    titleI18nKey: "warehouse.hubStats.delivered", 
    icon: Boxes, 
    accent: "success" as const 
  },
]

export function WarehouseDetailPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [search, setSearch] = useState("")
  const [transferStatusFilter, setTransferStatusFilter] =
    useState<WarehouseTransferStatusFilter>("")
  const [returnsOnly, setReturnsOnly] = useState(false)
  const [returnsCourierFilterId, setReturnsCourierFilterId] = useState("")
  const [page, setPage] = useState(1)
  const [trackingInput, setTrackingInput] = useState("")
  const [returnDiscountInput, setReturnDiscountInput] = useState("")
  const [trackingResult, setTrackingResult] = useState<string>("")

  const canSeeWarehouseDirectory =
    user?.role === "ADMIN" || user?.role === "WAREHOUSE_ADMIN"
  const accessDenied =
    !!user &&
    user.role === "WAREHOUSE" &&
    !!user.warehouseId &&
    user.warehouseId !== warehouseId

  const queueQueryKey = useMemo(
    () =>
      [
        "warehouse-orders",
        token,
        warehouseId,
        page,
        search,
        transferStatusFilter,
        returnsOnly,
        returnsOnly ? returnsCourierFilterId : "",
      ] as const,
    [
      token,
      warehouseId,
      page,
      search,
      transferStatusFilter,
      returnsOnly,
      returnsCourierFilterId,
    ],
  )

  const siteDetailWarehouseId = warehouseId

  const siteDetailQuery = useQuery({
    queryKey: ["warehouse-site-detail", token, siteDetailWarehouseId],
    queryFn: () => getWarehouseSite(token, siteDetailWarehouseId),
    enabled: !!token && !!siteDetailWarehouseId && !accessDenied,
  })

  const hub = siteDetailQuery.data

  const statsQuery = useQuery({
    queryKey: ["warehouse-stats", token, warehouseId],
    queryFn: () => getWarehouseStats(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied,
    refetchInterval: 15000,
  })

  const queueQuery = useQuery({
    queryKey: queueQueryKey,
    queryFn: () =>
      listWarehouseOrders({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        transferStatus:
          transferStatusFilter === "" ? undefined : transferStatusFilter,
        returnsOnly,
        courierId:
          returnsOnly && returnsCourierFilterId.trim()
            ? returnsCourierFilterId.trim()
            : undefined,
        warehouseId,
      }),
    enabled: !!token && !!warehouseId && !accessDenied,
    refetchInterval: 10000,
  })

  const couriersForReturnsFilterQuery = useQuery({
    queryKey: ["warehouse-couriers-returns", token],
    queryFn: () => getWarehouseCouriers({ token }),
    enabled: !!token && returnsOnly && !accessDenied,
  })

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token, warehouseId] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-queue", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-orders", token] }),
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
      setTrackingInput("")
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
      setTrackingInput("")
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
      setTrackingInput("")
      setReturnDiscountInput("")
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
      const row = data as { transferStatus?: string; updatedAt?: string }
      if (!row.transferStatus || !row.updatedAt) {
        setTrackingResult("")
        return
      }
      const label = backendShipmentTransferLabel(t, row.transferStatus)
      setTrackingResult(`${label} · ${formatDateTime(row.updatedAt, locale)}`)
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
    stats?.pending ?? 0,
    stats?.assigned ?? 0,
    stats?.onTheWayToWarehouse ?? 0,
    stats?.inWarehouse ?? 0,
    stats?.partiallyDelivered ?? 0,
    stats?.delivered ?? 0,
  ]
  const maxStatValue = Math.max(...statValues, 0)

  if (!warehouseId) {
    return (
      <Layout title={t("warehouse.detail.invalidTitle")}>
        <p className="text-muted-foreground text-sm">{t("warehouse.detail.invalidDescription")}</p>
      </Layout>
    )
  }

  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  const handleSubBranchClick = (subBranchId: string) => {
    nav(`/warehouses/${encodeURIComponent(subBranchId)}`)
  }

  const getNotApplicable = () => t("warehouse.notApplicable") || "—"

  return (
    <Layout title={hub?.name ?? t("warehouse.detail.pageTitle")}>
      <div className="space-y-6">
        {canSeeWarehouseDirectory ? (
          <p>
            <Link
              to="/warehouses"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
              {t("warehouse.detail.backToWarehouses")}
            </Link>
          </p>
        ) : null}

        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
              <Boxes className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {hub?.name ?? t("warehouse.detail.pageTitle")}
              </CardTitle>
              <CardDescription>{t("warehouse.detail.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        {siteDetailWarehouseId ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">{t("warehouse.hubSnapshot.title")}</h2>
              <p className="text-muted-foreground text-sm">{t("warehouse.hubSnapshot.description")}</p>
            </div>
            {siteDetailQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}
            {siteDetailQuery.error ? (
              <p className="text-destructive text-sm">
                {(siteDetailQuery.error as Error).message}
              </p>
            ) : null}
            {hub ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Warehouse className="size-4" aria-hidden />
                        {t("warehouse.siteDetail.hubCardTitle")}
                      </CardTitle>
                      <CardDescription>{t("warehouse.siteDetail.hubCardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-2 text-sm">
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colName")}</span>{" "}
                        {hub.name}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">
                          {t("warehouse.sites.colGovernorate")}
                        </span>{" "}
                        {hub.governorate}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colZone")}</span>{" "}
                        {hub.zone ?? getNotApplicable()}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colCode")}</span>{" "}
                        {hub.code ?? getNotApplicable()}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colAddress")}</span>{" "}
                        {hub.address?.trim() ? hub.address : getNotApplicable()}
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground font-medium">
                          {t("warehouse.sites.colCoordinates")}
                        </span>
                        <CoordinatesMapLink latitude={hub.latitude} longitude={hub.longitude} />
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colStatus")}</span>{" "}
                        {hub.isActive
                          ? t("warehouse.sites.statusActive")
                          : t("warehouse.sites.statusInactive")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserRound className="size-4" aria-hidden />
                        {t("warehouse.siteDetail.adminCardTitle")}
                      </CardTitle>
                      <CardDescription>{t("warehouse.siteDetail.adminCardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("warehouse.siteDetail.staffCount")}</span>
                        <p className="text-foreground text-2xl font-semibold tabular-nums">
                          {hub.staffCount}
                        </p>
                      </div>
                      {hub.admin ? (
                        <div className="border-border space-y-1 rounded-lg border p-3">
                          <p className="text-foreground font-medium">{hub.admin.fullName}</p>
                          <p className="text-muted-foreground">{hub.admin.email}</p>
                          {!hub.admin.isActive ? (
                            <p className="text-destructive text-xs">
                              {t("warehouse.siteDetail.adminInactive")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{t("warehouse.siteDetail.noAdmin")}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {hub.subBranches && hub.subBranches.length > 0 && !hub.mainBranchId
                  ? hub.subBranches.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSubBranchClick(sub.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubBranchClick(sub.id)}
                      >
                        <p className="font-medium text-sm">{sub.name}</p>
                        <p className="text-muted-foreground text-xs">{sub.governorate}{sub.zone ? ` · ${sub.zone}` : ""}</p>
                      </div>
                    ))
                  : null}

                {hub.mainBranch && hub.mainBranchId ? (
                  <div
                    className="rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSubBranchClick(hub.mainBranch!!.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubBranchClick(hub.mainBranch!!.id)}
                  >
                    <p className="font-medium text-sm">{hub.mainBranch.name}</p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {transferStatCards.map((c) => (
            <StatCard
              key={c.statKey}
              title={t(c.titleI18nKey)}
              value={stats?.[c.statKey] ?? 0}
              percentage={toPercentFromMax(stats?.[c.statKey] ?? 0, maxStatValue)}
              icon={c.icon}
              accent={c.accent}
            />
          ))}
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
                {scanInMutation.isPending ? t("common.processing") : t("warehouse.operations.scanIn")}
              </Button>
              <Button
                type="button"
                onClick={() => scanOutMutation.mutate()}
                disabled={!trackingInput.trim() || scanOutMutation.isPending}
              >
                {scanOutMutation.isPending ? t("common.processing") : t("warehouse.operations.scanOut")}
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
                {receiveReturnMutation.isPending ? t("common.processing") : t("warehouse.operations.receiveReturn")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const payload = scanPayloadFromInput(trackingInput)
                  if (payload.shipmentId) {
                    showToast(t("warehouse.operations.trackNeedsTracking"), "error")
                    return
                  }
                  if (!payload.trackingNumber) {
                    showToast(t("warehouse.operations.enterValidTracking"), "error")
                    return
                  }
                  trackingMutation.mutate()
                }}
                disabled={!trackingInput.trim() || trackingMutation.isPending}
              >
                <Search className="size-5" aria-hidden />
                {trackingMutation.isPending ? t("common.searching") : t("warehouse.operations.track")}
              </Button>
            </div>

            {trackingResult ? (
              <p className="text-muted-foreground text-sm">{trackingResult}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.queue.titleTransfers")}</CardTitle>
            <CardDescription>{t("warehouse.queue.descriptionTransfers")}</CardDescription>
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
                value={transferStatusFilter}
                onChange={(e) => {
                  setTransferStatusFilter(e.target.value as WarehouseTransferStatusFilter)
                  setPage(1)
                }}
              >
                {warehouseTransferStatusFilters.map((value) => (
                  <option key={value || "all"} value={value}>
                    {value
                      ? backendShipmentTransferLabel(t, value)
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
                  {(couriersForReturnsFilterQuery.data?.couriers ?? []).map((c: WarehouseCourierRow) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName?.trim() || t("warehouse.queue.unnamedCourier")}
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
              <Table className="min-w-[56rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.table.merchant")}</TableHead>
                    <TableHead>{t("warehouse.table.orderCount")}</TableHead>
                    <TableHead>{t("warehouse.table.totalValue")}</TableHead>
                    <TableHead>{t("warehouse.table.batchTransfer")}</TableHead>
                    <TableHead>{t("warehouse.table.pickupCourier")}</TableHead>
                    <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queueQuery.data?.merchantOrders ?? []).map((row) => {
                    const fmtMoney = (raw: string | number) => {
                      const num = typeof raw === 'number' ? raw : Number.parseFloat(
                        String(raw ?? "").replace(/,/g, "").trim(),
                      )
                      if (!Number.isFinite(num)) return getNotApplicable()
                      return new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "EGP",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }).format(num)
                    }
                    return (
                      <TableRow
                        key={row.id}
                        className={`hover:bg-muted/50 cursor-pointer ${warehouseTransferRowTone(row.transferStatus)}`}
                        onClick={() =>
                          nav(
                            `/warehouses/${encodeURIComponent(warehouseId)}/transfers/${encodeURIComponent(row.id)}`,
                          )
                        }
                      >
                        <TableCell>{row.merchant?.displayName ?? getNotApplicable()}</TableCell>
                        <TableCell>{row.orderCount}</TableCell>
                        <TableCell>{fmtMoney(row.totalShipmentValue)}</TableCell>
                        <TableCell className="max-w-[12rem] text-xs whitespace-normal">
                          <BackendStatusBadge kind="merchantOrderBatch" value={row.transferStatus} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.pickupCourier?.fullName ?? getNotApplicable()}
                        </TableCell>
                        <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                      </TableRow>
                    )
                  })}
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