export type ShipmentLocationPayload = {
    locationText: string;
    locationLink: string | null;
};
export type GeoCoordinates = {
    lat: number;
    lng: number;
};
export declare function extractShipmentLocation(notes: string | null | undefined): ShipmentLocationPayload;
export declare function upsertShipmentLocationNotes(notes: string | null | undefined, payload: ShipmentLocationPayload): string | null;
export declare function parseCoordinatesFromLocationInput(input: string | null | undefined): GeoCoordinates | null;
