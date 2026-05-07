import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  CUSTOMER_SERVICE_FEE_RATE_KEY,
  DEFAULT_COMMISSION_FEE_KEY,
  getSystemSetting,
  type SupportInfo,
  SHIPPING_FEE_CONFIG_KEY,
  SUPPORT_INFO_KEY,
  putSystemSetting,
  type InsightsPeriodConfig,
  VISA_COMMISSION_RATE_KEY,
} from "@/api/system-settings-api"
import { listRegionsCatalog } from "@/api/delivery-zones-api"
import { getUserSetting, putUserSetting } from "@/api/user-settings-api"
import { ApiError, formatApiValidationDetails } from "@/api/client"
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
import {
  type ReferenceDataCreateBody,
  type ReferenceDataRow,
  createBankReferenceData,
  createBusinessSectorReferenceData,
  createGovernorateReferenceData,
  createProductTypeReferenceData,
  createSalesChannelReferenceData,
  deleteBankReferenceData,
  deleteBusinessSectorReferenceData,
  deleteGovernorateReferenceData,
  deleteProductTypeReferenceData,
  deleteSalesChannelReferenceData,
  listBanksReferenceData,
  listBusinessSectorsReferenceData,
  listGovernoratesReferenceData,
  listProductTypesReferenceData,
  listSalesChannelsReferenceData,
  updateBankReferenceData,
  updateBusinessSectorReferenceData,
  updateGovernorateReferenceData,
  updateProductTypeReferenceData,
  updateSalesChannelReferenceData,
} from "@/api/reference-data-api"

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

function TabButton(props: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={props.active ? "default" : "outline"}
      onClick={props.onClick}
      className="h-9"
    >
      {props.children}
    </Button>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const canManageSystem = (user?.permissions ?? []).includes("settings.manage_system")
  const perms = user?.permissions ?? []
  const canReadAnyReferenceData = perms.some(
    (p) => p.startsWith("reference_data.") && p.endsWith(".read"),
  )
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<"LAST_PERIOD" | "CUSTOM_RANGE">("LAST_PERIOD")
  const [lastDays, setLastDays] = useState(30)
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")
  const [defaultCommissionFee, setDefaultCommissionFee] = useState("0")
  const [visaCommissionPercent, setVisaCommissionPercent] = useState("2.5")
  const [serviceFeePercent, setServiceFeePercent] = useState("0")
  const [shippingMode, setShippingMode] = useState<
    | "MANUAL"
    | "FIXED"
    | "PERCENT_OF_VALUE"
    | "MARKUP_FIXED"
    | "MARKUP_PERCENT"
    | "BY_REGION"
  >("MANUAL")
  const [shippingFixedAmount, setShippingFixedAmount] = useState("0")
  const [shippingPercentOfValue, setShippingPercentOfValue] = useState("0")
  const [shippingMarkupFixed, setShippingMarkupFixed] = useState("0")
  const [shippingMarkupPercent, setShippingMarkupPercent] = useState("0")
  const [shippingFallbackAmount, setShippingFallbackAmount] = useState("0")
  const [shippingRegionAmounts, setShippingRegionAmounts] = useState<Record<string, string>>({})

  const [supportPhone, setSupportPhone] = useState("")
  const [supportWhatsapp, setSupportWhatsapp] = useState("")
  const [supportEmail, setSupportEmail] = useState("")
  const [supportWebsite, setSupportWebsite] = useState("")
  const [supportAddressEn, setSupportAddressEn] = useState("")
  const [supportAddressAr, setSupportAddressAr] = useState("")
  const [supportWorkingHoursEn, setSupportWorkingHoursEn] = useState("")
  const [supportWorkingHoursAr, setSupportWorkingHoursAr] = useState("")
  const [supportFacebook, setSupportFacebook] = useState("")
  const [supportInstagram, setSupportInstagram] = useState("")
  const [supportLinkedin, setSupportLinkedin] = useState("")
  const [supportX, setSupportX] = useState("")
  const [supportTiktok, setSupportTiktok] = useState("")
  const [supportErrors, setSupportErrors] = useState<Record<string, string>>({})

  const [activeTab, setActiveTab] = useState<"SETTINGS" | "SYSTEM_SETTINGS">("SETTINGS")

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
      getSystemSetting<{
        mode: string
        amount?: number
        rate?: number
        addAmount?: number
        addRate?: number
        fallbackAmount?: number
        regionAmounts?: Record<string, number>
      }>(token, SHIPPING_FEE_CONFIG_KEY),
    enabled: !!token && canManageSystem,
  })
  const regionsQuery = useQuery({
    queryKey: ["regions-catalog", "settings", token],
    queryFn: () => listRegionsCatalog(token),
    enabled: !!token && canManageSystem,
  })
  const supportInfoQuery = useQuery({
    queryKey: ["system-settings", SUPPORT_INFO_KEY, token],
    queryFn: () => getSystemSetting<SupportInfo>(token, SUPPORT_INFO_KEY),
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
          : cfg.mode === "MARKUP_FIXED"
            ? "MARKUP_FIXED"
            : cfg.mode === "MARKUP_PERCENT"
              ? "MARKUP_PERCENT"
              : cfg.mode === "BY_REGION"
                ? "BY_REGION"
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
    if (mode === "MARKUP_FIXED") {
      const a = Number(cfg.addAmount)
      setShippingMarkupFixed(Number.isFinite(a) ? String(a) : "0")
    }
    if (mode === "MARKUP_PERCENT") {
      const r = Number(cfg.addRate)
      setShippingMarkupPercent(Number.isFinite(r) ? String(r * 100) : "0")
    }
    if (mode === "BY_REGION") {
      const f = Number(cfg.fallbackAmount)
      setShippingFallbackAmount(Number.isFinite(f) && f >= 0 ? String(f) : "0")
      const m = cfg.regionAmounts ?? {}
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(m)) {
        next[k] = String(v)
      }
      setShippingRegionAmounts(next)
    }
  }, [shippingFeeConfigQuery.data?.value])
  useEffect(() => {
    const v = supportInfoQuery.data?.value
    if (!v) return
    setSupportPhone(v.phone ?? "")
    setSupportWhatsapp(v.whatsapp ?? "")
    setSupportEmail(v.email ?? "")
    setSupportWebsite(v.website ?? "")
    setSupportAddressEn(v.address?.en ?? "")
    setSupportAddressAr(v.address?.ar ?? "")
    setSupportWorkingHoursEn(v.workingHours?.en ?? "")
    setSupportWorkingHoursAr(v.workingHours?.ar ?? "")
    setSupportFacebook(v.socialLinks?.facebook ?? "")
    setSupportInstagram(v.socialLinks?.instagram ?? "")
    setSupportLinkedin(v.socialLinks?.linkedin ?? "")
    setSupportX(v.socialLinks?.x ?? "")
    setSupportTiktok(v.socialLinks?.tiktok ?? "")
  }, [supportInfoQuery.data?.value])

  useEffect(() => {
    if (!canManageSystem && activeTab === "SYSTEM_SETTINGS") {
      setActiveTab("SETTINGS")
    }
  }, [activeTab, canManageSystem])

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
      const shippingFixed = Number.parseFloat(shippingFixedAmount)
      const shippingPercentValue = Number.parseFloat(shippingPercentOfValue)
      const shippingMarkupFixedNum = Number.parseFloat(shippingMarkupFixed)
      const shippingMarkupPercentNum = Number.parseFloat(shippingMarkupPercent)
      const shippingFallbackNum = Number.parseFloat(shippingFallbackAmount)

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
            ? { mode: "FIXED", amount: Number.isFinite(shippingFixed) && shippingFixed >= 0 ? shippingFixed : 0 }
            : shippingMode === "PERCENT_OF_VALUE"
              ? {
                  mode: "PERCENT_OF_VALUE",
                  rate:
                    Number.isFinite(shippingPercentValue) && shippingPercentValue >= 0
                      ? shippingPercentValue / 100
                      : 0,
                }
              : shippingMode === "MARKUP_FIXED"
                ? {
                    mode: "MARKUP_FIXED",
                    addAmount: Number.isFinite(shippingMarkupFixedNum) ? shippingMarkupFixedNum : 0,
                  }
                : shippingMode === "MARKUP_PERCENT"
                  ? {
                      mode: "MARKUP_PERCENT",
                      addRate:
                        Number.isFinite(shippingMarkupPercentNum) ? shippingMarkupPercentNum / 100 : 0,
                    }
                  : shippingMode === "BY_REGION"
                    ? {
                        mode: "BY_REGION",
                        fallbackAmount:
                          Number.isFinite(shippingFallbackNum) && shippingFallbackNum >= 0
                            ? shippingFallbackNum
                            : 0,
                        regionAmounts: Object.fromEntries(
                          Object.entries(shippingRegionAmounts).map(([id, v]) => [
                            id,
                            Number.parseFloat(v) || 0,
                          ]),
                        ),
                      }
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

  const saveSupportInfoMutation = useMutation({
    mutationFn: async (value: SupportInfo) => {
      return putSystemSetting(token, SUPPORT_INFO_KEY, value)
    },
    onSuccess: () => {
      showToast(t("common.saved"), "success")
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", SUPPORT_INFO_KEY, token],
      })
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.status === 400 && e.details) {
        const msg = formatApiValidationDetails(e.details)
        showToast(msg || e.message || t("common.error"), "error")
        return
      }
      showToast(e.message || t("common.error"), "error")
    },
  })

  function hasPerm(key: string): boolean {
    return perms.includes(key)
  }

  function validateSupportInfoDraft(draft: SupportInfo): Record<string, string> {
    const errs: Record<string, string> = {}
    const e164ish = /^\+?[1-9]\d{7,14}$/
    const isValidPhone = (v: string | null) => v == null || e164ish.test(v)
    const isValidEmail = (v: string | null) =>
      v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    const isValidUrl = (v: string | null | undefined) => {
      if (v == null) return true
      try {
        // eslint-disable-next-line no-new
        new URL(v)
        return true
      } catch {
        return false
      }
    }

    if (!isValidPhone(draft.phone)) errs.phone = t("common.invalid")
    if (!isValidPhone(draft.whatsapp)) errs.whatsapp = t("common.invalid")
    if (!isValidEmail(draft.email)) errs.email = t("common.invalid")
    if (!isValidUrl(draft.website)) errs.website = t("common.invalid")
    if (!isValidUrl(draft.socialLinks.facebook)) errs.facebook = t("common.invalid")
    if (!isValidUrl(draft.socialLinks.instagram)) errs.instagram = t("common.invalid")
    if (!isValidUrl(draft.socialLinks.linkedin)) errs.linkedin = t("common.invalid")
    if (!isValidUrl(draft.socialLinks.x)) errs.x = t("common.invalid")
    if (!isValidUrl(draft.socialLinks.tiktok)) errs.tiktok = t("common.invalid")

    return errs
  }

  function LookupRowEditor(props: {
    row: ReferenceDataRow
    canUpdate: boolean
    canDelete: boolean
    onSave: (patch: Partial<ReferenceDataCreateBody>) => void
    onDelete: () => void
    saving: boolean
    deleting: boolean
  }) {
    const [name, setName] = useState(props.row.name)
    const [nameAr, setNameAr] = useState(props.row.nameAr)
    const [code, setCode] = useState(props.row.code)
    const [isActive, setIsActive] = useState(Boolean(props.row.isActive))

    const changed =
      name !== props.row.name ||
      nameAr !== props.row.nameAr ||
      code !== props.row.code ||
      isActive !== Boolean(props.row.isActive)

    return (
      <div className="space-y-2 rounded-md border p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!props.canUpdate} />
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} disabled={!props.canUpdate} />
          <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={!props.canUpdate} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={!props.canUpdate}
          />
          <span>{t("common.active")}</span>
        </label>
        <div className="flex gap-2">
          {props.canUpdate ? (
            <Button
              type="button"
              disabled={!changed || props.saving}
              onClick={() => {
                props.onSave({
                  name: name.trim(),
                  nameAr: nameAr.trim(),
                  code: code.trim(),
                  isActive,
                })
              }}
            >
              {props.saving ? t("common.saving") : t("common.save")}
            </Button>
          ) : null}
          {props.canDelete ? (
            <Button type="button" variant="destructive" disabled={props.deleting} onClick={props.onDelete}>
              {props.deleting ? t("common.deleting") : t("common.delete")}
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  function LookupManager(props: {
    title: string
    description: string
    queryKey: (string | number)[]
    canRead: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    listFn: (token: string) => Promise<ReferenceDataRow[]>
    createFn: (token: string, body: ReferenceDataCreateBody) => Promise<ReferenceDataRow>
    updateFn: (token: string, id: string, body: Partial<ReferenceDataCreateBody>) => Promise<ReferenceDataRow>
    deleteFn: (token: string, id: string) => Promise<void>
  }) {
    const [newName, setNewName] = useState("")
    const [newNameAr, setNewNameAr] = useState("")
    const [newCode, setNewCode] = useState("")

    const q = useQuery({
      queryKey: props.queryKey,
      queryFn: () => props.listFn(token),
      enabled: !!token && props.canRead,
    })

    const createMutation = useMutation({
      mutationFn: async () => {
        if (!newName.trim() || !newNameAr.trim()) {
          throw new Error(t("common.required"))
        }
        return props.createFn(token, {
          name: newName.trim(),
          nameAr: newNameAr.trim(),
          ...(newCode.trim() ? { code: newCode.trim() } : {}),
          isActive: true,
        })
      },
      onSuccess: () => {
        setNewName("")
        setNewNameAr("")
        setNewCode("")
        void queryClient.invalidateQueries({ queryKey: props.queryKey })
        showToast(t("common.saved"), "success")
      },
      onError: (e: Error) => showToast(e.message || t("common.error"), "error"),
    })

    const updateMutation = useMutation({
      mutationFn: async (payload: { id: string; patch: Partial<ReferenceDataCreateBody> }) => {
        return props.updateFn(token, payload.id, payload.patch)
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: props.queryKey })
        showToast(t("common.saved"), "success")
      },
      onError: (e: Error) => showToast(e.message || t("common.error"), "error"),
    })

    const deleteMutation = useMutation({
      mutationFn: async (id: string) => props.deleteFn(token, id),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: props.queryKey })
        showToast(t("common.deleted"), "success")
      },
      onError: (e: Error) => showToast(e.message || t("common.error"), "error"),
    })

    if (!props.canRead) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.isLoading ? <p className="text-muted-foreground text-sm">{t("common.loading")}</p> : null}
          {q.error ? (
            <p className="text-destructive text-sm">{(q.error as Error).message}</p>
          ) : null}

          {props.canCreate ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">{t("common.create")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
                <Input value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} placeholder="Arabic name" />
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (optional)" />
              </div>
              <Button type="button" disabled={!token || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            {(q.data ?? []).map((row) => (
              <LookupRowEditor
                key={row.id}
                row={row}
                canUpdate={props.canUpdate}
                canDelete={props.canDelete}
                onSave={(patch) => updateMutation.mutate({ id: row.id, patch })}
                onDelete={() => deleteMutation.mutate(row.id)}
                saving={updateMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Layout title={t("settings.pageTitle")}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === "SETTINGS"} onClick={() => setActiveTab("SETTINGS")}>
            Settings
          </TabButton>
          {canManageSystem ? (
            <TabButton
              active={activeTab === "SYSTEM_SETTINGS"}
              onClick={() => setActiveTab("SYSTEM_SETTINGS")}
            >
              System Settings
            </TabButton>
          ) : null}
        </div>

        {activeTab === "SETTINGS" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

            {canReadAnyReferenceData ? (
              <>
                <LookupManager
                  title="Reference data — Banks"
                  description="Manage the banks reference data."
                  queryKey={["reference-data", "banks", token]}
                  canRead={hasPerm("reference_data.banks.read")}
                  canCreate={hasPerm("reference_data.banks.create")}
                  canUpdate={hasPerm("reference_data.banks.update")}
                  canDelete={hasPerm("reference_data.banks.delete")}
                  listFn={listBanksReferenceData}
                  createFn={createBankReferenceData}
                  updateFn={updateBankReferenceData}
                  deleteFn={deleteBankReferenceData}
                />
                <LookupManager
                  title="Reference data — Product types"
                  description="Manage the product types reference data."
                  queryKey={["reference-data", "product-types", token]}
                  canRead={hasPerm("reference_data.product_types.read")}
                  canCreate={hasPerm("reference_data.product_types.create")}
                  canUpdate={hasPerm("reference_data.product_types.update")}
                  canDelete={hasPerm("reference_data.product_types.delete")}
                  listFn={listProductTypesReferenceData}
                  createFn={createProductTypeReferenceData}
                  updateFn={updateProductTypeReferenceData}
                  deleteFn={deleteProductTypeReferenceData}
                />
                <LookupManager
                  title="Reference data — Sales channels"
                  description="Manage the sales channels reference data."
                  queryKey={["reference-data", "sales-channels", token]}
                  canRead={hasPerm("reference_data.sales_channels.read")}
                  canCreate={hasPerm("reference_data.sales_channels.create")}
                  canUpdate={hasPerm("reference_data.sales_channels.update")}
                  canDelete={hasPerm("reference_data.sales_channels.delete")}
                  listFn={listSalesChannelsReferenceData}
                  createFn={createSalesChannelReferenceData}
                  updateFn={updateSalesChannelReferenceData}
                  deleteFn={deleteSalesChannelReferenceData}
                />
                <LookupManager
                  title="Reference data — Business sectors"
                  description="Manage the business sectors reference data."
                  queryKey={["reference-data", "business-sectors", token]}
                  canRead={hasPerm("reference_data.business_sectors.read")}
                  canCreate={hasPerm("reference_data.business_sectors.create")}
                  canUpdate={hasPerm("reference_data.business_sectors.update")}
                  canDelete={hasPerm("reference_data.business_sectors.delete")}
                  listFn={listBusinessSectorsReferenceData}
                  createFn={createBusinessSectorReferenceData}
                  updateFn={updateBusinessSectorReferenceData}
                  deleteFn={deleteBusinessSectorReferenceData}
                />
                <LookupManager
                  title="Reference data — Governorates"
                  description="Manage the governorates reference data."
                  queryKey={["reference-data", "governorates", token]}
                  canRead={hasPerm("reference_data.governorates.read")}
                  canCreate={hasPerm("reference_data.governorates.create")}
                  canUpdate={hasPerm("reference_data.governorates.update")}
                  canDelete={hasPerm("reference_data.governorates.delete")}
                  listFn={listGovernoratesReferenceData}
                  createFn={createGovernorateReferenceData}
                  updateFn={updateGovernorateReferenceData}
                  deleteFn={deleteGovernorateReferenceData}
                />
              </>
            ) : null}
          </div>
        ) : null}

        {activeTab === "SYSTEM_SETTINGS" && canManageSystem ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                            : e.target.value === "MARKUP_FIXED"
                              ? "MARKUP_FIXED"
                              : e.target.value === "MARKUP_PERCENT"
                                ? "MARKUP_PERCENT"
                                : e.target.value === "BY_REGION"
                                  ? "BY_REGION"
                            : "MANUAL",
                      )
                    }
                  >
                    <option value="MANUAL">{t("settings.financial.shippingFeeModeManual")}</option>
                    <option value="FIXED">{t("settings.financial.shippingFeeModeFixed")}</option>
                    <option value="PERCENT_OF_VALUE">{t("settings.financial.shippingFeeModePercentOfValue")}</option>
                    <option value="MARKUP_FIXED">{t("settings.financial.shippingFeeModeMarkupFixed")}</option>
                    <option value="MARKUP_PERCENT">{t("settings.financial.shippingFeeModeMarkupPercent")}</option>
                    <option value="BY_REGION">{t("settings.financial.shippingFeeModeByRegion")}</option>
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
                {shippingMode === "MARKUP_FIXED" ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="shipping-markup-fixed">
                      {t("settings.financial.shippingFeeMarkupFixedAmount")}
                    </label>
                    <Input
                      id="shipping-markup-fixed"
                      type="number"
                      step="0.01"
                      className="max-w-xs"
                      value={shippingMarkupFixed}
                      onChange={(e) => setShippingMarkupFixed(e.target.value)}
                    />
                  </div>
                ) : null}
                {shippingMode === "MARKUP_PERCENT" ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="shipping-markup-percent">
                      {t("settings.financial.shippingFeeMarkupPercent")}
                    </label>
                    <Input
                      id="shipping-markup-percent"
                      type="number"
                      min={-100}
                      max={1000}
                      step="0.1"
                      className="max-w-xs"
                      value={shippingMarkupPercent}
                      onChange={(e) => setShippingMarkupPercent(e.target.value)}
                    />
                  </div>
                ) : null}
                {shippingMode === "BY_REGION" ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="shipping-fallback">
                        {t("settings.financial.shippingFeeFallbackAmount")}
                      </label>
                      <Input
                        id="shipping-fallback"
                        type="number"
                        min={0}
                        step="0.01"
                        className="max-w-xs"
                        value={shippingFallbackAmount}
                        onChange={(e) => setShippingFallbackAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">{t("settings.financial.shippingFeeRegionTable")}</p>
                      <p className="text-muted-foreground text-xs">
                        {t("settings.financial.shippingFeeRegionTableHelp")}
                      </p>
                      <div className="grid gap-2">
                        {(regionsQuery.data?.regions ?? []).map((r) => (
                          <div key={r.id} className="flex items-center gap-2">
                            <span className="text-sm w-40 truncate">{r.name}</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="max-w-xs"
                              value={shippingRegionAmounts[r.id] ?? ""}
                              onChange={(e) =>
                                setShippingRegionAmounts((prev) => ({
                                  ...prev,
                                  [r.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
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

            <Card>
              <CardHeader>
                <CardTitle>Support Information</CardTitle>
                <CardDescription>Manage customer-facing support contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {supportInfoQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
                ) : null}
                {supportInfoQuery.error ? (
                  <p className="text-destructive text-sm">{(supportInfoQuery.error as Error).message}</p>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Contact</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Input
                        value={supportPhone}
                        onChange={(e) => {
                          setSupportPhone(e.target.value)
                          setSupportErrors((p) => ({ ...p, phone: "" }))
                        }}
                        placeholder="Phone (+2010...)"
                      />
                      {supportErrors.phone ? <p className="text-destructive text-xs">{supportErrors.phone}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportWhatsapp}
                        onChange={(e) => {
                          setSupportWhatsapp(e.target.value)
                          setSupportErrors((p) => ({ ...p, whatsapp: "" }))
                        }}
                        placeholder="WhatsApp (+2010...)"
                      />
                      {supportErrors.whatsapp ? (
                        <p className="text-destructive text-xs">{supportErrors.whatsapp}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportEmail}
                        onChange={(e) => {
                          setSupportEmail(e.target.value)
                          setSupportErrors((p) => ({ ...p, email: "" }))
                        }}
                        placeholder="Email (support@...)"
                      />
                      {supportErrors.email ? <p className="text-destructive text-xs">{supportErrors.email}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportWebsite}
                        onChange={(e) => {
                          setSupportWebsite(e.target.value)
                          setSupportErrors((p) => ({ ...p, website: "" }))
                        }}
                        placeholder="Website (https://...)"
                      />
                      {supportErrors.website ? (
                        <p className="text-destructive text-xs">{supportErrors.website}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Address</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={supportAddressEn}
                      onChange={(e) => setSupportAddressEn(e.target.value)}
                      placeholder="Address (EN)"
                    />
                    <Input
                      value={supportAddressAr}
                      onChange={(e) => setSupportAddressAr(e.target.value)}
                      placeholder="Address (AR)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Working hours</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={supportWorkingHoursEn}
                      onChange={(e) => setSupportWorkingHoursEn(e.target.value)}
                      placeholder="Working hours (EN)"
                    />
                    <Input
                      value={supportWorkingHoursAr}
                      onChange={(e) => setSupportWorkingHoursAr(e.target.value)}
                      placeholder="Working hours (AR)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Social links</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Input
                        value={supportFacebook}
                        onChange={(e) => {
                          setSupportFacebook(e.target.value)
                          setSupportErrors((p) => ({ ...p, facebook: "" }))
                        }}
                        placeholder="Facebook URL"
                      />
                      {supportErrors.facebook ? (
                        <p className="text-destructive text-xs">{supportErrors.facebook}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportInstagram}
                        onChange={(e) => {
                          setSupportInstagram(e.target.value)
                          setSupportErrors((p) => ({ ...p, instagram: "" }))
                        }}
                        placeholder="Instagram URL"
                      />
                      {supportErrors.instagram ? (
                        <p className="text-destructive text-xs">{supportErrors.instagram}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportLinkedin}
                        onChange={(e) => {
                          setSupportLinkedin(e.target.value)
                          setSupportErrors((p) => ({ ...p, linkedin: "" }))
                        }}
                        placeholder="LinkedIn URL"
                      />
                      {supportErrors.linkedin ? (
                        <p className="text-destructive text-xs">{supportErrors.linkedin}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportX}
                        onChange={(e) => {
                          setSupportX(e.target.value)
                          setSupportErrors((p) => ({ ...p, x: "" }))
                        }}
                        placeholder="X (Twitter) URL"
                      />
                      {supportErrors.x ? <p className="text-destructive text-xs">{supportErrors.x}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={supportTiktok}
                        onChange={(e) => {
                          setSupportTiktok(e.target.value)
                          setSupportErrors((p) => ({ ...p, tiktok: "" }))
                        }}
                        placeholder="TikTok URL"
                      />
                      {supportErrors.tiktok ? (
                        <p className="text-destructive text-xs">{supportErrors.tiktok}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!token || saveSupportInfoMutation.isPending}
                  onClick={() => {
                    const toNull = (s: string) => {
                      const t = s.trim()
                      return t ? t : null
                    }
                    const toOpt = (s: string) => {
                      const t = s.trim()
                      return t ? t : undefined
                    }
                    const draft: SupportInfo = {
                      phone: toNull(supportPhone),
                      whatsapp: toNull(supportWhatsapp),
                      email: toNull(supportEmail),
                      website: toNull(supportWebsite),
                      address: { en: supportAddressEn, ar: supportAddressAr },
                      workingHours: { en: supportWorkingHoursEn, ar: supportWorkingHoursAr },
                      socialLinks: {
                        facebook: toOpt(supportFacebook),
                        instagram: toOpt(supportInstagram),
                        linkedin: toOpt(supportLinkedin),
                        x: toOpt(supportX),
                        tiktok: toOpt(supportTiktok),
                      },
                    }
                    const errs = validateSupportInfoDraft(draft)
                    setSupportErrors(errs)
                    if (Object.values(errs).some(Boolean)) {
                      showToast(t("common.invalid"), "error")
                      return
                    }
                    saveSupportInfoMutation.mutate(draft)
                  }}
                >
                  {saveSupportInfoMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
