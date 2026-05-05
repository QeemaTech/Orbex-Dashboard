import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "react-lucid"

import { listPackagingMaterialStock } from "@/api/packaging-material-stock-api"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  useCreatePackagingMaterial,
  usePackagingMaterials,
  useUpsertPackagingMaterialStock,
  useUpdatePackagingMaterial,
} from "@/features/packaging-material/hooks/use-packaging-material"
import {
  canReadPackagingMaterials,
  canWritePackagingMaterials,
} from "@/features/packaging-material/utils/packaging-material.utils"
import {
  packagingMaterialUnitTypes,
  type PackagingMaterial,
  type PackagingMaterialUnitType,
} from "@/api/packaging-materials-api"
import { showToast } from "@/lib/toast"
import { listWarehouseSites } from "@/api/warehouse-api"
import { useQuery, useQueryClient } from "@tanstack/react-query"

type MaterialForm = {
  arabicName: string
  englishName: string
  sku: string
  unitType: PackagingMaterialUnitType
  sellingPrice: string
  minimumRequestQuantity: string
  defaultWarehouseId: string
  isActive: boolean
}

type StockForm = {
  warehouseId: string
  availableQuantity: string
  reservedQuantity: string
  minimumStockThreshold: string
}

type EditableStockRow = {
  /** Existing stock row id, when loaded from API. */
  id?: string
  warehouseId: string
  availableQuantity: string
  reservedQuantity: string
  minimumStockThreshold: string
}

function emptyForm(): MaterialForm {
  return {
    arabicName: "",
    englishName: "",
    sku: "",
    unitType: "PIECE",
    sellingPrice: "",
    minimumRequestQuantity: "",
    defaultWarehouseId: "",
    isActive: true,
  }
}

function emptyStockForm(): StockForm {
  return {
    warehouseId: "",
    availableQuantity: "",
    reservedQuantity: "0",
    minimumStockThreshold: "",
  }
}

export function PackagingMaterialsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const canRead = canReadPackagingMaterials(user)
  const canWrite = canWritePackagingMaterials(user)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PackagingMaterial | null>(null)
  const [form, setForm] = useState<MaterialForm>(emptyForm)
  const [stockForm, setStockForm] = useState<StockForm>(emptyStockForm)
  const [stockRows, setStockRows] = useState<EditableStockRow[]>([])

  const editingStockQuery = useQuery({
    queryKey: ["packaging-material-stock", "byMaterial", token, editing?.id],
    queryFn: () =>
      listPackagingMaterialStock({
        token,
        packagingMaterialId: editing!.id,
        page: 1,
        pageSize: 200,
      }),
    enabled: !!token && !!editing && canRead,
    staleTime: 10_000,
  })

  useEffect(() => {
    if (!editing || !modalOpen) return
    const rows = editingStockQuery.data?.stock ?? []
    setStockRows(
      rows.map((r) => ({
        id: r.id,
        warehouseId: r.warehouseId,
        availableQuantity: r.availableQuantity,
        reservedQuantity: r.reservedQuantity,
        minimumStockThreshold: r.minimumStockThreshold ?? "",
      })),
    )
  }, [editing, modalOpen, editingStockQuery.data?.stock])

  const materialsQuery = usePackagingMaterials({ token, page, pageSize, search })
  const warehousesQuery = useQuery({
    queryKey: ["packaging-material-warehouses", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const stockAggQuery = useQuery({
    queryKey: ["packaging-material-stock", "agg", token],
    queryFn: async () => {
      const pageSize = 200
      const maxPages = 25
      let page = 1
      let total = 0
      const all: Array<{
        packagingMaterialId: string
        availableQuantity: string
        reservedQuantity: string
        isLowStock?: boolean
      }> = []
      while (page <= maxPages) {
        const res = await listPackagingMaterialStock({ token, page, pageSize })
        total = res.total
        for (const row of res.stock) {
          all.push({
            packagingMaterialId: row.packagingMaterialId,
            availableQuantity: row.availableQuantity,
            reservedQuantity: row.reservedQuantity,
            isLowStock: row.isLowStock,
          })
        }
        if (all.length >= total) break
        page += 1
      }
      return { total, rows: all }
    },
    enabled: !!token && canRead,
    staleTime: 20_000,
  })

  const stockByMaterialId = useMemo(() => {
    const m = new Map<string, { available: number; reserved: number; isLowStock: boolean }>()
    for (const r of stockAggQuery.data?.rows ?? []) {
      const a = Number(r.availableQuantity)
      const rv = Number(r.reservedQuantity)
      const prev = m.get(r.packagingMaterialId) ?? {
        available: 0,
        reserved: 0,
        isLowStock: false,
      }
      m.set(r.packagingMaterialId, {
        available: prev.available + (Number.isFinite(a) ? a : 0),
        reserved: prev.reserved + (Number.isFinite(rv) ? rv : 0),
        isLowStock: prev.isLowStock || Boolean(r.isLowStock),
      })
    }
    return m
  }, [stockAggQuery.data?.rows])

  const createMutation = useCreatePackagingMaterial(token)
  const updateMutation = useUpdatePackagingMaterial(token)
  const upsertStockMutation = useUpsertPackagingMaterialStock(token)

  const rows = materialsQuery.data?.materials ?? []
  const total = materialsQuery.data?.total ?? 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setStockForm(emptyStockForm())
    setStockRows([])
    setModalOpen(true)
  }

  function openEdit(material: PackagingMaterial) {
    setEditing(material)
    setForm({
      arabicName: material.arabicName,
      englishName: material.englishName,
      sku: material.sku,
      unitType: material.unitType,
      sellingPrice: material.sellingPrice,
      minimumRequestQuantity: material.minimumRequestQuantity ?? "",
      defaultWarehouseId: material.defaultWarehouseId ?? "",
      isActive: material.isActive,
    })
    setStockForm(emptyStockForm())
    setStockRows([])
    setModalOpen(true)
  }

  async function onSave() {
    if (!form.arabicName || !form.englishName || !form.sellingPrice) {
      showToast("Please fill required fields", "error")
      return
    }

    const wantsStock =
      !editing &&
      (stockForm.availableQuantity.trim().length > 0 ||
        stockForm.reservedQuantity.trim().length > 0)
    if (wantsStock) {
      if (!stockForm.warehouseId) {
        showToast(t("packagingMaterials.stock.warehouseRequired"), "error")
        return
      }
      if (stockForm.availableQuantity.trim().length === 0) {
        showToast(t("packagingMaterials.stock.availableRequired"), "error")
        return
      }
      const a = Number(stockForm.availableQuantity)
      const r = Number(stockForm.reservedQuantity || "0")
      if (!Number.isFinite(a) || a < 0 || !Number.isFinite(r) || r < 0) {
        showToast(t("packagingMaterials.stock.invalidQty"), "error")
        return
      }
    }

    try {
      let saved: PackagingMaterial | null = null
      if (editing) {
        saved = await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            ...form,
            sku: form.sku,
            minimumRequestQuantity: form.minimumRequestQuantity || null,
            defaultWarehouseId: form.defaultWarehouseId || null,
          },
        })
      } else {
        saved = await createMutation.mutateAsync({
          arabicName: form.arabicName,
          englishName: form.englishName,
          unitType: form.unitType,
          sellingPrice: form.sellingPrice,
          isActive: form.isActive,
          minimumRequestQuantity: form.minimumRequestQuantity || null,
          defaultWarehouseId: form.defaultWarehouseId || null,
        })
      }

      if (saved && wantsStock) {
        await upsertStockMutation.mutateAsync({
          warehouseId: stockForm.warehouseId,
          packagingMaterialId: saved.id,
          availableQuantity: stockForm.availableQuantity,
          reservedQuantity: stockForm.reservedQuantity || "0",
          ...(stockForm.minimumStockThreshold.trim() !== ""
            ? { minimumStockThreshold: stockForm.minimumStockThreshold.trim() }
            : {}),
        })
      }

      setModalOpen(false)
      showToast("Saved successfully", "success")
    } catch (error) {
      showToast((error as Error).message ?? "Could not save material", "error")
    }
  }

  function updateStockRow(idx: number, patch: Partial<EditableStockRow>) {
    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function addStockRow() {
    setStockRows((prev) => [
      ...prev,
      { warehouseId: "", availableQuantity: "", reservedQuantity: "0", minimumStockThreshold: "" },
    ])
  }

  function removeStockRow(idx: number) {
    setStockRows((prev) => prev.filter((_, i) => i !== idx))
  }

  async function saveStockRow(idx: number) {
    const row = stockRows[idx]
    if (!editing) return
    if (!row) return
    if (!row.warehouseId) {
      showToast(t("packagingMaterials.stock.warehouseRequired"), "error")
      return
    }
    if (row.availableQuantity.trim().length === 0) {
      showToast(t("packagingMaterials.stock.availableRequired"), "error")
      return
    }
    const a = Number(row.availableQuantity)
    const r = Number(row.reservedQuantity || "0")
    if (!Number.isFinite(a) || a < 0 || !Number.isFinite(r) || r < 0) {
      showToast(t("packagingMaterials.stock.invalidQty"), "error")
      return
    }

    try {
      await upsertStockMutation.mutateAsync({
        warehouseId: row.warehouseId,
        packagingMaterialId: editing.id,
        availableQuantity: row.availableQuantity,
        reservedQuantity: row.reservedQuantity || "0",
        ...(row.minimumStockThreshold.trim() !== ""
          ? { minimumStockThreshold: row.minimumStockThreshold.trim() }
          : { minimumStockThreshold: null }),
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["packaging-material-stock", "byMaterial", token, editing.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["packaging-material-stock", "agg", token],
        }),
      ])
      showToast("Stock saved", "success")
    } catch (e) {
      showToast((e as Error).message ?? "Could not save stock", "error")
    }
  }

  return (
    <Layout title={t("packagingMaterials.title")}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{t("packagingMaterials.title")}</CardTitle>
              <CardDescription>{t("packagingMaterials.subtitle")}</CardDescription>
            </div>
            {canWrite ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                {t("packagingMaterials.add")}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {!canRead ? (
              <p className="text-sm text-destructive">{t("packagingMaterials.noAccess")}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder={t("packagingMaterials.searchPlaceholder")}
              />
            </div>
            {materialsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("packagingMaterials.loading")}</p>
            ) : null}
            {!materialsQuery.isLoading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("packagingMaterials.empty")}</p>
            ) : null}
            {rows.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("packagingMaterials.table.sku")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.englishName")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.arabicName")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.unitType")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.sellingPrice")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.minimumRequestQuantity")}</TableHead>
                      <TableHead className="text-end">{t("packagingMaterials.table.stock")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.active")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.sku}</TableCell>
                        <TableCell>
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <span>{row.englishName}</span>
                            {!row.defaultWarehouseId && (row.activeRequestsCount ?? 0) > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                No default warehouse
                              </Badge>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell>{row.arabicName}</TableCell>
                        <TableCell>{row.unitType}</TableCell>
                        <TableCell>{row.sellingPrice}</TableCell>
                        <TableCell>{row.minimumRequestQuantity ?? "—"}</TableCell>
                        <TableCell className="text-end tabular-nums">
                          {stockAggQuery.isLoading ? (
                            <span className="text-muted-foreground text-xs">
                              {t("common.loading")}
                            </span>
                          ) : (
                            (() => {
                              const s = stockByMaterialId.get(row.id)
                              if (!s) return "—"
                              return (
                                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                                  <span>
                                    {s.available.toLocaleString()} / {s.reserved.toLocaleString()}
                                  </span>
                                  {s.isLowStock ? (
                                    <Badge variant="destructive" className="text-xs">
                                      Low
                                    </Badge>
                                  ) : null}
                                </span>
                              )
                            })()
                          )}
                        </TableCell>
                        <TableCell>{row.isActive ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                              {t("common.edit")}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("cs.pagination.summary", { total, page })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  {t("cs.pagination.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t("cs.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("packagingMaterials.editTitle") : t("packagingMaterials.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                {t("packagingMaterials.form.englishName")}
              </label>
              <Input
                value={form.englishName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, englishName: event.target.value }))
                }
                placeholder={t("packagingMaterials.form.englishName")}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                {t("packagingMaterials.form.arabicName")}
              </label>
              <Input
                value={form.arabicName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, arabicName: event.target.value }))
                }
                placeholder={t("packagingMaterials.form.arabicName")}
                dir="rtl"
                autoComplete="off"
              />
            </div>

            {editing ? (
              <div className="grid gap-1 sm:col-span-2">
                <label className="text-muted-foreground text-xs font-medium">
                  {t("packagingMaterials.form.sku")}
                </label>
                <Input value={form.sku} readOnly aria-readonly />
              </div>
            ) : null}

            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                {t("packagingMaterials.table.unitType")}
              </label>
              <select
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={form.unitType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    unitType: event.target.value as PackagingMaterialUnitType,
                  }))
                }
              >
                {packagingMaterialUnitTypes.map((unitType) => (
                  <option key={unitType} value={unitType}>
                    {unitType}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                {t("packagingMaterials.form.sellingPrice")}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sellingPrice: event.target.value }))
                }
                placeholder={t("packagingMaterials.form.sellingPrice")}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                {t("packagingMaterials.form.minimumRequestQuantity")}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minimumRequestQuantity}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    minimumRequestQuantity: event.target.value,
                  }))
                }
                placeholder={t("packagingMaterials.form.minimumRequestQuantity")}
              />
            </div>

            <div className="grid gap-1 sm:col-span-2">
              <label className="text-muted-foreground text-xs font-medium">
                {t("packagingMaterials.form.defaultWarehouseId")}
              </label>
              <select
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={form.defaultWarehouseId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, defaultWarehouseId: event.target.value }))
                }
              >
                <option value="">{t("packagingMaterials.form.defaultWarehouseId")}</option>
                {(warehousesQuery.data?.warehouses ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Used by approval/delivery to scope stock operations.
              </p>
            </div>

            <div className="sm:col-span-2">
              <div className="border-border/60 rounded-lg border p-3">
                <p className="text-foreground mb-2 text-sm font-semibold">
                  {t("packagingMaterials.stock.title")}
                </p>
                <p className="text-muted-foreground mb-3 text-xs">
                  Inventory per warehouse — independent of routing.
                </p>
                {!editing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1 sm:col-span-2">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t("packagingMaterials.stock.warehouse")}
                      </label>
                      <select
                        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                        value={stockForm.warehouseId}
                        onChange={(event) =>
                          setStockForm((prev) => ({ ...prev, warehouseId: event.target.value }))
                        }
                      >
                        <option value="">{t("packagingMaterials.stock.selectWarehouse")}</option>
                        {(warehousesQuery.data?.warehouses ?? []).map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t("packagingMaterials.stock.available")}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={stockForm.availableQuantity}
                        onChange={(event) =>
                          setStockForm((prev) => ({
                            ...prev,
                            availableQuantity: event.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="grid gap-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t("packagingMaterials.stock.reserved")}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={stockForm.reservedQuantity}
                        onChange={(event) =>
                          setStockForm((prev) => ({
                            ...prev,
                            reservedQuantity: event.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="grid gap-1 sm:col-span-2">
                      <label className="text-muted-foreground text-xs font-medium">
                        Low-stock threshold (optional, this hub/SKU)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={stockForm.minimumStockThreshold}
                        onChange={(event) =>
                          setStockForm((prev) => ({
                            ...prev,
                            minimumStockThreshold: event.target.value,
                          }))
                        }
                        placeholder="Leave empty to clear"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {editingStockQuery.isLoading ? "Loading stock…" : "Manage stock per warehouse."}
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={addStockRow}>
                        Add stock for warehouse
                      </Button>
                    </div>

                    {stockRows.length === 0 && !editingStockQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">No stock rows.</p>
                    ) : null}

                    <div className="grid gap-3">
                      {stockRows.map((r, idx) => {
                        const usedWarehouseIds = new Set(
                          stockRows
                            .filter((_, i) => i !== idx)
                            .map((x) => x.warehouseId)
                            .filter(Boolean),
                        )
                        return (
                          <div key={`${r.id ?? "new"}-${idx}`} className="rounded-md border p-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="grid gap-1 sm:col-span-2">
                                <label className="text-muted-foreground text-xs font-medium">
                                  {t("packagingMaterials.stock.warehouse")}
                                </label>
                                <select
                                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                                  value={r.warehouseId}
                                  disabled={Boolean(r.id)}
                                  onChange={(event) =>
                                    updateStockRow(idx, { warehouseId: event.target.value })
                                  }
                                >
                                  <option value="">{t("packagingMaterials.stock.selectWarehouse")}</option>
                                  {(warehousesQuery.data?.warehouses ?? [])
                                    .filter((w) => !usedWarehouseIds.has(w.id) || w.id === r.warehouseId)
                                    .map((warehouse) => (
                                      <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                      </option>
                                    ))}
                                </select>
                                {r.id ? (
                                  <p className="text-xs text-muted-foreground">
                                    Warehouse cannot be changed for an existing stock row.
                                  </p>
                                ) : null}
                              </div>

                              <div className="grid gap-1">
                                <label className="text-muted-foreground text-xs font-medium">
                                  {t("packagingMaterials.stock.available")}
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={r.availableQuantity}
                                  onChange={(event) =>
                                    updateStockRow(idx, { availableQuantity: event.target.value })
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div className="grid gap-1">
                                <label className="text-muted-foreground text-xs font-medium">
                                  {t("packagingMaterials.stock.reserved")}
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={r.reservedQuantity}
                                  onChange={(event) =>
                                    updateStockRow(idx, { reservedQuantity: event.target.value })
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div className="grid gap-1 sm:col-span-2">
                                <label className="text-muted-foreground text-xs font-medium">
                                  Low-stock threshold (optional, this hub/SKU)
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={r.minimumStockThreshold}
                                  onChange={(event) =>
                                    updateStockRow(idx, { minimumStockThreshold: event.target.value })
                                  }
                                  placeholder="Leave empty to clear"
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeStockRow(idx)}
                              >
                                Remove
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void saveStockRow(idx)}
                                disabled={upsertStockMutation.isPending}
                              >
                                Save row
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              {t("packagingMaterials.form.isActive")}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

