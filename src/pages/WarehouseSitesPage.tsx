import { useQuery } from "@tanstack/react-query"
import { Warehouse } from "react-lucid"
import { useTranslation } from "react-i18next"

import { listWarehouseSites } from "@/api/warehouse-api"
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

export function WarehouseSitesPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  return (
    <Layout title={t("warehouse.sites.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
              <Warehouse className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("warehouse.sites.pageTitle")}</CardTitle>
              <CardDescription>{t("warehouse.sites.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.sites.tableTitle")}</CardTitle>
            <CardDescription>{t("warehouse.sites.tableDescription")}</CardDescription>
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
                    <TableHead>{t("warehouse.sites.colCode")}</TableHead>
                    <TableHead>{t("warehouse.sites.colStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sitesQuery.data?.warehouses ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.governorate}</TableCell>
                      <TableCell>{w.zone ?? "—"}</TableCell>
                      <TableCell>{w.code ?? "—"}</TableCell>
                      <TableCell>
                        {w.isActive
                          ? t("warehouse.sites.statusActive")
                          : t("warehouse.sites.statusInactive")}
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
