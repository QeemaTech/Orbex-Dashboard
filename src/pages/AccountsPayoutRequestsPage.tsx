import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Check, CreditCard, X } from "lucide-react"

import {
  approvePayoutRequest,
  listAllPayoutRequests,
  markPayoutRequestPaid,
  rejectPayoutRequest,
  type MerchantPayoutRequestRow,
  type MerchantPayoutRequestStatus,
} from "@/api/accounting-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

const PAGE_SIZE = 25

function resolveNumberLocale(lng: string) {
  return lng.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatEGP(amount: string, locale: string): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(n)
}

export function AccountsPayoutRequestsPage() {
  const { t, i18n } = useTranslation()
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const qc = useQueryClient()

  const canReview = Boolean(user?.permissions?.includes("accounts.review_payout"))
  const canMarkPaid = Boolean(user?.permissions?.includes("accounts.mark_payout_paid"))

  const [status, setStatus] = useState<MerchantPayoutRequestStatus | "">("PENDING")
  const [merchantId, setMerchantId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)

  const queryKey = useMemo(
    () => ["accounting-payout-requests", status, merchantId, from, to, page] as const,
    [status, merchantId, from, to, page],
  )

  const listQuery = useQuery({
    queryKey,
    queryFn: () =>
      listAllPayoutRequests({
        token,
        status: status || undefined,
        merchantId: merchantId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!token,
  })

  const approveMut = useMutation({
    mutationFn: (requestId: string) => approvePayoutRequest({ token, requestId }),
    onSuccess: async () => {
      showToast(t("accounts.payoutRequests.admin.approved"), "success")
      await qc.invalidateQueries({ queryKey: queryKey.slice(0, 1) })
    },
    onError: (e) => showToast((e as Error).message, "error"),
  })

  const rejectMut = useMutation({
    mutationFn: (requestId: string) =>
      rejectPayoutRequest({ token, requestId, reason: "Rejected by admin" }),
    onSuccess: async () => {
      showToast(t("accounts.payoutRequests.admin.rejected"), "success")
      await qc.invalidateQueries({ queryKey: queryKey.slice(0, 1) })
    },
    onError: (e) => showToast((e as Error).message, "error"),
  })

  const paidMut = useMutation({
    mutationFn: (requestId: string) =>
      markPayoutRequestPaid({ token, requestId, paymentRef: "" }),
    onSuccess: async () => {
      showToast(t("accounts.payoutRequests.admin.markedPaid"), "success")
      await qc.invalidateQueries({ queryKey: queryKey.slice(0, 1) })
    },
    onError: (e) => showToast((e as Error).message, "error"),
  })

  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function onFilterChange() {
    setPage(1)
  }

  return (
    <Layout title={t("accounts.payoutRequests.admin.title")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{t("accounts.payoutRequests.admin.title")}</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts">{t("accounts.payoutRequests.admin.backToAccounts")}</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.payoutRequests.admin.filters")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <select
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as never)
                onFilterChange()
              }}
            >
              <option value="">{t("accounts.payoutRequests.admin.statusAll")}</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PAID">PAID</option>
            </select>
            <Input
              value={merchantId}
              onChange={(e) => {
                setMerchantId(e.target.value)
                onFilterChange()
              }}
              placeholder={t("accounts.payoutRequests.admin.merchantId")}
            />
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                onFilterChange()
              }}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                onFilterChange()
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.payoutRequests.admin.tableTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {listQuery.isLoading ? (
              <p className="text-muted-foreground px-6 text-sm">{t("common.loading")}</p>
            ) : null}
            {listQuery.isError ? (
              <p className="text-destructive px-6 text-sm" role="alert">
                {(listQuery.error as Error).message}
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <Table className="min-w-[70rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accounts.payoutRequests.admin.merchant")}</TableHead>
                    <TableHead>{t("accounts.payoutRequests.status")}</TableHead>
                    <TableHead>{t("accounts.payoutRequests.period")}</TableHead>
                    <TableHead className="text-end">{t("accounts.payoutRequests.shipments")}</TableHead>
                    <TableHead className="text-end">{t("accounts.payoutRequests.net")}</TableHead>
                    <TableHead>{t("accounts.payoutRequests.createdAt")}</TableHead>
                    <TableHead>{t("accounts.payoutRequests.admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listQuery.data?.items ?? []).map((r: MerchantPayoutRequestRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/accounts/merchants/${encodeURIComponent(r.merchant.id)}`}
                          className="text-primary hover:underline"
                        >
                          {r.merchant.displayName}
                        </Link>
                      </TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.periodFrom.slice(0, 10)} → {r.periodTo.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {r.shipmentCount.toLocaleString(locale)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-semibold">
                        {formatEGP(r.netPayable, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.createdAt.slice(0, 10)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {canReview && r.status === "PENDING" ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => approveMut.mutate(r.id)}
                                disabled={approveMut.isPending}
                              >
                                <Check className="me-1 size-4" aria-hidden />
                                {t("accounts.payoutRequests.admin.approve")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => rejectMut.mutate(r.id)}
                                disabled={rejectMut.isPending}
                              >
                                <X className="me-1 size-4" aria-hidden />
                                {t("accounts.payoutRequests.admin.reject")}
                              </Button>
                            </>
                          ) : null}
                          {canMarkPaid && r.status === "APPROVED" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => paidMut.mutate(r.id)}
                              disabled={paidMut.isPending}
                            >
                              <CreditCard className="me-1 size-4" aria-hidden />
                              {t("accounts.payoutRequests.admin.markPaid")}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(listQuery.data?.items?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground text-center">
                        {t("accounts.payoutRequests.admin.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {t("accounts.pagination.page")} {page} / {totalPages} · {total}{" "}
              {t("accounts.pagination.total")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("accounts.pagination.prev")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("accounts.pagination.next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

