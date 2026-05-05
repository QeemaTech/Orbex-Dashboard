import { useQuery } from "@tanstack/react-query"
import { Package } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { listPackagingMaterialStock, type PackagingMaterialStockRow } from "@/api/packaging-material-stock-api"
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

const PAGE_SIZE = 200

async function fetchAllPackagingStockForWarehouse(params: {
  token: string
  warehouseId: string
}): Promise<{ stock: PackagingMaterialStockRow[]; total: number }> {
  const stock: PackagingMaterialStockRow[] = []
  let page = 1
  let total = 0
  for (let guard = 0; guard < 25; guard += 1) {
    const res = await listPackagingMaterialStock({
      token: params.token,
      warehouseId: params.warehouseId,
      page,
      pageSize: PAGE_SIZE,
    })
    total = res.total
    stock.push(...res.stock)
    if (stock.length >= total || res.stock.length === 0) break
    page += 1
  }
  return { stock, total }
}

type WarehouseHubPackagingStockSectionProps = {
  token: string
  warehouseId: string
  /** When false, section is not rendered */
  enabled?: boolean
}

export function WarehouseHubPackagingStockSection(props: WarehouseHubPackagingStockSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"
  const enabled = Boolean(props.token && props.warehouseId && (props.enabled ?? true))

  const q = useQuery({
    queryKey: ["warehouse-hub-packaging-stock", props.token, props.warehouseId],
    queryFn: () =>
      fetchAllPackagingStockForWarehouse({
        token: props.token,
        warehouseId: props.warehouseId,
      }),
    enabled,
    staleTime: 30_000,
  })

  if (!enabled) return null

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="text-primary size-5 shrink-0" aria-hidden />
            {t("warehouse.packagingStock.title")}
          </CardTitle>
          <CardDescription>{t("warehouse.packagingStock.description")}</CardDescription>
        </div>
        <Link
          to="/packaging-inventory"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline shrink-0"
        >
          {t("warehouse.packagingStock.manageLink")}
        </Link>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("warehouse.packagingStock.loading")}</p>
        ) : null}
        {q.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {(q.error as Error)?.message ?? t("warehouse.packagingStock.error")}
          </p>
        ) : null}
        {q.isSuccess ? (
          <>
            {q.data.total > q.data.stock.length && q.data.stock.length > 0 ? (
              <p className="text-muted-foreground mb-3 text-xs">
                {t("warehouse.packagingStock.partialHint", {
                  shown: q.data.stock.length,
                  total: q.data.total,
                })}
              </p>
            ) : null}
            {q.data.stock.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.packagingStock.empty")}</p>
            ) : (
              <div className="max-h-[min(28rem,55vh)] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("warehouse.packagingStock.colMaterial")}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t("warehouse.packagingStock.colSku")}</TableHead>
                      <TableHead className="text-end">{t("warehouse.packagingStock.colAvailable")}</TableHead>
                      <TableHead className="text-end">{t("warehouse.packagingStock.colReserved")}</TableHead>
                      <TableHead className="text-end hidden md:table-cell">
                        {t("warehouse.packagingStock.colFree")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.data.stock.map((row) => {
                      const avail = Number(row.availableQuantity)
                      const resv = Number(row.reservedQuantity)
                      const free = Number.isFinite(avail) && Number.isFinite(resv) ? avail - resv : null
                      const name =
                        row.packagingMaterial.englishName?.trim() ||
                        row.packagingMaterial.arabicName?.trim() ||
                        row.packagingMaterial.sku ||
                        "—"
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
                            {row.packagingMaterial.sku ?? "—"}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {Number.isFinite(avail) ? avail.toLocaleString(locale) : row.availableQuantity}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {Number.isFinite(resv) ? resv.toLocaleString(locale) : row.reservedQuantity}
                          </TableCell>
                          <TableCell className="text-end tabular-nums hidden md:table-cell">
                            {free != null && Number.isFinite(free)
                              ? free.toLocaleString(locale)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
