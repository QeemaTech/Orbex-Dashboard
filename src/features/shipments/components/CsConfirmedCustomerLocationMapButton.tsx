import { useState } from "react"
import { MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CustomerLocationMapPreviewDialog } from "@/components/shared/CustomerLocationMapPreviewDialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  latitude: string | null | undefined
  longitude: string | null | undefined
  className?: string
  stopPropagation?: boolean
}

/** Map preview for **customer delivery** pin after CS line confirmation (not courier track). */
export function CsConfirmedCustomerLocationMapButton({
  latitude,
  longitude,
  className,
  stopPropagation = false,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const lat = String(latitude ?? "").trim()
  const lng = String(longitude ?? "").trim()
  if (!lat || !lng) return null

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={cn("size-9 shrink-0 text-sky-700 dark:text-sky-300", className)}
        title={t("cs.customerPinMap.openPreview")}
        aria-label={t("cs.customerPinMap.openPreview")}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation()
          setOpen(true)
        }}
      >
        <MapPin className="size-4" aria-hidden />
      </Button>
      <CustomerLocationMapPreviewDialog
        open={open}
        onOpenChange={setOpen}
        latitude={lat}
        longitude={lng}
      />
    </>
  )
}
