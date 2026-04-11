import React, { useState } from "react"
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const isRTL = i18n.language?.startsWith("ar")

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const rows = Array.isArray(sitesQuery.data?.warehouses) ? sitesQuery.data.warehouses : []

  const groups: WarehouseGroup[] = rows
    .filter((w) => isMainBranch(w))
    .map((mainBranch) => ({
      mainBranch,
      subBranches: rows.filter((w) => w.mainBranchId === mainBranch.id),
    }))

  const orphanSubBranches = rows.filter(
    (w) => !isMainBranch(w) && !rows.some((m) => m.id === w.mainBranchId),
  )

  const toggleExpand = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
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

  const handleMainBranchClick = (id: string) => {
    navigate(`/warehouses/${encodeURIComponent(id)}`)
  }

  const handleSubBranchClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    navigate(`/warehouses/${encodeURIComponent(id)}`)
  }

  // Define alignment classes based on RTL/LTR
  const textAlignClass = isRTL ? "text-right" : "text-left"
  const flexJustifyClass = isRTL ? "justify-end" : "justify-start"
  const chevronMarginClass = isRTL ? "ml-1" : "mr-1"

  return (
    <Layout title={t("warehouse.list.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className={`flex flex-row items-center gap-3 pb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
              <Warehouse className="size-6" aria-hidden />
            </div>
            <div className={`space-y-1 ${isRTL ? "text-right" : "text-left"}`}>
              <CardTitle className="text-lg">{t("warehouse.list.pageTitle")}</CardTitle>
              <CardDescription>{t("warehouse.list.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={isRTL ? "text-right" : "text-left"}>{t("warehouse.list.tableTitle")}</CardTitle>
            <CardDescription className={isRTL ? "text-right" : "text-left"}>{t("warehouse.list.tableDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {sitesQuery.isLoading ? (
              <p className={`text-muted-foreground text-sm ${isRTL ? "text-right" : "text-left"}`}>{t("warehouse.loading")}</p>
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
                    <TableHead className={textAlignClass}>
                      {t("warehouse.sites.colName")}
                    </TableHead>
                    <TableHead className={textAlignClass}>
                      {t("warehouse.sites.colGovernorate")}
                    </TableHead>
                    <TableHead className={textAlignClass}>
                      {t("warehouse.sites.colZone")}
                    </TableHead>
                    <TableHead className={`${textAlignClass} tabular-nums`}>
                      {t("warehouse.list.colMerchantOrderBatches")}
                    </TableHead>
                    <TableHead className={`${textAlignClass} w-[100px]`}>
                      {t("warehouse.list.colLocation")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => {
                    const isExpanded = expandedIds.has(group.mainBranch.id)
                    return (
                      <React.Fragment key={group.mainBranch.id}>
                        {/* Main Branch Row */}
                        <TableRow className="hover:bg-muted/50">
                          <TableCell className={`align-middle ${textAlignClass}`}>
                            <div className={`flex items-center gap-2 ${flexJustifyClass}`}>
                              <button
                                onClick={(e) => toggleExpand(group.mainBranch.id, e)}
                                className="hover:bg-muted rounded p-0.5 transition-colors"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className={`size-4 text-muted-foreground ${isRTL ? "rotate-180" : ""}`} />
                                )}
                              </button>
                              <button
                                onClick={() => handleMainBranchClick(group.mainBranch.id)}
                                className="hover:text-primary transition-colors font-medium"
                              >
                                {group.mainBranch.name}
                              </button>
                              <Badge variant="outline" className="text-xs font-normal">
                                {t("warehouse.list.mainBranch")}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className={`align-middle ${textAlignClass}`}>
                            {group.mainBranch.governorate}
                          </TableCell>
                          <TableCell className={`align-middle ${textAlignClass}`}>
                            {group.mainBranch.zone ?? "—"}
                          </TableCell>
                          <TableCell className={`align-middle ${textAlignClass} tabular-nums`}>
                            {typeof group.mainBranch.transferCount === "number"
                              ? group.mainBranch.transferCount
                              : "—"}
                          </TableCell>
                          <TableCell className={`align-middle ${textAlignClass}`}>
                            <div className={`flex ${flexJustifyClass}`}>
                              <CoordinatesMapLink
                                latitude={group.mainBranch.latitude}
                                longitude={group.mainBranch.longitude}
                                stopPropagation
                              />
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Sub-branches Rows (only when expanded) */}
                        {isExpanded &&
                          group.subBranches.map((sub) => (
                            <TableRow
                              key={sub.id}
                              className="hover:bg-muted/50 cursor-pointer bg-muted/30"
                              onClick={(e) => handleSubBranchClick(sub.id, e)}
                            >
                              <TableCell className={`align-middle ${textAlignClass} font-medium`}>
                                <div className={`flex items-center gap-2 ${flexJustifyClass}`}>
                                  <span className="w-6" /> {/* Spacer for alignment */}
                                  {sub.name}
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {t("warehouse.list.subBranch")}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className={`align-middle ${textAlignClass}`}>
                                {sub.governorate}
                              </TableCell>
                              <TableCell className={`align-middle ${textAlignClass}`}>
                                {sub.zone ?? "—"}
                              </TableCell>
                              <TableCell className={`align-middle ${textAlignClass} tabular-nums`}>
                                {typeof sub.transferCount === "number" ? sub.transferCount : "—"}
                              </TableCell>
                              <TableCell className={`align-middle ${textAlignClass}`}>
                                <div className={`flex ${flexJustifyClass}`}>
                                  <CoordinatesMapLink
                                    latitude={sub.latitude}
                                    longitude={sub.longitude}
                                    stopPropagation
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    )
                  })}

                  {/* Orphan Sub-branches */}
                  {orphanSubBranches.map((w) => (
                    <TableRow
                      key={w.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={(e) => handleSubBranchClick(w.id, e)}
                    >
                      <TableCell className={`align-middle ${textAlignClass} font-medium`}>
                        <div className={`flex items-center gap-2 ${flexJustifyClass}`}>
                          {w.name}
                          <Badge variant="secondary" className="text-xs font-normal">
                            {t("warehouse.list.subBranch")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className={`align-middle ${textAlignClass}`}>
                        {w.governorate}
                      </TableCell>
                      <TableCell className={`align-middle ${textAlignClass}`}>
                        {w.zone ?? "—"}
                      </TableCell>
                      <TableCell className={`align-middle ${textAlignClass} tabular-nums`}>
                        {typeof w.transferCount === "number" ? w.transferCount : "—"}
                      </TableCell>
                      <TableCell className={`align-middle ${textAlignClass}`}>
                        <div className={`flex ${flexJustifyClass}`}>
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