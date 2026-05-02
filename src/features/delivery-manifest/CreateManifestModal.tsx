import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Check, Loader2 } from "lucide-react"

import {
  createDeliveryManifest,
  getCourierSuggestions,
  type CourierSuggestion,
  type EligibleShipmentRow,
} from "@/api/delivery-manifests-api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { showToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  warehouseId: string
  selected: EligibleShipmentRow[]
  onCompleted: () => void
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function CreateManifestModal({
  open,
  onOpenChange,
  token,
  warehouseId,
  selected,
  onCompleted,
}: Props) {
  const queryClient = useQueryClient()
  const [courierId, setCourierId] = useState<string>("")
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")

  const deliveryZoneId = selected[0]?.resolvedDeliveryZoneId ?? ""
  const targetZoneLabel = selected[0]?.zoneLabel ?? "—"

  const totals = useMemo(() => {
    let cod = 0
    let value = 0
    for (const s of selected) {
      cod += s.codAmountEgp
      value += s.shipmentValueEgp
    }
    return { cod, value }
  }, [selected])

  const suggestionsQuery = useQuery({
    queryKey: ["delivery-manifest-courier-suggestions", token, warehouseId, deliveryZoneId],
    queryFn: () =>
      getCourierSuggestions({ token, warehouseId, deliveryZoneId }),
    enabled: open && !!token && !!warehouseId && !!deliveryZoneId,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!courierId) {
        throw new Error("Select a courier")
      }
      await createDeliveryManifest({
        token,
        body: {
          warehouseId,
          courierId,
          shipmentIds: selected.map((s) => s.id),
          dispatchDate,
          notes: notes.trim() || undefined,
        },
      })
    },
    onSuccess: async () => {
      showToast("Manifest created as draft", "success")
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifest-eligible"] })
      await queryClient.invalidateQueries({ queryKey: ["delivery-manifest-list"] })
      onCompleted()
      onOpenChange(false)
      setCourierId("")
      setNotes("")
    },
    onError: (e: Error) => showToast(e.message, "error"),
  })

  const couriers = suggestionsQuery.data?.couriers ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitMutation.isPending) {
          onOpenChange(v)
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Create manifest — {selected.length} shipment{selected.length === 1 ? "" : "s"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">Total COD</p>
            <p className="text-lg font-semibold">{formatMoney(totals.cod)} EGP</p>
          </div>
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">Est. value</p>
            <p className="text-lg font-semibold">{formatMoney(totals.value)} EGP</p>
          </div>
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">Target zone</p>
            <p className="line-clamp-2 text-sm font-medium">{targetZoneLabel}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Suggested couriers</p>
          {suggestionsQuery.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : couriers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No couriers for this zone.</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {couriers.map((c: CourierSuggestion) => {
                const selectedRow = courierId === c.courierId
                const barColor = c.loadPercent >= 85 ? "bg-destructive" : "bg-primary"
                return (
                  <li key={c.courierId}>
                    <button
                      type="button"
                      onClick={() => setCourierId(c.courierId)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        selectedRow ? "border-primary ring-primary ring-2" : "hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{c.fullName ?? c.courierId}</span>
                        <span
                          className={cn(
                            "h-4 w-4 shrink-0 rounded-full border-2",
                            selectedRow ? "border-primary bg-primary" : "border-muted-foreground",
                          )}
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Load {c.loadPercent}% · {c.activeLoadCount} active stops
                      </p>
                      <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
                        <div
                          className={cn("h-full rounded-full transition-all", barColor)}
                          style={{ width: `${c.loadPercent}%` }}
                        />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="dm-dispatch-date">Dispatch date</Label>
            <Input
              id="dm-dispatch-date"
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dm-notes">Dispatcher notes</Label>
            <textarea
              id="dm-notes"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              placeholder="Delivery instructions for the courier…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={submitMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitMutation.isPending || !courierId || selected.length === 0}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" /> Create draft manifest
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateManifestModal
