import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  createPickupCourier,
  listPickupCouriers,
  type PickupCourierRow,
  updatePickupCourier,
} from "@/api/pickup-couriers-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

export function PickupCouriersPage() {
  const { t } = useTranslation()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<PickupCourierRow | null>(null)

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token, "pickup-couriers"],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const listQuery = useQuery({
    queryKey: ["pickup-couriers", token, search],
    queryFn: () => listPickupCouriers({ token, page: 1, pageSize: 100, search: search || undefined }),
    enabled: !!token,
  })

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["pickup-couriers", token] })

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof createPickupCourier>[0]["body"]) =>
      createPickupCourier({ token, body }),
    onSuccess: async () => {
      showToast(t("pickupCouriers.feedback.created"), "success")
      await refresh()
    },
    onError: (e) => showToast(e instanceof Error ? e.message : t("pickupCouriers.feedback.failed"), "error"),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updatePickupCourier>[0]["body"] }) =>
      updatePickupCourier({ token, id, body }),
    onSuccess: async () => {
      showToast(t("pickupCouriers.feedback.updated"), "success")
      setEditing(null)
      await refresh()
    },
    onError: (e) => showToast(e instanceof Error ? e.message : t("pickupCouriers.feedback.failed"), "error"),
  })

  const warehouseOptions = useMemo(() => sitesQuery.data?.warehouses ?? [], [sitesQuery.data])

  return (
    <Layout title={t("pickupCouriers.title")}>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{t("pickupCouriers.title")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("pickupCouriers.search")} />
            <PickupCourierForm
              title={t("pickupCouriers.create")}
              warehouses={warehouseOptions}
              busy={createMut.isPending}
              onSubmit={(body) => createMut.mutate(body)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>{t("pickupCouriers.columns.name")}</TableHead><TableHead>{t("pickupCouriers.columns.phone")}</TableHead><TableHead>{t("pickupCouriers.columns.warehouse")}</TableHead><TableHead>{t("pickupCouriers.columns.vehicle")}</TableHead><TableHead>{t("pickupCouriers.columns.active")}</TableHead><TableHead>{t("pickupCouriers.columns.actions")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {(listQuery.data?.pickupCouriers ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.contactPhone}</TableCell>
                    <TableCell>{row.assignedWarehouse?.name ?? "—"}</TableCell>
                    <TableCell>{`${row.vehicleType} (${row.vehiclePlateNumber})`}</TableCell>
                    <TableCell>{row.isActive ? t("pickupCouriers.active") : t("pickupCouriers.inactive")}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(row)}>{t("pickupCouriers.edit")}</Button>
                      <Button size="sm" variant={row.isActive ? "destructive" : "secondary"} onClick={() => updateMut.mutate({ id: row.id, body: { isActive: !row.isActive } })}>
                        {row.isActive ? t("pickupCouriers.deactivate") : t("pickupCouriers.activate")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl rounded-lg border p-4">
            <PickupCourierForm
              title={t("pickupCouriers.edit")}
              warehouses={warehouseOptions}
              initial={editing}
              busy={updateMut.isPending}
              onSubmit={(body) => updateMut.mutate({ id: editing.id, body })}
            />
            <div className="mt-3 flex justify-end"><Button variant="outline" onClick={() => setEditing(null)}>{t("pickupCouriers.close")}</Button></div>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}

function PickupCourierForm({
  title,
  warehouses,
  busy,
  initial,
  onSubmit,
}: {
  title: string
  warehouses: Array<{ id: string; name: string }>
  busy: boolean
  initial?: Partial<PickupCourierRow>
  onSubmit: (body: Parameters<typeof createPickupCourier>[0]["body"]) => void
}) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState(initial?.fullName ?? "")
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "")
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? "")
  const [assignedWarehouseId, setAssignedWarehouseId] = useState(initial?.assignedWarehouseId ?? "")
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType ?? "")
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState(initial?.vehiclePlateNumber ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ fullName, contactPhone, nationalId: nationalId || null, assignedWarehouseId, vehicleType, vehiclePlateNumber, notes: notes || null }) }}>
      <h3 className="font-medium">{title}</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("pickupCouriers.columns.name")} required />
        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t("pickupCouriers.columns.phone")} required />
        <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder={t("pickupCouriers.nationalId")} />
        <select className="border-input bg-background h-9 rounded-md border px-3 text-sm" value={assignedWarehouseId} onChange={(e) => setAssignedWarehouseId(e.target.value)} required>
          <option value="">{t("pickupCouriers.columns.warehouse")}</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder={t("pickupCouriers.vehicleType")} required />
        <Input value={vehiclePlateNumber} onChange={(e) => setVehiclePlateNumber(e.target.value)} placeholder={t("pickupCouriers.vehiclePlate")} required />
      </div>
      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("pickupCouriers.notes")} />
      <Button type="submit" disabled={busy}>{busy ? "..." : t("pickupCouriers.save")}</Button>
    </form>
  )
}
