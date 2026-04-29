import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MapPin, Pencil, Plus, Trash2 } from "react-lucid"
import { useTranslation } from "react-i18next"

import {
  deactivateDeliveryZone,
  deleteDeliveryZonePermanent,
  getDeliveryZoneWarehouseLinks,
  listDeliveryZones,
  type DeliveryZoneRow,
} from "@/api/delivery-zones-api"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeliveryZoneFormDialog } from "@/features/delivery-zones/components/DeliveryZoneFormDialog"
import { DeliveryZonesInspectMap } from "@/features/delivery-zones/components/DeliveryZonesInspectMap"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

function renderZoneCouriersCell(z: DeliveryZoneRow) {
  const rows =
    z.couriers && z.couriers.length > 0
      ? z.couriers
      : z.courierIds.map((id) => ({
        id,
        fullName: null,
        contactPhone: null,
      }))
  if (rows.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <ul className="max-h-36 space-y-1 overflow-y-auto text-xs leading-snug">
      {rows.map((c) => (
        <li key={c.id}>
          <span className="font-medium">{c.fullName ?? c.id}</span>
          {c.contactPhone ? (
            <span className="text-muted-foreground"> · {c.contactPhone}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function DeliveryZonesPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const qc = useQueryClient()
  const canView = Boolean(user?.permissions?.includes("delivery_zones.read"))
  const canCreate = Boolean(user?.permissions?.includes("delivery_zones.create"))
  const canUpdate = Boolean(user?.permissions?.includes("delivery_zones.update"))
  const canDelete = Boolean(user?.permissions?.includes("delivery_zones.delete"))
  const canManageRows = canUpdate || canDelete

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<DeliveryZoneRow | null>(null)
  const [inspectedZoneId, setInspectedZoneId] = useState<string | null>(null)

  const zonesQuery = useQuery({
    queryKey: ["delivery-zones", token],
    queryFn: () => listDeliveryZones(token),
    enabled: !!token && canView,
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateDeliveryZone(token, id),
    onSuccess: () => {
      showToast(t("deliveryZones.feedback.deactivated"), "success")
      void qc.invalidateQueries({ queryKey: ["delivery-zones"] })
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("deliveryZones.feedback.deactivateFailed"), "error")
    },
  })

  const deletePermanentMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryZonePermanent(token, id),
    onSuccess: () => {
      showToast(t("deliveryZones.feedback.deletedPermanent"), "success")
      void qc.invalidateQueries({ queryKey: ["delivery-zones"] })
    },
    onError: (e: Error) => {
      showToast(
        e.message ?? t("deliveryZones.feedback.deletePermanentFailed"),
        "error",
      )
    },
  })

  const zones = zonesQuery.data?.zones ?? []
  const inspectedZone =
    zones.find((zone) => zone.id === inspectedZoneId) ?? zones[0] ?? null
  const inspectLinksQuery = useQuery({
    queryKey: ["delivery-zone-warehouses", token, inspectedZone?.id ?? ""],
    queryFn: () => getDeliveryZoneWarehouseLinks(token, inspectedZone!.id),
    enabled: !!token && !!inspectedZone?.id,
  })
  const mapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim()

  function openCreate() {
    setDialogMode("create")
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(row: DeliveryZoneRow) {
    setDialogMode("edit")
    setEditing(row)
    setDialogOpen(true)
  }

  return (
    <Layout title={t("deliveryZones.pageTitle")}>
      <div className="flex flex-col gap-6">
        {canView ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-5" aria-hidden />
                  {t("deliveryZones.cardTitle")}
                </CardTitle>
                <CardDescription>{t("deliveryZones.cardDescription")}</CardDescription>
              </div>
              {canCreate ? (
                <Button type="button" size="sm" className="gap-1" onClick={openCreate}>
                  <Plus className="size-4" aria-hidden />
                  {t("deliveryZones.addZone")}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {mapsApiKey ? (
                <div className="mb-4 space-y-3">
                  <DeliveryZonesInspectMap
                    apiKey={mapsApiKey}
                    token={token}
                    zones={zones}
                    inspectedZoneId={inspectedZone?.id ?? null}
                    onInspectZone={(id) => setInspectedZoneId(id)}
                  />
                  {inspectedZone ? (
                    <div className="space-y-2 rounded-md border p-3 text-sm">
                      <div className="grid gap-2 md:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">
                          {t("deliveryZones.inspect.name", { defaultValue: "Zone" })}:
                        </span>{" "}
                        {inspectedZone.name ?? "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("deliveryZones.inspect.type", { defaultValue: "Type" })}:
                        </span>{" "}
                        {inspectedZone.geometryType ?? "CIRCLE"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("deliveryZones.inspect.governorate", {
                            defaultValue: "Governorate",
                          })}
                          :
                        </span>{" "}
                        {inspectedZone.governorate}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("deliveryZones.inspect.operational", {
                            defaultValue: "Operational status",
                          })}
                          :
                        </span>{" "}
                        {inspectedZone.isActive
                          ? t("deliveryZones.active")
                          : t("deliveryZones.inactive")}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("deliveryZones.inspect.radius", { defaultValue: "Radius" })}:
                        </span>{" "}
                        {inspectedZone.radiusMeters
                          ? t("deliveryZones.radiusMeters", {
                              m: inspectedZone.radiusMeters,
                            })
                          : "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("deliveryZones.inspect.linkedWarehouses", {
                            defaultValue: "Linked warehouses",
                          })}
                          :
                        </span>{" "}
                        {(inspectLinksQuery.data?.deliveryWarehouses.length ?? 0) +
                          (inspectLinksQuery.data?.pickupWarehouses.length ?? 0)}
                      </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs">
                            {t("deliveryZones.inspect.couriers", {
                              defaultValue: "Assigned delivery couriers",
                            })}
                          </p>
                          <ul className="space-y-1 text-xs">
                            {(inspectedZone.couriers ?? []).length === 0 ? (
                              <li>—</li>
                            ) : (
                              (inspectedZone.couriers ?? []).map((c) => (
                                <li key={c.id}>
                                  {c.fullName ?? c.id}
                                  {c.contactPhone ? ` · ${c.contactPhone}` : ""}
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs">
                            {t("deliveryZones.inspect.warehouses", {
                              defaultValue: "Linked warehouses",
                            })}
                          </p>
                          <ul className="space-y-1 text-xs">
                            {inspectLinksQuery.isLoading ? (
                              <li>{t("deliveryZones.loading")}</li>
                            ) : (inspectLinksQuery.data?.deliveryWarehouses.length ??
                                0) +
                                (inspectLinksQuery.data?.pickupWarehouses.length ??
                                  0) ===
                              0 ? (
                              <li>—</li>
                            ) : (
                              [
                                ...(inspectLinksQuery.data?.deliveryWarehouses ??
                                  []),
                                ...(inspectLinksQuery.data?.pickupWarehouses ?? []),
                              ].map((w) => <li key={w.id}>{w.name}</li>)
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {zonesQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">{t("deliveryZones.loading")}</p>
              ) : zones.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("deliveryZones.empty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("deliveryZones.col.name")}</TableHead>
                      <TableHead>{t("deliveryZones.col.governorate")}</TableHead>
                      <TableHead>{t("deliveryZones.col.area")}</TableHead>
                      <TableHead>{t("deliveryZones.col.region")}</TableHead>
                      <TableHead>{t("deliveryZones.col.radius")}</TableHead>
                      <TableHead>{t("deliveryZones.col.couriers")}</TableHead>
                      <TableHead>{t("deliveryZones.col.center")}</TableHead>
                      <TableHead>{t("deliveryZones.col.status")}</TableHead>
                      <TableHead className="w-[120px]">
                        {t("deliveryZones.col.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((z) => (
                      <TableRow
                        key={z.id}
                        onMouseEnter={() => setInspectedZoneId(z.id)}
                      >
                        <TableCell className="font-medium">
                          {z.name ?? "—"}
                        </TableCell>
                        <TableCell>{z.governorate}</TableCell>
                        <TableCell>{z.areaZone ?? "—"}</TableCell>
                        <TableCell>
                          {z.region ? `${z.region.name} (${z.region.code})` : "—"}
                        </TableCell>
                        <TableCell>
                          {z.radiusMeters != null
                            ? t("deliveryZones.radiusMeters", { m: z.radiusMeters })
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[16rem] align-top">
                          {renderZoneCouriersCell(z)}
                        </TableCell>
                        <TableCell>
                          <CoordinatesMapLink
                            latitude={z.latitude}
                            longitude={z.longitude}
                          />
                        </TableCell>
                        <TableCell>
                          {z.isActive ? (
                            <Badge variant="default">{t("deliveryZones.active")}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("deliveryZones.inactive")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {canManageRows ? (
                              <>
                                {canUpdate ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={() => openEdit(z)}
                                    aria-label={t("deliveryZones.edit")}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                ) : null}
                                {canDelete ? (
                                  <>
                                    {z.isActive ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive h-8 px-2 text-xs"
                                        disabled={deactivateMut.isPending}
                                        onClick={() => {
                                          if (
                                            window.confirm(t("deliveryZones.confirmDeactivate"))
                                          ) {
                                            deactivateMut.mutate(z.id)
                                          }
                                        }}
                                      >
                                        {t("deliveryZones.deactivate")}
                                      </Button>
                                    ) : null}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive size-8"
                                      disabled={deletePermanentMut.isPending}
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            t("deliveryZones.confirmDeletePermanent"),
                                          )
                                        ) {
                                          deletePermanentMut.mutate(z.id)
                                        }
                                      }}
                                      aria-label={t("deliveryZones.deletePermanent")}
                                      title={t("deliveryZones.deletePermanent")}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <DeliveryZoneFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={editing}
        token={token}
        canWrite={dialogMode === "create" ? canCreate : canUpdate}
        onOpenChange={setDialogOpen}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["delivery-zones"] })}
      />
    </Layout>
  )
}
