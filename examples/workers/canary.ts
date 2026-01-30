/**
 * Canary Deployment Example
 * 
 * Route specific users (beta testers, internal team, etc.) to canary backend.
 * Other users go to stable backends.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

interface Env {
    CANARY_COOKIE_NAME?: string
    CANARY_HEADER_NAME?: string
}

// Stable production backends
const stableLayer = LoadBalancer.live({
    endpoints: [
        endpoint("https://stable-1.api.example.com", { healthCheckPath: "/health" }),
        endpoint("https://stable-2.api.example.com", { healthCheckPath: "/health" }),
        endpoint("https://stable-3.api.example.com", { healthCheckPath: "/health" }),
    ],
    availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
})

// Canary backend (new version being tested)
const canaryLayer = LoadBalancer.live({
    endpoints: [endpoint("https://canary.api.example.com", { healthCheckPath: "/health" })],
    availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
})

function isCanaryUser(request: Request, env: Env): boolean {
    const cookieName = env.CANARY_COOKIE_NAME || "canary"
    const headerName = env.CANARY_HEADER_NAME || "X-Canary"

    // Check for canary header
    if (request.headers.get(headerName) === "true") {
        return true
    }

    // Check for canary cookie
    const cookies = request.headers.get("Cookie") || ""
    if (cookies.includes(`${cookieName}=true`)) {
        return true
    }

    // Check for specific user agents (e.g., internal testing tools)
    const userAgent = request.headers.get("User-Agent") || ""
    if (userAgent.includes("InternalTestBot")) {
        return true
    }

    return false
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const useCanary = isCanaryUser(request, env)
        const layer = useCanary ? canaryLayer : stableLayer

        const response = await Effect.gen(function* () {
            const lb = yield* LoadBalancer
            return yield* lb.handleRequest(request)
        }).pipe(Effect.provide(layer), Effect.runPromise)

        // Add header to indicate which version served the request
        const newResponse = new Response(response.body, response)
        newResponse.headers.set("X-Version", useCanary ? "canary" : "stable")

        return newResponse
    },
}
