import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "react-lucid"

import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { useQuery } from "@tanstack/react-query"
import {
  usePackagingMaterialStock,
  usePackagingMaterials,
  useUpsertPackagingMaterialStock,
} from "@/features/packaging-material/hooks/use-packaging-material"
import {
  canReadPackagingMaterialStock,
  canWritePackagingMaterialStock,
} from "@/features/packaging-material/utils/packaging-material.utils"
import { showToast } from "@/lib/toast"

const LOW_STOCK_THRESHOLD = 10

export function PackagingInventoryPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [warehouseId, setWarehouseId] = useState("")
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [stockDialogMode, setStockDialogMode] = useState<"add" | "update">("add")
  const [stockForm, setStockForm] = useState({
    warehouseId: "",
    packagingMaterialId: "",
    availableQuantity: "",
    reservedQuantity: "0",
  })

  const canRead = canReadPackagingMaterialStock(user)
  const canWrite = canWritePackagingMaterialStock(user)

  const stockQuery = usePackagingMaterialStock({
    token,
    page,
    pageSize,
    warehouseId: warehouseId || undefined,
  })
  const materialsQuery = usePackagingMaterials({
    token,
    page: 1,
    pageSize: 200,
  })
  const upsertStockMutation = useUpsertPackagingMaterialStock(token)
  const warehousesQuery = useQuery({
    queryKey: ["packaging-warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const rows = stockQuery.data?.stock ?? []
  const total = stockQuery.data?.total ?? 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  async function onSubmitStock() {
    if (!canWrite) {
      showToast("You do not have permission to manage stock", "error")
      return
    }
    if (!stockForm.warehouseId || !stockForm.packagingMaterialId) {
      showToast("Please select warehouse and material", "error")
      return
    }
    if (stockForm.availableQuantity === "") {
      showToast("Please enter available quantity", "error")
      return
    }
    try {
      await upsertStockMutation.mutateAsync({
        warehouseId: stockForm.warehouseId,
        packagingMaterialId: stockForm.packagingMaterialId,
        availableQuantity: stockForm.availableQuantity,
        reservedQuantity: stockForm.reservedQuantity || "0",
      })
      showToast("Stock updated", "success")
      setStockDialogOpen(false)
      setStockForm({
        warehouseId: "",
        packagingMaterialId: "",
        availableQuantity: "",
        reservedQuantity: "0",
      })
    } catch (error) {
      showToast((error as Error).message ?? "Could not update stock", "error")
    }
  }

  function openAddStockDialog() {
    if (!canWrite) {
      showToast("You do not have permission to manage stock", "error")
      return
    }
    setStockDialogMode("add")
    setStockForm({
      warehouseId: warehouseId || "",
      packagingMaterialId: "",
      availableQuantity: "",
      reservedQuantity: "0",
    })
    setStockDialogOpen(true)
  }

  function openUpdateStockDialog(row: (typeof rows)[number]) {
    if (!canWrite) {
      showToast("You do not have permission to manage stock", "error")
      return
    }
    setStockDialogMode("update")
    setStockForm({
      warehouseId: row.warehouseId,
      packagingMaterialId: row.packagingMaterialId,
      availableQuantity: row.availableQuantity,
      reservedQuantity: row.reservedQuantity,
    })
    setStockDialogOpen(true)
  }

  return (
    <Layout title={t("packagingInventory.title")}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{t("packagingInventory.title")}</CardTitle>
            <CardDescription>{t("packagingInventory.subtitle")}</CardDescription>
          </div>
          {canRead ? (
            <Button onClick={openAddStockDialog}>
              <Plus className="size-4" />
              {t("packagingInventory.addStock")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!canRead ? <p className="text-sm text-destructive">{t("packagingInventory.noAccess")}</p> : null}
          <div className="flex items-center gap-2">
            <select
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t("packagingInventory.allWarehouses")}</option>
              {(warehousesQuery.data?.warehouses ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          {stockQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("packagingInventory.loading")}</p>
          ) : null}
          {!stockQuery.isLoading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("packagingInventory.empty")}</p>
          ) : null}
          {rows.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("packagingInventory.table.material")}</TableHead>
                    <TableHead>{t("packagingInventory.table.warehouse")}</TableHead>
                    <TableHead>{t("packagingInventory.table.available")}</TableHead>
                    <TableHead>{t("packagingInventory.table.reserved")}</TableHead>
                    <TableHead>{t("packagingInventory.table.status")}</TableHead>
                    <TableHead>{t("packagingInventory.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const available = Number(row.availableQuantity)
                    const isLow = Number.isFinite(available) && available <= LOW_STOCK_THRESHOLD
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.packagingMaterial.englishName}</TableCell>
                        <TableCell>{row.warehouse.name}</TableCell>
                        <TableCell>{row.availableQuantity}</TableCell>
                        <TableCell>{row.reservedQuantity}</TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive">{t("packagingInventory.lowStock")}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("packagingInventory.inStock")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openUpdateStockDialog(row)}
                          >
                            {t("common.edit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("cs.pagination.summary", { total, page })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="border-input rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                {t("cs.pagination.prev")}
              </button>
              <button
                type="button"
                className="border-input rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t("cs.pagination.next")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockDialogMode === "add"
                ? t("packagingInventory.addStock")
                : t("packagingInventory.updateStock")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              {t("packagingInventory.selectWarehouse")}
            </label>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={stockForm.warehouseId}
              onChange={(event) =>
                setStockForm((prev) => ({ ...prev, warehouseId: event.target.value }))
              }
            >
              <option value="">{t("packagingInventory.selectWarehouse")}</option>
              {(warehousesQuery.data?.warehouses ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium">
              {t("packagingInventory.selectMaterial")}
            </label>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={stockForm.packagingMaterialId}
              onChange={(event) =>
                setStockForm((prev) => ({ ...prev, packagingMaterialId: event.target.value }))
              }
              disabled={stockDialogMode === "update"}
            >
              <option value="">{t("packagingInventory.selectMaterial")}</option>
              {(materialsQuery.data?.materials ?? []).map((material) => (
                <option key={material.id} value={material.id}>
                  {material.englishName} ({material.sku})
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium">
              {t("packagingInventory.availableQuantityLabel")}
            </label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={stockForm.availableQuantity}
              onChange={(event) =>
                setStockForm((prev) => ({ ...prev, availableQuantity: event.target.value }))
              }
              placeholder={t("packagingInventory.table.available")}
            />
            <label className="block text-sm font-medium">
              {t("packagingInventory.reservedQuantityLabel")}
            </label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={stockForm.reservedQuantity}
              onChange={(event) =>
                setStockForm((prev) => ({ ...prev, reservedQuantity: event.target.value }))
              }
              placeholder={t("packagingInventory.table.reserved")}
            />
            <p className="text-xs text-muted-foreground">
              {t("packagingInventory.quantityHelp")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void onSubmitStock()} disabled={upsertStockMutation.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

