/**
 * Blue-Green Deployment Example
 * 
 * Gradually shift traffic between two deployment environments.
 * Control the split via environment variable or Cloudflare KV.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

// Environment binding for traffic split (set via wrangler.toml or dashboard)
interface Env {
    GREEN_TRAFFIC_PERCENT?: string // "0" to "100"
}

// Blue (stable) backends
const blueEndpoints = [
    endpoint("https://blue-1.api.example.com", { healthCheckPath: "/health" }),
    endpoint("https://blue-2.api.example.com", { healthCheckPath: "/health" }),
]

// Green (new version) backends
const greenEndpoints = [
    endpoint("https://green-1.api.example.com", { healthCheckPath: "/health" }),
    endpoint("https://green-2.api.example.com", { healthCheckPath: "/health" }),
]

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Get traffic split percentage (default: 0% to green)
        const greenPercent = parseInt(env.GREEN_TRAFFIC_PERCENT || "0", 10) / 100

        // Decide which deployment to use
        const useGreen = Math.random() < greenPercent

        const layer = LoadBalancer.live({
            endpoints: useGreen ? greenEndpoints : blueEndpoints,
            availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
        })

        const response = await Effect.gen(function* () {
            const lb = yield* LoadBalancer
            return yield* lb.handleRequest(request)
        }).pipe(Effect.provide(layer), Effect.runPromise)

        // Add header to indicate which deployment served the request
        const newResponse = new Response(response.body, response)
        newResponse.headers.set("X-Deployment", useGreen ? "green" : "blue")

        return newResponse
    },
}
