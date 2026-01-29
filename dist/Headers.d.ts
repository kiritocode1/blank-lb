/**
 * @blank-utils/load-balancer
 *
 * Response header utilities for observability
 */
import type { Endpoint } from "./Endpoint.js";
/**
 * Header names used by the load balancer
 */
export declare const HEADERS: {
    /** The endpoint URL that served the request */
    readonly ENDPOINT: "X-Load-Balancer-Endpoint";
    /** Total request latency in milliseconds */
    readonly LATENCY: "X-Load-Balancer-Latency";
    /** Time to select the endpoint in milliseconds */
    readonly GATHER_LATENCY: "X-Load-Balancer-Endpoint-Gather-Latency";
    /** Number of endpoints tried (only on failover) */
    readonly TRIED_COUNT: "X-Load-Balancer-Tried-Count";
    /** Comma-separated endpoint URLs tried (only on failover) */
    readonly TRIED_ENDPOINTS: "X-Load-Balancer-Tried-Endpoints";
};
/**
 * Add load balancer headers to a response
 */
export declare const addLoadBalancerHeaders: (response: Response, endpoint: Endpoint, triedEndpoints: ReadonlyArray<Endpoint>, startTime: number, gatherTime: number) => Response;
//# sourceMappingURL=Headers.d.ts.map