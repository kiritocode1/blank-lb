/**
 * Recovery Handler Example
 * 
 * Demonstrates how to handle total backend failures gracefully.
 * Options: return fallback response, log to external service, store in R2, etc.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

// Stub R2Bucket type from @cloudflare/workers-types
interface R2Bucket {
    put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>
}

interface Env {
    FAILED_REQUESTS: R2Bucket // R2 bucket for storing failed requests
    ERROR_WEBHOOK?: string // Webhook URL for alerts
}

const lb = (env: Env) =>
    LoadBalancer.live({
        endpoints: [
            endpoint("https://api1.example.com", { healthCheckPath: "/health" }),
            endpoint("https://api2.example.com", { healthCheckPath: "/health" }),
        ],

        availability: {
            type: "fail-forward",
            failoverOnStatuses: [500, 502, 503, 504],
        },

        recoveryFn: (_request, context) =>
            Effect.sync(() => {
                const timestamp = new Date().toISOString()
                const requestId = crypto.randomUUID()

                // 1. Log the failure
                console.error(`[${timestamp}] All backends failed`, {
                    requestId,
                    triedEndpoints: context.triedEndpoints.map((ep) => ep.url),
                    lastError: String(context.lastError),
                })

                // 2. Store the failed request in R2 (fire and forget)
                env.FAILED_REQUESTS.put(
                    `failed/${timestamp.slice(0, 10)}/${requestId}.json`,
                    JSON.stringify({ requestId, timestamp, triedEndpoints: context.triedEndpoints.map((ep) => ep.url) }),
                    { httpMetadata: { contentType: "application/json" } },
                ).catch(() => { })

                // 3. Send alert to webhook (fire and forget)
                if (env.ERROR_WEBHOOK) {
                    fetch(env.ERROR_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: `🚨 All backends failed`,
                            requestId,
                            triedEndpoints: context.triedEndpoints.length,
                        }),
                    }).catch(() => { })
                }

                // 4. Return a user-friendly error response
                return new Response(
                    JSON.stringify({
                        error: "Service Temporarily Unavailable",
                        message: "We're experiencing technical difficulties. Please try again in a few minutes.",
                        requestId,
                        retryAfter: 60,
                    }),
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-After": "60",
                            "X-Request-Id": requestId,
                            "Cache-Control": "no-store",
                        },
                    },
                )
            }),
    })

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return Effect.gen(function* () {
            const loadBalancer = yield* LoadBalancer
            return yield* loadBalancer.handleRequest(request)
        }).pipe(Effect.provide(lb(env)), Effect.runPromise)
    },
}
