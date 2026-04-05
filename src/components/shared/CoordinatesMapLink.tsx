import { MapPin } from "react-lucid"
import { useTranslation } from "react-i18next"

import {
  googleMapsSearchUrl,
  parseWarehouseLatLng,
  type GeoCoordinates,
} from "@/features/customer-service/lib/location"
import { cn } from "@/lib/utils"

type CoordinatesMapLinkProps = {
  latitude?: string | null
  longitude?: string | null
  /** When set, used instead of parsing `latitude` / `longitude`. */
  coordinates?: GeoCoordinates | null
  className?: string
  iconClassName?: string
  stopPropagation?: boolean
}

export function CoordinatesMapLink({
  latitude,
  longitude,
  coordinates: coordsProp,
  className,
  iconClassName = "size-5 shrink-0",
  stopPropagation = false,
}: CoordinatesMapLinkProps) {
  const { t } = useTranslation()
  const coords =
    coordsProp !== undefined
      ? coordsProp
      : parseWarehouseLatLng(latitude, longitude)
  const label = t("cs.table.viewLocation")

  if (!coords) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <a
      href={googleMapsSearchUrl(coords)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "text-primary hover:bg-primary/10 inline-flex size-9 items-center justify-center rounded-full transition-colors",
        className,
      )}
      title={label}
      aria-label={label}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <MapPin className={cn(iconClassName)} aria-hidden />
      <span className="sr-only">{label}</span>
    </a>
  )
}
