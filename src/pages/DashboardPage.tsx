import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Boxes, Package, TrendingUp, Users, Warehouse } from "react-lucid"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate } from "react-router-dom"
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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
import {
  getDashboardKpis,
  listPendingMerchantOrderImports,
  merchantOrderBatchId,
} from "@/api/merchant-orders-api"
import { type InsightsPeriodConfig } from "@/api/system-settings-api"
import { getUserSetting } from "@/api/user-settings-api"
import { listUsers } from "@/api/users-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { backendMerchantOrderBatchLabel } from "@/features/warehouse/backend-labels"
import { getDefaultDashboardRoute, isMerchantUser, useAuth } from "@/lib/auth-context"
import { isWarehouseAdmin } from "@/lib/warehouse-access"
import { isMainBranch } from "@/lib/warehouse-utils"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

export type DashboardVariant = "global" | "warehouseAdmin"

/**
 * Client fallback when the user-settings response has no `value` in the success path.
 * `GET /api/user-settings/INSIGHTS_PERIOD` resolves user row, then system setting, then
 * `DEFAULT_INSIGHTS_PERIOD_CONFIG` on the server.
 */
const DASHBOARD_INSIGHTS_DEFAULT: InsightsPeriodConfig = {
  mode: "LAST_PERIOD",
  lastDays: 30,
}

/** Cards and charts need matching JWT permissions; re-fetch `/api/auth/me` after role changes. */
function hasPermission(
  user: ReturnType<typeof useAuth>["user"],
  key: string,
): boolean {
  if (!user) return false
  if (user.role === "ADMIN") return true
  return user.permissions?.includes(key) ?? false
}

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatEGPFromDecimalString(amountStr: string | undefined, locale: string) {
  const n = Number.parseFloat(String(amountStr ?? "0").replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatInsightsPeriodLabel(
  period: { from: string; to: string } | undefined,
  language: string,
): string | null {
  if (!period) return null
  const loc = language.startsWith("ar") ? "ar-EG" : "en-EG"
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
  try {
    const a = new Date(period.from)
    const b = new Date(period.to)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
    return `${a.toLocaleDateString(loc, opts)} – ${b.toLocaleDateString(loc, opts)}`
  } catch {
    return null
  }
}

function useHubBasePath(warehouseList: { id: string; mainBranchId: string | null }[]) {
  return useMemo(() => {
    const w = warehouseList[0]
    if (!w) return { hubBase: "", isMain: false, merchantOrdersPath: "", hubShipmentsPath: "" }
    const enc = encodeURIComponent(w.id)
    const base = `/warehouses/${enc}`
    const main = isMainBranch(w)
    return {
      hubBase: base,
      isMain: main,
      merchantOrdersPath: `${base}/orders`,
      hubShipmentsPath: `${base}/shipments`,
    }
  }, [warehouseList])
}

function DashboardContent({ variant }: { variant: DashboardVariant }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isMd = useMediaQuery("(min-width: 768px)")
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const isWhAdmin = variant === "warehouseAdmin"
  const isMerchant = isMerchantUser(user)

  /** Aligned with `GET /api/merchant-orders/dashboard/kpis` (`merchant_orders.read` or `dashboard.view`). */
  const canReadMerchantOrderKpis =
    !!token &&
    (hasPermission(user, "merchant_orders.read") ||
      hasPermission(user, "dashboard.view"))
  const canListUsers = !!token && hasPermission(user, "users.read") && !isWhAdmin
  const canListWarehouses = !!token && hasPermission(user, "warehouses.read")

  const warehousesPreview = useQuery({
    queryKey: ["dashboard-warehouse-sites", token, variant],
    queryFn: () => listWarehouseSites(token),
    enabled: canListWarehouses,
  })

  const usersCountQuery = useQuery({
    queryKey: ["dashboard-users-total", token],
    queryFn: () => listUsers({ token, page: 1, pageSize: 1 }),
    enabled: canListUsers,
  })

  const insightsSettingsQuery = useQuery({
    queryKey: ["user-settings", "INSIGHTS_PERIOD", token],
    queryFn: () => getUserSetting<InsightsPeriodConfig>(token, "INSIGHTS_PERIOD"),
    enabled: !!token,
  })

  const effectiveInsights = useMemo((): InsightsPeriodConfig => {
    if (insightsSettingsQuery.isSuccess && insightsSettingsQuery.data?.value != null) {
      return insightsSettingsQuery.data.value
    }
    return DASHBOARD_INSIGHTS_DEFAULT
  }, [insightsSettingsQuery.isSuccess, insightsSettingsQuery.data])

  const trendDays =
    effectiveInsights.mode === "LAST_PERIOD" ? effectiveInsights.lastDays : undefined
  const createdFrom =
    effectiveInsights.mode === "CUSTOM_RANGE" ? effectiveInsights.startDate : undefined
  const createdTo =
    effectiveInsights.mode === "CUSTOM_RANGE" ? effectiveInsights.endDate : undefined
  const effectiveTrendDays = trendDays ?? 30

  const kpiQuery = useQuery({
    queryKey: [
      "dashboard-kpis",
      variant,
      "home",
      token,
      effectiveTrendDays,
      createdFrom,
      createdTo,
    ],
    queryFn: () =>
      getDashboardKpis({
        token,
        recentTake: 8,
        trendDays: createdFrom && createdTo ? undefined : effectiveTrendDays,
        createdFrom: createdFrom,
        createdTo: createdTo,
      }),
    enabled: canReadMerchantOrderKpis,
  })
  const totals = kpiQuery.data?.totals
  const warehouseList = Array.isArray(warehousesPreview.data?.warehouses)
    ? warehousesPreview.data.warehouses
    : []
  const warehouseCount = warehouseList.length
  const warehouseTotalAllTime =
    totals?.totalWarehouses !== undefined ? totals.totalWarehouses : warehouseCount

  const { merchantOrdersPath, hubShipmentsPath } = useHubBasePath(warehouseList)

  const kpiPending = canReadMerchantOrderKpis && kpiQuery.isLoading
  const userHeadline =
    totals?.totalUsers !== undefined
      ? totals.totalUsers
      : (usersCountQuery.data?.total ?? 0)
  const shipmentLinesHeadline =
    totals?.totalShipmentLines ?? totals?.totalOrders ?? 0
  const merchantOrdersHeadline =
    totals?.totalMerchantOrders ?? totals?.totalShipments ?? 0

  const statShipmentsTo = isWhAdmin
    ? merchantOrdersPath || "/warehouses"
    : "/merchant-orders"
  const statLinesTo = isWhAdmin ? hubShipmentsPath || "/shipments" : "/shipments"
  const statWarehousesTo = isWhAdmin && warehouseList[0]
    ? `/warehouses/${encodeURIComponent(warehouseList[0].id)}`
    : "/warehouses"

  const lineData = useMemo(() => {
    const orders = kpiQuery.data?.ordersOverTime ?? []
    const mos = kpiQuery.data?.merchantOrdersOverTime ?? []
    const oMap = new Map(orders.map((o) => [o.date, o.count]))
    const mMap = new Map(mos.map((o) => [o.date, o.count]))
    const dates = [...new Set([...oMap.keys(), ...mMap.keys()])].sort()
    return dates.map((date) => ({
      date,
      shipmentLines: oMap.get(date) ?? 0,
      merchantOrders: mMap.get(date) ?? 0,
      label: new Date(`${date}T12:00:00.000Z`).toLocaleDateString(i18n.language, {
        month: "short",
        day: "numeric",
      }),
    }))
  }, [kpiQuery.data?.ordersOverTime, kpiQuery.data?.merchantOrdersOverTime, i18n.language])

  const insightsPeriodLabel = formatInsightsPeriodLabel(
    kpiQuery.data?.insightsPeriod,
    i18n.language,
  )

  const pieData = useMemo(() => {
    const rows = kpiQuery.data?.transferStatusBreakdown ?? []
    const palette = [
      "var(--primary)",
      "var(--success)",
      "var(--warning)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--muted-foreground)",
    ]
    return rows.map((row, i) => ({
      status: row.transferStatus,
      value: row.count,
      color: palette[i % palette.length] ?? "var(--primary)",
      label: backendMerchantOrderBatchLabel(t, row.transferStatus),
    }))
  }, [kpiQuery.data?.transferStatusBreakdown, t])

  const onQuickViewMerchantOrders = () => {
    if (isWhAdmin) {
      void navigate(merchantOrdersPath || "/warehouses")
      return
    }
    void navigate("/merchant-orders")
  }

  const onQuickViewShipments = () => {
    if (isWhAdmin) {
      void navigate(hubShipmentsPath || "/shipments")
      return
    }
    void navigate("/shipments")
  }

  const showMerchantQuickTabs =
    !isWhAdmin &&
    isMerchantUser(user) &&
    hasPermission(user, "merchant_orders.read")

  const [quickActionsTab, setQuickActionsTab] = useState<"shortcuts" | "pending">("shortcuts")

  const pendingImportsPreviewQuery = useQuery({
    queryKey: ["dashboard-merchant-pending-imports", token],
    queryFn: () => listPendingMerchantOrderImports({ token }),
    enabled: Boolean(token && showMerchantQuickTabs && quickActionsTab === "pending"),
  })

  const insightGridClass =
    isWhAdmin
      ? "grid gap-5 md:gap-6 md:grid-cols-2 xl:grid-cols-3"
      : "grid gap-5 md:gap-6 md:grid-cols-2 xl:grid-cols-4"

  const warehouseViewAllTo =
    isWhAdmin && warehouseList[0] ? `/warehouses/${encodeURIComponent(warehouseList[0].id)}` : "/warehouses"

  return (
    <Layout title={t("nav.dashboard")}>
      <div className="space-y-10">
        {canReadMerchantOrderKpis && kpiQuery.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("dashboard.kpiError")}{" "}
            {(kpiQuery.error as Error)?.message ? String((kpiQuery.error as Error).message) : ""}
          </p>
        ) : null}
        {canReadMerchantOrderKpis && kpiPending ? (
          <p className="text-muted-foreground text-sm">{t("dashboard.kpiLoading")}</p>
        ) : null}
        {canReadMerchantOrderKpis ? (
          <div className={insightGridClass}>
            {canListUsers ? (
              <StatCard
                title={t("dashboard.adminStats.users")}
                value={kpiPending ? "—" : userHeadline}
                icon={Users}
                accent="primary"
                to={user?.role === "ADMIN" ? "/users" : undefined}
                hideTrend
              />
            ) : null}
            <StatCard
              title={t("dashboard.adminStats.orders")}
              value={kpiPending ? "—" : shipmentLinesHeadline}
              icon={Boxes}
              accent="warning"
              to={statLinesTo}
              hideTrend
            />
            <StatCard
              title={isMerchant ? t("dashboard.myOrders.statsTotalShipments") : t("dashboard.adminStats.shipments")}
              value={kpiPending ? "—" : merchantOrdersHeadline}
              icon={Package}
              accent="success"
              to={statShipmentsTo}
              hideTrend
            />
            {canListWarehouses && !isWhAdmin ? (
              <StatCard
                title={t("dashboard.adminStats.warehouses")}
                value={kpiPending ? "—" : warehouseTotalAllTime}
                icon={Warehouse}
                accent="destructive"
                to={statWarehousesTo}
                hideTrend
              />
            ) : null}
          </div>
        ) : null}

        {canListWarehouses ? (
          <Card className="border-border">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Warehouse className="text-primary size-5 shrink-0" aria-hidden />
                  {t("dashboard.warehouses.title")}
                </CardTitle>
                <CardDescription>{t("dashboard.warehouses.description")}</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 self-start" asChild>
                <Link to={warehouseViewAllTo}>{t("dashboard.warehouses.viewAll")}</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {warehousesPreview.isLoading ? (
                <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
              ) : null}
              {warehousesPreview.error ? (
                <p className="text-destructive text-sm">
                  {(warehousesPreview.error as Error).message}
                </p>
              ) : null}
              <ul className="space-y-2">
                {warehouseList.slice(0, 3).map((w) => (
                  <li key={w.id}>
                    <Link
                      to={`/warehouses/${w.id}`}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {w.name}
                    </Link>
                    <span className="text-muted-foreground text-sm">
                      {" "}
                      · {w.governorate}
                      {w.code ? ` · ${w.code}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {warehouseCount === 0 &&
              !warehousesPreview.isLoading &&
              !warehousesPreview.error ? (
                <p className="text-muted-foreground text-sm">{t("dashboard.warehouses.empty")}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {canReadMerchantOrderKpis ? (
        <div className="grid gap-6 xl:gap-7 lg:grid-cols-5">
          <Card className="dashboard-card dashboard-card-hover dashboard-animate-in lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <TrendingUp className="size-6 shrink-0 text-primary" aria-hidden />
                {isMerchant ? t("dashboard.myOrders.chartLineTitle") : t("dashboard.chart.lineTitle")}
              </CardTitle>
              <CardDescription>
                {isMerchant
                  ? t("dashboard.myOrders.chartLineDescriptionPeriod")
                  : t("dashboard.chart.lineDescriptionPeriod")}
                {insightsPeriodLabel ? (
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {insightsPeriodLabel}
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-5">
              <div className="text-muted-foreground h-[220px] w-full min-h-[200px] text-xs sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineData}
                    margin={{
                      top: 8,
                      right: isMd ? 8 : 4,
                      left: isMd ? 0 : -8,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: isMd ? 12 : 10,
                      }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      width={isMd ? undefined : 28}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: isMd ? 12 : 10,
                      }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: isMd ? 12 : 11 }} />
                    <Line
                      type="monotone"
                      dataKey="shipmentLines"
                      name={t("dashboard.chart.shipmentLinesSeries")}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ fill: "var(--primary)", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="merchantOrders"
                      name={
                        isMerchant
                          ? t("dashboard.myOrders.chartMerchantOrdersSeries")
                          : t("dashboard.chart.merchantOrdersSeries")
                      }
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={{ fill: "var(--chart-2)", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card dashboard-card-hover dashboard-animate-in lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.chart.merchantOrderBatchPieTitle")}</CardTitle>
              <CardDescription>
                {isMerchant
                  ? t("dashboard.myOrders.chartMerchantOrderBatchPieDescription")
                  : t("dashboard.chart.merchantOrderBatchPieDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-5">
              <div className="h-[240px] w-full min-h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={isMd ? "52%" : "42%"}
                      outerRadius={isMd ? "78%" : "68%"}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={`${entry.status}-${entry.label}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: isMd ? 12 : 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        ) : null}

        <div className="gradient-accent dashboard-animate-in rounded-2xl border border-border/80 p-5 shadow-[var(--shadow-soft)]">
          {showMerchantQuickTabs ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
                <button
                  type="button"
                  onClick={() => setQuickActionsTab("shortcuts")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    quickActionsTab === "shortcuts"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {t("dashboard.quickActions.tabShortcuts")}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickActionsTab("pending")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    quickActionsTab === "pending"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {t("dashboard.quickActions.tabPending")}
                </button>
              </div>
              {quickActionsTab === "shortcuts" ? (
                <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-foreground text-lg font-semibold">
                      {t("dashboard.quickActions.title")}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {isMerchant
                        ? t("dashboard.myOrders.quickActionsDescription")
                        : t("dashboard.quickActions.description")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      variant="default"
                      className="w-full sm:w-auto"
                      onClick={onQuickViewMerchantOrders}
                    >
                      {isMerchant
                        ? t("dashboard.myOrders.quickActionsViewShipments")
                        : t("dashboard.quickActions.viewShipments")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={onQuickViewShipments}
                    >
                      {t("dashboard.quickActions.viewAllOrders")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-foreground text-lg font-semibold">
                      {t("dashboard.quickActions.pendingTitle")}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.quickActions.pendingDescription")}
                    </p>
                  </div>
                  {pendingImportsPreviewQuery.isLoading ? (
                    <p className="text-muted-foreground text-sm">{t("dashboard.kpiLoading")}</p>
                  ) : null}
                  {pendingImportsPreviewQuery.error ? (
                    <p className="text-destructive text-sm" role="alert">
                      {(pendingImportsPreviewQuery.error as Error).message}
                    </p>
                  ) : null}
                  {!pendingImportsPreviewQuery.isLoading &&
                  !pendingImportsPreviewQuery.error &&
                  (pendingImportsPreviewQuery.data?.items.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.quickActions.pendingEmpty")}
                    </p>
                  ) : null}
                  <ul className="space-y-2">
                    {(pendingImportsPreviewQuery.data?.items ?? []).slice(0, 5).map((row) => (
                      <li
                        key={row.id}
                        className="border-border/80 flex flex-col gap-0.5 rounded-lg border bg-background/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium break-all">{row.fileName}</span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {t("dashboard.quickActions.pendingRows", { count: row.rowCount })} ·{" "}
                          {new Date(row.createdAt).toLocaleString(locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link to="/merchant-orders/pending-confirmations">
                      {t("dashboard.quickActions.pendingViewAll")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-foreground text-lg font-semibold">
                  {t("dashboard.quickActions.title")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {isMerchant
                    ? t("dashboard.myOrders.quickActionsDescription")
                    : t("dashboard.quickActions.description")}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="default"
                  className="w-full sm:w-auto"
                  onClick={onQuickViewMerchantOrders}
                >
                  {isMerchant
                    ? t("dashboard.myOrders.quickActionsViewShipments")
                    : t("dashboard.quickActions.viewShipments")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={onQuickViewShipments}
                >
                  {t("dashboard.quickActions.viewAllOrders")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {canReadMerchantOrderKpis ? (
        <Card className="dashboard-card dashboard-animate-in overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">
              {isMerchant ? t("dashboard.myOrders.recentShipmentsTitle") : t("dashboard.recent.shipmentsTitle")}
            </CardTitle>
            <CardDescription>
              {isMerchant
                ? t("dashboard.myOrders.recentShipmentsDescription")
                : t("dashboard.recent.shipmentsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:px-4">
              <Table className="min-w-[36rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.table.merchant")}</TableHead>
                    <TableHead>{t("dashboard.table.warehouse")}</TableHead>
                    <TableHead>{t("dashboard.table.merchantOrderBatchStatus")}</TableHead>
                    <TableHead className="text-end">{t("dashboard.table.orderCount")}</TableHead>
                    <TableHead className="text-end">
                      {t("dashboard.table.batchValue")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(kpiQuery.data?.recentShipments ?? []).map((row, idx) => (
                    <TableRow
                      key={merchantOrderBatchId(row) || row.id || `row-${idx}`}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        const batchId = merchantOrderBatchId(row)
                        if (!batchId) return
                        void navigate(`/merchant-orders/${encodeURIComponent(batchId)}`)
                      }}
                    >
                      <TableCell className="font-medium">
                        {row.merchant?.displayName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.assignedWarehouse?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <BackendStatusBadge
                          kind="merchantOrderBatch"
                          value={row.transferStatus ?? ""}
                        />
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {row.orderCount ?? "—"}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {formatEGPFromDecimalString(
                          row.totalShipmentValue ?? row.shipmentValue,
                          locale,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        ) : null}
      </div>
    </Layout>
  )
}

/** Global home dashboard: warehouse site admins are sent to the scoped warehouse dashboard. */
export function DashboardPage() {
  const { user } = useAuth()
  if (isWarehouseAdmin(user)) {
    return <Navigate to="/dashboard/warehouse" replace />
  }
  return <DashboardContent variant="global" />
}

/** Hub-scoped insights; only for warehouse site admins. */
export function WarehouseAdminDashboardPage() {
  const { user } = useAuth()
  if (!isWarehouseAdmin(user)) {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />
  }
  return <DashboardContent variant="warehouseAdmin" />
}
