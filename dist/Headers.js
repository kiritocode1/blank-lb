/**
 * @blank-utils/load-balancer
 *
 * Response header utilities for observability
 */
/**
 * Header names used by the load balancer
 */
export const HEADERS = {
    /** The endpoint URL that served the request */
    ENDPOINT: "X-Load-Balancer-Endpoint",
    /** Total request latency in milliseconds */
    LATENCY: "X-Load-Balancer-Latency",
    /** Time to select the endpoint in milliseconds */
    GATHER_LATENCY: "X-Load-Balancer-Endpoint-Gather-Latency",
    /** Number of endpoints tried (only on failover) */
    TRIED_COUNT: "X-Load-Balancer-Tried-Count",
    /** Comma-separated endpoint URLs tried (only on failover) */
    TRIED_ENDPOINTS: "X-Load-Balancer-Tried-Endpoints",
};
/**
 * Add load balancer headers to a response
 */
export const addLoadBalancerHeaders = (response, endpoint, triedEndpoints, startTime, gatherTime) => {
    const endTime = Date.now();
    const headers = new Headers(response.headers);
    headers.set(HEADERS.ENDPOINT, endpoint.url);
    headers.set(HEADERS.LATENCY, String(endTime - startTime));
    headers.set(HEADERS.GATHER_LATENCY, String(gatherTime - startTime));
    // Add failover trace headers if we tried more than one endpoint
    if (triedEndpoints.length > 1) {
        headers.set(HEADERS.TRIED_COUNT, String(triedEndpoints.length));
        headers.set(HEADERS.TRIED_ENDPOINTS, triedEndpoints.map((ep) => ep.url).join(", "));
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
};
//# sourceMappingURL=Headers.js.map