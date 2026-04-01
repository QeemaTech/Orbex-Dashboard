import type { CsShipmentRow } from "@/api/shipments-api";
export interface CsShipmentRowActionsProps {
    row: CsShipmentRow;
    token: string;
    listQueryKey: unknown[];
    onOpenMap: (courierId: string) => void;
    onOpenAddLocation: (row: CsShipmentRow) => void;
}
export declare function CsShipmentRowActions({ row, token, listQueryKey, onOpenMap, onOpenAddLocation, }: CsShipmentRowActionsProps): import("react/jsx-runtime").JSX.Element;
