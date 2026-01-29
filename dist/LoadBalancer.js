/**
 * @blank-utils/load-balancer
 *
 * LoadBalancer service - the main entry point
 */
import { Context, Effect, Layer, Schema } from "effect";
import { asyncBlock, failForward, promiseAny, } from "./AvailabilityMethod.js";
import { Endpoint } from "./Endpoint.js";
import { NoHealthyEndpointsError } from "./Errors.js";
import { selectGeoEndpoints } from "./GeoSteering.js";
import { HealthChecker, HealthCheckerLive } from "./HealthChecker.js";
import { withRecovery } from "./Recovery.js";
/**
 * Steering configuration
 */
export const SteeringConfig = Schema.Struct({
    type: Schema.Literal("geo"),
    /**
     * Default endpoints to use when no geo match is found
     */
    defaultEndpoints: Schema.optionalWith(Schema.Array(Schema.Any), {
        default: () => [],
    }),
});
/**
 * LoadBalancer service interface
 */
export class LoadBalancer extends Context.Tag("@blank-utils/LoadBalancer")() {
    /**
     * Create a LoadBalancer layer with the given options
     */
    static layer(options) {
        return Layer.effect(LoadBalancer, Effect.gen(function* () {
            const healthChecker = yield* HealthChecker;
            return {
                handleRequest: (request) => {
                    // Determine which endpoints to try
                    const endpointsToTry = getEndpointsToTry(options, request.cf);
                    if (endpointsToTry.length === 0) {
                        return Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [] }));
                    }
                    // Get availability method
                    const availability = options.availability ?? {
                        type: "fail-forward",
                        failoverOnStatuses: [502, 503, 504],
                    };
                    // Create recovery context
                    let triedEndpoints = [];
                    let lastError;
                    const getContext = () => ({
                        triedEndpoints,
                        lastError,
                    });
                    // Build the effect based on availability method
                    const healthCheckerLayer = Layer.succeed(HealthChecker, healthChecker);
                    const runWithMethod = () => {
                        switch (availability.type) {
                            case "fail-forward": {
                                const statuses = "failoverOnStatuses" in availability
                                    ? availability.failoverOnStatuses
                                    : [502, 503, 504];
                                return failForward(endpointsToTry, request, statuses);
                            }
                            case "async-block":
                                return asyncBlock(endpointsToTry, request).pipe(Effect.provide(healthCheckerLayer));
                            case "promise-any":
                                return promiseAny(endpointsToTry, request).pipe(Effect.provide(healthCheckerLayer));
                        }
                    };
                    let effect = runWithMethod();
                    // Track tried endpoints from error
                    effect = effect.pipe(Effect.tapError((error) => Effect.sync(() => {
                        triedEndpoints = [...error.triedEndpoints];
                        lastError = error.lastError;
                    })));
                    // Apply recovery function if provided
                    if (options.recoveryFn) {
                        effect = withRecovery(effect, request, options.recoveryFn, getContext);
                    }
                    return effect;
                },
            };
        }));
    }
    /**
     * Create a fully assembled LoadBalancer layer with HealthCheckerLive
     */
    static live(options) {
        return LoadBalancer.layer(options).pipe(Layer.provide(HealthCheckerLive));
    }
}
/**
 * Get the list of endpoints to try based on configuration and geo data
 */
function getEndpointsToTry(options, cf) {
    // If geo steering is enabled
    if (options.steering?.type === "geo" && options.geoEndpoints) {
        return selectGeoEndpoints(options.geoEndpoints, cf, options.steering.defaultEndpoints);
    }
    // Regular endpoints
    return options.endpoints ?? [];
}
//# sourceMappingURL=LoadBalancer.js.map