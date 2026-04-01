import type { CsShipmentRow } from "@/api/shipments-api";
import type { DashboardPerspective } from "@/features/shipment-status/status-types";
export interface CsShipmentTableProps {
    rows: CsShipmentRow[];
    token: string;
    listQueryKey: unknown[];
    onOpenMap: (courierId: string) => void;
    onOpenAddLocation: (row: CsShipmentRow) => void;
    detailBasePath?: string;
    /** When false, hides the actions column (e.g. general Shipments list). Default true. */
    showActions?: boolean;
    perspective?: DashboardPerspective;
}
export declare function CsShipmentTable({ rows, token, listQueryKey, onOpenMap, onOpenAddLocation, detailBasePath, showActions, perspective, }: CsShipmentTableProps): import("react/jsx-runtime").JSX.Element;
