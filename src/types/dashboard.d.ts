export type ShipmentStatus = "delivered" | "rejected" | "postponed" | "in_transit";
export interface DashboardStats {
    totalShipments: number;
    delivered: number;
    rejected: number;
    postponed: number;
}
export interface DailyShipmentPoint {
    date: string;
    labelKey: string;
    count: number;
}
export interface StatusSlice {
    status: ShipmentStatus;
    labelKey: string;
    value: number;
    color: string;
}
export interface ShipmentRow {
    id: string;
    customerName: string;
    phone: string;
    status: ShipmentStatus;
    paymentMethod: string;
    amountCents: number;
}
