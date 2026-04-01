export type WarehouseStats = {
    awaitingScanIn: number;
    inWarehouse: number;
    readyForAssignment: number;
    assigned: number;
    returnsPending: number;
    returnsReceivedToday: number;
};
export type WarehouseShipmentRow = {
    id: string;
    trackingNumber: string | null;
    customerName: string;
    phonePrimary: string;
    currentStatus: string;
    assignedCourierId: string | null;
    returnReceivedAt: string | null;
    scannedOutAt: string | null;
    merchant?: {
        id: string;
        displayName: string;
        businessName: string;
    };
    courier?: {
        id: string;
        fullName: string | null;
        userId: string;
        contactPhone: string | null;
    } | null;
    updatedAt: string;
};
export type WarehouseQueueResponse = {
    shipments: WarehouseShipmentRow[];
    total: number;
    page: number;
    pageSize: number;
};
type WarehouseQueueParams = {
    token: string;
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    returnsOnly?: boolean;
};
export declare function getWarehouseStats(token: string): Promise<WarehouseStats>;
export declare function listWarehouseQueue(params: WarehouseQueueParams): Promise<WarehouseQueueResponse>;
export declare function scanShipmentIn(params: {
    token: string;
    trackingNumber: string;
    note?: string;
}): Promise<unknown>;
export declare function scanShipmentOut(params: {
    token: string;
    trackingNumber: string;
    note?: string;
}): Promise<unknown>;
export declare function assignWarehouseShipment(params: {
    token: string;
    shipmentId: string;
    courierId: string;
    note?: string;
}): Promise<unknown>;
export declare function receiveWarehouseReturn(params: {
    token: string;
    trackingNumber: string;
    returnDiscountAmount?: number;
    note?: string;
}): Promise<unknown>;
export declare function getWarehouseTracking(params: {
    token: string;
    trackingNumber: string;
}): Promise<unknown>;
export {};
