import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PackagingRequestDetailsBody } from "@/features/packaging-material/components/PackagingRequestDetailsBody"
import { usePackagingMaterialRequestById } from "@/features/packaging-material/hooks/use-packaging-material"
import { canReadAllPackagingRequests, canReadOwnPackagingRequests } from "@/features/packaging-material/utils/packaging-material.utils"
import type { AuthUser } from "@/lib/auth-context"

export function PackagingRequestPreviewModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  requestId: string | null
  user: AuthUser | null | undefined
}) {
  const allowedToReadPackaging =
    canReadAllPackagingRequests(props.user) || canReadOwnPackagingRequests(props.user)
  const q = usePackagingMaterialRequestById({
    token: props.token,
    requestId: props.requestId ?? "",
    enabled: props.open && !!props.requestId && !!props.token && allowedToReadPackaging,
  })

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Packaging request</DialogTitle>
          <DialogDescription>
            {q.data?.request.requestNumber ?? (props.requestId ? "Loading…" : "")}
          </DialogDescription>
        </DialogHeader>
        {!allowedToReadPackaging ? (
          <p className="text-sm text-muted-foreground">
            You do not have permission to view packaging requests.
          </p>
        ) : (
          <PackagingRequestDetailsBody data={q.data ?? null} isLoading={q.isLoading} />
        )}
      </DialogContent>
    </Dialog>
  )
}
