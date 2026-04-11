import { useQuery } from "@tanstack/react-query"
import { Warehouse } from "react-lucid"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { listWarehouseSites } from "@/api/warehouse-api"
import type { WarehouseSiteRow } from "@/api/warehouse-api"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import { Layout } from "@/components/layout/Layout"
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

export function WarehousesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const rows = Array.isArray(sitesQuery.data?.warehouses) ? sitesQuery.data.warehouses : []

  return (
    <Layout title={t("warehouse.list.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
              <Warehouse className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("warehouse.list.pageTitle")}</CardTitle>
              <CardDescription>{t("warehouse.list.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.list.tableTitle")}</CardTitle>
            <CardDescription>{t("warehouse.list.tableDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {sitesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}
            {sitesQuery.error ? (
              <p className="text-destructive text-sm">
                {(sitesQuery.error as Error).message}
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.sites.colName")}</TableHead>
                    <TableHead>{t("warehouse.sites.colGovernorate")}</TableHead>
                    <TableHead>{t("warehouse.sites.colZone")}</TableHead>
                    <TableHead className="text-end tabular-nums">
                      {t("warehouse.list.colMerchantOrderBatches")}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {t("warehouse.list.colLocation")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((w: WarehouseSiteRow & { transferCount?: number }) => (
                    <TableRow
                      key={w.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/warehouses/${encodeURIComponent(w.id)}`)}
                    >
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.governorate}</TableCell>
                      <TableCell>{w.zone ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {typeof w.transferCount === "number" ? w.transferCount : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <CoordinatesMapLink
                            latitude={w.latitude}
                            longitude={w.longitude}
                            stopPropagation
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
