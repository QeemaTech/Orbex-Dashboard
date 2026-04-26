import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  CUSTOMER_SERVICE_FEE_RATE_KEY,
  DEFAULT_COMMISSION_FEE_KEY,
  getSystemSetting,
  SHIPPING_FEE_CONFIG_KEY,
  putSystemSetting,
  type InsightsPeriodConfig,
  VISA_COMMISSION_RATE_KEY,
} from "@/api/system-settings-api"
import { getUserSetting, putUserSetting } from "@/api/user-settings-api"
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
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const canManageSystem = (user?.permissions ?? []).includes("settings.manage_system")
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<"LAST_PERIOD" | "CUSTOM_RANGE">("LAST_PERIOD")
  const [lastDays, setLastDays] = useState(30)
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")
  const [defaultCommissionFee, setDefaultCommissionFee] = useState("0")
  const [visaCommissionPercent, setVisaCommissionPercent] = useState("2.5")
  const [serviceFeePercent, setServiceFeePercent] = useState("0")
  const [shippingMode, setShippingMode] = useState<"MANUAL" | "FIXED" | "PERCENT_OF_VALUE">(
    "MANUAL",
  )
  const [shippingFixedAmount, setShippingFixedAmount] = useState("0")
  const [shippingPercentOfValue, setShippingPercentOfValue] = useState("0")

  const userInsightsQuery = useQuery({
    queryKey: ["user-settings", "INSIGHTS_PERIOD", token],
    queryFn: () => getUserSetting<InsightsPeriodConfig>(token, "INSIGHTS_PERIOD"),
    enabled: !!token,
  })
  const defaultCommissionQuery = useQuery({
    queryKey: ["system-settings", DEFAULT_COMMISSION_FEE_KEY, token],
    queryFn: () => getSystemSetting<number>(token, DEFAULT_COMMISSION_FEE_KEY),
    enabled: !!token && canManageSystem,
  })
  const visaCommissionQuery = useQuery({
    queryKey: ["system-settings", VISA_COMMISSION_RATE_KEY, token],
    queryFn: () => getSystemSetting<number>(token, VISA_COMMISSION_RATE_KEY),
    enabled: !!token && canManageSystem,
  })
  const serviceFeeQuery = useQuery({
    queryKey: ["system-settings", CUSTOMER_SERVICE_FEE_RATE_KEY, token],
    queryFn: () => getSystemSetting<number>(token, CUSTOMER_SERVICE_FEE_RATE_KEY),
    enabled: !!token && canManageSystem,
  })
  const shippingFeeConfigQuery = useQuery({
    queryKey: ["system-settings", SHIPPING_FEE_CONFIG_KEY, token],
    queryFn: () =>
      getSystemSetting<{ mode: string; amount?: number; rate?: number }>(token, SHIPPING_FEE_CONFIG_KEY),
    enabled: !!token && canManageSystem,
  })

  useEffect(() => {
    const v = userInsightsQuery.data?.value
    if (!v) return
    if (v.mode === "LAST_PERIOD") {
      setMode("LAST_PERIOD")
      setLastDays(v.lastDays)
    } else {
      setMode("CUSTOM_RANGE")
      setRangeFrom(isoToDateInputValue(v.startDate))
      setRangeTo(isoToDateInputValue(v.endDate))
    }
  }, [userInsightsQuery.data])
  useEffect(() => {
    const n = Number(defaultCommissionQuery.data?.value)
    if (Number.isFinite(n) && n >= 0) setDefaultCommissionFee(String(n))
  }, [defaultCommissionQuery.data?.value])
  useEffect(() => {
    const rate = Number(visaCommissionQuery.data?.value)
    if (Number.isFinite(rate) && rate >= 0) {
      setVisaCommissionPercent(String(rate * 100))
    }
  }, [visaCommissionQuery.data?.value])
  useEffect(() => {
    const rate = Number(serviceFeeQuery.data?.value)
    if (Number.isFinite(rate) && rate >= 0) {
      setServiceFeePercent(String(rate * 100))
    }
  }, [serviceFeeQuery.data?.value])
  useEffect(() => {
    const cfg = shippingFeeConfigQuery.data?.value
    if (!cfg) return
    const mode =
      cfg.mode === "FIXED"
        ? "FIXED"
        : cfg.mode === "PERCENT_OF_VALUE"
          ? "PERCENT_OF_VALUE"
          : "MANUAL"
    setShippingMode(mode)
    if (mode === "FIXED") {
      const a = Number(cfg.amount)
      setShippingFixedAmount(Number.isFinite(a) && a >= 0 ? String(a) : "0")
    }
    if (mode === "PERCENT_OF_VALUE") {
      const r = Number(cfg.rate)
      setShippingPercentOfValue(
        Number.isFinite(r) && r >= 0 ? String(r * 100) : "0",
      )
    }
  }, [shippingFeeConfigQuery.data?.value])

  const saveUserInsightsMutation = useMutation({
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
      return putUserSetting(token, "INSIGHTS_PERIOD", value)
    },
    onSuccess: () => {
      showToast(t("settings.insightsPeriod.saved"), "success")
      void queryClient.invalidateQueries({
        queryKey: ["user-settings", "INSIGHTS_PERIOD", token],
      })
      void queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token], exact: false })
      void queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", token], exact: false })
    },
    onError: (e: Error) => {
      showToast(e.message || t("settings.insightsPeriod.saveFailed"), "error")
    },
  })
  const saveFinancialMutation = useMutation({
    mutationFn: async () => {
      const commission = Number.parseFloat(defaultCommissionFee)
      if (!Number.isFinite(commission) || commission < 0) {
        throw new Error(t("settings.financial.invalidCommissionFee"))
      }
      const visaPercent = Number.parseFloat(visaCommissionPercent)
      if (!Number.isFinite(visaPercent) || visaPercent < 0 || visaPercent > 100) {
        throw new Error(t("settings.financial.invalidVisaCommissionPercent"))
      }
      const servicePercent = Number.parseFloat(serviceFeePercent)
      if (!Number.isFinite(servicePercent) || servicePercent < 0 || servicePercent > 100) {
        throw new Error(t("settings.financial.invalidServiceFeePercent"))
      }
      const visaRate = visaPercent / 100
      const serviceRate = servicePercent / 100
      await Promise.all([
        putSystemSetting(token, DEFAULT_COMMISSION_FEE_KEY, commission),
        putSystemSetting(token, VISA_COMMISSION_RATE_KEY, visaRate),
        putSystemSetting(token, CUSTOMER_SERVICE_FEE_RATE_KEY, serviceRate),
        putSystemSetting(
          token,
          SHIPPING_FEE_CONFIG_KEY,
          shippingMode === "FIXED"
            ? { mode: "FIXED", amount: Number.parseFloat(shippingFixedAmount) || 0 }
            : shippingMode === "PERCENT_OF_VALUE"
              ? { mode: "PERCENT_OF_VALUE", rate: (Number.parseFloat(shippingPercentOfValue) || 0) / 100 }
              : { mode: "MANUAL" },
        ),
      ])
    },
    onSuccess: () => {
      showToast(t("settings.financial.saved"), "success")
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", DEFAULT_COMMISSION_FEE_KEY, token],
      })
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", VISA_COMMISSION_RATE_KEY, token],
      })
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", CUSTOMER_SERVICE_FEE_RATE_KEY, token],
      })
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", SHIPPING_FEE_CONFIG_KEY, token],
      })
    },
    onError: (e: Error) => {
      showToast(e.message || t("settings.financial.saveFailed"), "error")
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
            {userInsightsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            ) : null}
            {userInsightsQuery.error ? (
              <p className="text-destructive text-sm">
                {(userInsightsQuery.error as Error).message}
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
              disabled={!token || saveUserInsightsMutation.isPending}
              onClick={() => saveUserInsightsMutation.mutate()}
            >
              {saveUserInsightsMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </CardContent>
        </Card>
        {canManageSystem ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.financial.title")}</CardTitle>
              <CardDescription>{t("settings.financial.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {defaultCommissionQuery.isLoading ||
              visaCommissionQuery.isLoading ||
              serviceFeeQuery.isLoading ||
              shippingFeeConfigQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
              ) : null}
              {defaultCommissionQuery.error ||
              visaCommissionQuery.error ||
              serviceFeeQuery.error ||
              shippingFeeConfigQuery.error ? (
                <p className="text-destructive text-sm">
                  {(
                    (defaultCommissionQuery.error ??
                      visaCommissionQuery.error ??
                      serviceFeeQuery.error ??
                      shippingFeeConfigQuery.error) as Error
                  ).message}
                </p>
              ) : null}
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="default-commission-fee">
                  {t("settings.financial.defaultCommissionFee")}
                </label>
                <p className="text-muted-foreground text-xs">
                  {t("settings.financial.defaultCommissionFeeHelp")}
                </p>
                <Input
                  id="default-commission-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  className="max-w-xs"
                  value={defaultCommissionFee}
                  onChange={(e) => setDefaultCommissionFee(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="visa-commission-percent">
                  {t("settings.financial.visaCommissionPercent")}
                </label>
                <p className="text-muted-foreground text-xs">
                  {t("settings.financial.visaCommissionPercentHelp")}
                </p>
                <Input
                  id="visa-commission-percent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="max-w-xs"
                  value={visaCommissionPercent}
                  onChange={(e) => setVisaCommissionPercent(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="service-fee-percent">
                  {t("settings.financial.serviceFeePercent")}
                </label>
                <p className="text-muted-foreground text-xs">
                  {t("settings.financial.serviceFeePercentHelp")}
                </p>
                <Input
                  id="service-fee-percent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="max-w-xs"
                  value={serviceFeePercent}
                  onChange={(e) => setServiceFeePercent(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="shipping-mode">
                  {t("settings.financial.shippingFeeMode")}
                </label>
                <p className="text-muted-foreground text-xs">
                  {t("settings.financial.shippingFeeModeHelp")}
                </p>
                <select
                  id="shipping-mode"
                  className="border-input bg-background w-full max-w-md rounded-md border px-3 py-2 text-sm"
                  value={shippingMode}
                  onChange={(e) =>
                    setShippingMode(
                      e.target.value === "FIXED"
                        ? "FIXED"
                        : e.target.value === "PERCENT_OF_VALUE"
                          ? "PERCENT_OF_VALUE"
                          : "MANUAL",
                    )
                  }
                >
                  <option value="MANUAL">{t("settings.financial.shippingFeeModeManual")}</option>
                  <option value="FIXED">{t("settings.financial.shippingFeeModeFixed")}</option>
                  <option value="PERCENT_OF_VALUE">{t("settings.financial.shippingFeeModePercentOfValue")}</option>
                </select>
              </div>
              {shippingMode === "FIXED" ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="shipping-fixed-amount">
                    {t("settings.financial.shippingFeeFixedAmount")}
                  </label>
                  <Input
                    id="shipping-fixed-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    className="max-w-xs"
                    value={shippingFixedAmount}
                    onChange={(e) => setShippingFixedAmount(e.target.value)}
                  />
                </div>
              ) : null}
              {shippingMode === "PERCENT_OF_VALUE" ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="shipping-percent-of-value">
                    {t("settings.financial.shippingFeePercentOfValue")}
                  </label>
                  <Input
                    id="shipping-percent-of-value"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    className="max-w-xs"
                    value={shippingPercentOfValue}
                    onChange={(e) => setShippingPercentOfValue(e.target.value)}
                  />
                </div>
              ) : null}
              <Button
                type="button"
                disabled={!token || saveFinancialMutation.isPending}
                onClick={() => saveFinancialMutation.mutate()}
              >
                {saveFinancialMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  )
}
