/**
 * @blank-utils/load-balancer
 *
 * HealthChecker service for checking endpoint health
 */
import { Context, Effect, Layer } from "effect";
import { EndpointUnhealthyError } from "./Errors.js";
/**
 * Default health check timeout in milliseconds.
 * Used when endpoint doesn't specify a timeout.
 */
export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5000;
/**
 * Calculate health check timeout from endpoint config.
 * Uses half of the endpoint's timeout (min 1000ms, max 10000ms).
 */
export const getHealthCheckTimeout = (endpoint) => {
    const halfTimeout = Math.floor(endpoint.timeoutMs / 2);
    return Math.max(1000, Math.min(halfTimeout, 10000));
};
/**
 * HealthChecker service interface
 */
export class HealthChecker extends Context.Tag("@blank-utils/HealthChecker")() {
}
/**
 * Default health checker implementation using fetch.
 *
 * Uses the endpoint's timeout (halved) for health checks, ensuring health
 * checks fail faster than actual requests.
 */
export const HealthCheckerLive = Layer.succeed(HealthChecker, {
    check: (endpoint) => Effect.gen(function* () {
        // Use endpoint-specific timeout (halved for health checks)
        const timeoutMs = getHealthCheckTimeout(endpoint);
        const response = yield* Effect.tryPromise({
            try: () => fetch(endpoint.healthCheckUrl, {
                method: "GET",
                // Single timeout via AbortSignal (removed redundant Effect.timeout)
                signal: AbortSignal.timeout(timeoutMs),
            }),
            catch: (cause) => {
                // Check if it's a timeout error
                if (cause instanceof Error && cause.name === "TimeoutError") {
                    return new EndpointUnhealthyError({ endpoint, reason: "timeout" });
                }
                return new EndpointUnhealthyError({ endpoint, reason: "network" });
            },
        });
        if (!response.ok) {
            return yield* new EndpointUnhealthyError({
                endpoint,
                reason: "status",
                statusCode: response.status,
            });
        }
        return true;
    }),
});
/**
 * Test health checker that always returns healthy
 */
export const HealthCheckerTest = Layer.succeed(HealthChecker, {
    check: () => Effect.succeed(true),
});
/**
 * Create a custom health checker with configurable timeout
 */
export const makeHealthChecker = (options) => Layer.succeed(HealthChecker, {
    check: (endpoint) => Effect.gen(function* () {
        const timeoutMs = options?.timeoutMs ?? getHealthCheckTimeout(endpoint);
        const response = yield* Effect.tryPromise({
            try: () => fetch(endpoint.healthCheckUrl, {
                method: "GET",
                signal: AbortSignal.timeout(timeoutMs),
            }),
            catch: (cause) => {
                if (cause instanceof Error && cause.name === "TimeoutError") {
                    return new EndpointUnhealthyError({ endpoint, reason: "timeout" });
                }
                return new EndpointUnhealthyError({ endpoint, reason: "network" });
            },
        });
        if (!response.ok) {
            return yield* new EndpointUnhealthyError({
                endpoint,
                reason: "status",
                statusCode: response.status,
            });
        }
        return true;
    }),
});
//# sourceMappingURL=HealthChecker.js.map