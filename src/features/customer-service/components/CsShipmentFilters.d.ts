export type CsFilterValues = {
    merchantName: string;
    courierName: string;
    unassignedOnly: boolean;
    regionName: string;
    phoneSearch: string;
    trackingNumber: string;
    currentStatus: string;
    currentStatusIn: string;
    createdFrom: string;
    createdTo: string;
    overdueOnly: boolean;
};
export interface CsShipmentFiltersProps {
    values: CsFilterValues;
    onChange: (next: CsFilterValues) => void;
}
export declare function CsShipmentFilters({ values, onChange, }: CsShipmentFiltersProps): import("react/jsx-runtime").JSX.Element;
