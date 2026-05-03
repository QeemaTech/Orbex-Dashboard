import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Sparkles } from "react-lucid"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import {
  approveMerchant,
  getMerchantPricing,
  listMerchants,
  putMerchantPricing,
  type MerchantAccountStatus,
  type MerchantZonePricing,
  type MerchantRow,
} from "@/api/merchants-api"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { listDeliveryZones } from "@/api/delivery-zones-api"
import { showToast } from "@/lib/toast"
import { useAuth } from "@/lib/auth-context"

function merchantStatusBadgeClass(status: MerchantAccountStatus): string {
  if (status === "ACTIVATED") {
    return "border-success/40 bg-success/12 text-success dark:border-success/45 dark:bg-success/18 dark:text-green-100"
  }
  return "border-warning/45 bg-warning/14 text-warning dark:border-warning/50 dark:bg-warning/18 dark:text-orange-100"
}

export function MerchantsPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20
  const accountStatus = (searchParams.get("accountStatus") ?? "") as
    | MerchantAccountStatus
    | ""

  const merchantPricingId = searchParams.get("pricingMerchantId") ?? ""

  const listQueryKey = useMemo(
    () => ["merchants", token, page, pageSize, accountStatus] as const,
    [token, page, pageSize, accountStatus],
  )

  const merchantsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => listMerchants({ token, page, pageSize, accountStatus }),
    enabled: !!token,
  })

  const approveMutation = useMutation({
    mutationFn: (merchantId: string) => approveMerchant({ token, merchantId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["merchants", token] })
    },
  })

  const zonesQuery = useQuery({
    queryKey: ["delivery-zones", token] as const,
    queryFn: () => listDeliveryZones(token, { isActive: true }),
    enabled: !!token,
  })

  const merchantPricingQuery = useQuery({
    queryKey: ["merchant-pricing", token, merchantPricingId] as const,
    queryFn: () => getMerchantPricing({ token, merchantId: merchantPricingId }),
    enabled: !!token && !!merchantPricingId,
  })

  const savePricingMutation = useMutation({
    mutationFn: (body: {
      merchantId: string
      packagingDeliveryFee?: number
      prices?: Array<{ deliveryZoneId: string; shippingFee: number }>
    }) =>
      putMerchantPricing({
        token,
        merchantId: body.merchantId,
        packagingDeliveryFee: body.packagingDeliveryFee,
        prices: body.prices,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["merchant-pricing", token] })
      showToast(t("merchants.pricing.saved"), "success")
    },
  })

  const setPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(nextPage))
    setSearchParams(params)
  }

  const setStatus = (value: MerchantAccountStatus | "") => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set("accountStatus", value)
    else params.delete("accountStatus")
    params.set("page", "1")
    setSearchParams(params)
  }

  const openPricing = (merchantId: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("pricingMerchantId", merchantId)
    setSearchParams(params)
  }

  const closePricing = () => {
    const params = new URLSearchParams(searchParams)
    params.delete("pricingMerchantId")
    setSearchParams(params)
  }

  const totalPages = Math.max(1, Math.ceil((merchantsQuery.data?.total ?? 0) / pageSize))

  const zoneRows = zonesQuery.data?.zones ?? []
  const pricing: MerchantZonePricing | null = merchantPricingQuery.data ?? null
  const priceByZone = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pricing?.prices ?? []) m.set(p.deliveryZoneId, p.shippingFee)
    return m
  }, [pricing])

  return (
    <Layout title={t("merchants.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("merchants.pageTitle")}</CardTitle>
              <CardDescription>{t("merchants.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("merchants.tableCardTitle")}
            </CardTitle>
            <CardDescription>{t("merchants.tableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {merchantPricingId ? (
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="border-border/60 border-b pb-4">
                  <CardTitle className="text-base font-semibold">
                    {t("merchants.pricing.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("merchants.pricing.subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {merchantPricingQuery.error ? (
                    <p className="text-destructive text-sm">
                      {(merchantPricingQuery.error as Error).message}
                    </p>
                  ) : null}
                  {merchantPricingQuery.isLoading ? (
                    <p className="text-muted-foreground text-sm">
                      {t("merchants.pricing.loading")}
                    </p>
                  ) : null}

                  {pricing ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            {t("merchants.pricing.packagingDeliveryFee")}
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={pricing.packagingDeliveryFee}
                            onBlur={(e) => {
                              const v = Number(e.target.value)
                              if (!Number.isFinite(v) || v < 0) return
                              savePricingMutation.mutate({
                                merchantId: merchantPricingId,
                                packagingDeliveryFee: v,
                              })
                            }}
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button type="button" variant="outline" onClick={closePricing}>
                            {t("merchants.pricing.close")}
                          </Button>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("merchants.pricing.zonesColumn")}</TableHead>
                            <TableHead>
                              {t("merchants.pricing.shippingFee")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {zoneRows.map((z) => (
                            <TableRow key={z.id}>
                              <TableCell className="font-medium">
                                {(z.name ?? "").trim()
                                  ? z.name
                                  : `${z.governorate}${z.areaZone ? ` - ${z.areaZone}` : ""}`}
                              </TableCell>
                              <TableCell className="w-[220px]">
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={priceByZone.get(z.id) ?? ""}
                                  placeholder="0"
                                  onBlur={(e) => {
                                    const v = Number(e.target.value)
                                    if (!Number.isFinite(v) || v < 0) return
                                    savePricingMutation.mutate({
                                      merchantId: merchantPricingId,
                                      prices: [{ deliveryZoneId: z.id, shippingFee: v }],
                                    })
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium" htmlFor="merchant-status-filter">
                {t("merchants.filters.status")}
              </label>
              <select
                id="merchant-status-filter"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={accountStatus}
                onChange={(event) =>
                  setStatus((event.target.value as MerchantAccountStatus | "") ?? "")
                }
              >
                <option value="">{t("merchants.filters.allStatuses")}</option>
                <option value="PENDING">{t("merchants.status.PENDING")}</option>
                <option value="ACTIVATED">{t("merchants.status.ACTIVATED")}</option>
              </select>
            </div>

            {merchantsQuery.error ? (
              <p className="text-destructive text-sm">{(merchantsQuery.error as Error).message}</p>
            ) : null}
            {approveMutation.error ? (
              <p className="text-destructive text-sm">
                {(approveMutation.error as Error).message}
              </p>
            ) : null}
            {merchantsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("merchants.loading")}</p>
            ) : null}

            {merchantsQuery.data ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("merchants.table.displayName")}</TableHead>
                    <TableHead>{t("merchants.table.owner")}</TableHead>
                    <TableHead>{t("merchants.table.phone")}</TableHead>
                    <TableHead>{t("merchants.table.businessName")}</TableHead>
                    <TableHead>{t("merchants.table.status")}</TableHead>
                    <TableHead>{t("merchants.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantsQuery.data.merchants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center">
                        {t("merchants.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    merchantsQuery.data.merchants.map((row: MerchantRow) => (
                      <TableRow key={row.merchantId}>
                        <TableCell className="font-medium">{row.displayName}</TableCell>
                        <TableCell>{row.fullName}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.businessName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium ${merchantStatusBadgeClass(row.accountStatus)}`}
                          >
                            {t(`merchants.status.${row.accountStatus}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                row.accountStatus !== "PENDING" ||
                                approveMutation.isPending
                              }
                              onClick={() => approveMutation.mutate(row.merchantId)}
                            >
                              {t("merchants.actions.approve")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openPricing(row.merchantId)}
                            >
                              {t("merchants.actions.pricing")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {t("merchants.pagination.summary", {
                  total: merchantsQuery.data?.total ?? 0,
                  page,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t("merchants.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t("merchants.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
