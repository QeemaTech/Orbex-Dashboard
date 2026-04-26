import type { MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { CsShipmentRow } from "@/api/merchant-orders-api"
import { CoordinatesMapLink } from "@/components/shared/CoordinatesMapLink"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"
import type { DashboardPerspective } from "@/features/shipment-status/status-types"

import { CsShipmentRowActions } from "./CsShipmentRowActions"
import { ShipmentStatusBadge } from "./ShipmentStatusBadge"

function stopRowClick(e: MouseEvent<HTMLDivElement>) {
  e.stopPropagation()
}

export interface CsShipmentTableProps {
  rows: CsShipmentRow[]
  token: string
  listQueryKey: unknown[]
  onOpenMap: (courierId: string) => void
  onOpenAddLocation: (row: CsShipmentRow) => void
  /** Used for deriving shipment-line detail base from merchant-order base; row opens shipment detail (`row.id`). */
  detailBasePath?: string
  /**
   * Row: `{orderDetailBasePath}/{row.id}`. Defaults: `detailBasePath` with `/merchant-orders` → `/shipments`.
   */
  orderDetailBasePath?: string
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
  detailBasePath = "/merchant-orders",
  orderDetailBasePath,
  showActions = true,
  perspective = "operations",
}: CsShipmentTableProps) {
  const { t } = useTranslation()
  const nav = useNavigate()

  const orderBase =
    orderDetailBasePath?.replace(/\/$/, "") ??
    (detailBasePath.endsWith("/merchant-orders")
      ? detailBasePath.replace(/\/merchant-orders$/, "/shipments")
      : "/shipments")

  const resolveCoordinates = (row: CsShipmentRow): { lat: number; lng: number } | null => {
    const hasLat = row.customerLat != null && String(row.customerLat).trim() !== ""
    const hasLng = row.customerLng != null && String(row.customerLng).trim() !== ""
    const lat = hasLat ? Number(row.customerLat) : Number.NaN
    const lng = hasLng ? Number(row.customerLng) : Number.NaN
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
    return null
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
            <TableHead className="w-[1%] whitespace-nowrap text-end">
              {t("cs.table.actions")}
            </TableHead>
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
              onClick={() => void nav(`${orderBase}/${encodeURIComponent(row.id)}`)}
            >
              <TableCell className="max-w-[120px] truncate">
                {row.customerName}
              </TableCell>
              <TableCell className="whitespace-nowrap">{row.phonePrimary}</TableCell>
              <TableCell>
                <ShipmentStatusBadge status={getPerspectiveStatusKey(perspective, row)} />
              </TableCell>
              <TableCell>
                <CoordinatesMapLink coordinates={coordinates} stopPropagation />
              </TableCell>
              {showActions ? (
                <TableCell className="text-end align-middle" onClick={stopRowClick}>
                  <CsShipmentRowActions
                    row={row}
                    token={token}
                    listQueryKey={listQueryKey}
                    onOpenMap={onOpenMap}
                    onOpenAddLocation={onOpenAddLocation}
                    layout="compact"
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
