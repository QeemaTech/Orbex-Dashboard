import { useQuery } from "@tanstack/react-query"
import { MapPin, Truck } from "react-lucid"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { getDashboardKpis } from "@/api/merchant-orders-api"
import { getWarehouseCouriers } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
    queryFn: async () => {
      const [couriersRes, kpis] = await Promise.all([
        getWarehouseCouriers({ token }),
        getDashboardKpis({ token }),
      ])
      return { couriersRes, kpis }
    },
    enabled: !!token,
    refetchInterval: 25_000,
  })

  const rows = useMemo<CourierRow[]>(() => {
    if (!couriersQuery.data) return []
    const workloadByCourierId = new Map(
      couriersQuery.data.kpis.courierWorkload.map((row) => [
        row.courierId,
        row.assignedCount,
      ]),
    )
    return couriersQuery.data.couriersRes.couriers
      .map((courier) => ({
        courierId: courier.id,
        courierName: courier.fullName?.trim() || t("cs.couriers.table.unknownCourier"),
        assignedCount: workloadByCourierId.get(courier.id) ?? 0,
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
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("cs.couriers.listTitle")}
            </CardTitle>
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
                <Table className="min-w-[540px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-sm font-medium normal-case tracking-normal">
                        {t("cs.couriers.table.name")}
                      </TableHead>
                      <TableHead className="text-sm font-medium normal-case tracking-normal">
                        {t("cs.couriers.table.assignedCount")}
                      </TableHead>
                      <TableHead className="text-sm font-medium normal-case tracking-normal">
                        {t("cs.couriers.table.location")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.courierId} className="hover:bg-transparent">
                        <TableCell>{row.courierName}</TableCell>
                        <TableCell>{row.assignedCount}</TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
