export type AccountingDashboardResponse = {
    paymentStatusSummary: Array<{
        paymentStatus: string;
        count: number;
    }>;
};
export declare function getAccountingDashboard(token: string): Promise<AccountingDashboardResponse>;
