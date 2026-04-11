import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Warehouse, ChevronDown, ChevronRight } from "react-lucid"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { listWarehouseSites } from "@/api/warehouse-api"
import type { WarehouseSiteRow } from "@/api/warehouse-api"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
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
import { isMainBranch } from "@/lib/warehouse-utils"

type WarehouseGroup = {
  mainBranch: WarehouseSiteRow
  subBranches: WarehouseSiteRow[]
}

export function WarehousesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const rows = sitesQuery.data?.warehouses ?? []

  const groups: WarehouseGroup[] = rows
    .filter((w) => isMainBranch(w))
    .map((mainBranch) => ({
      mainBranch,
      subBranches: rows.filter((w) => w.mainBranchId === mainBranch.id),
    }))

  const orphanSubBranches = rows.filter(
    (w) => !isMainBranch(w) && !rows.some((m) => m.id === w.mainBranchId),
  )

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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
                      {t("warehouse.list.colTransfers")}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {t("warehouse.list.colLocation")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => {
                    const isExpanded = expandedIds.has(group.mainBranch.id)
                    return (
                      <tbody key={group.mainBranch.id}>
                        <TableRow
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleExpand(group.mainBranch.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                              )}
                              {group.mainBranch.name}
                              <Badge variant="outline" className="text-xs font-normal">
                                {t("warehouse.list.mainBranch")}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{group.mainBranch.governorate}</TableCell>
                          <TableCell>{group.mainBranch.zone ?? "—"}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {typeof group.mainBranch.transferCount === "number"
                              ? group.mainBranch.transferCount
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <CoordinatesMapLink
                                latitude={group.mainBranch.latitude}
                                longitude={group.mainBranch.longitude}
                                stopPropagation
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded &&
                          group.subBranches.map((sub) => (
                            <TableRow
                              key={sub.id}
                              className="hover:bg-muted/50 cursor-pointer bg-muted/30"
                              onClick={() => navigate(`/warehouses/${encodeURIComponent(sub.id)}`)}
                            >
                              <TableCell className="font-medium pl-8">
                                <div className="flex items-center gap-2">
                                  {sub.name}
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {t("warehouse.list.subBranch")}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>{sub.governorate}</TableCell>
                              <TableCell>{sub.zone ?? "—"}</TableCell>
                              <TableCell className="text-end tabular-nums">
                                {typeof sub.transferCount === "number" ? sub.transferCount : "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center">
                                  <CoordinatesMapLink
                                    latitude={sub.latitude}
                                    longitude={sub.longitude}
                                    stopPropagation
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </tbody>
                    )
                  })}
                  {orphanSubBranches.map((w) => (
                    <TableRow
                      key={w.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/warehouses/${encodeURIComponent(w.id)}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {w.name}
                          <Badge variant="secondary" className="text-xs font-normal">
                            {t("warehouse.list.subBranch")}
                          </Badge>
                        </div>
                      </TableCell>
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