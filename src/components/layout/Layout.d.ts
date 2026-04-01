import { type ReactNode } from "react";
export interface LayoutProps {
    title: string;
    children: ReactNode;
}
export declare function Layout({ title, children }: LayoutProps): import("react/jsx-runtime").JSX.Element;
