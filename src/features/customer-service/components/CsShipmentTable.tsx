import { useTranslation } from "react-i18next"
import { MapPin } from "react-lucid"
import { useNavigate } from "react-router-dom"

import type { CsShipmentRow } from "@/api/shipments-api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parseCoordinatesFromLocationInput } from "@/features/customer-service/lib/location"
import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"
import type { DashboardPerspective } from "@/features/shipment-status/status-types"

import { CsShipmentRowActions } from "./CsShipmentRowActions"
import { ShipmentStatusBadge } from "./ShipmentStatusBadge"

export interface CsShipmentTableProps {
  rows: CsShipmentRow[]
  token: string
  listQueryKey: unknown[]
  onOpenMap: (courierId: string) => void
  onOpenAddLocation: (row: CsShipmentRow) => void
  detailBasePath?: string
  /** When false, hides the actions column (e.g. general Shipments list). Default true. */
  showActions?: boolean
  perspective?: DashboardPerspective
}

export function CsShipmentTable({
  rows,
  token,
  listQueryKey,
  onOpenMap,
  onOpenAddLocation,
  detailBasePath = "/shipments",
  showActions = true,
  perspective = "operations",
}: CsShipmentTableProps) {
  const { t } = useTranslation()
  const nav = useNavigate()

  const resolveCoordinates = (row: CsShipmentRow): { lat: number; lng: number } | null => {
    const hasLat = row.customerLat != null && String(row.customerLat).trim() !== ""
    const hasLng = row.customerLng != null && String(row.customerLng).trim() !== ""
    const lat = hasLat ? Number(row.customerLat) : Number.NaN
    const lng = hasLng ? Number(row.customerLng) : Number.NaN
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
    return parseCoordinatesFromLocationInput(row.locationLink)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("cs.table.customer")}</TableHead>
          <TableHead>{t("cs.table.phone")}</TableHead>
          <TableHead>{t("cs.table.status")}</TableHead>
          <TableHead className="w-24">{t("cs.table.gpsLocation")}</TableHead>
          {showActions ? (
            <TableHead className="w-[300px]">{t("cs.table.actions")}</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const coordinates = resolveCoordinates(row)
          return (
            <TableRow
              key={row.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() =>
                nav(`${detailBasePath}/${encodeURIComponent(row.customerName)}`)
              }
            >
            <TableCell className="max-w-[120px] truncate">
              {row.customerName}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {row.phonePrimary}
            </TableCell>
            <TableCell>
              <ShipmentStatusBadge
                status={getPerspectiveStatusKey(perspective, row)}
              />
            </TableCell>
              <TableCell>
                {coordinates ? (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(`${coordinates.lat},${coordinates.lng}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:bg-primary/10 inline-flex size-9 items-center justify-center rounded-full transition-colors"
                    title={t("cs.table.viewLocation")}
                    aria-label={t("cs.table.viewLocation")}
                  >
                    <MapPin className="size-5 shrink-0" aria-hidden />
                    <span className="sr-only">{t("cs.table.viewLocation")}</span>
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
              {showActions ? (
                <TableCell>
                  <CsShipmentRowActions
                    row={row}
                    token={token}
                    listQueryKey={listQueryKey}
                    onOpenMap={onOpenMap}
                    onOpenAddLocation={onOpenAddLocation}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
