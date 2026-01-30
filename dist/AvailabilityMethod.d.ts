/**
 * @blank-utils/load-balancer
 *
 * Availability methods (failover strategies)
 */
import { Effect, Schema } from "effect";
import type { Endpoint } from "./Endpoint.js";
import { NoHealthyEndpointsError } from "./Errors.js";
import { HealthChecker } from "./HealthChecker.js";
/**
 * Default HTTP status codes that trigger failover
 */
export declare const DEFAULT_FAILOVER_STATUSES: readonly [502, 503, 504];
/**
 * Availability method types
 */
export declare const AvailabilityMethodType: Schema.Literal<["fail-forward", "async-block", "promise-any"]>;
export type AvailabilityMethodType = typeof AvailabilityMethodType.Type;
/**
 * Fail-forward options
 */
export declare const FailForwardOptions: Schema.Struct<{
    type: Schema.Literal<["fail-forward"]>;
    /**
     * HTTP status codes that should trigger failover
     * @default [502, 503, 504]
     */
    failoverOnStatuses: Schema.optionalWith<Schema.Array$<typeof Schema.Number>, {
        default: () => (502 | 503 | 504)[];
    }>;
}>;
export type FailForwardOptions = typeof FailForwardOptions.Type;
/**
 * Async-block options (sequential health checks)
 */
export declare const AsyncBlockOptions: Schema.Struct<{
    type: Schema.Literal<["async-block"]>;
}>;
export type AsyncBlockOptions = typeof AsyncBlockOptions.Type;
/**
 * Promise-any options (parallel health checks)
 */
export declare const PromiseAnyOptions: Schema.Struct<{
    type: Schema.Literal<["promise-any"]>;
}>;
export type PromiseAnyOptions = typeof PromiseAnyOptions.Type;
/**
 * Union of all availability method configurations
 */
export declare const AvailabilityMethod: Schema.Union<[Schema.Struct<{
    type: Schema.Literal<["fail-forward"]>;
    /**
     * HTTP status codes that should trigger failover
     * @default [502, 503, 504]
     */
    failoverOnStatuses: Schema.optionalWith<Schema.Array$<typeof Schema.Number>, {
        default: () => (502 | 503 | 504)[];
    }>;
}>, Schema.Struct<{
    type: Schema.Literal<["async-block"]>;
}>, Schema.Struct<{
    type: Schema.Literal<["promise-any"]>;
}>]>;
export type AvailabilityMethod = typeof AvailabilityMethod.Type;
/**
 * Fail-forward strategy:
 * Try endpoints in order, failover only on specific status codes or network errors.
 *
 * Body is buffered once at the start to support retry across multiple endpoints.
 */
export declare const failForward: (endpoints: ReadonlyArray<Endpoint>, request: Request, failoverStatuses?: ReadonlyArray<number>) => Effect.Effect<Response, NoHealthyEndpointsError>;
/**
 * Async-block strategy:
 * Sequentially check each endpoint's health, use the first healthy one.
 *
 * Body is buffered once at the start to support retry across multiple endpoints.
 */
export declare const asyncBlock: (endpoints: ReadonlyArray<Endpoint>, request: Request) => Effect.Effect<Response, NoHealthyEndpointsError, HealthChecker>;
/**
 * Promise-any strategy:
 * Check all endpoints' health in parallel, use the first one that responds healthy.
 *
 * Body is buffered once at the start before forwarding.
 */
export declare const promiseAny: (endpoints: ReadonlyArray<Endpoint>, request: Request) => Effect.Effect<Response, NoHealthyEndpointsError, HealthChecker>;
//# sourceMappingURL=AvailabilityMethod.d.ts.map