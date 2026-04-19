import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  getSystemSetting,
  putSystemSetting,
  type InsightsPeriodConfig,
} from "@/api/system-settings-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

function isoToDateInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function dateInputToUtcStartIso(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date(ymd).toISOString()
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString()
}

function dateInputToUtcEndIso(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date(ymd).toISOString()
  }
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString()
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<"LAST_PERIOD" | "CUSTOM_RANGE">("LAST_PERIOD")
  const [lastDays, setLastDays] = useState(30)
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")

  const insightsQuery = useQuery({
    queryKey: ["system-settings", "INSIGHTS_PERIOD", token],
    queryFn: () =>
      getSystemSetting<InsightsPeriodConfig>(token, "INSIGHTS_PERIOD"),
    enabled: !!token,
  })

  useEffect(() => {
    const v = insightsQuery.data?.value
    if (!v) return
    if (v.mode === "LAST_PERIOD") {
      setMode("LAST_PERIOD")
      setLastDays(v.lastDays)
    } else {
      setMode("CUSTOM_RANGE")
      setRangeFrom(isoToDateInputValue(v.startDate))
      setRangeTo(isoToDateInputValue(v.endDate))
    }
  }, [insightsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      let value: InsightsPeriodConfig
      if (mode === "LAST_PERIOD") {
        const n = Number(lastDays)
        if (!Number.isFinite(n) || n < 1 || n > 3660) {
          throw new Error(t("settings.insightsPeriod.invalidLastDays"))
        }
        value = { mode: "LAST_PERIOD", lastDays: Math.floor(n) }
      } else {
        if (!rangeFrom.trim() || !rangeTo.trim()) {
          throw new Error(t("settings.insightsPeriod.rangeRequired"))
        }
        if (rangeFrom > rangeTo) {
          throw new Error(t("settings.insightsPeriod.invalidRange"))
        }
        value = {
          mode: "CUSTOM_RANGE",
          startDate: dateInputToUtcStartIso(rangeFrom.trim()),
          endDate: dateInputToUtcEndIso(rangeTo.trim()),
        }
      }
      return putSystemSetting(token, "INSIGHTS_PERIOD", value)
    },
    onSuccess: () => {
      showToast(t("settings.insightsPeriod.saved"), "success")
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", "INSIGHTS_PERIOD", token],
      })
      void queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token] })
    },
    onError: (e: Error) => {
      showToast(e.message || t("settings.insightsPeriod.saveFailed"), "error")
    },
  })

  return (
    <Layout title={t("settings.pageTitle")}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.insightsPeriod.title")}</CardTitle>
            <CardDescription>{t("settings.insightsPeriod.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insightsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            ) : null}
            {insightsQuery.error ? (
              <p className="text-destructive text-sm">
                {(insightsQuery.error as Error).message}
              </p>
            ) : null}

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="insights-mode">
                {t("settings.insightsPeriod.mode")}
              </label>
              <select
                id="insights-mode"
                className="border-input bg-background w-full max-w-md rounded-md border px-3 py-2 text-sm"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value === "CUSTOM_RANGE" ? "CUSTOM_RANGE" : "LAST_PERIOD")
                }
              >
                <option value="LAST_PERIOD">{t("settings.insightsPeriod.modeLastPeriod")}</option>
                <option value="CUSTOM_RANGE">{t("settings.insightsPeriod.modeCustomRange")}</option>
              </select>
            </div>

            {mode === "LAST_PERIOD" ? (
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="insights-last-days">
                  {t("settings.insightsPeriod.lastDays")}
                </label>
                <Input
                  id="insights-last-days"
                  type="number"
                  min={1}
                  max={3660}
                  className="max-w-xs"
                  value={lastDays}
                  onChange={(e) => setLastDays(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="insights-from">
                    {t("settings.insightsPeriod.startDate")}
                  </label>
                  <Input
                    id="insights-from"
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="insights-to">
                    {t("settings.insightsPeriod.endDate")}
                  </label>
                  <Input
                    id="insights-to"
                    type="date"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              disabled={!token || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
