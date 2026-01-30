/**
 * REST API Load Balancer Example
 * 
 * This example shows how the load balancer acts as a transparent proxy
 * for your REST API. All routes (/users, /products, etc.) are defined
 * on your backend servers - the load balancer just forwards requests.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

/**
 * Your backend servers have routes like:
 * 
 * GET  /users          → List all users
 * GET  /users/:id      → Get user by ID
 * POST /users          → Create user
 * PUT  /users/:id      → Update user
 * DELETE /users/:id    → Delete user
 * 
 * GET  /products       → List products
 * GET  /products/:id   → Get product
 * POST /orders         → Create order
 * etc.
 * 
 * The load balancer transparently forwards ALL these requests
 * to one of your backend servers.
 */

const lb = LoadBalancer.live({
    endpoints: [
        endpoint("https://api1.example.com", { healthCheckPath: "/health" }),
        endpoint("https://api2.example.com", { healthCheckPath: "/health" }),
        endpoint("https://api3.example.com", { healthCheckPath: "/health" }),
    ],
    availability: {
        type: "fail-forward",
        failoverOnStatuses: [502, 503, 504],
    },
})

export default {
    async fetch(request: Request): Promise<Response> {
        // The load balancer forwards the ENTIRE request:
        // - Path: /users/123
        // - Method: GET, POST, PUT, DELETE, etc.
        // - Headers: Authorization, Content-Type, etc.
        // - Body: JSON payload for POST/PUT

        return Effect.gen(function* () {
            const loadBalancer = yield* LoadBalancer
            return yield* loadBalancer.handleRequest(request)
        }).pipe(Effect.provide(lb), Effect.runPromise)
    },
}

/**
 * ┌──────────────────────────────────────────────────────────────────┐
 * │                        How It Works                              │
 * └──────────────────────────────────────────────────────────────────┘
 * 
 * User Request                  Load Balancer              Backend Server
 * ─────────────                 ─────────────              ──────────────
 * 
 * GET /users/123  ──────────►  Forwards to  ──────────►  GET /users/123
 *                              api1.example.com           Returns user data
 * 
 * POST /orders    ──────────►  Forwards to  ──────────►  POST /orders
 * {items: [...]}               api2.example.com           Creates order
 * 
 * DELETE /users/5 ──────────►  Forwards to  ──────────►  DELETE /users/5
 *                              api1.example.com           Deletes user
 * 
 * The path, method, headers, and body are ALL preserved.
 */
