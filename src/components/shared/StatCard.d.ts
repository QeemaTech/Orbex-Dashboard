import type { LucideIcon } from "lucide-react";
export type StatAccent = "primary" | "success" | "warning" | "destructive";
export interface StatCardProps {
    title: string;
    value: number | string;
    percentage?: number;
    icon: LucideIcon;
    accent: StatAccent;
}
export declare function StatCard({ title, value, percentage, icon: Icon, accent, }: StatCardProps): import("react/jsx-runtime").JSX.Element;
