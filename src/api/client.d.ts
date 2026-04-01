export declare class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare function apiUrl(path: string): string;
export declare function apiFetch<T>(path: string, init?: RequestInit & {
    token?: string | null;
}): Promise<T>;
