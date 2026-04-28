import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { PackagingMaterialRequestStatus } from "@/api/packaging-material-requests-api"
import { resolvePackagingStepIndex } from "@/features/packaging-material/utils/packaging-material.utils"

const steps = ["PENDING", "APPROVED", "PREPARING", "DELIVERED"] as const

export function PackagingRequestStatusStepper(props: {
  status: PackagingMaterialRequestStatus
  className?: string
}) {
  const currentIndex = resolvePackagingStepIndex(props.status)
  return (
    <div className={cn("space-y-3", props.className)}>
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex
          return (
            <div key={step} className="space-y-1">
              <div
                className={cn(
                  "h-2 rounded-full",
                  isDone ? "bg-primary" : "bg-muted",
                )}
              />
              <p className="text-xs font-medium">{step}</p>
            </div>
          )
        })}
      </div>
      {props.status === "READY_FOR_DELIVERY" ? (
        <Badge variant="outline">READY_FOR_DELIVERY</Badge>
      ) : null}
      {props.status === "REJECTED" ? <Badge variant="destructive">REJECTED</Badge> : null}
      {props.status === "CANCELLED" ? <Badge variant="secondary">CANCELLED</Badge> : null}
    </div>
  )
}

