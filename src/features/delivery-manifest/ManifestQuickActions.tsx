import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  dispatchDeliveryManifest,
  getDispatchPreview,
  lockDeliveryManifest,
  type DeliveryManifestListRow,
} from "@/api/delivery-manifests-api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { showToast } from "@/lib/toast"

type Props = {
  token: string
  manifest: DeliveryManifestListRow
  canManage: boolean
}

export function ManifestQuickActions({ token, manifest, canManage }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = useState(false)

  const canLock = canManage && manifest.status === "DRAFT"
  const canDispatch = canManage && manifest.status === "LOCKED"

  const lockMutation = useMutation({
    mutationFn: () => lockDeliveryManifest({ token, manifestId: manifest.id }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.lockSuccess", { defaultValue: "Manifest locked" }), "success")
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifests-list"] })
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifests-global"] })
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifest", "detail", token, manifest.id] })
    },
    onError: (e: Error) => showToast(e.message, "error"),
  })

  const dispatchPreviewQuery = useQuery({
    queryKey: ["delivery-manifest", "dispatch-preview", token, manifest.id],
    queryFn: () => getDispatchPreview({ token, manifestId: manifest.id }),
    enabled: !!token && dispatchConfirmOpen,
    retry: false,
  })

  const hasDispatchErrors = (dispatchPreviewQuery.data?.errors.length ?? 0) > 0

  const dispatchSummaryLine = useMemo(() => {
    const d = dispatchPreviewQuery.data
    if (!d) return null
    const courier = d.summary.courier.fullName?.trim() || d.summary.courier.id
    const zone = d.summary.zone.name?.trim() || d.summary.zone.id
    return `${courier} • ${zone} • ${d.summary.shipmentCount} shipments • COD ${d.summary.codTotalEgp.toFixed(2)} EGP`
  }, [dispatchPreviewQuery.data])

  const dispatchMutation = useMutation({
    mutationFn: () => dispatchDeliveryManifest({ token, manifestId: manifest.id }),
    onSuccess: async () => {
      showToast(
        t("warehouse.manifests.dispatchSuccess", {
          defaultValue: "Delivery tasks created. Scan shipments out to move them OUT_FOR_DELIVERY.",
        }),
        "success",
      )
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifests-list"] })
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifests-global"] })
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifest", "detail", token, manifest.id] })
    },
    onError: (e: Error) => showToast(e.message, "error"),
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canLock || lockMutation.isPending}
        onClick={() => lockMutation.mutate()}
        title={
          !canManage
            ? t("warehouse.manifests.managePermissionHint", {
                defaultValue:
                  "Missing permission: delivery_manifests.manage, courier_manifests.manage, or warehouses.manage_transfer.",
              })
            : undefined
        }
      >
        {t("warehouse.manifests.lock", { defaultValue: "Lock" })}
      </Button>

      <Button
        type="button"
        size="sm"
        disabled={!canDispatch || dispatchMutation.isPending}
        onClick={() => setDispatchConfirmOpen(true)}
        title={
          !canManage
            ? t("warehouse.manifests.managePermissionHint", {
                defaultValue:
                  "Missing permission: delivery_manifests.manage, courier_manifests.manage, or warehouses.manage_transfer.",
              })
            : undefined
        }
      >
        {t("warehouse.manifests.dispatch", { defaultValue: "Ready for scan-out" })}
      </Button>

      <Dialog open={dispatchConfirmOpen} onOpenChange={setDispatchConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("warehouse.manifests.dispatchConfirm.title", {
                defaultValue: "Ready for scan-out",
              })}
            </DialogTitle>
          </DialogHeader>

          {dispatchPreviewQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">{t("warehouse.loading", { defaultValue: "Loading…" })}</p>
          ) : dispatchPreviewQuery.error ? (
            <p className="text-destructive text-sm">
              {(dispatchPreviewQuery.error as Error).message}
            </p>
          ) : dispatchPreviewQuery.data ? (
            <div className="space-y-2 text-sm">
              {dispatchSummaryLine ? <p className="text-muted-foreground">{dispatchSummaryLine}</p> : null}

              {dispatchPreviewQuery.data.warnings.length ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                  <p className="font-medium">Warnings</p>
                  <ul className="mt-1 list-disc pl-5">
                    {dispatchPreviewQuery.data.warnings.map((w) => (
                      <li key={w.code}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {dispatchPreviewQuery.data.errors.length ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
                  <p className="font-medium">Errors</p>
                  <ul className="mt-1 list-disc pl-5">
                    {dispatchPreviewQuery.data.errors.map((e, idx) => (
                      <li key={`${e.code}-${e.shipmentId ?? "global"}-${idx}`}>{e.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Ready for scan-out will create DELIVERY tasks. Shipment status changes to OUT_FOR_DELIVERY only after warehouse scan-out.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDispatchConfirmOpen(false)}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="button"
              disabled={
                dispatchMutation.isPending ||
                dispatchPreviewQuery.isLoading ||
                !!dispatchPreviewQuery.error ||
                hasDispatchErrors
              }
              onClick={async () => {
                setDispatchConfirmOpen(false)
                dispatchMutation.mutate()
              }}
            >
              {t("warehouse.manifests.dispatchConfirm.confirm", { defaultValue: "Confirm" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

