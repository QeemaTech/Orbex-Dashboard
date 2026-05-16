import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  ABOUT_APP_KEY,
  CUSTOMER_SERVICE_FEE_RATE_KEY,
  DEFAULT_COMMISSION_FEE_KEY,
  getSystemSetting,
  type AboutApp,
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
import { KeyValueRowsEditor } from "@/components/settings/KeyValueRowsEditor"
import { LocalizedFieldPair } from "@/components/settings/LocalizedFieldPair"
import { LocalizedExtraFieldsEditor } from "@/components/settings/LocalizedExtraFieldsEditor"
import { SettingsFormSection } from "@/components/settings/SettingsFormSection"
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
import {
  findDuplicateKeys,
  isValidFieldKey,
  keyValueRowsToRecord,
  recordToKeyValueRows,
  type KeyValueRow,
} from "@/lib/key-value-rows"
import {
  extraFieldsToRows,
  findDuplicateLocalizedLabels,
  rowsToExtraFields,
  type LocalizedExtraFieldRow,
} from "@/lib/localized-extra-fields"
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
  const [supportSocialRows, setSupportSocialRows] = useState<KeyValueRow[]>([])
  const [supportExtraRows, setSupportExtraRows] = useState<LocalizedExtraFieldRow[]>([])
  const [supportSocialRowErrors, setSupportSocialRowErrors] = useState<
    Record<string, { key?: string; value?: string }>
  >({})
  const [supportExtraRowErrors, setSupportExtraRowErrors] = useState<
    Record<string, { keyEn?: string; keyAr?: string; valueEn?: string; valueAr?: string }>
  >({})
  const [supportErrors, setSupportErrors] = useState<Record<string, string>>({})

  const [aboutAppNameEn, setAboutAppNameEn] = useState("")
  const [aboutAppNameAr, setAboutAppNameAr] = useState("")
  const [aboutTaglineEn, setAboutTaglineEn] = useState("")
  const [aboutTaglineAr, setAboutTaglineAr] = useState("")
  const [aboutDescriptionEn, setAboutDescriptionEn] = useState("")
  const [aboutDescriptionAr, setAboutDescriptionAr] = useState("")
  const [aboutVersion, setAboutVersion] = useState("")
  const [aboutTermsUrl, setAboutTermsUrl] = useState("")
  const [aboutPrivacyUrl, setAboutPrivacyUrl] = useState("")
  const [aboutCopyrightEn, setAboutCopyrightEn] = useState("")
  const [aboutCopyrightAr, setAboutCopyrightAr] = useState("")
  const [aboutExtraRows, setAboutExtraRows] = useState<LocalizedExtraFieldRow[]>([])
  const [aboutExtraRowErrors, setAboutExtraRowErrors] = useState<
    Record<string, { keyEn?: string; keyAr?: string; valueEn?: string; valueAr?: string }>
  >({})
  const [aboutErrors, setAboutErrors] = useState<Record<string, string>>({})

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
  const aboutAppQuery = useQuery({
    queryKey: ["system-settings", ABOUT_APP_KEY, token],
    queryFn: () => getSystemSetting<AboutApp>(token, ABOUT_APP_KEY),
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
    setSupportSocialRows(recordToKeyValueRows(v.socialLinks ?? {}))
    setSupportExtraRows(extraFieldsToRows(v.extraFields))
    setSupportSocialRowErrors({})
    setSupportExtraRowErrors({})
  }, [supportInfoQuery.data?.value])
  useEffect(() => {
    const v = aboutAppQuery.data?.value
    if (!v) return
    setAboutAppNameEn(v.appName?.en ?? "")
    setAboutAppNameAr(v.appName?.ar ?? "")
    setAboutTaglineEn(v.tagline?.en ?? "")
    setAboutTaglineAr(v.tagline?.ar ?? "")
    setAboutDescriptionEn(v.description?.en ?? "")
    setAboutDescriptionAr(v.description?.ar ?? "")
    setAboutVersion(v.version ?? "")
    setAboutTermsUrl(v.termsUrl ?? "")
    setAboutPrivacyUrl(v.privacyUrl ?? "")
    setAboutCopyrightEn(v.copyright?.en ?? "")
    setAboutCopyrightAr(v.copyright?.ar ?? "")
    setAboutExtraRows(extraFieldsToRows(v.extraFields))
    setAboutExtraRowErrors({})
  }, [aboutAppQuery.data?.value])

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
      showToast(t("settings.support.saved"), "success")
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

  const saveAboutAppMutation = useMutation({
    mutationFn: async (value: AboutApp) => putSystemSetting(token, ABOUT_APP_KEY, value),
    onSuccess: () => {
      showToast(t("settings.aboutApp.saved"), "success")
      void queryClient.invalidateQueries({
        queryKey: ["system-settings", ABOUT_APP_KEY, token],
      })
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.status === 400 && e.details) {
        const msg = formatApiValidationDetails(e.details)
        showToast(msg || e.message || t("common.error"), "error")
        return
      }
      showToast(e.message || t("settings.aboutApp.saveFailed"), "error")
    },
  })

  function hasPerm(key: string): boolean {
    return perms.includes(key)
  }

  function validateKeyValueRows(
    rows: KeyValueRow[],
    opts: {
      reservedKeys?: Set<string>
      requireUrlValues?: boolean
    },
  ): { rowErrors: Record<string, { key?: string; value?: string }>; valid: boolean } {
    const rowErrors: Record<string, { key?: string; value?: string }> = {}
    const seen = new Set<string>()

    const isValidUrl = (v: string) => {
      try {
        new URL(v)
        return true
      } catch {
        return false
      }
    }

    for (const row of rows) {
      const key = row.key.trim()
      const value = row.value.trim()
      if (!key && !value) continue

      const issues: { key?: string; value?: string } = {}
      if (!key) {
        issues.key = t("settings.keyValue.keyRequired")
      } else {
        if (!isValidFieldKey(key)) issues.key = t("settings.keyValue.invalidKey")
        if (opts.reservedKeys?.has(key)) issues.key = t("settings.keyValue.reservedKey")
        const norm = key.toLowerCase()
        if (seen.has(norm)) issues.key = t("settings.keyValue.duplicateKey")
        seen.add(norm)
      }
      if (opts.requireUrlValues && value && !isValidUrl(value)) {
        issues.value = t("common.invalid")
      }
      if (opts.requireUrlValues && key && !value) {
        issues.value = t("settings.keyValue.valueRequired")
      }
      if (issues.key || issues.value) rowErrors[row.id] = issues
    }

    const dupes = findDuplicateKeys(rows)
    if (dupes.length > 0) {
      for (const row of rows) {
        if (dupes.includes(row.key.trim())) {
          rowErrors[row.id] = {
            ...rowErrors[row.id],
            key: t("settings.keyValue.duplicateKey"),
          }
        }
      }
    }

    return { rowErrors, valid: Object.keys(rowErrors).length === 0 }
  }

  function validateLocalizedExtraFieldRows(
    rows: LocalizedExtraFieldRow[],
  ): {
    rowErrors: Record<string, { keyEn?: string; keyAr?: string; valueEn?: string; valueAr?: string }>
    valid: boolean
  } {
    const rowErrors: Record<
      string,
      { keyEn?: string; keyAr?: string; valueEn?: string; valueAr?: string }
    > = {}

    for (const row of rows) {
      const keyEn = row.key.en.trim()
      const keyAr = row.key.ar.trim()
      const valueEn = row.value.en.trim()
      const valueAr = row.value.ar.trim()
      if (!keyEn && !keyAr && !valueEn && !valueAr) continue

      const issues: { keyEn?: string; keyAr?: string; valueEn?: string; valueAr?: string } = {}
      if (!keyEn && !keyAr) {
        const msg = t("settings.keyValue.localizedLabelRequired")
        issues.keyEn = msg
        issues.keyAr = msg
      }
      if (!valueEn && !valueAr) {
        const msg = t("settings.keyValue.localizedValueRequired")
        issues.valueEn = msg
        issues.valueAr = msg
      }
      if (issues.keyEn || issues.keyAr || issues.valueEn || issues.valueAr) {
        rowErrors[row.id] = issues
      }
    }

    const dupes = new Set(findDuplicateLocalizedLabels(rows))
    for (const row of rows) {
      if (dupes.has(row.id)) {
        const msg = t("settings.keyValue.duplicateLabel")
        rowErrors[row.id] = {
          ...rowErrors[row.id],
          keyEn: rowErrors[row.id]?.keyEn ?? msg,
          keyAr: rowErrors[row.id]?.keyAr ?? msg,
        }
      }
    }

    return { rowErrors, valid: Object.keys(rowErrors).length === 0 }
  }

  function validateAboutAppDraft(draft: AboutApp): Record<string, string> {
    const errs: Record<string, string> = {}
    const isValidUrl = (v: string | null) => {
      if (v == null) return true
      try {
        new URL(v)
        return true
      } catch {
        return false
      }
    }
    if (!isValidUrl(draft.termsUrl)) errs.termsUrl = t("common.invalid")
    if (!isValidUrl(draft.privacyUrl)) errs.privacyUrl = t("common.invalid")
    return errs
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
                <CardTitle>{t("settings.support.title")}</CardTitle>
                <CardDescription>{t("settings.support.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {supportInfoQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
                ) : null}
                {supportInfoQuery.error ? (
                  <p className="text-destructive text-sm">{(supportInfoQuery.error as Error).message}</p>
                ) : null}

                <SettingsFormSection
                  title={t("settings.support.contactTitle")}
                  description={t("settings.support.contactDescription")}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" htmlFor="support-phone">
                        {t("settings.support.phone")}
                      </label>
                      <Input
                        id="support-phone"
                        value={supportPhone}
                        onChange={(e) => {
                          setSupportPhone(e.target.value)
                          setSupportErrors((p) => ({ ...p, phone: "" }))
                        }}
                        placeholder={t("settings.support.phonePlaceholder")}
                      />
                      {supportErrors.phone ? (
                        <p className="text-destructive text-xs">{supportErrors.phone}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" htmlFor="support-whatsapp">
                        {t("settings.support.whatsapp")}
                      </label>
                      <Input
                        id="support-whatsapp"
                        value={supportWhatsapp}
                        onChange={(e) => {
                          setSupportWhatsapp(e.target.value)
                          setSupportErrors((p) => ({ ...p, whatsapp: "" }))
                        }}
                        placeholder={t("settings.support.whatsappPlaceholder")}
                      />
                      {supportErrors.whatsapp ? (
                        <p className="text-destructive text-xs">{supportErrors.whatsapp}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" htmlFor="support-email">
                        {t("settings.support.email")}
                      </label>
                      <Input
                        id="support-email"
                        type="email"
                        value={supportEmail}
                        onChange={(e) => {
                          setSupportEmail(e.target.value)
                          setSupportErrors((p) => ({ ...p, email: "" }))
                        }}
                        placeholder={t("settings.support.emailPlaceholder")}
                      />
                      {supportErrors.email ? (
                        <p className="text-destructive text-xs">{supportErrors.email}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" htmlFor="support-website">
                        {t("settings.support.website")}
                      </label>
                      <Input
                        id="support-website"
                        value={supportWebsite}
                        onChange={(e) => {
                          setSupportWebsite(e.target.value)
                          setSupportErrors((p) => ({ ...p, website: "" }))
                        }}
                        placeholder={t("settings.support.websitePlaceholder")}
                      />
                      {supportErrors.website ? (
                        <p className="text-destructive text-xs">{supportErrors.website}</p>
                      ) : null}
                    </div>
                  </div>
                </SettingsFormSection>

                <SettingsFormSection
                  title={t("settings.support.addressTitle")}
                  description={t("settings.support.addressDescription")}
                >
                  <LocalizedFieldPair
                    enLabel={t("settings.support.addressEn")}
                    arLabel={t("settings.support.addressAr")}
                    enValue={supportAddressEn}
                    arValue={supportAddressAr}
                    onEnChange={setSupportAddressEn}
                    onArChange={setSupportAddressAr}
                    enPlaceholder={t("settings.support.addressEnPlaceholder")}
                    arPlaceholder={t("settings.support.addressArPlaceholder")}
                  />
                </SettingsFormSection>

                <SettingsFormSection
                  title={t("settings.support.hoursTitle")}
                  description={t("settings.support.hoursDescription")}
                >
                  <LocalizedFieldPair
                    enLabel={t("settings.support.hoursEn")}
                    arLabel={t("settings.support.hoursAr")}
                    enValue={supportWorkingHoursEn}
                    arValue={supportWorkingHoursAr}
                    onEnChange={setSupportWorkingHoursEn}
                    onArChange={setSupportWorkingHoursAr}
                    enPlaceholder={t("settings.support.hoursEnPlaceholder")}
                    arPlaceholder={t("settings.support.hoursArPlaceholder")}
                  />
                </SettingsFormSection>

                <SettingsFormSection
                  title={t("settings.support.socialTitle")}
                  description={t("settings.support.socialDescription")}
                >
                  <KeyValueRowsEditor
                    rows={supportSocialRows}
                    onChange={(rows) => {
                      setSupportSocialRows(rows)
                      setSupportSocialRowErrors({})
                    }}
                    keyLabel={t("settings.support.socialPlatform")}
                    valueLabel={t("settings.support.socialUrl")}
                    keyPlaceholder={t("settings.support.socialPlatformPlaceholder")}
                    valuePlaceholder={t("settings.support.socialUrlPlaceholder")}
                    addLabel={t("settings.support.addSocialLink")}
                    exampleTitle={t("settings.support.socialExampleTitle")}
                    exampleKey={t("settings.support.socialExampleKey")}
                    exampleValue={t("settings.support.socialExampleValue")}
                    rowErrors={supportSocialRowErrors}
                    disabled={saveSupportInfoMutation.isPending}
                  />
                </SettingsFormSection>

                <SettingsFormSection
                  title={t("settings.support.extraTitle")}
                  description={t("settings.support.extraDescription")}
                >
                  <LocalizedExtraFieldsEditor
                    rows={supportExtraRows}
                    onChange={(rows) => {
                      setSupportExtraRows(rows)
                      setSupportExtraRowErrors({})
                    }}
                    keyEnLabel={t("settings.support.extraLabelEn")}
                    keyArLabel={t("settings.support.extraLabelAr")}
                    valueEnLabel={t("settings.support.extraValueEn")}
                    valueArLabel={t("settings.support.extraValueAr")}
                    keyEnPlaceholder={t("settings.support.extraLabelEnPlaceholder")}
                    keyArPlaceholder={t("settings.support.extraLabelArPlaceholder")}
                    valueEnPlaceholder={t("settings.support.extraValueEnPlaceholder")}
                    valueArPlaceholder={t("settings.support.extraValueArPlaceholder")}
                    addLabel={t("settings.support.addExtraField")}
                    exampleTitle={t("settings.support.extraExampleTitle")}
                    exampleKeyEn={t("settings.support.extraExampleKeyEn")}
                    exampleKeyAr={t("settings.support.extraExampleKeyAr")}
                    exampleValueEn={t("settings.support.extraExampleValueEn")}
                    exampleValueAr={t("settings.support.extraExampleValueAr")}
                    rowErrors={supportExtraRowErrors}
                    disabled={saveSupportInfoMutation.isPending}
                  />
                </SettingsFormSection>

                <Button
                  type="button"
                  disabled={!token || saveSupportInfoMutation.isPending}
                  onClick={() => {
                    const toNull = (s: string) => {
                      const trimmed = s.trim()
                      return trimmed ? trimmed : null
                    }
                    const socialValidation = validateKeyValueRows(supportSocialRows, {
                      requireUrlValues: true,
                    })
                    const extraValidation = validateLocalizedExtraFieldRows(supportExtraRows)
                    setSupportSocialRowErrors(socialValidation.rowErrors)
                    setSupportExtraRowErrors(extraValidation.rowErrors)
                    if (!socialValidation.valid || !extraValidation.valid) {
                      showToast(t("common.invalid"), "error")
                      return
                    }
                    const draft: SupportInfo = {
                      phone: toNull(supportPhone),
                      whatsapp: toNull(supportWhatsapp),
                      email: toNull(supportEmail),
                      website: toNull(supportWebsite),
                      address: { en: supportAddressEn, ar: supportAddressAr },
                      workingHours: { en: supportWorkingHoursEn, ar: supportWorkingHoursAr },
                      socialLinks: keyValueRowsToRecord(supportSocialRows),
                      extraFields: rowsToExtraFields(supportExtraRows),
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

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.aboutApp.title")}</CardTitle>
                <CardDescription>{t("settings.aboutApp.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aboutAppQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
                ) : null}
                {aboutAppQuery.error ? (
                  <p className="text-destructive text-sm">{(aboutAppQuery.error as Error).message}</p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.appNameEn")}</label>
                    <Input value={aboutAppNameEn} onChange={(e) => setAboutAppNameEn(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.appNameAr")}</label>
                    <Input value={aboutAppNameAr} onChange={(e) => setAboutAppNameAr(e.target.value)} dir="rtl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.taglineEn")}</label>
                    <Input value={aboutTaglineEn} onChange={(e) => setAboutTaglineEn(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.taglineAr")}</label>
                    <Input value={aboutTaglineAr} onChange={(e) => setAboutTaglineAr(e.target.value)} dir="rtl" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium">{t("settings.aboutApp.descriptionEn")}</label>
                    <Input value={aboutDescriptionEn} onChange={(e) => setAboutDescriptionEn(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium">{t("settings.aboutApp.descriptionAr")}</label>
                    <Input value={aboutDescriptionAr} onChange={(e) => setAboutDescriptionAr(e.target.value)} dir="rtl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.version")}</label>
                    <Input
                      value={aboutVersion}
                      onChange={(e) => setAboutVersion(e.target.value)}
                      placeholder="1.0.0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.termsUrl")}</label>
                    <Input
                      value={aboutTermsUrl}
                      onChange={(e) => {
                        setAboutTermsUrl(e.target.value)
                        setAboutErrors((p) => ({ ...p, termsUrl: "" }))
                      }}
                      placeholder="https://example.com/terms"
                    />
                    {aboutErrors.termsUrl ? (
                      <p className="text-destructive text-xs">{aboutErrors.termsUrl}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium">{t("settings.aboutApp.privacyUrl")}</label>
                    <Input
                      value={aboutPrivacyUrl}
                      onChange={(e) => {
                        setAboutPrivacyUrl(e.target.value)
                        setAboutErrors((p) => ({ ...p, privacyUrl: "" }))
                      }}
                      placeholder="https://example.com/privacy"
                    />
                    {aboutErrors.privacyUrl ? (
                      <p className="text-destructive text-xs">{aboutErrors.privacyUrl}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.copyrightEn")}</label>
                    <Input value={aboutCopyrightEn} onChange={(e) => setAboutCopyrightEn(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("settings.aboutApp.copyrightAr")}</label>
                    <Input value={aboutCopyrightAr} onChange={(e) => setAboutCopyrightAr(e.target.value)} dir="rtl" />
                  </div>
                </div>

                <SettingsFormSection
                  title={t("settings.aboutApp.extraTitle")}
                  description={t("settings.aboutApp.extraDescription")}
                >
                  <LocalizedExtraFieldsEditor
                    rows={aboutExtraRows}
                    onChange={(rows) => {
                      setAboutExtraRows(rows)
                      setAboutExtraRowErrors({})
                    }}
                    keyEnLabel={t("settings.aboutApp.extraLabelEn")}
                    keyArLabel={t("settings.aboutApp.extraLabelAr")}
                    valueEnLabel={t("settings.aboutApp.extraValueEn")}
                    valueArLabel={t("settings.aboutApp.extraValueAr")}
                    keyEnPlaceholder={t("settings.aboutApp.extraLabelEnPlaceholder")}
                    keyArPlaceholder={t("settings.aboutApp.extraLabelArPlaceholder")}
                    valueEnPlaceholder={t("settings.aboutApp.extraValueEnPlaceholder")}
                    valueArPlaceholder={t("settings.aboutApp.extraValueArPlaceholder")}
                    addLabel={t("settings.aboutApp.addExtraField")}
                    exampleTitle={t("settings.aboutApp.extraExampleTitle")}
                    exampleKeyEn={t("settings.aboutApp.extraExampleKeyEn")}
                    exampleKeyAr={t("settings.aboutApp.extraExampleKeyAr")}
                    exampleValueEn={t("settings.aboutApp.extraExampleValueEn")}
                    exampleValueAr={t("settings.aboutApp.extraExampleValueAr")}
                    rowErrors={aboutExtraRowErrors}
                    disabled={saveAboutAppMutation.isPending}
                  />
                </SettingsFormSection>

                <Button
                  type="button"
                  disabled={!token || saveAboutAppMutation.isPending}
                  onClick={() => {
                    const toNull = (s: string) => {
                      const trimmed = s.trim()
                      return trimmed ? trimmed : null
                    }
                    const extraValidation = validateLocalizedExtraFieldRows(aboutExtraRows)
                    setAboutExtraRowErrors(extraValidation.rowErrors)
                    if (!extraValidation.valid) {
                      showToast(t("common.invalid"), "error")
                      return
                    }
                    const draft: AboutApp = {
                      appName: { en: aboutAppNameEn.trim(), ar: aboutAppNameAr.trim() },
                      tagline: { en: aboutTaglineEn.trim(), ar: aboutTaglineAr.trim() },
                      description: { en: aboutDescriptionEn.trim(), ar: aboutDescriptionAr.trim() },
                      version: toNull(aboutVersion),
                      termsUrl: toNull(aboutTermsUrl),
                      privacyUrl: toNull(aboutPrivacyUrl),
                      copyright: { en: aboutCopyrightEn.trim(), ar: aboutCopyrightAr.trim() },
                      extraFields: rowsToExtraFields(aboutExtraRows),
                    }
                    const errs = validateAboutAppDraft(draft)
                    setAboutErrors(errs)
                    if (Object.values(errs).some(Boolean)) {
                      showToast(t("common.invalid"), "error")
                      return
                    }
                    saveAboutAppMutation.mutate(draft)
                  }}
                >
                  {saveAboutAppMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
