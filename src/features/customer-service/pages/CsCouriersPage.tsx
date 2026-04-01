import { useQuery } from "@tanstack/react-query"
import { MapPin, Truck } from "react-lucid"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { getDashboardKpis } from "@/api/shipments-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CsCourierMapDialog } from "@/features/customer-service/components/CsCourierMapDialog"
import { useAuth } from "@/lib/auth-context"

type CourierRow = {
  courierId: string
  courierName: string
  assignedCount: number
}

export function CsCouriersPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const [mapCourierId, setMapCourierId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

  const couriersQuery = useQuery({
    queryKey: ["cs-couriers-list", token],
    queryFn: () => getDashboardKpis({ token }),
    enabled: !!token,
    refetchInterval: 25_000,
  })

  const rows = useMemo<CourierRow[]>(() => {
    if (!couriersQuery.data) return []
    return couriersQuery.data.courierWorkload
      .map((row) => ({
        courierId: row.courierId,
        courierName:
          row.courierName?.trim() || t("cs.couriers.table.unknownCourier"),
        assignedCount: row.assignedCount,
      }))
      .sort((a, b) => a.courierName.localeCompare(b.courierName))
  }, [couriersQuery.data, t])

  const openMap = (courierId: string) => {
    setMapCourierId(courierId)
    setMapOpen(true)
  }

  return (
    <Layout title={t("cs.couriers.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/8 border-primary/15 bg-gradient-to-br via-card to-card shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
            <div className="bg-primary/12 text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
              <Truck className="size-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight">
                {t("cs.couriers.pageTitle")}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                {t("cs.couriers.subtitle")}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("cs.couriers.listTitle")}
            </CardTitle>
            <CardDescription>{t("cs.couriers.listDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {couriersQuery.error ? (
              <p className="text-destructive text-sm">
                {(couriersQuery.error as Error).message}
              </p>
            ) : null}

            {couriersQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t("cs.couriers.loading")}
              </p>
            ) : null}

            {!couriersQuery.isLoading && rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("cs.couriers.empty")}
              </p>
            ) : null}

            {rows.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[540px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-start font-medium">
                        {t("cs.couriers.table.name")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("cs.couriers.table.assignedCount")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("cs.couriers.table.location")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.courierId} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{row.courierName}</td>
                        <td className="px-3 py-2">{row.assignedCount}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-9"
                            title={t("cs.couriers.actions.viewMap")}
                            aria-label={t("cs.couriers.actions.viewMap")}
                            onClick={() => openMap(row.courierId)}
                          >
                            <MapPin className="size-5" aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CsCourierMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        courierId={mapCourierId}
        token={token}
      />
    </Layout>
  )
}
