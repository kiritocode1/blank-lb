/**
 * @blank-utils/load-balancer
 *
 * Forward requests to endpoints
 */
import { Effect } from "effect";
import type { Endpoint } from "./Endpoint.js";
import { RequestForwardError } from "./Errors.js";
/**
 * Forward a request to an endpoint
 */
export declare const forwardRequest: (endpoint: Endpoint, request: Request) => Effect.Effect<Response, RequestForwardError>;
//# sourceMappingURL=Forward.d.ts.map