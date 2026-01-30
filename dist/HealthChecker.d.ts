/**
 * @blank-utils/load-balancer
 *
 * HealthChecker service for checking endpoint health
 */
import { Context, Effect, Layer } from "effect";
import type { Endpoint } from "./Endpoint.js";
import { EndpointUnhealthyError } from "./Errors.js";
/**
 * Default health check timeout in milliseconds.
 * Used when endpoint doesn't specify a timeout.
 */
export declare const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5000;
/**
 * Calculate health check timeout from endpoint config.
 * Uses half of the endpoint's timeout (min 1000ms, max 10000ms).
 */
export declare const getHealthCheckTimeout: (endpoint: Endpoint) => number;
declare const HealthChecker_base: Context.TagClass<HealthChecker, "@blank-utils/HealthChecker", {
    /**
     * Check if an endpoint is healthy
     * Returns true if healthy, fails with EndpointUnhealthyError if not
     */
    readonly check: (endpoint: Endpoint) => Effect.Effect<boolean, EndpointUnhealthyError>;
}>;
/**
 * HealthChecker service interface
 */
export declare class HealthChecker extends HealthChecker_base {
}
/**
 * Default health checker implementation using fetch.
 *
 * Uses the endpoint's timeout (halved) for health checks, ensuring health
 * checks fail faster than actual requests.
 */
export declare const HealthCheckerLive: Layer.Layer<HealthChecker, never, never>;
/**
 * Test health checker that always returns healthy
 */
export declare const HealthCheckerTest: Layer.Layer<HealthChecker, never, never>;
/**
 * Create a custom health checker with configurable timeout
 */
export declare const makeHealthChecker: (options?: {
    /**
     * Fixed timeout in milliseconds (overrides endpoint-based calculation)
     */
    readonly timeoutMs?: number;
}) => Layer.Layer<HealthChecker>;
export {};
//# sourceMappingURL=HealthChecker.d.ts.map