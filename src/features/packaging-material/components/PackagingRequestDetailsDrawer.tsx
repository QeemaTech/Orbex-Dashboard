import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PackagingRequestDetailsBody } from "@/features/packaging-material/components/PackagingRequestDetailsBody"
import { PackagingRequestPaymentForm } from "@/features/packaging-material/components/PackagingRequestPaymentForm"
import type { PackagingRequestDetails } from "@/features/packaging-material/types"
import { canRecordPackagingRequestPayment } from "@/features/packaging-material/utils/packaging-material.utils"
import type { AuthUser } from "@/lib/auth-context"

export function PackagingRequestDetailsDrawer(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PackagingRequestDetails | null
  isLoading?: boolean
  token?: string
  user?: AuthUser | null
}) {
  const showPayment =
    !!props.token &&
    !!props.data?.request.id &&
    canRecordPackagingRequestPayment(props.user)

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Packaging request details</DialogTitle>
          <DialogDescription>
            {props.data?.request.requestNumber ?? "No request selected"}
          </DialogDescription>
        </DialogHeader>

        <PackagingRequestDetailsBody data={props.data} isLoading={props.isLoading} />

        {showPayment ? (
          <PackagingRequestPaymentForm
            token={props.token!}
            requestId={props.data!.request.id}
            request={props.data!.request}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
