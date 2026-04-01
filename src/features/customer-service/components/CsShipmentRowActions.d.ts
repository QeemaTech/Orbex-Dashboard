import type { CsShipmentRow } from "@/api/shipments-api";
export interface CsShipmentRowActionsProps {
    row: CsShipmentRow;
    token: string;
    listQueryKey: unknown[];
    onOpenMap: (courierId: string) => void;
    onOpenAddLocation: (row: CsShipmentRow) => void;
    showWhatsApp?: boolean;
    showAddLocation?: boolean;
}
export declare function CsShipmentRowActions({ row, token, listQueryKey, onOpenMap, onOpenAddLocation, showWhatsApp, showAddLocation, }: CsShipmentRowActionsProps): import("react/jsx-runtime").JSX.Element;
