/**
 * @blank-utils/load-balancer
 *
 * Forward requests to endpoints
 */
import { Effect } from "effect";
import type { Endpoint } from "./Endpoint.js";
import { RequestForwardError } from "./Errors.js";
/**
 * Check if a method should have a body
 */
export declare const methodSupportsBody: (method: string) => boolean;
/**
 * Buffered body type - either ArrayBuffer for methods that support body, or null
 */
export type BufferedBody = ArrayBuffer | null;
/**
 * Buffer a request body for potential retries.
 * Returns null for methods that don't support body (GET, HEAD, OPTIONS).
 *
 * This should be called ONCE before any forwarding attempts to avoid
 * consuming the ReadableStream multiple times.
 */
export declare const bufferRequestBody: (request: Request) => Effect.Effect<BufferedBody, RequestForwardError>;
/**
 * Forward a request to an endpoint.
 *
 * @param endpoint - The endpoint to forward to
 * @param request - The original request (used for method, headers, URL path)
 * @param bufferedBody - Pre-buffered body from bufferRequestBody (enables retries)
 */
export declare const forwardRequest: (endpoint: Endpoint, request: Request, bufferedBody?: BufferedBody) => Effect.Effect<Response, RequestForwardError>;
/**
 * Forward a request to an endpoint (legacy API - buffers body internally).
 *
 * ⚠️ WARNING: This function buffers the body on each call. If you're using
 * failover (trying multiple endpoints), use `bufferRequestBody` once and
 * pass the result to `forwardRequest` for each attempt.
 *
 * @deprecated Use forwardRequest with pre-buffered body for failover scenarios
 */
export declare const forwardRequestSimple: (endpoint: Endpoint, request: Request) => Effect.Effect<Response, RequestForwardError>;
//# sourceMappingURL=Forward.d.ts.map