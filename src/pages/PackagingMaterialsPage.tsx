import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "react-lucid"

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
import { useQuery } from "@tanstack/react-query"

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

export function PackagingMaterialsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const canRead = canReadPackagingMaterials(user)
  const canWrite = canWritePackagingMaterials(user)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PackagingMaterial | null>(null)
  const [form, setForm] = useState<MaterialForm>(emptyForm)

  const materialsQuery = usePackagingMaterials({ token, page, pageSize, search })
  const warehousesQuery = useQuery({
    queryKey: ["packaging-material-warehouses", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })
  const createMutation = useCreatePackagingMaterial(token)
  const updateMutation = useUpdatePackagingMaterial(token)

  const rows = materialsQuery.data?.materials ?? []
  const total = materialsQuery.data?.total ?? 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
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
    setModalOpen(true)
  }

  async function onSave() {
    if (!form.arabicName || !form.englishName || !form.sellingPrice) {
      showToast("Please fill required fields", "error")
      return
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            ...form,
            sku: form.sku,
            minimumRequestQuantity: form.minimumRequestQuantity || null,
            defaultWarehouseId: form.defaultWarehouseId || null,
          },
        })
      } else {
        await createMutation.mutateAsync({
          arabicName: form.arabicName,
          englishName: form.englishName,
          unitType: form.unitType,
          sellingPrice: form.sellingPrice,
          isActive: form.isActive,
          minimumRequestQuantity: form.minimumRequestQuantity || null,
          defaultWarehouseId: form.defaultWarehouseId || null,
        })
      }
      setModalOpen(false)
      showToast("Saved successfully", "success")
    } catch (error) {
      showToast((error as Error).message ?? "Could not save material", "error")
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
                      <TableHead>{t("packagingMaterials.table.active")}</TableHead>
                      <TableHead>{t("packagingMaterials.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.sku}</TableCell>
                        <TableCell>{row.englishName}</TableCell>
                        <TableCell>{row.arabicName}</TableCell>
                        <TableCell>{row.unitType}</TableCell>
                        <TableCell>{row.sellingPrice}</TableCell>
                        <TableCell>{row.minimumRequestQuantity ?? "—"}</TableCell>
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
            <Input
              value={form.englishName}
              onChange={(event) => setForm((prev) => ({ ...prev, englishName: event.target.value }))}
              placeholder={t("packagingMaterials.form.englishName")}
            />
            <Input
              value={form.arabicName}
              onChange={(event) => setForm((prev) => ({ ...prev, arabicName: event.target.value }))}
              placeholder={t("packagingMaterials.form.arabicName")}
            />
            {editing ? (
              <Input
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder={t("packagingMaterials.form.sku")}
              />
            ) : null}
            <select
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              value={form.unitType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, unitType: event.target.value as PackagingMaterialUnitType }))
              }
            >
              {packagingMaterialUnitTypes.map((unitType) => (
                <option key={unitType} value={unitType}>
                  {unitType}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, sellingPrice: event.target.value }))}
              placeholder={t("packagingMaterials.form.sellingPrice")}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.minimumRequestQuantity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, minimumRequestQuantity: event.target.value }))
              }
              placeholder={t("packagingMaterials.form.minimumRequestQuantity")}
            />
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
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

