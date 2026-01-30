/**
 * @blank-utils/load-balancer
 *
 * Availability methods (failover strategies)
 */
import { Effect, Schema } from "effect"
import type { Endpoint } from "./Endpoint.js"
import { NoHealthyEndpointsError } from "./Errors.js"
import { bufferRequestBody, forwardRequest, type BufferedBody } from "./Forward.js"
import { addLoadBalancerHeaders } from "./Headers.js"
import { HealthChecker } from "./HealthChecker.js"

/**
 * Default HTTP status codes that trigger failover
 */
export const DEFAULT_FAILOVER_STATUSES = [502, 503, 504] as const

/**
 * Availability method types
 */
export const AvailabilityMethodType = Schema.Literal(
    "fail-forward",
    "async-block",
    "promise-any",
)
export type AvailabilityMethodType = typeof AvailabilityMethodType.Type

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
})
export type FailForwardOptions = typeof FailForwardOptions.Type

/**
 * Async-block options (sequential health checks)
 */
export const AsyncBlockOptions = Schema.Struct({
    type: Schema.Literal("async-block"),
})
export type AsyncBlockOptions = typeof AsyncBlockOptions.Type

/**
 * Promise-any options (parallel health checks)
 */
export const PromiseAnyOptions = Schema.Struct({
    type: Schema.Literal("promise-any"),
})
export type PromiseAnyOptions = typeof PromiseAnyOptions.Type

/**
 * Union of all availability method configurations
 */
export const AvailabilityMethod = Schema.Union(
    FailForwardOptions,
    AsyncBlockOptions,
    PromiseAnyOptions,
)
export type AvailabilityMethod = typeof AvailabilityMethod.Type

/**
 * Fail-forward strategy:
 * Try endpoints in order, failover only on specific status codes or network errors.
 * 
 * Body is buffered once at the start to support retry across multiple endpoints.
 */
export const failForward = (
    endpoints: ReadonlyArray<Endpoint>,
    request: Request,
    failoverStatuses: ReadonlyArray<number> = [...DEFAULT_FAILOVER_STATUSES],
): Effect.Effect<Response, NoHealthyEndpointsError> =>
    Effect.gen(function* () {
        const startTime = Date.now()
        const tried: Endpoint[] = []
        let lastError: unknown

        // Buffer body once for all retry attempts (fixes body consumption issue)
        const bufferedBody: BufferedBody = yield* bufferRequestBody(request).pipe(
            Effect.catchAll((error) => {
                lastError = error
                return Effect.succeed(null)
            }),
        )

        for (const endpoint of endpoints) {
            tried.push(endpoint)
            const gatherTime = Date.now()

            const result = yield* forwardRequest(endpoint, request, bufferedBody).pipe(
                Effect.either,
            )

            if (result._tag === "Right") {
                const response = result.right

                // Check if we should failover based on status code
                if (!failoverStatuses.includes(response.status)) {
                    return addLoadBalancerHeaders(
                        response,
                        endpoint,
                        tried,
                        startTime,
                        gatherTime,
                    )
                }
                // Failover status, try next endpoint
                lastError = new Error(`Endpoint returned status ${response.status}`)
            } else {
                // Network/forward error, try next endpoint
                lastError = result.left
            }
        }

        return yield* new NoHealthyEndpointsError({
            triedEndpoints: tried,
            lastError,
        })
    })

/**
 * Async-block strategy:
 * Sequentially check each endpoint's health, use the first healthy one.
 * 
 * Body is buffered once at the start to support retry across multiple endpoints.
 */
export const asyncBlock = (
    endpoints: ReadonlyArray<Endpoint>,
    request: Request,
): Effect.Effect<Response, NoHealthyEndpointsError, HealthChecker> =>
    Effect.gen(function* () {
        const startTime = Date.now()
        const checker = yield* HealthChecker
        const tried: Endpoint[] = []
        let lastError: unknown

        // Buffer body once for all retry attempts
        const bufferedBody: BufferedBody = yield* bufferRequestBody(request).pipe(
            Effect.catchAll((error) => {
                lastError = error
                return Effect.succeed(null)
            }),
        )

        for (const endpoint of endpoints) {
            tried.push(endpoint)
            const gatherTime = Date.now()

            const healthResult = yield* checker.check(endpoint).pipe(Effect.either)

            if (healthResult._tag === "Right") {
                // Endpoint is healthy, forward the request
                const forwardResult = yield* forwardRequest(endpoint, request, bufferedBody).pipe(
                    Effect.either,
                )

                if (forwardResult._tag === "Right") {
                    return addLoadBalancerHeaders(
                        forwardResult.right,
                        endpoint,
                        tried,
                        startTime,
                        gatherTime,
                    )
                }
                lastError = forwardResult.left
            } else {
                lastError = healthResult.left
            }
        }

        return yield* new NoHealthyEndpointsError({
            triedEndpoints: tried,
            lastError,
        })
    })

/**
 * Promise-any strategy:
 * Check all endpoints' health in parallel, use the first one that responds healthy.
 * 
 * Body is buffered once at the start before forwarding.
 */
export const promiseAny = (
    endpoints: ReadonlyArray<Endpoint>,
    request: Request,
): Effect.Effect<Response, NoHealthyEndpointsError, HealthChecker> =>
    Effect.gen(function* () {
        const startTime = Date.now()
        const checker = yield* HealthChecker

        if (endpoints.length === 0) {
            return yield* new NoHealthyEndpointsError({
                triedEndpoints: [],
            })
        }

        // Buffer body once before forwarding
        const bufferedBody: BufferedBody = yield* bufferRequestBody(request).pipe(
            Effect.catchAll(() => Effect.succeed(null)),
        )

        // Race all health checks, first healthy wins
        const healthyEndpointResult = yield* Effect.raceAll(
            endpoints.map((endpoint) =>
                checker.check(endpoint).pipe(
                    Effect.map(() => endpoint),
                    Effect.catchAll(() => Effect.never),
                ),
            ),
        ).pipe(
            Effect.timeout("10 seconds"),
            Effect.option,
        )

        if (healthyEndpointResult._tag === "None") {
            return yield* new NoHealthyEndpointsError({
                triedEndpoints: [...endpoints],
            })
        }

        const endpoint = healthyEndpointResult.value
        const gatherTime = Date.now()

        // FIX #3: Report all endpoints as tried, not just the one that failed
        const response = yield* forwardRequest(endpoint, request, bufferedBody).pipe(
            Effect.mapError((error) =>
                new NoHealthyEndpointsError({
                    triedEndpoints: [...endpoints],  // Fixed: was [endpoint]
                    lastError: error,
                }),
            ),
        )

        return addLoadBalancerHeaders(
            response,
            endpoint,
            [endpoint],
            startTime,
            gatherTime,
        )
    })
