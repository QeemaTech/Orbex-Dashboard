import type { CsShipmentRow } from "@/api/shipments-api";
export interface CsShipmentTableProps {
    rows: CsShipmentRow[];
    token: string;
    listQueryKey: unknown[];
    onOpenMap: (courierId: string) => void;
    onOpenAddLocation: (row: CsShipmentRow) => void;
    detailBasePath?: string;
    /** When false, hides the actions column (e.g. general Shipments list). Default true. */
    showActions?: boolean;
}
export declare function CsShipmentTable({ rows, token, listQueryKey, onOpenMap, onOpenAddLocation, detailBasePath, showActions, }: CsShipmentTableProps): import("react/jsx-runtime").JSX.Element;
