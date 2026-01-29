/**
 * @blank-utils/load-balancer
 *
 * Forward requests to endpoints
 */
import { Effect } from "effect";
import { RequestForwardError } from "./Errors.js";
/**
 * Forward a request to an endpoint
 */
export const forwardRequest = (endpoint, request) => Effect.gen(function* () {
    const url = new URL(request.url);
    const targetUrl = endpoint.buildTargetUrl(url.pathname, url.search);
    const response = yield* Effect.tryPromise({
        try: () => fetch(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: "follow",
            signal: AbortSignal.timeout(endpoint.timeoutMs),
        }),
        catch: (cause) => new RequestForwardError({ endpoint, cause }),
    });
    return response;
});
//# sourceMappingURL=Forward.js.map