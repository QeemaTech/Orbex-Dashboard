export type NotificationDto = {
    id: string;
    userId: string;
    channel: string;
    type: string;
    title: string;
    body: string | null;
    payloadJson: unknown;
    readAt: string | null;
    createdAt: string;
};
export type NotificationListResponse = {
    notifications: NotificationDto[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function listNotifications(token: string, params?: {
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
}): Promise<NotificationListResponse>;
export declare function markNotificationRead(token: string, id: string): Promise<void>;
export declare function markAllNotificationsRead(token: string): Promise<void>;
