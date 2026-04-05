import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink, TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
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

function toPercent(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0
  return Math.round((part / total) * 100)
}

function TotalShipmentsIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
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

function DeliveredIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
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

function RejectedIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M12 2.25a9.75 9.75 0 1 0 9.75 9.75A9.75 9.75 0 0 0 12 2.25Zm3.53 12.22a1.125 1.125 0 1 1-1.59 1.59L12 14.06l-1.94 1.94a1.125 1.125 0 1 1-1.59-1.59L10.41 12 8.47 10.06a1.125 1.125 0 0 1 1.59-1.59L12 10.41l1.94-1.94a1.125 1.125 0 0 1 1.59 1.59L13.59 12l1.94 1.94Z" />
    </svg>
  )
}

function PostponedIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
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

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isMd = useMediaQuery("(min-width: 768px)")
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const kpiQuery = useQuery({
    queryKey: ["dashboard-kpis", token],
    queryFn: () =>
      getDashboardKpis({
        token,
        trendDays: 14,
        recentTake: 8,
      }),
    enabled: !!token,
  })
  const totals = kpiQuery.data?.totals
  const totalShipments = totals?.totalShipments ?? 0

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
        <div className="grid gap-5 md:gap-6 xl:grid-cols-4">
          <StatCard
            title={t("dashboard.stats.totalShipments")}
            value={totalShipments}
            percentage={totalShipments > 0 ? 100 : 0}
            icon={TotalShipmentsIcon}
            accent="primary"
          />
          <StatCard
            title={t("dashboard.stats.delivered")}
            value={totals?.delivered ?? 0}
            percentage={toPercent(totals?.delivered ?? 0, totalShipments)}
            icon={DeliveredIcon}
            accent="success"
          />
          <StatCard
            title={t("dashboard.stats.rejected")}
            value={totals?.rejected ?? 0}
            percentage={toPercent(totals?.rejected ?? 0, totalShipments)}
            icon={RejectedIcon}
            accent="destructive"
          />
          <StatCard
            title={t("dashboard.stats.postponed")}
            value={totals?.postponed ?? 0}
            percentage={toPercent(totals?.postponed ?? 0, totalShipments)}
            icon={PostponedIcon}
            accent="warning"
          />
        </div>

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
                          {coordinates ? (
                            <a
                              href={`https://www.google.com/maps?q=${encodeURIComponent(`${coordinates.lat},${coordinates.lng}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary inline-flex items-center rounded-md p-1 transition-colors hover:bg-primary/12"
                              aria-label={t("dashboard.table.viewLocation")}
                              title={t("dashboard.table.viewLocation")}
                            >
                              <ExternalLink className="size-5" aria-hidden />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
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
