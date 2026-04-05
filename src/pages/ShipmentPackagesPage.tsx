import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Boxes } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import { getShipmentPackages, listShipments } from "@/api/shipments-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
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

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ShipmentPackagesPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { shipmentId: shipmentParam = "" } = useParams()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const shipmentName = (() => {
    try {
      return decodeURIComponent(shipmentParam).trim()
    } catch {
      return shipmentParam.trim()
    }
  })()

  const isWarehouseRoute = location.pathname.startsWith("/warehouse/")
  const isCsRoute = location.pathname.startsWith("/cs/")
  const isIdParam = uuidRegex.test(shipmentName)
  const shouldUseDirectId = isWarehouseRoute || isCsRoute || isIdParam

  const matchedShipmentQuery = useQuery({
    queryKey: ["shipment-packages-match", shipmentName, token],
    queryFn: async () => {
      const result = await listShipments({
        token,
        page: 1,
        pageSize: 1,
        customerName: shipmentName,
      })
      return result.shipments[0] ?? null
    },
    enabled: !!token && !!shipmentName && !shouldUseDirectId,
  })

  const matchedShipmentId = shouldUseDirectId
    ? shipmentName
    : matchedShipmentQuery.data?.id ?? ""

  const detailPath = (() => {
    if (!matchedShipmentId) return "/shipments"
    if (isWarehouseRoute) return `/warehouse/shipments/${matchedShipmentId}`
    if (isCsRoute) return `/cs/shipments/${matchedShipmentId}`
    return `/shipments/${matchedShipmentId}`
  })()

  const packagesQuery = useQuery({
    queryKey: ["shipment-packages", matchedShipmentId, token],
    queryFn: () =>
      getShipmentPackages({ token, shipmentId: matchedShipmentId }),
    enabled: !!token && !!matchedShipmentId,
  })

  const currencyLocale = t("shipments.detail.currencyLocale", { defaultValue: "en-EG" })
  const formatMoney = (raw: string | null | undefined): string => {
    const n = Number.parseFloat(String(raw ?? "").replace(/,/g, "").trim())
    if (!Number.isFinite(n)) return "—"
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n)
  }

  return (
    <Layout title={t("shipments.packagesTitle", { defaultValue: "Shipment packages" })}>
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={detailPath}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {t("shipments.backToShipment", { defaultValue: "Back to shipment" })}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="text-primary size-5" aria-hidden />
              {t("shipments.packagesTitle", { defaultValue: "Packages in batch" })}
            </CardTitle>
            <CardDescription>
              {t("shipments.packagesSubtitle", {
                defaultValue: "Each row is one parcel with its own recipient.",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedShipmentQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t("shipments.loading")}
              </p>
            ) : null}
            {!shouldUseDirectId && !matchedShipmentQuery.isLoading && !matchedShipmentId ? (
              <p className="text-destructive text-sm">
                {t("shipments.detail.notFound", { defaultValue: "Shipment not found." })}
              </p>
            ) : null}
            {packagesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t("shipments.loading")}
              </p>
            ) : null}
            {packagesQuery.error ? (
              <p className="text-destructive text-sm">
                {(packagesQuery.error as Error).message}
              </p>
            ) : null}
            {packagesQuery.data ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("warehouse.table.trackingNumber", { defaultValue: "Tracking" })}
                      </TableHead>
                      <TableHead>{t("cs.table.customer", { defaultValue: "Customer" })}</TableHead>
                      <TableHead>{t("cs.table.phone", { defaultValue: "Phone" })}</TableHead>
                      <TableHead>
                        {t("shipments.packages.deliveryStatus", { defaultValue: "Delivery" })}
                      </TableHead>
                      <TableHead>
                        {t("shipments.packages.paymentStatus", { defaultValue: "Payment" })}
                      </TableHead>
                      <TableHead>{t("cs.table.value", { defaultValue: "Value" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packagesQuery.data.packages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                          {t("shipments.packagesEmpty", { defaultValue: "No packages." })}
                        </TableCell>
                      </TableRow>
                    ) : (
                      packagesQuery.data.packages.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">
                            {p.trackingNumber || "—"}
                          </TableCell>
                          <TableCell>{p.customer.customerName}</TableCell>
                          <TableCell>{p.customer.phonePrimary}</TableCell>
                          <TableCell className="text-xs">{p.deliveryStatus}</TableCell>
                          <TableCell className="text-xs">{p.paymentStatus}</TableCell>
                          <TableCell>{formatMoney(p.shipmentValue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
