import type { ShipmentStatus } from "@/types/dashboard";
export interface StatusBadgeProps {
    status: ShipmentStatus;
    className?: string;
}
export declare function StatusBadge({ status, className }: StatusBadgeProps): import("react/jsx-runtime").JSX.Element;
