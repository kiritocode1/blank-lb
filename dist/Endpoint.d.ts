/**
 * @blank-utils/load-balancer
 *
 * Endpoint data type representing a backend URL
 */
import { Schema } from "effect";
/**
 * Schema for validating endpoint URLs (must be http:// or https://)
 */
export declare const EndpointUrl: Schema.brand<Schema.filter<typeof Schema.String>, "EndpointUrl">;
export type EndpointUrl = typeof EndpointUrl.Type;
/**
 * Schema for health check path (must start with /)
 */
export declare const HealthCheckPath: Schema.brand<Schema.filter<typeof Schema.String>, "HealthCheckPath">;
export type HealthCheckPath = typeof HealthCheckPath.Type;
declare const Endpoint_base: Schema.Class<Endpoint, {
    /**
     * The base URL of the endpoint (e.g., "https://api.example.com")
     */
    url: typeof Schema.String;
    /**
     * Health check pathname for availability checks
     * @default "/"
     */
    healthCheckPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    /**
     * Weight for weighted load balancing (higher = more traffic)
     * @default 1
     */
    weight: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
    /**
     * Optional timeout for requests to this endpoint in milliseconds
     * @default 30000
     */
    timeoutMs: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
}, Schema.Struct.Encoded<{
    /**
     * The base URL of the endpoint (e.g., "https://api.example.com")
     */
    url: typeof Schema.String;
    /**
     * Health check pathname for availability checks
     * @default "/"
     */
    healthCheckPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    /**
     * Weight for weighted load balancing (higher = more traffic)
     * @default 1
     */
    weight: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
    /**
     * Optional timeout for requests to this endpoint in milliseconds
     * @default 30000
     */
    timeoutMs: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
}>, never, {
    readonly url: string;
} & {
    readonly healthCheckPath?: string;
} & {
    readonly weight?: number;
} & {
    readonly timeoutMs?: number;
}, {}, {}>;
/**
 * An Endpoint represents a backend URL that can receive load-balanced traffic.
 */
export declare class Endpoint extends Endpoint_base {
    /**
     * Get the normalized URL (without trailing slash)
     */
    get normalizedUrl(): string;
    /**
     * Get the full health check URL
     */
    get healthCheckUrl(): string;
    /**
     * Build target URL by combining endpoint base with request path
     */
    buildTargetUrl(pathname: string, search: string): string;
}
/**
 * Create an endpoint with just a URL (convenience function)
 */
export declare const endpoint: (url: string, options?: {
    readonly healthCheckPath?: string;
    readonly weight?: number;
    readonly timeoutMs?: number;
}) => Endpoint;
export {};
//# sourceMappingURL=Endpoint.d.ts.map