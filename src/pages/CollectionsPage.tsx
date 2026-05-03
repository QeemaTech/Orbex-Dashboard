import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { HandCoins, Landmark, PieChartIcon, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { getAccountingDashboard } from "@/api/accounting-api"
import { Layout } from "@/components/layout/Layout"
import { ShipmentStatusBadge } from "@/features/customer-service/components/ShipmentStatusBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

function resolveNumberLocale(lng: string) {
  return lng.startsWith("ar") ? "ar-EG" : "en-EG"
}

const CHART_PALETTE = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--chart-2)",
  "var(--chart-3)",
  "color-mix(in oklch, var(--destructive) 85%, transparent)",
] as const

function cardAccentFromPaymentStatus(status: string): string {
  switch (status) {
    case "SETTLED":
    case "COLLECTED":
    case "READY_FOR_SETTLEMENT":
      return "border-success/35 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm"
    case "PENDING_COLLECTION":
    case "POS_PENDING":
      return "border-warning/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm"
    case "ON_HOLD":
      return "border-destructive/30 bg-gradient-to-br from-rose-500/8 via-card to-card shadow-sm"
    default:
      return "border-border/80 bg-card shadow-sm"
  }
}

function progressClassFromPaymentStatus(status: string): string {
  switch (status) {
    case "SETTLED":
    case "COLLECTED":
    case "READY_FOR_SETTLEMENT":
      return "bg-success"
    case "PENDING_COLLECTION":
    case "POS_PENDING":
      return "bg-warning"
    case "ON_HOLD":
      return "bg-destructive"
    default:
      return "bg-primary"
  }
}

export function CollectionsPage() {
  const { t, i18n } = useTranslation()
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const queryClient = useQueryClient()

  const canOpenAccounts =
    user?.role === "ADMIN" || Boolean(user?.permissions?.includes("accounts.read"))

  const q = useQuery({
    queryKey: ["accounting-dashboard", token],
    queryFn: () => getAccountingDashboard(token),
    enabled: !!token,
    refetchInterval: 15_000,
  })

  const rows = q.data?.paymentStatusSummary ?? []
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.count - a.count),
    [rows],
  )
  const total = useMemo(
    () => sortedRows.reduce((acc, r) => acc + r.count, 0),
    [sortedRows],
  )

  const pieData = useMemo(() => {
    return sortedRows.map((row, i) => ({
      name: row.paymentStatus,
      value: row.count,
      color: CHART_PALETTE[i % CHART_PALETTE.length] ?? "var(--primary)",
      label: t(`cs.shipmentStatus.${row.paymentStatus}`, {
        defaultValue: row.paymentStatus,
      }),
    }))
  }, [sortedRows, t])

  function onRefresh() {
    void queryClient.invalidateQueries({ queryKey: ["accounting-dashboard"] })
  }

  return (
    <Layout title={t("nav.collections")}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-primary/12 flex size-12 items-center justify-center rounded-2xl">
                <HandCoins className="text-primary size-7" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {t("nav.collections")}
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                  {t("collections.subtitle")}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t("collections.autoRefreshHint")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={q.isFetching}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn("size-4", q.isFetching && "animate-spin")}
                aria-hidden
              />
              {t("collections.refresh")}
            </Button>
            {canOpenAccounts ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/accounts" className="gap-2">
                    <Landmark className="size-4" aria-hidden />
                    {t("collections.openAccounts")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/accounts/balances">{t("collections.openBalances")}</Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {q.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted/50 h-32 animate-pulse rounded-xl border"
              />
            ))}
          </div>
        ) : null}

        {q.error ? (
          <p className="text-destructive text-sm" role="alert">
            {t("collections.errorPrefix")}{" "}
            {(q.error as Error).message ? String((q.error as Error).message) : ""}
          </p>
        ) : null}

        {!q.isLoading && !q.error && total === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground py-12 text-center text-sm">
              {t("collections.empty")}
            </CardContent>
          </Card>
        ) : null}

        {!q.isLoading && !q.error && total > 0 ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-primary/25 from-primary/8 bg-gradient-to-br to-card lg:col-span-1">
                <CardHeader>
                  <CardDescription>{t("collections.totalShipments")}</CardDescription>
                  <CardTitle className="text-4xl font-bold tabular-nums">
                    {total.toLocaleString(locale)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-0">
                  <PieChartIcon className="text-muted-foreground size-5" aria-hidden />
                  <div>
                    <CardTitle className="text-base">{t("collections.chartTitle")}</CardTitle>
                    <CardDescription>{t("collections.chartHint")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[min(320px,55vw)] w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius="48%"
                          outerRadius="78%"
                          paddingAngle={2}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            typeof value === "number"
                              ? value.toLocaleString(locale)
                              : Number(value ?? 0).toLocaleString(locale)
                          }
                          contentStyle={{
                            borderRadius: "0.75rem",
                            border: "1px solid color-mix(in oklch, var(--border) 80%, transparent)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    {pieData.map((d) => (
                      <li key={d.name} className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                          aria-hidden
                        />
                        <span className="text-foreground font-medium">{d.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          ({d.value.toLocaleString(locale)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">
                {t("accounts.table.paymentStatus")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sortedRows.map((row) => {
                  const pct = total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0
                  return (
                    <div
                      key={row.paymentStatus}
                      className={cn(
                        "flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md",
                        cardAccentFromPaymentStatus(row.paymentStatus),
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <ShipmentStatusBadge status={row.paymentStatus} />
                        <span className="text-muted-foreground text-xs font-medium tabular-nums">
                          {t("collections.shareOfTotal", { pct })}
                        </span>
                      </div>
                      <p className="text-3xl font-semibold tabular-nums">
                        {row.count.toLocaleString(locale)}
                      </p>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500 ease-out",
                            progressClassFromPaymentStatus(row.paymentStatus),
                          )}
                          style={{ width: `${Math.min(100, pct)}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  )
}
