import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Sparkles } from "react-lucid"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import {
  approveMerchant,
  listMerchants,
  type MerchantAccountStatus,
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

  const totalPages = Math.max(1, Math.ceil((merchantsQuery.data?.total ?? 0) / pageSize))

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
