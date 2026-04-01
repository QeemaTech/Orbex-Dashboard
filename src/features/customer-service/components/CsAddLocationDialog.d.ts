import { type CsShipmentRow } from "@/api/shipments-api";
export interface CsAddLocationDialogProps {
    open: boolean;
    row: CsShipmentRow | null;
    token: string;
    listQueryKey: unknown[];
    onOpenChange: (open: boolean) => void;
}
export declare function CsAddLocationDialog({ open, row, token, listQueryKey, onOpenChange, }: CsAddLocationDialogProps): import("react/jsx-runtime").JSX.Element | null;
