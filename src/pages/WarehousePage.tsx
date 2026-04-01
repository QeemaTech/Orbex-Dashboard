import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Boxes, PackageCheck, RotateCcw, Search, Truck } from "react-lucid"
import { useTranslation } from "react-i18next"

import {
  assignWarehouseShipment,
  getWarehouseStats,
  getWarehouseTracking,
  listWarehouseQueue,
  receiveWarehouseReturn,
  scanShipmentIn,
  scanShipmentOut,
} from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

const statuses = [
  "",
  "CONFIRMED_BY_CS",
  "IN_WAREHOUSE",
  "OUT_FOR_DELIVERY",
  "ASSIGNED",
  "REJECTED",
  "POSTPONED",
] as const

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

export function WarehousePage() {
  const { t, i18n } = useTranslation()
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [returnsOnly, setReturnsOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [trackingInput, setTrackingInput] = useState("")
  const [courierIdInput, setCourierIdInput] = useState("")
  const [returnDiscountInput, setReturnDiscountInput] = useState("")
  const [selectedShipmentId, setSelectedShipmentId] = useState("")
  const [trackingResult, setTrackingResult] = useState<string>("")

  const queueQueryKey = useMemo(
    () =>
      [
        "warehouse-queue",
        token,
        page,
        search,
        status,
        returnsOnly,
      ] as const,
    [token, page, search, status, returnsOnly],
  )

  const statsQuery = useQuery({
    queryKey: ["warehouse-stats", token],
    queryFn: () => getWarehouseStats(token),
    enabled: !!token,
    refetchInterval: 15000,
  })

  const queueQuery = useQuery({
    queryKey: queueQueryKey,
    queryFn: () =>
      listWarehouseQueue({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        status: status || undefined,
        returnsOnly,
      }),
    enabled: !!token,
    refetchInterval: 10000,
  })

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats", token] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-queue", token] }),
    ])
  }

  const scanInMutation = useMutation({
    mutationFn: () =>
      scanShipmentIn({
        token,
        trackingNumber: trackingInput.trim(),
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.scanInSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const scanOutMutation = useMutation({
    mutationFn: () =>
      scanShipmentOut({
        token,
        trackingNumber: trackingInput.trim(),
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.scanOutSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const assignMutation = useMutation({
    mutationFn: (payload: { shipmentId: string; courierId: string }) =>
      assignWarehouseShipment({
        token,
        shipmentId: payload.shipmentId,
        courierId: payload.courierId,
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.assignmentSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const receiveReturnMutation = useMutation({
    mutationFn: () =>
      receiveWarehouseReturn({
        token,
        trackingNumber: trackingInput.trim(),
        returnDiscountAmount:
          returnDiscountInput.trim() === ""
            ? undefined
            : Number(returnDiscountInput),
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.returnSuccess"), "success")
      await refreshData()
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const trackingMutation = useMutation({
    mutationFn: () =>
      getWarehouseTracking({
        token,
        trackingNumber: trackingInput.trim(),
      }),
    onSuccess: (data) => {
      const row = data as {
        customerName: string
        currentStatus: string
        updatedAt: string
      }
      setTrackingResult(
        `${row.customerName} · ${t(`cs.shipmentStatus.${row.currentStatus}`)} · ${formatDateTime(
          row.updatedAt,
          locale,
        )}`,
      )
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

  return (
    <Layout title={t("warehouse.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Boxes className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("warehouse.pageTitle")}</CardTitle>
              <CardDescription>{t("warehouse.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
          <StatCard
            title={t("warehouse.stats.awaitingScanIn")}
            value={statsQuery.data?.awaitingScanIn ?? 0}
            icon={PackageCheck}
            accent="warning"
          />
          <StatCard
            title={t("warehouse.stats.inWarehouse")}
            value={statsQuery.data?.inWarehouse ?? 0}
            icon={Boxes}
            accent="primary"
          />
          <StatCard
            title={t("warehouse.stats.readyForAssignment")}
            value={statsQuery.data?.readyForAssignment ?? 0}
            icon={Truck}
            accent="success"
          />
          <StatCard
            title={t("warehouse.stats.assigned")}
            value={statsQuery.data?.assigned ?? 0}
            icon={Truck}
            accent="primary"
          />
          <StatCard
            title={t("warehouse.stats.returnsPending")}
            value={statsQuery.data?.returnsPending ?? 0}
            icon={RotateCcw}
            accent="destructive"
          />
          <StatCard
            title={t("warehouse.stats.returnsReceivedToday")}
            value={statsQuery.data?.returnsReceivedToday ?? 0}
            icon={RotateCcw}
            accent="success"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.operations.title")}</CardTitle>
            <CardDescription>{t("warehouse.operations.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder={t("warehouse.operations.trackingPlaceholder")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => scanInMutation.mutate()}
                disabled={!trackingInput.trim() || scanInMutation.isPending}
              >
                {t("warehouse.operations.scanIn")}
              </Button>
              <Button
                type="button"
                onClick={() => scanOutMutation.mutate()}
                disabled={!trackingInput.trim() || scanOutMutation.isPending}
              >
                {t("warehouse.operations.scanOut")}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                value={returnDiscountInput}
                onChange={(e) => setReturnDiscountInput(e.target.value)}
                placeholder={t("warehouse.operations.discountPlaceholder")}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => receiveReturnMutation.mutate()}
                disabled={!trackingInput.trim() || receiveReturnMutation.isPending}
              >
                {t("warehouse.operations.receiveReturn")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => trackingMutation.mutate()}
                disabled={!trackingInput.trim() || trackingMutation.isPending}
              >
                <Search className="size-4" aria-hidden />
                {t("warehouse.operations.track")}
              </Button>
            </div>

            {trackingResult ? (
              <p className="text-muted-foreground text-sm">{trackingResult}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.queue.title")}</CardTitle>
            <CardDescription>{t("warehouse.queue.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t("warehouse.queue.searchPlaceholder")}
              />
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                {statuses.map((value) => (
                  <option key={value || "all"} value={value}>
                    {value
                      ? t(`cs.shipmentStatus.${value}`)
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
                    setPage(1)
                  }}
                />
                {t("warehouse.queue.returnsOnly")}
              </label>
            </div>

            {queueQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}

            {queueQuery.error ? (
              <p className="text-destructive text-sm">
                {(queueQuery.error as Error).message}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[64rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.table.trackingNumber")}</TableHead>
                    <TableHead>{t("warehouse.table.customer")}</TableHead>
                    <TableHead>{t("warehouse.table.merchant")}</TableHead>
                    <TableHead>{t("warehouse.table.status")}</TableHead>
                    <TableHead>{t("warehouse.table.courier")}</TableHead>
                    <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                    <TableHead>{t("warehouse.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queueQuery.data?.shipments ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.trackingNumber ?? "—"}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.merchant?.displayName ?? "—"}</TableCell>
                      <TableCell>{t(`cs.shipmentStatus.${row.currentStatus}`)}</TableCell>
                      <TableCell>{row.courier?.fullName ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-36"
                            placeholder={t("warehouse.queue.courierIdPlaceholder")}
                            value={selectedShipmentId === row.id ? courierIdInput : ""}
                            onChange={(e) => {
                              setSelectedShipmentId(row.id)
                              setCourierIdInput(e.target.value)
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedShipmentId(row.id)
                              assignMutation.mutate({
                                shipmentId: row.id,
                                courierId: courierIdInput.trim(),
                              })
                            }}
                            disabled={
                              assignMutation.isPending ||
                              selectedShipmentId !== row.id ||
                              !courierIdInput.trim()
                            }
                          >
                            {t("warehouse.queue.assign")}
                          </Button>
                        </div>
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
