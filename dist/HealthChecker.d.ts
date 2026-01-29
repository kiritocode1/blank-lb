/**
 * @blank-utils/load-balancer
 *
 * HealthChecker service for checking endpoint health
 */
import { Context, Effect, Layer } from "effect";
import type { Endpoint } from "./Endpoint.js";
import { EndpointUnhealthyError } from "./Errors.js";
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
 * Default health checker implementation using fetch
 */
export declare const HealthCheckerLive: Layer.Layer<HealthChecker, never, never>;
/**
 * Test health checker that always returns healthy
 */
export declare const HealthCheckerTest: Layer.Layer<HealthChecker, never, never>;
export {};
//# sourceMappingURL=HealthChecker.d.ts.map