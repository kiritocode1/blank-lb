/**
 * Geo Steering Example
 * 
 * Route users to the nearest backend based on their geographic location.
 * Uses Cloudflare's built-in geo detection.
 */
import { Effect } from "effect"
import { LoadBalancer, geoEndpoint, endpoint } from "@blank-utils/load-balancer"

const lb = LoadBalancer.live({
    geoEndpoints: [
        // Americas → US servers
        geoEndpoint(
            "https://us.api.example.com",
            { type: "continent", continents: ["NA", "SA"] },
            { healthCheckPath: "/health", timeoutMs: 5000 },
        ),

        // Europe & Africa → EU servers
        geoEndpoint(
            "https://eu.api.example.com",
            { type: "continent", continents: ["EU", "AF"] },
            { healthCheckPath: "/health", timeoutMs: 5000 },
        ),

        // Asia & Oceania → Asia servers
        geoEndpoint(
            "https://asia.api.example.com",
            { type: "continent", continents: ["AS", "OC"] },
            { healthCheckPath: "/health", timeoutMs: 5000 },
        ),
    ],

    steering: {
        type: "geo",
        // Fallback for unknown locations (Antarctica, etc.)
        defaultEndpoints: [endpoint("https://us.api.example.com")],
    },

    availability: {
        type: "fail-forward",
        failoverOnStatuses: [502, 503, 504],
    },
})

export default {
    async fetch(request: Request): Promise<Response> {
        return Effect.gen(function* () {
            const loadBalancer = yield* LoadBalancer
            // Cloudflare automatically adds geo info to request.cf
            return yield* loadBalancer.handleRequest(request)
        }).pipe(Effect.provide(lb), Effect.runPromise)
    },
}
