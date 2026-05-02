import type { ManifestRouteStop } from "@/api/delivery-manifests-api"
import { Button } from "@/components/ui/button"

type Props = {
  stops: ManifestRouteStop[]
  selectedOrder?: number
  onSelectOrder?: (order: number) => void
}

export function StopList({ stops, selectedOrder, onSelectOrder }: Props) {
  if (!stops.length) return null

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Stops in suggested order</p>
      <div className="space-y-1">
        {stops
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => {
            const selected = selectedOrder === s.order
            return (
              <Button
                key={`${s.shipmentId}-${s.order}`}
                type="button"
                variant={selected ? "secondary" : "outline"}
                className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                onClick={() => onSelectOrder?.(s.order)}
              >
                <div className="flex w-full gap-2">
                  <span className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                    {s.order}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.shipmentId}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{s.address}</p>
                  </div>
                </div>
              </Button>
            )
          })}
      </div>
    </div>
  )
}

