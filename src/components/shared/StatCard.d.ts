import type { ComponentType } from "react";
export type StatAccent = "primary" | "success" | "warning" | "destructive";
export interface StatCardProps {
    title: string;
    value: number | string;
    percentage?: number;
    icon: ComponentType<{
        className?: string;
        "aria-hidden"?: boolean;
    }>;
    accent: StatAccent;
}
export declare function StatCard({ title, value, percentage, icon: Icon, accent, }: StatCardProps): import("react/jsx-runtime").JSX.Element;
