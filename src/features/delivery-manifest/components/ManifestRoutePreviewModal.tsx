import { useMemo } from "react"

import type { ManifestRoute } from "@/api/delivery-manifests-api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ManifestRoutePanel } from "@/features/delivery-manifest/components/ManifestRoutePanel"

type Props = {
  apiKey: string
  triggerLabel?: string
  route?: ManifestRoute
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
}

export function ManifestRoutePreviewModal({
  apiKey,
  triggerLabel = "Preview",
  route,
  isLoading,
  error,
  disabled,
}: Props) {
  const title = useMemo(() => {
    if (!route) return "Suggested Route"
    if (route.status === "READY") return "Suggested Route"
    if (route.status === "FAILED") return "Suggested Route (Blocked)"
    return "Suggested Route (Pending)"
  }, [route])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Auto-generated round-trip route from the warehouse.
          </DialogDescription>
        </DialogHeader>
        <ManifestRoutePanel
          apiKey={apiKey}
          route={route}
          isLoading={isLoading}
          error={error}
        />
      </DialogContent>
    </Dialog>
  )
}

