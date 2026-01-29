/**
 * @blank-utils/load-balancer
 *
 * Recovery function support for handling total failures
 */
import { Effect } from "effect";
import type { Endpoint } from "./Endpoint.js";
/**
 * Context passed to the recovery function
 */
export interface RecoveryContext {
    /**
     * The endpoints that were tried before all failed
     */
    readonly triedEndpoints: ReadonlyArray<Endpoint>;
    /**
     * The last error that occurred
     */
    readonly lastError?: unknown;
}
/**
 * Recovery function type
 *
 * Called when all endpoints fail. Can:
 * - Log failures to external services
 * - Store failed requests for later replay
 * - Return undefined to throw the default error
 * - Return a Response to handle gracefully
 */
export type RecoveryFn = (request: Request, context: RecoveryContext) => Effect.Effect<Response | undefined>;
/**
 * Apply a recovery function to handle total failures
 */
export declare const withRecovery: <E>(effect: Effect.Effect<Response, E>, request: Request, recoveryFn: RecoveryFn | undefined, getContext: () => RecoveryContext) => Effect.Effect<Response, E>;
//# sourceMappingURL=Recovery.d.ts.map