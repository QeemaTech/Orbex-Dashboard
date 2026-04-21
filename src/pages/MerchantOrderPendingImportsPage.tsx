import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import {
  confirmPendingMerchantOrderImport,
  listPendingMerchantOrderImports,
  rejectPendingMerchantOrderImport,
} from "@/api/merchant-orders-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isMerchantUser, useAuth } from "@/lib/auth-context"

export function MerchantOrderPendingImportsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const merchantId = user?.merchantId ?? null
  const isMerchant = isMerchantUser(user)
  const queryClient = useQueryClient()

  const pendingQuery = useQuery({
    queryKey: ["merchant-order-pending-imports", token],
    queryFn: () => listPendingMerchantOrderImports({ token }),
    enabled: !!token,
  })

  const confirmMutation = useMutation({
    mutationFn: (pendingImportId: string) =>
      confirmPendingMerchantOrderImport({ token, pendingImportId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports", token] }),
        queryClient.invalidateQueries({ queryKey: ["admin-shipments-list"] }),
      ])
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (pendingImportId: string) =>
      rejectPendingMerchantOrderImport({ token, pendingImportId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports", token] })
    },
  })

  const isMutating = confirmMutation.isPending || rejectMutation.isPending
  const canConfirm = Boolean(user?.permissions?.includes("merchant_orders.confirm"))
  const visibleItems = (pendingQuery.data?.items ?? []).filter((row) =>
    isMerchant ? !!merchantId && row.merchantId === merchantId : true,
  )

  return (
    <Layout title={t("merchantOrdersList.pendingPageTitle", { defaultValue: "Pending confirmations" })}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("merchantOrdersList.pendingPageTitle", { defaultValue: "Pending confirmations" })}
            </CardTitle>
            <CardDescription>
              {t("merchantOrdersList.pendingDescription", {
                defaultValue:
                  "Review uploaded Excel batches, then confirm to create merchant orders and tracking numbers.",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("merchantOrdersList.loading")}</p>
            ) : null}
            {pendingQuery.error ? (
              <p className="text-sm text-destructive">{(pendingQuery.error as Error).message}</p>
            ) : null}
            {!pendingQuery.isLoading && visibleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("merchantOrdersList.pendingEmpty", { defaultValue: "No pending imports." })}
              </p>
            ) : null}
            {visibleItems.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{row.merchantName}</p>
                  <p className="text-muted-foreground">{row.merchantBusinessName}</p>
                  <p className="text-muted-foreground">
                    {t("merchantOrdersList.colPhone", { defaultValue: "Phone" })}: {row.merchantPhone}
                  </p>
                  {row.merchantEmail ? (
                    <p className="text-muted-foreground">
                      {t("merchantOrdersList.colEmail", { defaultValue: "Email" })}: {row.merchantEmail}
                    </p>
                  ) : null}
                  {row.merchantPickupAddress ? (
                    <p className="text-muted-foreground">
                      {t("merchantOrdersList.colAddress", { defaultValue: "Address" })}:{" "}
                      {row.merchantPickupAddress}
                      {row.merchantPickupGovernorate ? ` · ${row.merchantPickupGovernorate}` : ""}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground">
                    {row.rowCount} {t("merchantOrdersList.colOrderCount")} ·{" "}
                    {t("merchantOrdersList.pickupDate", { defaultValue: "Pickup date" })}:{" "}
                    {new Date(row.pickupDate).toLocaleDateString()}
                  </p>
                  <p className="text-muted-foreground">
                    {t("cs.shipmentStatus.PENDING_CONFIRMATION", {
                      defaultValue: "Pending confirmation",
                    })}
                  </p>
                  <p className="text-muted-foreground">{row.fileName}</p>
                </div>
                {canConfirm ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isMutating}
                      onClick={() => confirmMutation.mutate(row.id)}
                    >
                      {t("merchantOrdersList.confirmPending", { defaultValue: "Confirm" })}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isMutating}
                      onClick={() => rejectMutation.mutate(row.id)}
                    >
                      {t("merchantOrdersList.rejectPending", { defaultValue: "Reject" })}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

