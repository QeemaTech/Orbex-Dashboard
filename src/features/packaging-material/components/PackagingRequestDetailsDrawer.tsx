import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PackagingRequestStatusStepper } from "@/features/packaging-material/components/PackagingRequestStatusStepper"
import type { PackagingRequestDetails } from "@/features/packaging-material/types"

export function PackagingRequestDetailsDrawer(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PackagingRequestDetails | null
  isLoading?: boolean
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Packaging request details</DialogTitle>
          <DialogDescription>
            {props.data?.request.requestNumber ?? "No request selected"}
          </DialogDescription>
        </DialogHeader>

        {props.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

        {props.data ? (
          <div className="space-y-4">
            <PackagingRequestStatusStepper status={props.data.request.status} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-semibold">Status:</span> {props.data.request.status}
              </p>
              <p>
                <span className="font-semibold">Estimated:</span>{" "}
                {props.data.request.totalEstimatedCost}
              </p>
              <p>
                <span className="font-semibold">Final:</span>{" "}
                {props.data.request.totalFinalCost ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Merchant:</span>{" "}
                {props.data.request.merchantName || props.data.request.merchantId}
              </p>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material SKU</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {props.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.packagingMaterialSku || item.packagingMaterialId}
                      </TableCell>
                      <TableCell>{item.requestedQuantity}</TableCell>
                      <TableCell>{item.approvedQuantity ?? "—"}</TableCell>
                      <TableCell>{item.deliveredQuantity ?? "—"}</TableCell>
                      <TableCell>{item.subtotal}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

