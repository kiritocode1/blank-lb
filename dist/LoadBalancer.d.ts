/**
 * @blank-utils/load-balancer
 *
 * LoadBalancer service - the main entry point
 */
import { Context, Effect, Layer, Schema } from "effect";
import type { AvailabilityMethod } from "./AvailabilityMethod.js";
import { Endpoint } from "./Endpoint.js";
import { NoHealthyEndpointsError } from "./Errors.js";
import type { GeoEndpoint } from "./GeoEndpoint.js";
import type { CfProperties } from "./GeoSteering.js";
import { HealthChecker } from "./HealthChecker.js";
import type { RecoveryFn } from "./Recovery.js";
/**
 * Steering configuration
 */
export declare const SteeringConfig: Schema.Struct<{
    type: Schema.Literal<["geo"]>;
    /**
     * Default endpoints to use when no geo match is found
     */
    defaultEndpoints: Schema.optionalWith<Schema.Array$<typeof Schema.Any>, {
        default: () => never[];
    }>;
}>;
export type SteeringConfig = typeof SteeringConfig.Type;
/**
 * LoadBalancer configuration options
 */
export interface LoadBalancerOptions {
    /**
     * Endpoints to load balance (regular endpoints without geo steering)
     */
    readonly endpoints?: ReadonlyArray<Endpoint>;
    /**
     * Geo endpoints (when using geo steering)
     */
    readonly geoEndpoints?: ReadonlyArray<GeoEndpoint>;
    /**
     * Steering configuration (e.g., geo steering)
     */
    readonly steering?: {
        readonly type: "geo";
        readonly defaultEndpoints?: ReadonlyArray<Endpoint>;
    };
    /**
     * Availability method configuration
     * @default { type: "fail-forward" }
     */
    readonly availability?: AvailabilityMethod;
    /**
     * Recovery function called when all endpoints fail
     */
    readonly recoveryFn?: RecoveryFn;
}
/**
 * Request type with optional Cloudflare properties
 */
export interface CfRequest extends Request {
    readonly cf?: CfProperties;
}
declare const LoadBalancer_base: Context.TagClass<LoadBalancer, "@blank-utils/LoadBalancer", {
    /**
     * Handle an incoming request by forwarding to an available endpoint
     */
    readonly handleRequest: (request: CfRequest) => Effect.Effect<Response, NoHealthyEndpointsError>;
}>;
/**
 * LoadBalancer service interface
 */
export declare class LoadBalancer extends LoadBalancer_base {
    /**
     * Create a LoadBalancer layer with the given options
     */
    static layer(options: LoadBalancerOptions): Layer.Layer<LoadBalancer, never, HealthChecker>;
    /**
     * Create a fully assembled LoadBalancer layer with HealthCheckerLive
     */
    static live(options: LoadBalancerOptions): Layer.Layer<LoadBalancer>;
}
export {};
//# sourceMappingURL=LoadBalancer.d.ts.map