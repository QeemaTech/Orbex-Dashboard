export type MerchantAccountStatus = "PENDING" | "ACTIVATED";
export type MerchantRow = {
    merchantId: string;
    userId: string;
    username: string;
    fullName: string;
    isActive: boolean;
    displayName: string;
    businessName: string;
    activityType: string;
    phone: string;
    email: string | null;
    accountStatus: MerchantAccountStatus;
    createdAt: string;
    updatedAt: string;
};
export type MerchantListResponse = {
    merchants: MerchantRow[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function listMerchants(params: {
    token: string;
    page?: number;
    pageSize?: number;
    accountStatus?: MerchantAccountStatus | "";
}): Promise<MerchantListResponse>;
export declare function approveMerchant(params: {
    token: string;
    merchantId: string;
}): Promise<MerchantRow>;
