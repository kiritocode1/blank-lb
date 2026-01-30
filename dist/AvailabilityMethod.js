/**
 * @blank-utils/load-balancer
 *
 * Availability methods (failover strategies)
 */
import { Effect, Schema } from "effect";
import { NoHealthyEndpointsError } from "./Errors.js";
import { bufferRequestBody, forwardRequest } from "./Forward.js";
import { addLoadBalancerHeaders } from "./Headers.js";
import { HealthChecker } from "./HealthChecker.js";
/**
 * Default HTTP status codes that trigger failover
 */
export const DEFAULT_FAILOVER_STATUSES = [502, 503, 504];
/**
 * Availability method types
 */
export const AvailabilityMethodType = Schema.Literal("fail-forward", "async-block", "promise-any");
/**
 * Fail-forward options
 */
export const FailForwardOptions = Schema.Struct({
    type: Schema.Literal("fail-forward"),
    /**
     * HTTP status codes that should trigger failover
     * @default [502, 503, 504]
     */
    failoverOnStatuses: Schema.optionalWith(Schema.Array(Schema.Number), {
        default: () => [...DEFAULT_FAILOVER_STATUSES],
    }),
});
/**
 * Async-block options (sequential health checks)
 */
export const AsyncBlockOptions = Schema.Struct({
    type: Schema.Literal("async-block"),
});
/**
 * Promise-any options (parallel health checks)
 */
export const PromiseAnyOptions = Schema.Struct({
    type: Schema.Literal("promise-any"),
});
/**
 * Union of all availability method configurations
 */
export const AvailabilityMethod = Schema.Union(FailForwardOptions, AsyncBlockOptions, PromiseAnyOptions);
/**
 * Fail-forward strategy:
 * Try endpoints in order, failover only on specific status codes or network errors.
 *
 * Body is buffered once at the start to support retry across multiple endpoints.
 */
export const failForward = (endpoints, request, failoverStatuses = [...DEFAULT_FAILOVER_STATUSES]) => Effect.gen(function* () {
    const startTime = Date.now();
    const tried = [];
    let lastError;
    // Buffer body once for all retry attempts (fixes body consumption issue)
    const bufferedBody = yield* bufferRequestBody(request).pipe(Effect.catchAll((error) => {
        lastError = error;
        return Effect.succeed(null);
    }));
    for (const endpoint of endpoints) {
        tried.push(endpoint);
        const gatherTime = Date.now();
        const result = yield* forwardRequest(endpoint, request, bufferedBody).pipe(Effect.either);
        if (result._tag === "Right") {
            const response = result.right;
            // Check if we should failover based on status code
            if (!failoverStatuses.includes(response.status)) {
                return addLoadBalancerHeaders(response, endpoint, tried, startTime, gatherTime);
            }
            // Failover status, try next endpoint
            lastError = new Error(`Endpoint returned status ${response.status}`);
        }
        else {
            // Network/forward error, try next endpoint
            lastError = result.left;
        }
    }
    return yield* new NoHealthyEndpointsError({
        triedEndpoints: tried,
        lastError,
    });
});
/**
 * Async-block strategy:
 * Sequentially check each endpoint's health, use the first healthy one.
 *
 * Body is buffered once at the start to support retry across multiple endpoints.
 */
export const asyncBlock = (endpoints, request) => Effect.gen(function* () {
    const startTime = Date.now();
    const checker = yield* HealthChecker;
    const tried = [];
    let lastError;
    // Buffer body once for all retry attempts
    const bufferedBody = yield* bufferRequestBody(request).pipe(Effect.catchAll((error) => {
        lastError = error;
        return Effect.succeed(null);
    }));
    for (const endpoint of endpoints) {
        tried.push(endpoint);
        const gatherTime = Date.now();
        const healthResult = yield* checker.check(endpoint).pipe(Effect.either);
        if (healthResult._tag === "Right") {
            // Endpoint is healthy, forward the request
            const forwardResult = yield* forwardRequest(endpoint, request, bufferedBody).pipe(Effect.either);
            if (forwardResult._tag === "Right") {
                return addLoadBalancerHeaders(forwardResult.right, endpoint, tried, startTime, gatherTime);
            }
            lastError = forwardResult.left;
        }
        else {
            lastError = healthResult.left;
        }
    }
    return yield* new NoHealthyEndpointsError({
        triedEndpoints: tried,
        lastError,
    });
});
/**
 * Promise-any strategy:
 * Check all endpoints' health in parallel, use the first one that responds healthy.
 *
 * Body is buffered once at the start before forwarding.
 */
export const promiseAny = (endpoints, request) => Effect.gen(function* () {
    const startTime = Date.now();
    const checker = yield* HealthChecker;
    if (endpoints.length === 0) {
        return yield* new NoHealthyEndpointsError({
            triedEndpoints: [],
        });
    }
    // Buffer body once before forwarding
    const bufferedBody = yield* bufferRequestBody(request).pipe(Effect.catchAll(() => Effect.succeed(null)));
    // Race all health checks, first healthy wins
    const healthyEndpointResult = yield* Effect.raceAll(endpoints.map((endpoint) => checker.check(endpoint).pipe(Effect.map(() => endpoint), Effect.catchAll(() => Effect.never)))).pipe(Effect.timeout("10 seconds"), Effect.option);
    if (healthyEndpointResult._tag === "None") {
        return yield* new NoHealthyEndpointsError({
            triedEndpoints: [...endpoints],
        });
    }
    const endpoint = healthyEndpointResult.value;
    const gatherTime = Date.now();
    // FIX #3: Report all endpoints as tried, not just the one that failed
    const response = yield* forwardRequest(endpoint, request, bufferedBody).pipe(Effect.mapError((error) => new NoHealthyEndpointsError({
        triedEndpoints: [...endpoints], // Fixed: was [endpoint]
        lastError: error,
    })));
    return addLoadBalancerHeaders(response, endpoint, [endpoint], startTime, gatherTime);
});
//# sourceMappingURL=AvailabilityMethod.js.map