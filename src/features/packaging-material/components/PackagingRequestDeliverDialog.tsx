import { useEffect, useState } from "react"
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
import type { PackagingMaterialRequestItem } from "@/api/packaging-material-requests-api"
import { useDeliverPackagingMaterialRequest } from "@/features/packaging-material/hooks/use-packaging-material"
import { showToast } from "@/lib/toast"

export function PackagingRequestDeliverDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  requestId: string
  items: PackagingMaterialRequestItem[] | undefined
}) {
  const mutation = useDeliverPackagingMaterialRequest(props.token)
  const [receiverName, setReceiverName] = useState("")
  const [receiverNotes, setReceiverNotes] = useState("")
  const [proofUrl, setProofUrl] = useState("")
  const [qtyByItemId, setQtyByItemId] = useState<Record<string, string>>({})

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
  }, [props.open, props.items])

  async function onConfirm() {
    if (!props.items?.length) return
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
