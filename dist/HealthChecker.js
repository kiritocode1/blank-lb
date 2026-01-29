/**
 * @blank-utils/load-balancer
 *
 * HealthChecker service for checking endpoint health
 */
import { Context, Effect, Layer } from "effect";
import { EndpointUnhealthyError } from "./Errors.js";
/**
 * HealthChecker service interface
 */
export class HealthChecker extends Context.Tag("@blank-utils/HealthChecker")() {
}
/**
 * Default health checker implementation using fetch
 */
export const HealthCheckerLive = Layer.succeed(HealthChecker, {
    check: (endpoint) => Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
            try: () => fetch(endpoint.healthCheckUrl, {
                method: "GET",
                signal: AbortSignal.timeout(5000),
            }),
            catch: () => new EndpointUnhealthyError({ endpoint, reason: "network" }),
        });
        if (!response.ok) {
            return yield* new EndpointUnhealthyError({
                endpoint,
                reason: "status",
                statusCode: response.status,
            });
        }
        return true;
    }).pipe(Effect.timeout("5 seconds"), Effect.catchTag("TimeoutException", () => Effect.fail(new EndpointUnhealthyError({ endpoint, reason: "timeout" })))),
});
/**
 * Test health checker that always returns healthy
 */
export const HealthCheckerTest = Layer.succeed(HealthChecker, {
    check: () => Effect.succeed(true),
});
//# sourceMappingURL=HealthChecker.js.map