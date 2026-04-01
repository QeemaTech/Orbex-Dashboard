import { type ReactNode } from "react";
type SidebarContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};
export declare function SidebarProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useSidebar(): SidebarContextValue;
export {};
