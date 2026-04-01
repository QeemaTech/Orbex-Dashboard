import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { getAccountingDashboard } from "@/api/accounting-api"
import { Layout } from "@/components/layout/Layout"
import { ShipmentStatusBadge } from "@/features/customer-service/components/ShipmentStatusBadge"
import { useAuth } from "@/lib/auth-context"

export function CollectionsPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const q = useQuery({
    queryKey: ["accounting-dashboard", token],
    queryFn: () => getAccountingDashboard(token),
    enabled: !!token,
    refetchInterval: 15_000,
  })

  return (
    <Layout title={t("nav.collections")}>
      <div className="space-y-4">
        {q.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("shipments.loading")}</p>
        ) : null}
        {q.error ? (
          <p className="text-destructive text-sm">{(q.error as Error).message}</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(q.data?.paymentStatusSummary ?? []).map((row) => (
            <div key={row.paymentStatus} className="rounded-lg border p-4">
              <div className="mb-2">
                <ShipmentStatusBadge status={row.paymentStatus} />
              </div>
              <p className="text-2xl font-semibold">{row.count}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

