import { Link } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PackagingRequestStatusStepper } from "@/features/packaging-material/components/PackagingRequestStatusStepper"
import type { PackagingRequestDetails } from "@/features/packaging-material/types"

export function PackagingRequestDetailsBody(props: {
  data: PackagingRequestDetails | null
  isLoading?: boolean
}) {
  if (props.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (!props.data) {
    return null
  }
  const { request, items } = props.data
  return (
    <div className="space-y-4">
      <PackagingRequestStatusStepper status={request.status} />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <p>
          <span className="font-semibold">Status:</span> {request.status}
        </p>
        <p>
          <span className="font-semibold">Estimated:</span> {request.totalEstimatedCost}
        </p>
        <p>
          <span className="font-semibold">Final:</span> {request.totalFinalCost ?? "—"}
        </p>
        <p>
          <span className="font-semibold">Merchant:</span>{" "}
          {request.merchantName || request.merchantId}
        </p>
        {request.paymentStatus ? (
          <p>
            <span className="font-semibold">Payment:</span> {request.paymentStatus}
            {request.collectedAmount != null ? ` · collected ${request.collectedAmount}` : ""}
          </p>
        ) : null}
        {request.deliveredAt ? (
          <p>
            <span className="font-semibold">Delivered:</span>{" "}
            {new Date(request.deliveredAt).toLocaleString()}
          </p>
        ) : null}
        {request.receiverName ? (
          <p>
            <span className="font-semibold">Receiver:</span> {request.receiverName}
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <span className="font-semibold">On-site packaging:</span>
          {request.doPackaging ? (
            <Badge variant="default">Yes — staff visit required</Badge>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <span className="font-semibold">Merchant order:</span>
          {(request.linkedMerchantOrderCount ?? 0) > 0 ? (
            <>
              <Badge variant="secondary">Linked</Badge>
              <span className="text-muted-foreground text-xs">
                {request.linkedMerchantOrderCount} batch(es)
                {(request.linkedMerchantOrderCount ?? 0) >
                (request.linkedMerchantOrderIds?.length ?? 0)
                  ? " (showing first ids)"
                  : ""}
              </span>
              {(request.linkedMerchantOrderIds ?? []).map((oid) => (
                <Link
                  key={oid}
                  to={`/merchant-orders/${encodeURIComponent(oid)}`}
                  className="text-primary text-xs underline"
                >
                  {oid.slice(0, 8)}…
                </Link>
              ))}
            </>
          ) : (
            <>
              <Badge variant="outline">Standalone</Badge>
              <span className="text-muted-foreground text-xs">Not linked to a confirmed batch</span>
            </>
          )}
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
            {items.map((item) => (
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
  )
}
