import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, UserRound, Warehouse } from "react-lucid"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { getWarehouseSite } from "@/api/warehouse-api"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import { Layout } from "@/components/layout/Layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

export function WarehouseSiteDetailPage() {
  const { t, i18n } = useTranslation()
  const { warehouseId } = useParams<{ warehouseId: string }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const id = warehouseId ?? ""

  const detailQuery = useQuery({
    queryKey: ["warehouse-site-detail", token, id],
    queryFn: () => getWarehouseSite(token, id),
    enabled: !!token && !!id,
  })

  const d = detailQuery.data

  return (
    <Layout title={t("warehouse.siteDetail.pageTitle")}>
      <div className="space-y-6">
        <p>
          <Link
            to="/warehouse/sites"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("warehouse.siteDetail.backToDirectory")}
          </Link>
        </p>

        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
              <Warehouse className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {d?.name ?? t("warehouse.siteDetail.loadingTitle")}
              </CardTitle>
              <CardDescription>{t("warehouse.siteDetail.subtitle")}</CardDescription>
              {d ? (
                <p className="pt-1">
                  <Link
                    to={`/warehouse?warehouseId=${encodeURIComponent(d.id)}`}
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {t("warehouse.siteDetail.viewShipmentsAtHub")}
                  </Link>
                </p>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        {detailQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
        ) : null}
        {detailQuery.error ? (
          <p className="text-destructive text-sm">{(detailQuery.error as Error).message}</p>
        ) : null}

        {d ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("warehouse.siteDetail.hubCardTitle")}</CardTitle>
                <CardDescription>{t("warehouse.siteDetail.hubCardDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3 text-sm">
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colId")}</span>
                  <p className="font-mono text-xs break-all">{d.id}</p>
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colGovernorate")}</span>
                  <p>{d.governorate}</p>
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colZone")}</span>
                  <p>{d.zone ?? "—"}</p>
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colCode")}</span>
                  <p>{d.code ?? "—"}</p>
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colAddress")}</span>
                  <p>{d.address?.trim() ? d.address : "—"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground font-medium">{t("warehouse.sites.colCoordinates")}</span>
                  <CoordinatesMapLink latitude={d.latitude} longitude={d.longitude} />
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colStatus")}</span>
                  <p>
                    {d.isActive
                      ? t("warehouse.sites.statusActive")
                      : t("warehouse.sites.statusInactive")}
                  </p>
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colCreatedAt")}</span>
                  <p>{formatDateTime(d.createdAt, i18n.language)}</p>
                </div>
                <div>
                  <span className="text-foreground font-medium">{t("warehouse.sites.colUpdatedAt")}</span>
                  <p>{formatDateTime(d.updatedAt, i18n.language)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="size-4" aria-hidden />
                  {t("warehouse.siteDetail.adminCardTitle")}
                </CardTitle>
                <CardDescription>{t("warehouse.siteDetail.adminCardDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("warehouse.siteDetail.staffCount")}</span>
                  <p className="text-foreground text-2xl font-semibold tabular-nums">{d.staffCount}</p>
                </div>
                {d.admin ? (
                  <div className="border-border space-y-2 rounded-lg border p-4">
                    <p className="text-foreground font-medium">{d.admin.fullName}</p>
                    <p className="text-muted-foreground">{d.admin.email}</p>
                    {!d.admin.isActive ? (
                      <p className="text-destructive text-xs">{t("warehouse.siteDetail.adminInactive")}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t("warehouse.siteDetail.noAdmin")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
