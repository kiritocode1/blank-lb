/**
 * @blank-utils/load-balancer
 *
 * Error types for the load balancer
 */
import { Data } from "effect"
import type { Endpoint } from "./Endpoint.js"

/**
 * Error thrown when no healthy endpoints are available after trying all candidates.
 */
export class NoHealthyEndpointsError extends Data.TaggedError(
    "NoHealthyEndpointsError",
)<{
    readonly triedEndpoints: ReadonlyArray<Endpoint>
    readonly lastError?: unknown
}> {
    override get message() {
        const urls = this.triedEndpoints.map((ep) => ep.url).join(", ")
        return `No healthy endpoints available. Tried: ${urls || "(none)"}`
    }
}

/**
 * Error thrown when an endpoint fails its health check.
 */
export class EndpointUnhealthyError extends Data.TaggedError(
    "EndpointUnhealthyError",
)<{
    readonly endpoint: Endpoint
    readonly reason: "timeout" | "status" | "network"
    readonly statusCode?: number
}> {
    override get message() {
        switch (this.reason) {
            case "timeout":
                return `Endpoint ${this.endpoint.url} health check timed out`
            case "status":
                return `Endpoint ${this.endpoint.url} returned status ${this.statusCode}`
            case "network":
                return `Endpoint ${this.endpoint.url} network error`
        }
    }
}

/**
 * Error thrown when the circuit breaker is open for an endpoint.
 */
export class CircuitOpenError extends Data.TaggedError("CircuitOpenError")<{
    readonly endpoint: Endpoint
    readonly openedAt: Date
    readonly failures: number
}> {
    override get message() {
        return `Circuit open for ${this.endpoint.url} since ${this.openedAt.toISOString()} (${this.failures} failures)`
    }
}

/**
 * Error thrown when forwarding a request to an endpoint fails.
 */
export class RequestForwardError extends Data.TaggedError(
    "RequestForwardError",
)<{
    readonly endpoint: Endpoint
    readonly cause: unknown
}> {
    override get message() {
        return `Failed to forward request to ${this.endpoint.url}: ${String(this.cause)}`
    }
}
