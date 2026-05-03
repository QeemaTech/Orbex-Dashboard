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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { hasPlatformWarehouseScope, isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { cn } from "@/lib/utils"

import CreateManifestModal from "./CreateManifestModal"

function priorityClass(tier: EligibleShipmentRow["priorityTier"]): string {
  if (tier === "URGENT") return "bg-destructive/15 text-destructive border-destructive/30"
  if (tier === "HIGH") return "bg-primary/10 text-primary border-primary/30"
  return "bg-muted text-muted-foreground border-border"
}

export function DeliveryManifestPage() {
  const { t } = useTranslation()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const permissions = user?.permissions ?? []
  const canReadAll =
    permissions.includes("delivery_manifests.read_all") ||
    permissions.includes("courier_manifests.read_all") ||
    hasPlatformWarehouseScope(user)
  const canReadLocal = permissions.includes("delivery_manifests.read")

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [zoneId, setZoneId] = useState("")
  const [priorityTier, setPriorityTier] = useState("ALL")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)

  const canSeeWarehouseDirectory = hasPlatformWarehouseScope(user) || isWarehouseAdmin(user)
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

  if (accessDenied) {
    return <Navigate to="/" replace />
  }

  if (shouldForceOwnWarehouse) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user!.warehouseId!)}/manifests`}
        replace
      />
    )
  }

  if (!warehouseId) {
    return (
      <Layout title={t("warehouse.detail.invalidTitle")}>
        <p className="text-muted-foreground text-sm">{t("warehouse.detail.invalidDescription")}</p>
      </Layout>
    )
  }

  if (user && isWarehouseStaff(user) && user.warehouseId && user.warehouseId !== warehouseId) {
    return <Navigate to={`/warehouses/${encodeURIComponent(user.warehouseId)}/manifests`} replace />
  }

  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  const items = eligibleQuery.data?.items ?? []
  const total = eligibleQuery.data?.total ?? 0
  const kpis = eligibleQuery.data?.kpis
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPage = () => {
    const pageIds = items.map((i) => i.id)
    const allOnPage = pageIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPage) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  const selectedRows = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i]))
    return [...selected].map((id) => map.get(id)).filter(Boolean) as EligibleShipmentRow[]
  }, [items, selected])

  const openModal = () => {
    if (selectedRows.length === 0) return
    const z = new Set(selectedRows.map((r) => r.resolvedDeliveryZoneId).filter(Boolean))
    if (z.size !== 1) {
      window.alert("Select shipments in the same delivery zone only.")
      return
    }
    setModalOpen(true)
  }

  const fleetZones = zoneLinksQuery.data?.deliveryZones ?? []

  return (
    <Layout title={t("warehouse.manifests.title")}>
      <div className="space-y-6">
        {canSeeWarehouseDirectory ? (
          <p>
            <Link
              to="/warehouses"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
              {t("warehouse.detail.backToWarehouses")}
            </Link>
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            className="max-w-md"
            placeholder="Search tracking, customer, phone…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for dispatch</CardTitle>
              <ClipboardList className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {eligibleQuery.isPending ? "—" : (kpis?.shipmentsReady ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available couriers</CardTitle>
              <Truck className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {eligibleQuery.isPending ? "—" : (kpis?.availableCouriers ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active manifests</CardTitle>
              <Package className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {eligibleQuery.isPending ? "—" : (kpis?.activeManifests ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Warehouse is fixed to this hub.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <select
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All zones</option>
              {fleetZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name?.trim() || z.id}
                </option>
              ))}
            </select>
            <select
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
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
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All payments</option>
              <option value="CASH">Cash</option>
              <option value="VISA">Visa</option>
              <option value="INSTAPAY">Instapay</option>
              <option value="E_WALLET">E-wallet</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoneId("")
                setPriorityTier("ALL")
                setPaymentMethod("")
                setSearch("")
                setDebouncedSearch("")
                setPage(1)
              }}
            >
              Clear
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Available shipments</CardTitle>
              <CardDescription>
                {total.toLocaleString()} total · Select lines, then create a manifest.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openModal}>
                Assign courier
              </Button>
              <Button type="button" size="sm" onClick={openModal} disabled={selected.size === 0}>
                Create manifest ({selected.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eligibleQuery.isPending ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : eligibleQuery.isError ? (
              <p className="text-destructive text-sm">{(eligibleQuery.error as Error).message}</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select page"
                            checked={
                              items.length > 0 && items.every((i) => selected.has(i.id))
                            }
                            onChange={toggleAllPage}
                          />
                        </TableHead>
                        <TableHead>Shipment</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>Governorate</TableHead>
                        <TableHead>COD</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(selected.has(row.id) && "bg-primary/5")}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selected.has(row.id)}
                              onChange={() => toggle(row.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.trackingNumber ?? row.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{row.customerName}</div>
                            <div className="text-muted-foreground text-xs">{row.customerPhone}</div>
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">
                            {row.zoneLabel}
                          </TableCell>
                          <TableCell className="text-sm">{row.governorate}</TableCell>
                          <TableCell className="text-sm">{row.codDisplay}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                priorityClass(row.priorityTier),
                              )}
                            >
                              {row.priorityTier}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                              {row.uiStatus}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    Showing {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <CreateManifestModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          token={token}
          warehouseId={warehouseId}
          selected={selectedRows}
          onCompleted={() => setSelected(new Set())}
        />
      </div>
    </Layout>
  )
}
