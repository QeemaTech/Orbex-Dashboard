import { type ReactNode } from "react";
export type UserRole = "ADMIN" | "CUSTOMER_SERVICE" | "SALES" | "ACCOUNTS" | "WAREHOUSE" | "COURIER" | "MERCHANT";
export type AuthUser = {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};
type AuthState = {
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    loading: boolean;
};
type AuthContextValue = AuthState & {
    login: (username: string, password: string) => Promise<AuthUser>;
    logout: () => void;
};
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextValue;
export declare function canAccessCustomerService(role: UserRole | undefined): boolean;
export declare function getDefaultDashboardRoute(role: UserRole | undefined): string;
export {};
