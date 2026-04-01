import type { AuthUser } from "@/lib/auth-context";
export type LoginBody = {
    username: string;
    password: string;
};
export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
};
export declare function loginRequest(body: LoginBody): Promise<LoginResponse>;
export declare function meRequest(token: string): Promise<AuthUser>;
