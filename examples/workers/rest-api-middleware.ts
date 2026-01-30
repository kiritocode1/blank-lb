/**
 * REST API with Middleware Example
 * 
 * Sometimes you want to add logic BEFORE or AFTER the request
 * is forwarded to your backend. This example shows how to:
 * - Add authentication
 * - Transform requests
 * - Modify responses
 * - Handle specific routes locally
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

interface Env {
    API_KEY?: string
}

const lb = LoadBalancer.live({
    endpoints: [
        endpoint("https://api1.example.com", { healthCheckPath: "/health" }),
        endpoint("https://api2.example.com", { healthCheckPath: "/health" }),
    ],
    availability: {
        type: "fail-forward",
        failoverOnStatuses: [502, 503, 504],
    },
})

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)

        // ═══════════════════════════════════════════════════════════
        // 1. Handle specific routes LOCALLY (without hitting backend)
        // ═══════════════════════════════════════════════════════════

        // Health check endpoint - respond directly
        if (url.pathname === "/health" || url.pathname === "/healthz") {
            return new Response(JSON.stringify({ status: "healthy", service: "load-balancer" }), {
                headers: { "Content-Type": "application/json" },
            })
        }

        // Version endpoint - respond directly
        if (url.pathname === "/version") {
            return new Response(JSON.stringify({ version: "1.0.0", environment: "production" }), {
                headers: { "Content-Type": "application/json" },
            })
        }

        // ═══════════════════════════════════════════════════════════
        // 2. AUTHENTICATION - Check before forwarding
        // ═══════════════════════════════════════════════════════════

        // Skip auth for public endpoints
        const publicPaths = ["/public", "/login", "/register", "/docs"]
        const isPublic = publicPaths.some((p) => url.pathname.startsWith(p))

        if (!isPublic) {
            const authHeader = request.headers.get("Authorization")

            // Check for Bearer token
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return new Response(JSON.stringify({ error: "Unauthorized", message: "Missing or invalid Authorization header" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                })
            }

            // Optionally validate the token here
            // const token = authHeader.slice(7)
            // const isValid = await validateToken(token)
        }

        // ═══════════════════════════════════════════════════════════
        // 3. TRANSFORM REQUEST - Add headers before forwarding
        // ═══════════════════════════════════════════════════════════

        // Create a new request with additional headers
        const modifiedHeaders = new Headers(request.headers)

        // Add request ID for tracing
        const requestId = crypto.randomUUID()
        modifiedHeaders.set("X-Request-ID", requestId)

        // Add timestamp
        modifiedHeaders.set("X-Request-Time", new Date().toISOString())

        // Add internal API key for backend authentication
        if (env.API_KEY) {
            modifiedHeaders.set("X-Internal-API-Key", env.API_KEY)
        }

        // Create modified request (preserving Cloudflare properties)
        const modifiedRequest = new Request(request, {
            headers: modifiedHeaders,
        })

        // ═══════════════════════════════════════════════════════════
        // 4. FORWARD TO BACKEND via Load Balancer
        // ═══════════════════════════════════════════════════════════

        const response = await Effect.gen(function* () {
            const loadBalancer = yield* LoadBalancer
            return yield* loadBalancer.handleRequest(modifiedRequest)
        }).pipe(Effect.provide(lb), Effect.runPromise)

        // ═══════════════════════════════════════════════════════════
        // 5. TRANSFORM RESPONSE - Add headers, modify body
        // ═══════════════════════════════════════════════════════════

        // Clone response to modify headers
        const modifiedResponse = new Response(response.body, response)

        // Add CORS headers
        modifiedResponse.headers.set("Access-Control-Allow-Origin", "*")
        modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        modifiedResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        // Add request ID to response for client-side tracing
        modifiedResponse.headers.set("X-Request-ID", requestId)

        // Add cache headers for GET requests
        if (request.method === "GET" && response.ok) {
            modifiedResponse.headers.set("Cache-Control", "public, max-age=60")
        }

        return modifiedResponse
    },
}

/**
 * ════════════════════════════════════════════════════════════════════
 * Summary: Request Flow with Middleware
 * ════════════════════════════════════════════════════════════════════
 *
 * 1. Request arrives at Worker
 *    │
 *    ├─► /health, /version → Respond locally (no backend)
 *    │
 *    └─► All other routes
 *        │
 *        ├─► Check authentication (reject if invalid)
 *        │
 *        ├─► Add headers (X-Request-ID, X-Internal-API-Key, etc.)
 *        │
 *        ├─► Forward to backend via Load Balancer
 *        │
 *        └─► Transform response (add CORS, cache headers)
 *            │
 *            └─► Return to client
 */
