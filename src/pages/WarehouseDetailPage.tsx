import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Boxes,
  Package,
  Search,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom"

import { createShipmentPlannedTask } from "@/api/shipments-api"
import type { PickupCourierRow } from "@/api/pickup-couriers-api"
import {
  getWarehousePickupCouriers,
  getWarehouseSite,
  getWarehouseStats,
  getWarehouseZoneLinks,
  getWarehouseTracking,
  listWarehouseOrders,
  listWarehouseStandaloneShipments,
  receiveWarehouseReturn,
  scanPayloadFromInput,
  scanShipmentIn,
  scanShipmentOut,
  setWarehouseZoneLinks,
  type WarehouseOrdersResponse,
  type WarehouseStandaloneShipmentRow,
} from "@/api/warehouse-api"
import {
  WarehouseScanner,
  type WarehouseScanMode,
} from "@/components/warehouse/WarehouseScanner"
import { listDeliveryZones } from "@/api/delivery-zones-api"
import { WarehouseHubPackagingStockSection } from "@/features/warehouse/components/WarehouseHubPackagingStockSection"
import { batchResolutionLabel } from "@/lib/warehouse-batch-resolution"
import { warehouseShipmentLineDetailPath } from "@/lib/warehouse-merchant-order-routes"
import { Layout } from "@/components/layout/Layout"
import {
  MerchantBatchStatusWithWarehouse,
  OrderDeliveryStatusWithWarehouse,
} from "@/components/shared/StatusWithWarehouseContext"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  hasPlatformWarehouseScope,
  isWarehouseAdmin,
  isWarehouseStaff,
} from "@/lib/warehouse-access"
import { showToast } from "@/lib/toast"
import { backendShipmentTransferLabel } from "@/features/warehouse/backend-labels"
import { ShipmentCsConfirmLocationDialog } from "@/features/shipments/components/ShipmentCsConfirmLocationDialog"
/** `MerchantOrder.transferStatus` (batch pipeline); empty = all batches in hub scope. */
const warehouseTransferStatusFilters = [
  "",
  "PENDING_PICKUP",
  "PICKED_UP",
  "IN_WAREHOUSE",
] as const

type WarehouseTransferStatusFilter = (typeof warehouseTransferStatusFilters)[number]

function warehouseTransferRowTone(transferStatus: string): string {
  const s = transferStatus.toUpperCase()
  if (s === "IN_WAREHOUSE") {
    return "bg-sky-50/70 dark:bg-sky-950/25"
  }
  if (s === "PICKED_UP") {
    return "bg-amber-50/70 dark:bg-amber-950/20"
  }
  return ""
}

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

function toPercentFromTotal(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
  return Math.round((value / total) * 100)
}

/** Minimal fields from scan-out merchant-order detail DTO (no API contract change). */
type ScanOutQueuePatch = {
  id?: string
  transferStatus?: string
  updatedAt?: string
}

function readScanOutQueuePatch(raw: unknown): ScanOutQueuePatch | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id : undefined
  const transferStatus =
    typeof o.transferStatus === "string" ? o.transferStatus : undefined
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : undefined
  if (!id || !transferStatus) return null
  return { id, transferStatus, updatedAt }
}

function AwaitingScanIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v13.5A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V9.75a2.25 2.25 0 0 0-.659-1.591l-4.5-4.5A2.25 2.25 0 0 0 14.25 3H5.25Zm4.2 5.25a.9.9 0 1 1 0 1.8h-2.7a.9.9 0 1 1 0-1.8h2.7Zm0 3.6a.9.9 0 1 1 0 1.8h-2.7a.9.9 0 1 1 0-1.8h2.7Zm4.05-1.65a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" />
    </svg>
  )
}

function WarehouseBoxIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M11.992 1.5a2 2 0 0 1 1.01.274l7.5 4.25A2 2 0 0 1 21.5 7.77v8.46a2 2 0 0 1-1.01 1.746l-7.5 4.25a2 2 0 0 1-1.98 0l-7.5-4.25A2 2 0 0 1 2.5 16.23V7.77a2 2 0 0 1 1.01-1.746l7.5-4.25a2 2 0 0 1 .982-.274Zm0 2.306L6.146 7.11l5.846 3.312 5.846-3.312-5.846-3.304ZM4.5 9.49v6.52l6.492 3.675v-6.519L4.5 9.49Zm15 0-6.508 3.676v6.519L19.5 16.01V9.49Z" />
    </svg>
  )
}

function AssignmentTruckIcon({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={ariaHidden}>
      <path d="M3.75 4.5A2.25 2.25 0 0 0 1.5 6.75v8.5A2.25 2.25 0 0 0 3.75 17.5h.882a2.625 2.625 0 0 1 5.236 0h3.264a2.625 2.625 0 0 1 5.236 0h1.132a1.5 1.5 0 0 0 1.5-1.5V11.7a2.25 2.25 0 0 0-.45-1.35l-2.4-3.2A2.25 2.25 0 0 0 16.35 6.3H14.25v-1.8H3.75Zm10.5 4.05h2.1l1.8 2.4h-3.9v-2.4Zm-7 10.2a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Zm8.5 0a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" />
    </svg>
  )
}

// Define stat cards configuration outside component to avoid recreation
const transferStatCards = [
  { 
    statKey: "pending" as const, 
    titleI18nKey: "warehouse.hubStats.pending", 
    icon: AwaitingScanIcon, 
    accent: "warning" as const 
  },
  { 
    statKey: "assigned" as const, 
    titleI18nKey: "warehouse.hubStats.assigned", 
    icon: AssignmentTruckIcon, 
    accent: "primary" as const 
  },
  { 
    statKey: "onTheWayToWarehouse" as const, 
    titleI18nKey: "warehouse.hubStats.onTheWayToWarehouse", 
    icon: WarehouseBoxIcon, 
    accent: "primary" as const 
  },
  { 
    statKey: "inWarehouse" as const, 
    titleI18nKey: "warehouse.hubStats.inWarehouse", 
    icon: Warehouse, 
    accent: "primary" as const 
  },
  { 
    statKey: "partiallyDelivered" as const, 
    titleI18nKey: "warehouse.hubStats.partiallyDelivered", 
    icon: Boxes, 
    accent: "success" as const 
  },
  { 
    statKey: "delivered" as const, 
    titleI18nKey: "warehouse.hubStats.delivered", 
    icon: Boxes, 
    accent: "success" as const 
  },
]

/** Standalone line status buckets (current page rows) — mirrors merchant pipeline grid layout. */
const shipmentSnapshotStatusCards = [
  {
    status: "IN_WAREHOUSE" as const,
    titleI18nKey: "warehouse.shipmentInsights.inWarehouse",
    icon: Warehouse,
    accent: "primary" as const,
  },
  {
    status: "ASSIGNED" as const,
    titleI18nKey: "warehouse.shipmentInsights.assigned",
    icon: Truck,
    accent: "primary" as const,
  },
  {
    status: "OUT_FOR_DELIVERY" as const,
    titleI18nKey: "warehouse.shipmentInsights.outForDelivery",
    icon: Truck,
    accent: "warning" as const,
  },
  {
    status: "DELIVERED" as const,
    titleI18nKey: "warehouse.shipmentInsights.delivered",
    icon: Package,
    accent: "success" as const,
  },
  {
    status: "REJECTED" as const,
    titleI18nKey: "warehouse.shipmentInsights.rejected",
    icon: Boxes,
    accent: "warning" as const,
  },
  {
    status: "POSTPONED" as const,
    titleI18nKey: "warehouse.shipmentInsights.postponed",
    icon: AwaitingScanIcon,
    accent: "warning" as const,
  },
]

function countShipmentStatusesOnPage(
  rows: WarehouseStandaloneShipmentRow[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) {
    const s = String(r.status ?? "").toUpperCase()
    counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

export function WarehouseDetailPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const canOpenManifests = Boolean(
    user?.permissions?.includes("delivery_manifests.read") ||
      user?.permissions?.includes("delivery_manifests.read_all"),
  )
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [search, setSearch] = useState("")
  const [transferStatusFilter, setTransferStatusFilter] =
    useState<WarehouseTransferStatusFilter>("")
  const [returnsOnly, setReturnsOnly] = useState(false)
  const [returnsCourierFilterId, setReturnsCourierFilterId] = useState("")
  const [page, setPage] = useState(1)
  const [lookupTrackingInput, setLookupTrackingInput] = useState("")
  const [returnDiscountInput, setReturnDiscountInput] = useState("")
  const [trackingResult, setTrackingResult] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"orders" | "shipments">("orders")
  const [manifestZoneId, setManifestZoneId] = useState("")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    merchantOrderId: string
    lineId: string
    customerName: string
    addressText: string
    locationText: string
    locationLink: string
    customerLat: string | null
    customerLng: string | null
  } | null>(null)

  useEffect(() => {
    setActiveTab("orders")
  }, [])

  const canSeeWarehouseDirectory =
    hasPlatformWarehouseScope(user) || isWarehouseAdmin(user)
  const accessDenied =
    !!user &&
    !isWarehouseAdmin(user) &&
    !user.warehouseId &&
    !hasPlatformWarehouseScope(user)

  const queueQueryKey = useMemo(
    () =>
      [
        "warehouse-orders",
        token,
        warehouseId,
        page,
        search,
        transferStatusFilter,
        returnsOnly,
        returnsOnly ? returnsCourierFilterId : "",
      ] as const,
    [
      token,
      warehouseId,
      page,
      search,
      transferStatusFilter,
      returnsOnly,
      returnsCourierFilterId,
    ],
  )

  const siteDetailWarehouseId = warehouseId

  const siteDetailQuery = useQuery({
    queryKey: ["warehouse-site-detail", token, siteDetailWarehouseId],
    queryFn: () => getWarehouseSite(token, siteDetailWarehouseId),
    enabled: !!token && !!siteDetailWarehouseId && !accessDenied,
  })

  const hub = siteDetailQuery.data

  /** Main hub: no parent branch. Sub-branch: `mainBranchId` set (and usually `mainBranch` populated from API). */
  const isMainHub =
    hub != null &&
    hub.mainBranchId == null &&
    hub.mainBranch == null

  /** Merchant-order queue + batch insight cards (main hub, orders tab only). */
  const merchantOrdersView = isMainHub && activeTab === "orders"
  const manifestsView = isMainHub && activeTab === "shipments"
  /** Standalone shipment list + shipment insight cards. */
  const shipmentsView =
    hub != null && (!isMainHub || (isMainHub && !manifestsView))
  /** Site info, zones, sub-branches — hidden on manifests tab for main hubs. */
  const warehouseHubDetailsVisible = hub != null && (!isMainHub || merchantOrdersView)
  /** Zone-link data is still needed on manifests tab for zone filters. */
  const warehouseSiteDataEnabled = hub != null && (!isMainHub || merchantOrdersView || manifestsView)

  useEffect(() => {
    if (hub != null && hub.mainBranchId != null) {
      setReturnsOnly(false)
    }
  }, [hub])

  const zoneLinksQuery = useQuery({
    queryKey: ["warehouse-zone-links", token, warehouseId],
    queryFn: () => getWarehouseZoneLinks(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied && warehouseSiteDataEnabled,
  })

  const zonesCatalogQuery = useQuery({
    queryKey: ["delivery-zones", token, "active-only"],
    queryFn: () => listDeliveryZones(token, { isActive: true }),
    enabled: !!token && !accessDenied && warehouseSiteDataEnabled,
    staleTime: 30_000,
  })

  const [deliveryZoneIds, setDeliveryZoneIds] = useState<string[]>([])
  const [pickupZoneIds, setPickupZoneIds] = useState<string[]>([])

  function toggleInList(prev: string[], id: string, nextChecked: boolean): string[] {
    const has = prev.includes(id)
    if (nextChecked && !has) return [...prev, id]
    if (!nextChecked && has) return prev.filter((x) => x !== id)
    return prev
  }

  const zoneLinksHydrated = useRef(false)
  useEffect(() => {
    if (zoneLinksHydrated.current) return
    const d = zoneLinksQuery.data
    if (!d) return
    setDeliveryZoneIds(d.deliveryZoneIds ?? [])
    setPickupZoneIds(d.pickupZoneIds ?? [])
    zoneLinksHydrated.current = true
  }, [zoneLinksQuery.data])

  const saveZoneLinksMut = useMutation({
    mutationFn: () =>
      setWarehouseZoneLinks({
        token,
        warehouseId,
        deliveryZoneIds,
        pickupZoneIds,
      }),
    onSuccess: () => {
      showToast(t("warehouse.zoneLinks.saved"), "success")
      void queryClient.invalidateQueries({ queryKey: ["warehouse-zone-links", token, warehouseId] })
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("warehouse.zoneLinks.saveFailed"), "error")
    },
  })

  const statsQuery = useQuery({
    queryKey: ["warehouse-stats", token, warehouseId],
    queryFn: () => getWarehouseStats(token, { warehouseId }),
    enabled: !!token && !!warehouseId && !accessDenied && merchantOrdersView,
    refetchInterval: 15000,
  })

  const queueQuery = useQuery({
    queryKey: queueQueryKey,
    queryFn: () =>
      listWarehouseOrders({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        transferStatus:
          transferStatusFilter === "" ? undefined : transferStatusFilter,
        returnsOnly,
        pickupCourierId:
          returnsOnly && returnsCourierFilterId.trim()
            ? returnsCourierFilterId.trim()
            : undefined,
        warehouseId,
      }),
    enabled:
      !!token &&
      !!warehouseId &&
      !accessDenied &&
      hub != null &&
      isMainHub &&
      activeTab === "orders",
    refetchInterval: 10000,
  })

  const couriersForReturnsFilterQuery = useQuery({
    queryKey: ["warehouse-couriers-returns", token],
    queryFn: () => getWarehousePickupCouriers({ token, warehouseId }),
    enabled:
      !!token &&
      !accessDenied &&
      (user?.permissions?.includes("warehouses.manage_transfer") ?? false) &&
      !!warehouseId &&
      ((isMainHub && returnsOnly && activeTab === "orders") || shipmentsView),
  })

  const standaloneQueryKey = useMemo(
    () =>
      [
        "warehouse-standalone-shipments",
        token,
        warehouseId,
        page,
        search,
        manifestsView ? manifestZoneId : "",
      ] as const,
    [token, warehouseId, page, search, manifestsView, manifestZoneId],
  )

  const standaloneQuery = useQuery({
    queryKey: standaloneQueryKey,
    queryFn: () =>
      listWarehouseStandaloneShipments({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        resolvedDeliveryZoneId:
          manifestsView && manifestZoneId.trim() ? manifestZoneId.trim() : undefined,
        warehouseId,
      }),
    enabled:
      !!token &&
      !!warehouseId &&
      !accessDenied &&
      hub != null &&
      (shipmentsView || manifestsView),
    refetchInterval: 10000,
  })

  const shipmentStatusCountsOnPage = useMemo(
    () => countShipmentStatusesOnPage(standaloneQuery.data?.shipments ?? []),
    [standaloneQuery.data?.shipments],
  )

  const shipmentHubTotal = standaloneQuery.data?.total ?? 0

  const canManageTransfer =
    user?.permissions?.includes("warehouses.manage_transfer") ?? false
  const canScanIn =
    user?.permissions?.includes("warehouses.scan_in") === true ||
    canManageTransfer ||
    user?.permissions?.includes("warehouses.manage") === true
  const canScanOut =
    user?.permissions?.includes("warehouses.scan_out") === true ||
    canManageTransfer ||
    user?.permissions?.includes("warehouses.manage") === true
  const canReadPackagingStock =
    user?.permissions?.includes("packaging_materials.read") ?? false

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token, warehouseId] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-queue", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-orders", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-standalone-shipments", token, warehouseId] }),
      queryClient.invalidateQueries({
        queryKey: ["warehouse-hub-packaging-stock", token, warehouseId],
      }),
    ])
  }, [queryClient, token, warehouseId])

  const patchQueueAfterScanIn = useCallback(
    (res: {
      merchantOrderId: string
      scanResult: "SCANNED" | "ALREADY_SCANNED"
    }) => {
      const now = new Date().toISOString()
      const nextTransfer = "IN_WAREHOUSE"
      queryClient.setQueriesData<WarehouseOrdersResponse>(
        { queryKey: ["warehouse-orders", token], exact: false },
        (old) => {
          if (!old) return old
          const idx = old.merchantOrders.findIndex(
            (r) =>
              r.id === res.merchantOrderId ||
              r.merchantOrderId === res.merchantOrderId,
          )
          if (idx < 0) return old

          if (transferStatusFilter && nextTransfer !== transferStatusFilter) {
            const merchantOrders = old.merchantOrders.filter((_, i) => i !== idx)
            return {
              ...old,
              merchantOrders,
              total: Math.max(0, old.total - 1),
            }
          }

          const merchantOrders = old.merchantOrders.map((r, i) => {
            if (i !== idx) return r
            if (res.scanResult === "ALREADY_SCANNED") {
              return { ...r, updatedAt: now }
            }
            return { ...r, transferStatus: nextTransfer, updatedAt: now }
          })
          return { ...old, merchantOrders }
        },
      )
    },
    [queryClient, token, transferStatusFilter],
  )

  const patchQueueAfterScanOut = useCallback(
    (detail: ScanOutQueuePatch) => {
      const batchId = detail.id
      const nextTransfer = detail.transferStatus
      if (!batchId || !nextTransfer) return
      const updatedAt = detail.updatedAt ?? new Date().toISOString()
      queryClient.setQueriesData<WarehouseOrdersResponse>(
        { queryKey: ["warehouse-orders", token], exact: false },
        (old) => {
          if (!old) return old
          const idx = old.merchantOrders.findIndex(
            (r) => r.id === batchId || r.merchantOrderId === batchId,
          )
          if (idx < 0) return old

          if (transferStatusFilter && nextTransfer !== transferStatusFilter) {
            const merchantOrders = old.merchantOrders.filter((_, i) => i !== idx)
            return {
              ...old,
              merchantOrders,
              total: Math.max(0, old.total - 1),
            }
          }

          const merchantOrders = old.merchantOrders.map((r, i) =>
            i === idx ? { ...r, transferStatus: nextTransfer, updatedAt } : r,
          )
          return { ...old, merchantOrders }
        },
      )
    },
    [queryClient, token, transferStatusFilter],
  )

  const handleWarehouseScan = useCallback(
    async (mode: WarehouseScanMode, trackingNumber: string) => {
      if (!warehouseId.trim()) {
        throw new Error("Missing warehouse id")
      }
      if (mode === "in") {
        const res = await scanShipmentIn({ token, warehouseId, trackingNumber })
        const msgKey =
          res.scanResult === "ALREADY_SCANNED"
            ? "warehouse.feedback.scanInAlreadyScanned"
            : "warehouse.feedback.scanInSuccess"
        showToast(t(msgKey), res.scanResult === "ALREADY_SCANNED" ? "info" : "success")
        patchQueueAfterScanIn(res)
      } else {
        const raw = await scanShipmentOut({ token, warehouseId, trackingNumber })
        showToast(t("warehouse.feedback.scanOutSuccess"), "success")
        const patch = readScanOutQueuePatch(raw)
        if (patch) patchQueueAfterScanOut(patch)
      }
      await refreshData()
      if (mode === "in") {
        await queryClient.refetchQueries({
          queryKey: ["warehouse-standalone-shipments", token, warehouseId],
          type: "active",
        })
      }
    },
    [
      token,
      warehouseId,
      t,
      refreshData,
      patchQueueAfterScanIn,
      patchQueueAfterScanOut,
      queryClient,
    ],
  )

  const receiveReturnMutation = useMutation({
    mutationFn: () => {
      const payload = scanPayloadFromInput(lookupTrackingInput)
      return receiveWarehouseReturn({
        token,
        ...payload,
        returnDiscountAmount:
          returnDiscountInput.trim() === ""
            ? undefined
            : Number(returnDiscountInput),
      })
    },
    onSuccess: async () => {
      showToast(t("warehouse.feedback.returnSuccess"), "success")
      await refreshData()
      setLookupTrackingInput("")
      setReturnDiscountInput("")
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const createTransferTaskMutation = useMutation({
    mutationFn: (params: {
      shipmentId: string
      pickupCourierId: string
      toWarehouseId: string
      transferDate: string
    }) =>
      createShipmentPlannedTask({
        token,
        shipmentId: params.shipmentId,
        body: {
          type: "TRANSFER",
          pickupCourierId: params.pickupCourierId,
          toWarehouseId: params.toWarehouseId,
          transferDate: params.transferDate,
        },
      }),
    onSuccess: async (out) => {
      const manifestId = out?.manifestId ?? null
      showToast(
        manifestId
          ? t("warehouse.feedback.transferManifestDispatched", {
              defaultValue: "Transfer manifest dispatched. Manifest ID: {{id}}",
              id: manifestId,
            })
          : t("warehouse.feedback.transferTaskCreated", {
              defaultValue: "Transfer task created successfully.",
            }),
        "success",
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["warehouse-standalone-shipments", token, warehouseId],
        }),
        queryClient.invalidateQueries({ queryKey: ["warehouse-orders", token] }),
      ])
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const trackingMutation = useMutation({
    mutationFn: () =>
      getWarehouseTracking({
        token,
        trackingNumber:
          scanPayloadFromInput(lookupTrackingInput).trackingNumber ?? "",
      }),
    onSuccess: (data) => {
      const row = data as { transferStatus?: string; updatedAt?: string }
      if (!row.transferStatus || !row.updatedAt) {
        setTrackingResult("")
        return
      }
      const label = backendShipmentTransferLabel(t, row.transferStatus)
      setTrackingResult(`${label} · ${formatDateTime(row.updatedAt, locale)}`)
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
      setTrackingResult("")
    },
  })

  const totalPages = Math.max(
    1,
    Math.ceil((queueQuery.data?.total ?? 0) / (queueQuery.data?.pageSize ?? 20)),
  )
  const standaloneTotalPages = Math.max(
    1,
    Math.ceil((standaloneQuery.data?.total ?? 0) / (standaloneQuery.data?.pageSize ?? 20)),
  )
  const stats = statsQuery.data
  const periodStats = stats?.periodMetrics
  const lifetimeStats = stats?.lifetimeMetrics
  const periodStatValues = transferStatCards.map((c) => periodStats?.[c.statKey] ?? 0)
  const totalPeriodStat = periodStatValues.reduce((sum, value) => sum + value, 0)

  const periodRangeLabel =
    stats?.period != null
      ? `${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(stats.period.from))} – ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(stats.period.to))}`
      : null

  if (!warehouseId) {
    return (
      <Layout title={t("warehouse.detail.invalidTitle")}>
        <p className="text-muted-foreground text-sm">{t("warehouse.detail.invalidDescription")}</p>
      </Layout>
    )
  }

  if (
    user &&
    isWarehouseStaff(user) &&
    user.warehouseId &&
    warehouseId &&
    user.warehouseId !== warehouseId
  ) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user.warehouseId)}`}
        replace
      />
    )
  }

  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  const handleSubBranchClick = (subBranchId: string) => {
    nav(`/warehouses/${encodeURIComponent(subBranchId)}`)
  }

  const getNotApplicable = () => t("warehouse.notApplicable") || "—"

  return (
    <Layout title={hub?.name ?? t("warehouse.detail.pageTitle")}>
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

        {!manifestsView ? (
          <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-xl">
                <Boxes className="size-6" aria-hidden />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {hub?.name ?? t("warehouse.detail.pageTitle")}
                </CardTitle>
                <CardDescription>{t("warehouse.detail.subtitle")}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {siteDetailWarehouseId && warehouseHubDetailsVisible ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">{t("warehouse.hubSnapshot.title")}</h2>
              <p className="text-muted-foreground text-sm">{t("warehouse.hubSnapshot.description")}</p>
            </div>
            {siteDetailQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}
            {siteDetailQuery.error ? (
              <p className="text-destructive text-sm">
                {(siteDetailQuery.error as Error).message}
              </p>
            ) : null}
            {hub ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Warehouse className="size-4" aria-hidden />
                        {t("warehouse.siteDetail.hubCardTitle")}
                      </CardTitle>
                      <CardDescription>{t("warehouse.siteDetail.hubCardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-2 text-sm">
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colName")}</span>{" "}
                        {hub.name}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">
                          {t("warehouse.sites.colGovernorate")}
                        </span>{" "}
                        {hub.governorate}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colZone")}</span>{" "}
                        {hub.zone ?? getNotApplicable()}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colCode")}</span>{" "}
                        {hub.code ?? getNotApplicable()}
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colAddress")}</span>{" "}
                        {hub.address?.trim() ? hub.address : getNotApplicable()}
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground font-medium">
                          {t("warehouse.sites.colCoordinates")}
                        </span>
                        <CoordinatesMapLink latitude={hub.latitude} longitude={hub.longitude} />
                      </p>
                      <p>
                        <span className="text-foreground font-medium">{t("warehouse.sites.colStatus")}</span>{" "}
                        {hub.isActive
                          ? t("warehouse.sites.statusActive")
                          : t("warehouse.sites.statusInactive")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserRound className="size-4" aria-hidden />
                        {t("warehouse.siteDetail.adminCardTitle")}
                      </CardTitle>
                      <CardDescription>{t("warehouse.siteDetail.adminCardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("warehouse.siteDetail.staffCount")}</span>
                        <p className="text-foreground text-2xl font-semibold tabular-nums">
                          {hub.staffCount}
                        </p>
                      </div>
                      {hub.admin ? (
                        <div className="border-border space-y-1 rounded-lg border p-3">
                          <p className="text-foreground font-medium">{hub.admin.fullName}</p>
                          <p className="text-muted-foreground">{hub.admin.email}</p>
                          {!hub.admin.isActive ? (
                            <p className="text-destructive text-xs">
                              {t("warehouse.siteDetail.adminInactive")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{t("warehouse.siteDetail.noAdmin")}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Boxes className="size-4" aria-hidden />
                      {t("warehouse.zoneLinks.title")}
                    </CardTitle>
                    <CardDescription>{t("warehouse.zoneLinks.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {zoneLinksQuery.isLoading || zonesCatalogQuery.isLoading ? (
                      <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
                    ) : zoneLinksQuery.error || zonesCatalogQuery.error ? (
                      <p className="text-destructive text-sm">
                        {((zoneLinksQuery.error || zonesCatalogQuery.error) as Error).message}
                      </p>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="grid gap-2">
                          <label className="text-muted-foreground text-xs font-medium">
                            {t("warehouse.zoneLinks.deliveryZones")}
                          </label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" className="justify-between">
                                {deliveryZoneIds.length
                                  ? `${deliveryZoneIds.length} selected`
                                  : t("common.select")}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[22rem]">
                              <DropdownMenuLabel>
                                {t("warehouse.zoneLinks.deliveryZones")}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(zonesCatalogQuery.data?.zones ?? []).map((z) => {
                                const label = [
                                  z.governorate,
                                  z.areaZone ?? "",
                                  z.name ?? "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                                const checked = deliveryZoneIds.includes(z.id)
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={z.id}
                                    checked={checked}
                                    onCheckedChange={(v) =>
                                      setDeliveryZoneIds((prev) =>
                                        toggleInList(prev, z.id, Boolean(v)),
                                      )
                                    }
                                  >
                                    {label}
                                  </DropdownMenuCheckboxItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-muted-foreground text-xs font-medium">
                            {t("warehouse.zoneLinks.pickupZones")}
                          </label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" className="justify-between">
                                {pickupZoneIds.length
                                  ? `${pickupZoneIds.length} selected`
                                  : t("common.select")}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[22rem]">
                              <DropdownMenuLabel>
                                {t("warehouse.zoneLinks.pickupZones")}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(zonesCatalogQuery.data?.zones ?? []).map((z) => {
                                const label = [
                                  z.governorate,
                                  z.areaZone ?? "",
                                  z.name ?? "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                                const checked = pickupZoneIds.includes(z.id)
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={z.id}
                                    checked={checked}
                                    onCheckedChange={(v) =>
                                      setPickupZoneIds((prev) =>
                                        toggleInList(prev, z.id, Boolean(v)),
                                      )
                                    }
                                  >
                                    {label}
                                  </DropdownMenuCheckboxItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        disabled={
                          saveZoneLinksMut.isPending ||
                          !token ||
                          accessDenied ||
                          !warehouseId
                        }
                        onClick={() => saveZoneLinksMut.mutate()}
                      >
                        {t("common.save")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {hub.subBranches && hub.subBranches.length > 0 && !hub.mainBranchId
                  ? hub.subBranches.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSubBranchClick(sub.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubBranchClick(sub.id)}
                      >
                        <p className="font-medium text-sm">{sub.name}</p>
                        <p className="text-muted-foreground text-xs">{sub.governorate}{sub.zone ? ` · ${sub.zone}` : ""}</p>
                      </div>
                    ))
                  : null}
              </>
            ) : null}
          </div>
        ) : null}

        {merchantOrdersView ? (
          <div className="space-y-3">
            {periodRangeLabel ? (
              <p className="text-muted-foreground text-sm">
                {t("warehouse.insights.periodFromSettings")}: {periodRangeLabel}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {transferStatCards.map((c) => (
                <StatCard
                  key={c.statKey}
                  title={t(c.titleI18nKey)}
                  value={periodStats?.[c.statKey] ?? 0}
                  percentage={toPercentFromTotal(periodStats?.[c.statKey] ?? 0, totalPeriodStat)}
                  icon={c.icon}
                  accent={c.accent}
                  secondaryValue={lifetimeStats?.[c.statKey] ?? 0}
                  secondaryLabel={t("warehouse.insights.allTime")}
                />
              ))}
            </div>
          </div>
        ) : null}

        {!accessDenied && warehouseId.trim() && canReadPackagingStock ? (
          <WarehouseHubPackagingStockSection token={token} warehouseId={warehouseId.trim()} />
        ) : null}

        {shipmentsView ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">
                {t("warehouse.shipmentInsights.title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("warehouse.shipmentInsights.subtitle")}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("warehouse.shipmentInsights.hubTotalLabel")}{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {(standaloneQuery.data?.total ?? 0).toLocaleString(locale)}
              </span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {shipmentSnapshotStatusCards.map((c) => {
                const v = shipmentStatusCountsOnPage[c.status] ?? 0
                return (
                  <StatCard
                    key={c.status}
                    title={t(c.titleI18nKey)}
                    value={v}
                    percentage={toPercentFromTotal(v, shipmentHubTotal)}
                    icon={c.icon}
                    accent={c.accent}
                  />
                )
              })}
            </div>
          </div>
        ) : null}

        {(!isMainHub || merchantOrdersView) ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.operations.title")}</CardTitle>
            <CardDescription>{t("warehouse.operations.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-2 text-sm">
                {t("warehouse.operations.scannerHint")}
              </p>
              <WarehouseScanner
                warehouseId={warehouseId}
                onScan={handleWarehouseScan}
                allowScanIn={canScanIn}
                allowScanOut={canScanOut}
                disabled={!token || accessDenied || (!canScanIn && !canScanOut)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                value={lookupTrackingInput}
                onChange={(e) => setLookupTrackingInput(e.target.value)}
                placeholder={t("warehouse.operations.lookupTrackingPlaceholder")}
              />
              <Input
                value={returnDiscountInput}
                onChange={(e) => setReturnDiscountInput(e.target.value)}
                placeholder={t("warehouse.operations.discountPlaceholder")}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => receiveReturnMutation.mutate()}
                disabled={
                  !lookupTrackingInput.trim() || receiveReturnMutation.isPending
                }
              >
                {receiveReturnMutation.isPending ? t("common.processing") : t("warehouse.operations.receiveReturn")}
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const payload = scanPayloadFromInput(lookupTrackingInput)
                  if (payload.shipmentLineId) {
                    showToast(t("warehouse.operations.trackNeedsTracking"), "error")
                    return
                  }
                  if (!payload.trackingNumber) {
                    showToast(t("warehouse.operations.enterValidTracking"), "error")
                    return
                  }
                  trackingMutation.mutate()
                }}
                disabled={!lookupTrackingInput.trim() || trackingMutation.isPending}
              >
                <Search className="size-5" aria-hidden />
                {trackingMutation.isPending ? t("common.searching") : t("warehouse.operations.track")}
              </Button>
            </div>

            {trackingResult ? (
              <p className="text-muted-foreground text-sm">{trackingResult}</p>
            ) : null}
          </CardContent>
        </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>
                  {isMainHub && activeTab === "orders"
                    ? t("warehouse.queue.titleTransfers")
                    : t("warehouse.queue.titleShipments")}
                </CardTitle>
                <CardDescription>
                  {isMainHub && activeTab === "orders"
                    ? t("warehouse.queue.descriptionTransfers")
                    : t("warehouse.queue.descriptionShipments")}
                </CardDescription>
              </div>
              {isMainHub ? (
                <div className="flex rounded-lg border p-0.5">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1 text-sm transition-colors ${
                      activeTab === "orders"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("orders")}
                  >
                    {t("warehouse.queue.tabOrders", { defaultValue: "Transfer" })}
                  </button>
                  {canOpenManifests ? (
                    <Link
                      to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests`}
                      className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1 text-sm transition-colors"
                    >
                      {t("warehouse.queue.tabShipments", {
                        defaultValue: "Delivery Manifests",
                      })}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={
                isMainHub && activeTab === "orders"
                  ? "grid gap-3 md:grid-cols-[2fr_1fr_auto]"
                  : "grid gap-3"
              }
            >
              {!manifestsView ? (
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder={t("warehouse.queue.searchPlaceholder")}
                />
              ) : null}
              {isMainHub && activeTab === "orders" ? (
                <>
                  <select
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                    value={transferStatusFilter}
                    onChange={(e) => {
                      setTransferStatusFilter(e.target.value as WarehouseTransferStatusFilter)
                      setPage(1)
                    }}
                  >
                    {warehouseTransferStatusFilters.map((value) => (
                      <option key={value || "all"} value={value}>
                        {value
                          ? backendShipmentTransferLabel(t, value)
                          : t("warehouse.queue.allStatuses")}
                      </option>
                    ))}
                  </select>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={returnsOnly}
                      onChange={(e) => {
                        setReturnsOnly(e.target.checked)
                        if (!e.target.checked) setReturnsCourierFilterId("")
                        setPage(1)
                      }}
                    />
                    {t("warehouse.queue.returnsOnly")}
                  </label>
                </>
              ) : manifestsView ? (
                <div className="flex flex-wrap items-end gap-3">
                  <select
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-[12rem] rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                    value={manifestZoneId}
                    onChange={(e) => {
                      setManifestZoneId(e.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">{t("warehouse.manifests.allZones")}</option>
                    {(zoneLinksQuery.data?.deliveryZones ?? []).map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name?.trim() || z.id}
                      </option>
                    ))}
                  </select>
                  <Button type="button" asChild>
                    <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests`}>
                      {t("warehouse.manifests.title")}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

            {isMainHub && activeTab === "orders" && returnsOnly ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-muted-foreground text-sm whitespace-nowrap">
                  {t("warehouse.queue.filterReturnsByPickupCourier")}
                </label>
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-[12rem] rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                  value={returnsCourierFilterId}
                  onChange={(e) => {
                    setReturnsCourierFilterId(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">{t("warehouse.queue.allPickupCouriers")}</option>
                  {(couriersForReturnsFilterQuery.data?.couriers ?? []).map((c: PickupCourierRow) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName?.trim() || t("warehouse.queue.unnamedCourier")}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {siteDetailQuery.isPending ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : siteDetailQuery.isError ? (
              <p className="text-destructive text-sm">
                {(siteDetailQuery.error as Error).message}
              </p>
            ) : manifestsView ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("warehouse.manifests.title")}</CardTitle>
                  <CardDescription>
                    Select CS-confirmed shipments, assign a delivery courier, and dispatch from the manifest workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button type="button" asChild>
                    <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests`}>
                      Open manifest workspace
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : isMainHub && activeTab === "orders" ? (
              <>
                {queueQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
                ) : null}

                {queueQuery.error ? (
                  <p className="text-destructive text-sm">
                    {(queueQuery.error as Error).message}
                  </p>
                ) : null}

                <div className="overflow-x-auto rounded-lg border">
                  <Table className="min-w-[56rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("warehouse.table.merchant")}</TableHead>
                        <TableHead>{t("warehouse.table.orderCount")}</TableHead>
                        <TableHead>{t("warehouse.table.totalValue")}</TableHead>
                        <TableHead>{t("warehouse.table.batchTransfer")}</TableHead>
                        <TableHead>{t("warehouse.table.batchResolution")}</TableHead>
                        <TableHead>{t("warehouse.table.pickupCourier")}</TableHead>
                        <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(queueQuery.data?.merchantOrders ?? []).map((row) => {
                    const fmtMoney = (raw: string | number) => {
                      const num = typeof raw === 'number' ? raw : Number.parseFloat(
                        String(raw ?? "").replace(/,/g, "").trim(),
                      )
                      if (!Number.isFinite(num)) return getNotApplicable()
                      return new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "EGP",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }).format(num)
                    }
                    return (
                      <TableRow
                        key={row.id}
                        className={`hover:bg-muted/50 cursor-pointer ${warehouseTransferRowTone(row.transferStatus)}`}
                        onClick={() =>
                          nav(
                            `/warehouses/${encodeURIComponent(warehouseId)}/transfers/${encodeURIComponent(row.id)}`,
                          )
                        }
                      >
                        <TableCell>{row.merchant?.displayName ?? getNotApplicable()}</TableCell>
                        <TableCell>{row.orderCount}</TableCell>
                        <TableCell>{fmtMoney(row.totalShipmentValue)}</TableCell>
                        <TableCell className="max-w-[12rem] text-xs whitespace-normal">
                          <MerchantBatchStatusWithWarehouse
                            transferStatus={row.transferStatus}
                            assignedWarehouseId={row.assignedWarehouse?.id}
                            assignedWarehouseName={row.assignedWarehouse?.name}
                            contextWarehouseId={warehouseId}
                          />
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {batchResolutionLabel(row, t)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.pickupCourier?.fullName ?? getNotApplicable()}
                        </TableCell>
                        <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {t("warehouse.queue.pagination", {
                  page,
                  total: queueQuery.data?.total ?? 0,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  {t("cs.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((v) => v + 1)}
                >
                  {t("cs.pagination.next")}
                </Button>
              </div>
            </div>
              </>
            ) : (
              <>
                {standaloneQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
                ) : null}

                {standaloneQuery.error ? (
                  <p className="text-destructive text-sm">
                    {(standaloneQuery.error as Error).message}
                  </p>
                ) : null}

                <div className="overflow-x-auto rounded-lg border">
                  <Table className="min-w-[40rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("warehouse.table.trackingNumber")}</TableHead>
                        <TableHead>{t("warehouse.table.customer")}</TableHead>
                        <TableHead>{t("warehouse.table.merchant")}</TableHead>
                        <TableHead>{t("warehouse.table.status")}</TableHead>
                        <TableHead>{t("warehouse.table.transferredFromWarehouse")}</TableHead>
                        <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                        <TableHead>{t("warehouse.manifests.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(standaloneQuery.data?.shipments ?? []).map((row: WarehouseStandaloneShipmentRow) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() =>
                            nav(
                              warehouseShipmentLineDetailPath(warehouseId, row.id),
                            )
                          }
                        >
                          <TableCell>{row.trackingNumber ?? getNotApplicable()}</TableCell>
                          <TableCell>{row.customerName ?? getNotApplicable()}</TableCell>
                          <TableCell>{row.merchantName ?? getNotApplicable()}</TableCell>
                          <TableCell>
                            <OrderDeliveryStatusWithWarehouse
                              status={row.status}
                              locationWarehouseId={row.currentWarehouseId}
                              locationWarehouseName={row.currentWarehouseName}
                              contextWarehouseId={warehouseId}
                            />
                          </TableCell>
                          <TableCell>
                            {row.transferredFromWarehouseName ?? getNotApplicable()}
                          </TableCell>
                          <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                !canManageTransfer ||
                                row.status !== "IN_WAREHOUSE" ||
                                createTransferTaskMutation.isPending
                              }
                              onClick={() => {
                                const pickupCourierId =
                                  couriersForReturnsFilterQuery.data?.couriers?.[0]?.id ?? null
                                const toWarehouseId =
                                  row.transferTargetWarehouseId ??
                                  hub?.mainBranchId ??
                                  null
                                if (!pickupCourierId) {
                                  showToast(
                                    t("warehouse.feedback.missingPickupCourier", {
                                      defaultValue:
                                        "No active pickup courier assigned to this warehouse.",
                                    }),
                                    "error",
                                  )
                                  return
                                }
                                if (!toWarehouseId) {
                                  showToast(
                                    t("warehouse.feedback.missingTransferDestination", {
                                      defaultValue:
                                        "Transfer destination warehouse is not configured for this shipment.",
                                    }),
                                    "error",
                                  )
                                  return
                                }
                                createTransferTaskMutation.mutate({
                                  shipmentId: row.id,
                                  pickupCourierId,
                                  toWarehouseId,
                                  transferDate: new Date().toISOString().slice(0, 10),
                                })
                              }}
                            >
                              {t("warehouse.queue.createTransferTask", {
                                defaultValue: "Create Transfer Task",
                              })}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-sm">
                    {t("warehouse.queue.pagination", {
                      page,
                      total: standaloneQuery.data?.total ?? 0,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((v) => v - 1)}
                    >
                      {t("cs.pagination.prev")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={page >= standaloneTotalPages}
                      onClick={() => setPage((v) => v + 1)}
                    >
                      {t("cs.pagination.next")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ShipmentCsConfirmLocationDialog
        open={confirmDialogOpen && confirmDialogData != null}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open)
          if (!open) setConfirmDialogData(null)
        }}
        token={token}
        lineId={confirmDialogData?.lineId ?? ""}
        customerName={confirmDialogData?.customerName ?? ""}
        initialAddressText={confirmDialogData?.addressText ?? ""}
        initialLocationText={confirmDialogData?.locationText ?? ""}
        initialLocationLink={confirmDialogData?.locationLink ?? ""}
        initialLat={confirmDialogData?.customerLat ?? null}
        initialLng={confirmDialogData?.customerLng ?? null}
        extraInvalidateQueryKeys={[
          ["warehouse-standalone-shipments", token, warehouseId],
          ["courier-manifests", token, warehouseId],
        ]}
      />
    </Layout>
  )
}