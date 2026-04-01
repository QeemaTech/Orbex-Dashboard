export type CourierLatestLocation = {
    lat: string;
    lng: string;
    recordedAt: string;
};
export declare function fetchCourierLatestLocation(token: string, courierId: string): Promise<CourierLatestLocation>;
