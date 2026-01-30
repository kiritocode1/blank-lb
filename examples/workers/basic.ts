/**
 * Basic Load Balancer Example
 * 
 * The simplest setup: distribute traffic across multiple backend servers
 * with automatic failover.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

// Define your backend endpoints
const lb = LoadBalancer.live({
    endpoints: [
        endpoint("https://api1.example.com"),
        endpoint("https://api2.example.com"),
        endpoint("https://api3.example.com"),
    ],
})

export default {
    async fetch(request: Request): Promise<Response> {
        return Effect.gen(function* () {
            const loadBalancer = yield* LoadBalancer
            return yield* loadBalancer.handleRequest(request)
        }).pipe(Effect.provide(lb), Effect.runPromise)
    },
}
