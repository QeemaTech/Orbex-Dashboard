import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ClipboardList, Loader2, Package, Truck } from "lucide-react"

import { getEligibleShipments, type EligibleShipmentRow } from "@/api/delivery-manifests-api"
import { getWarehouseZoneLinks } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { hasPlatformWarehouseScope, isWarehouseStaff } from "@/lib/warehouse-access"
import { cn } from "@/lib/utils"

import { CreateManifestModal } from "./CreateManifestModal"

function priorityClass(tier: EligibleShipmentRow["priorityTier"]): string {
  if (tier === "URGENT") return "bg-destructive/15 text-destructive border-destructive/30"
  if (tier === "HIGH") return "bg-primary/10 text-primary border-primary/30"
  return "bg-muted text-muted-foreground border-border"
}

export function DeliveryManifestWorkspacePage() {
  const { t } = useTranslation()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const permissions = user?.permissions ?? []
  const canReadAll =
    permissions.includes("delivery_manifests.read_all") || hasPlatformWarehouseScope(user)
  const canReadLocal = permissions.includes("delivery_manifests.read")
  const canManage =
    permissions.includes("delivery_manifests.manage") ||
    permissions.includes("warehouses.manage_transfer") ||
    hasPlatformWarehouseScope(user)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [zoneId, setZoneId] = useState("")
  const [priorityTier, setPriorityTier] = useState("ALL")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)

  const accessDenied = !!user && !canReadAll && !canReadLocal

  const shouldForceOwnWarehouse =
    !!user &&
    !canReadAll &&
    isWarehouseStaff(user) &&
    !!user.warehouseId &&
    warehouseId &&
    user.warehouseId !== warehouseId

  const debounceRef = useMemo(() => ({ id: 0 as ReturnType<typeof setTimeout> | 0 }), [])
  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      if (debounceRef.id) clearTimeout(debounceRef.id)
      debounceRef.id = setTimeout(() => {
        setDebouncedSearch(v.trim())
        setPage(1)
      }, 300)
    },
    [debounceRef],
  )

  const zoneLinksQuery = useQuery({
    queryKey: ["warehouse-zone-links", token, warehouseId],
    queryFn: () => getWarehouseZoneLinks(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const eligibleQuery = useQuery({
    queryKey: [
      "delivery-manifest-eligible",
      token,
      warehouseId,
      page,
      pageSize,
      debouncedSearch,
      zoneId,
      priorityTier,
      paymentMethod,
    ],
    queryFn: () =>
      getEligibleShipments({
        token,
        warehouseId,
        page,
        pageSize,
        search: debouncedSearch || undefined,
        resolvedDeliveryZoneId: zoneId || undefined,
        priorityTier: priorityTier === "ALL" ? undefined : priorityTier,
        paymentMethod: paymentMethod || undefined,
      }),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const items = eligibleQuery.data?.items ?? []
  const total = eligibleQuery.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const selectedRows = useMemo(
    () => items.filter((r) => selected.has(r.id)),
    [items, selected],
  )

  if (accessDenied) return <Navigate to="/" replace />
  if (shouldForceOwnWarehouse) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user!.warehouseId!)}/manifests/workspace`}
        replace
      />
    )
  }

  return (
    <Layout title={t("warehouse.manifests.title")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests`}>
              {t("warehouse.manifests.listTitle", { defaultValue: "Manifests" })}
            </Link>
          </Button>
          <Button
            type="button"
            disabled={!canManage || selectedRows.length === 0}
            onClick={() => setModalOpen(true)}
            title={!canManage ? "Missing permission delivery_manifests.manage" : undefined}
          >
            {t("warehouse.manifests.create.cta", { defaultValue: "Create manifest" })}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5" aria-hidden />
              Eligible shipments
            </CardTitle>
            <CardDescription>
              Select CS-confirmed shipments in warehouse and dispatch via a delivery manifest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
              <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search…" />
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All zones</option>
                {(zoneLinksQuery.data?.deliveryZones ?? []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name?.trim() || z.id}
                  </option>
                ))}
              </select>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={priorityTier}
                onChange={(e) => {
                  setPriorityTier(e.target.value)
                  setPage(1)
                }}
              >
                <option value="ALL">All priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="STANDARD">Standard</option>
              </select>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All payment</option>
                <option value="CASH">Cash</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            {eligibleQuery.isLoading ? (
              <p className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </p>
            ) : null}
            {eligibleQuery.error ? (
              <p className="text-destructive text-sm">{(eligibleQuery.error as Error).message}</p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[60rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Tracking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>COD</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const checked = selected.has(row.id)
                    return (
                      <TableRow key={row.id} className={checked ? "bg-muted/30" : undefined}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(row.id)
                                else next.delete(row.id)
                                return next
                              })
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <Link
                            to={`/warehouses/${encodeURIComponent(warehouseId)}/shipments/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(
                              `/warehouses/${encodeURIComponent(warehouseId)}/manifests/workspace`,
                            )}&returnLabel=${encodeURIComponent("Back to manifest workspace")}`}
                            className="hover:underline"
                          >
                            {row.trackingNumber ?? row.id}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate">
                          <div className="flex items-center gap-2">
                            <Package className="size-4 text-muted-foreground" aria-hidden />
                            <span className="truncate">{row.customerName}</span>
                          </div>
                          <div className="text-muted-foreground text-xs">{row.customerPhone}</div>
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate">{row.zoneLabel}</TableCell>
                        <TableCell>{row.paymentMethod}</TableCell>
                        <TableCell>{row.codDisplay}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                              priorityClass(row.priorityTier),
                            )}
                          >
                            <Truck className="size-3" aria-hidden />
                            {row.priorityTier}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                Page {page} of {pageCount} • {total} shipments
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateManifestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        token={token}
        warehouseId={warehouseId}
        selected={selectedRows}
        onCompleted={() => {
          setSelected(new Set())
          eligibleQuery.refetch()
        }}
      />
    </Layout>
  )
}

