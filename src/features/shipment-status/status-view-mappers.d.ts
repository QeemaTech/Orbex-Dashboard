import type { DashboardPerspective } from "@/features/shipment-status/status-types";
export type ShipmentStateForView = {
    status?: string | null;
    subStatus?: string | null;
    paymentStatus?: string | null;
    currentStatus?: string | null;
};
export declare function getPerspectiveStatusKey(perspective: DashboardPerspective, row: ShipmentStateForView): string;
