import type { Endpoint } from "./Endpoint.js";
declare const NoHealthyEndpointsError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "NoHealthyEndpointsError";
} & Readonly<A>;
/**
 * Error thrown when no healthy endpoints are available after trying all candidates.
 */
export declare class NoHealthyEndpointsError extends NoHealthyEndpointsError_base<{
    readonly triedEndpoints: ReadonlyArray<Endpoint>;
    readonly lastError?: unknown;
}> {
    get message(): string;
}
declare const EndpointUnhealthyError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "EndpointUnhealthyError";
} & Readonly<A>;
/**
 * Error thrown when an endpoint fails its health check.
 */
export declare class EndpointUnhealthyError extends EndpointUnhealthyError_base<{
    readonly endpoint: Endpoint;
    readonly reason: "timeout" | "status" | "network";
    readonly statusCode?: number;
}> {
    get message(): string;
}
declare const CircuitOpenError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "CircuitOpenError";
} & Readonly<A>;
/**
 * Error thrown when the circuit breaker is open for an endpoint.
 */
export declare class CircuitOpenError extends CircuitOpenError_base<{
    readonly endpoint: Endpoint;
    readonly openedAt: Date;
    readonly failures: number;
}> {
    get message(): string;
}
declare const RequestForwardError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "RequestForwardError";
} & Readonly<A>;
/**
 * Error thrown when forwarding a request to an endpoint fails.
 */
export declare class RequestForwardError extends RequestForwardError_base<{
    readonly endpoint: Endpoint;
    readonly cause: unknown;
}> {
    get message(): string;
}
export {};
//# sourceMappingURL=Errors.d.ts.map