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
import { useApprovePackagingMaterialRequest } from "@/features/packaging-material/hooks/use-packaging-material"
import { showToast } from "@/lib/toast"

export function PackagingRequestApproveDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  requestId: string
  items: PackagingMaterialRequestItem[] | undefined
}) {
  const mutation = useApprovePackagingMaterialRequest(props.token)
  const [qtyByItemId, setQtyByItemId] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!props.open || !props.items) return
    const next: Record<string, string> = {}
    for (const it of props.items) {
      next[it.id] = it.requestedQuantity
    }
    setQtyByItemId(next)
  }, [props.open, props.items])

  async function onConfirm() {
    if (!props.items?.length) return
    try {
      await mutation.mutateAsync({
        id: props.requestId,
        items: props.items.map((it) => ({
          itemId: it.id,
          approvedQuantity: qtyByItemId[it.id] ?? it.requestedQuantity,
        })),
      })
      showToast("Request approved", "success")
      props.onOpenChange(false)
    } catch (e) {
      showToast((e as Error).message ?? "Approval failed", "error")
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve packaging request</DialogTitle>
        </DialogHeader>
        {!props.items?.length ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Approved qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">
                    {it.packagingMaterialSku || it.packagingMaterialId}
                  </TableCell>
                  <TableCell>{it.requestedQuantity}</TableCell>
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
            {mutation.isPending ? "Saving…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
