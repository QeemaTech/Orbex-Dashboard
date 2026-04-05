import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Boxes, Package, TrendingUp, Users, Warehouse } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
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
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
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
import { getDashboardKpis } from "@/api/shipments-api"
import { listUsers } from "@/api/users-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { parseCoordinatesFromLocationInput } from "@/features/customer-service/lib/location"
import { useAuth } from "@/lib/auth-context"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import type { ShipmentStatus as DashboardShipmentStatus } from "@/types/dashboard"
import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatEGP(amountCents: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100)
}

function toDashboardStatus(status: string): DashboardShipmentStatus {
  if (status === "DELIVERED") return "delivered"
  if (status === "REJECTED") return "rejected"
  if (status === "DELAYED" || status === "POSTPONED") return "postponed"
  return "in_transit"
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isMd = useMediaQuery("(min-width: 768px)")
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const warehousesPreview = useQuery({
    queryKey: ["dashboard-warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && user?.role === "ADMIN",
  })

  const usersCountQuery = useQuery({
    queryKey: ["dashboard-users-total", token],
    queryFn: () => listUsers({ token, page: 1, pageSize: 1 }),
    enabled: !!token && user?.role === "ADMIN",
  })

  const kpiQuery = useQuery({
    queryKey: ["dashboard-kpis", "home", token],
    queryFn: () =>
      getDashboardKpis({
        token,
        trendDays: 14,
        recentTake: 8,
      }),
    enabled: !!token,
  })
  const totals = kpiQuery.data?.totals
  const warehouseCount = (warehousesPreview.data?.warehouses ?? []).length

  const lineData = useMemo(
    () =>
      (kpiQuery.data?.shipmentsOverTime ?? []).map((row) => ({
        date: row.date,
        count: row.count,
        label: new Date(row.date).toLocaleDateString(i18n.language, {
          month: "short",
          day: "numeric",
        }),
      })),
    [kpiQuery.data?.shipmentsOverTime, i18n.language]
  )

  const pieData = useMemo(
    () =>
      (kpiQuery.data?.statusBreakdown ?? []).map(
        ({ status, subStatus, count }) => ({
          status: `${status}/${subStatus}`,
          value: count,
          color:
            status === "DELIVERED"
              ? "var(--success)"
              : status === "RETURNED" && subStatus === "REJECTED"
                ? "var(--error)"
                : status === "RETURNED" && subStatus === "DELAYED"
                  ? "var(--warning)"
                  : "var(--primary)",
          label: `${status}/${subStatus}`,
        }),
      ),
    [kpiQuery.data?.statusBreakdown],
  )

  return (
    <Layout title={t("nav.dashboard")}>
      <div className="space-y-10">
        {user?.role === "ADMIN" ? (
          <div className="grid gap-5 md:gap-6 xl:grid-cols-4">
            <StatCard
              title={t("dashboard.adminStats.users")}
              value={usersCountQuery.data?.total ?? 0}
              icon={Users}
              accent="primary"
              to="/users"
              hideTrend
            />
            <StatCard
              title={t("dashboard.adminStats.shipments")}
              value={totals?.totalShipments ?? 0}
              icon={Package}
              accent="success"
              to="/shipments"
              hideTrend
            />
            <StatCard
              title={t("dashboard.adminStats.packages")}
              value={totals?.totalPackages ?? 0}
              icon={Boxes}
              accent="warning"
              to="/shipments"
              hideTrend
            />
            <StatCard
              title={t("dashboard.adminStats.warehouses")}
              value={warehouseCount}
              icon={Warehouse}
              accent="destructive"
              to="/warehouse/sites"
              hideTrend
            />
          </div>
        ) : null}

        {user?.role === "ADMIN" ? (
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
                <Link to="/warehouse/sites">{t("dashboard.warehouses.viewAll")}</Link>
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
                {(warehousesPreview.data?.warehouses ?? []).slice(0, 3).map((w) => (
                  <li key={w.id}>
                    <Link
                      to={`/warehouse/sites/${w.id}`}
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
              {(warehousesPreview.data?.warehouses ?? []).length === 0 &&
              !warehousesPreview.isLoading &&
              !warehousesPreview.error ? (
                <p className="text-muted-foreground text-sm">{t("dashboard.warehouses.empty")}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:gap-7 lg:grid-cols-5">
          <Card className="dashboard-card dashboard-card-hover dashboard-animate-in lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <TrendingUp className="size-6 shrink-0 text-primary" aria-hidden />
                {t("dashboard.chart.lineTitle")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.chart.lineDescription")}
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
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t("dashboard.chart.lineSeriesName")}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ fill: "var(--primary)", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card dashboard-card-hover dashboard-animate-in lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.chart.pieTitle")}</CardTitle>
              <CardDescription>
                {t("dashboard.chart.pieDescription")}
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
                        <Cell key={entry.status} fill={entry.color} />
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

        <div className="gradient-accent dashboard-animate-in rounded-2xl border border-border/80 p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-foreground text-lg font-semibold">
                {t("dashboard.quickActions.title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("dashboard.quickActions.description")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => navigate("/shipments")}
              >
                {t("dashboard.quickActions.viewAllShipments")}
              </Button>
            </div>
          </div>
        </div>

        <Card className="dashboard-card dashboard-animate-in overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.recent.title")}</CardTitle>
            <CardDescription>{t("dashboard.recent.description")}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:px-4">
              <Table className="min-w-[36rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.table.customerName")}</TableHead>
                    <TableHead>{t("dashboard.table.phone")}</TableHead>
                    <TableHead>{t("dashboard.table.location")}</TableHead>
                    <TableHead>{t("dashboard.table.status")}</TableHead>
                    <TableHead>{t("dashboard.table.paymentMethod")}</TableHead>
                    <TableHead className="text-end">
                      {t("dashboard.table.amount")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(kpiQuery.data?.recentShipments ?? []).map((row) => {
                    const lat = Number(row.customerLat)
                    const lng = Number(row.customerLng)
                    const fallback = parseCoordinatesFromLocationInput(row.locationLink)
                    const coordinates =
                      Number.isFinite(lat) && Number.isFinite(lng)
                        ? { lat, lng }
                        : fallback
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.customerName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.phonePrimary}
                        </TableCell>
                        <TableCell>
                          <CoordinatesMapLink coordinates={coordinates} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={toDashboardStatus(
                              getPerspectiveStatusKey("operations", row),
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {row.paymentMethod}
                        </TableCell>
                        <TableCell className="text-end font-medium tabular-nums">
                          {formatEGP(
                            Math.round(Number(row.shipmentValue || "0") * 100),
                            locale,
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
