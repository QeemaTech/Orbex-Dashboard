export type ShipmentListResponse = {
    shipments: CsShipmentRow[];
    total: number;
    page: number;
    pageSize: number;
};
export type CsMerchant = {
    id: string;
    displayName: string;
    businessName: string;
};
export type CsCourier = {
    id: string;
    fullName: string | null;
    userId: string;
    contactPhone: string | null;
};
export type CsShipmentRow = {
    id: string;
    merchantId: string;
    assignedCourierId: string | null;
    trackingNumber: string | null;
    customerName: string;
    phonePrimary: string;
    phoneSecondary: string | null;
    addressText: string;
    notes?: string | null;
    locationText?: string;
    locationLink?: string | null;
    addressConfirmed?: boolean;
    customerLat?: string | null;
    customerLng?: string | null;
    customerLocationReceivedAt?: string | null;
    shipmentValue: string;
    shippingFee: string;
    paymentMethod: string;
    productType: string;
    currentStatus: string;
    status?: string;
    subStatus?: string;
    paymentStatus?: string;
    merchant?: CsMerchant;
    courier?: CsCourier | null;
    createdAt: string;
    updatedAt: string;
    statusEvents?: CsShipmentStatusEvent[];
};
export type CsShipmentStatusEvent = {
    id: string;
    shipmentId: string;
    fromStatus: string | null;
    toStatus: string;
    fromCoreStatus?: string | null;
    toCoreStatus?: string;
    fromSubStatus?: string | null;
    toSubStatus?: string;
    fromPaymentStatus?: string | null;
    toPaymentStatus?: string;
    receivedByCustomer: boolean | null;
    paymentCollected: boolean | null;
    note: string | null;
    actorUserId: string | null;
    courierLat: string | null;
    courierLng: string | null;
    createdAt: string;
};
export type ListShipmentsParams = {
    token: string;
    page?: number;
    pageSize?: number;
    merchantId?: string;
    merchantName?: string;
    assignedCourierId?: string;
    courierName?: string;
    unassignedOnly?: boolean;
    regionId?: string;
    regionName?: string;
    phoneSearch?: string;
    trackingNumber?: string;
    customerName?: string;
    currentStatus?: string;
    currentStatusIn?: string[];
    status?: string;
    subStatus?: string;
    paymentStatus?: string;
    createdFrom?: string;
    createdTo?: string;
    overdueOnly?: boolean;
    expand?: string;
};
export declare function listShipments(p: ListShipmentsParams): Promise<ShipmentListResponse>;
export declare function getShipmentById(params: {
    token: string;
    shipmentId: string;
    includeEvents?: boolean;
}): Promise<CsShipmentRow>;
export type DashboardKpisResponse = {
    totals: {
        totalShipments: number;
        delivered: number;
        rejected: number;
        postponed: number;
        pendingAssignment: number;
        inProgress: number;
    };
    statusDistribution: Array<{
        status: string;
        value: number;
    }>;
    shipmentsOverTime: Array<{
        date: string;
        count: number;
    }>;
    courierWorkload: Array<{
        courierId: string;
        courierName: string | null;
        assignedCount: number;
    }>;
    recentShipments: CsShipmentRow[];
};
export declare function getDashboardKpis(p: Omit<ListShipmentsParams, "page" | "pageSize" | "expand"> & {
    trendDays?: number;
    recentTake?: number;
}): Promise<DashboardKpisResponse>;
export type TimelineEventRow = {
    id: string;
    shipmentId: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    actorUserId: string | null;
    createdAt: string;
    shipment: {
        id: string;
        trackingNumber: string | null;
        customerName: string;
        phonePrimary: string;
        currentStatus: string;
        assignedCourierId: string | null;
        createdAt: string;
    };
};
export type TimelineResponse = {
    events: TimelineEventRow[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function listShipmentTimeline(p: ListShipmentsParams): Promise<TimelineResponse>;
export declare function confirmShipmentCs(token: string, shipmentId: string): Promise<void>;
export type PatchShipmentFieldsParams = {
    token: string;
    shipmentId: string;
    addressText?: string;
    notes?: string | null;
    customerLat?: string;
    customerLng?: string;
};
export declare function patchShipmentFields(p: PatchShipmentFieldsParams): Promise<CsShipmentRow>;
export type SendWhatsappShipmentPromptParams = {
    token: string;
    shipmentId: string;
    locale: "ar" | "en";
};
export declare function sendWhatsappShipmentPrompt(p: SendWhatsappShipmentPromptParams): Promise<{
    sent: boolean;
}>;
