import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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
import {
  packagingMaterialRequestPaymentMethods,
  type PackagingMaterialRequest,
  type PackagingMaterialRequestItem,
} from "@/api/packaging-material-requests-api"
import { useDeliverPackagingMaterialRequest } from "@/features/packaging-material/hooks/use-packaging-material"
import { showToast } from "@/lib/toast"

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "INSTAPAY", label: "InstaPay" },
  { value: "VISA", label: "Card (Visa)" },
] as const satisfies Array<{
  value: (typeof packagingMaterialRequestPaymentMethods)[number]
  label: string
}>

export function PackagingRequestDeliverDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  requestId: string
  request?: PackagingMaterialRequest | null
  items: PackagingMaterialRequestItem[] | undefined
}) {
  const mutation = useDeliverPackagingMaterialRequest(props.token)
  const [receiverName, setReceiverName] = useState("")
  const [receiverNotes, setReceiverNotes] = useState("")
  const [proofUrl, setProofUrl] = useState("")
  const [qtyByItemId, setQtyByItemId] = useState<Record<string, string>>({})
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")

  useEffect(() => {
    if (!props.open || !props.items) return
    const next: Record<string, string> = {}
    for (const it of props.items) {
      const base = it.approvedQuantity ?? it.requestedQuantity
      next[it.id] = base
    }
    setQtyByItemId(next)
    setReceiverName("")
    setReceiverNotes("")
    setProofUrl("")
    setPaymentMethod("")
    setPaymentNotes("")
  }, [props.open, props.items])

  const isUnpaid = props.request?.paymentStatus === "UNPAID"

  const computedFinalTotal = useMemo(() => {
    if (!props.items?.length) return null
    let sum = 0
    for (const it of props.items) {
      const qRaw = qtyByItemId[it.id] ?? it.approvedQuantity ?? it.requestedQuantity
      const q = Number(qRaw)
      const price = Number(it.unitPriceSnapshot ?? 0)
      if (!Number.isFinite(q) || q <= 0) return null
      if (!Number.isFinite(price) || price < 0) return null
      sum += q * price
    }
    return Math.round(sum * 100) / 100
  }, [props.items, qtyByItemId])

  async function onConfirm() {
    if (!props.items?.length) return
    if (isUnpaid && !paymentMethod.trim()) {
      showToast("Select a payment method for collection", "error")
      return
    }
    try {
      await mutation.mutateAsync({
        id: props.requestId,
        receiverName: receiverName || null,
        receiverNotes: receiverNotes || null,
        proofAttachmentUrl: proofUrl || null,
        items: props.items.map((it) => ({
          itemId: it.id,
          deliveredQuantity: qtyByItemId[it.id] ?? it.approvedQuantity ?? it.requestedQuantity,
        })),
        ...(isUnpaid
          ? {
              deliveryPayment: {
                paymentMethod: paymentMethod.trim() as (typeof packagingMaterialRequestPaymentMethods)[number],
                ...(computedFinalTotal != null
                  ? { collectedAmount: String(computedFinalTotal.toFixed(2)) }
                  : {}),
                ...(paymentNotes.trim() ? { notes: paymentNotes.trim() } : { notes: null }),
              },
            }
          : {}),
      })
      showToast("Marked as delivered", "success")
      props.onOpenChange(false)
    } catch (e) {
      showToast((e as Error).message ?? "Delivery update failed", "error")
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm delivery</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Receiver name" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
          <Input placeholder="Proof URL (optional)" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />
        </div>
        <Input
          placeholder="Receiver notes (optional)"
          value={receiverNotes}
          onChange={(e) => setReceiverNotes(e.target.value)}
        />
        {isUnpaid ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                Payment method (required)
              </label>
              <select
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">Select…</option>
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                Collected amount (auto)
              </label>
              <Input
                readOnly
                aria-readonly
                value={computedFinalTotal != null ? computedFinalTotal.toFixed(2) : ""}
                placeholder="—"
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <label className="text-muted-foreground text-xs font-medium">
                Payment notes (optional)
              </label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. received cash, collector name, reference…"
              />
            </div>
          </div>
        ) : null}
        {!props.items?.length ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Delivered qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">
                    {it.packagingMaterialSku || it.packagingMaterialId}
                  </TableCell>
                  <TableCell>{it.approvedQuantity ?? "—"}</TableCell>
                  <TableCell>
                    <Input
                      className="h-8 max-w-[140px]"
                      value={qtyByItemId[it.id] ?? ""}
                      onChange={(e) =>
                        setQtyByItemId((prev) => ({ ...prev, [it.id]: e.target.value }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Confirm delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
