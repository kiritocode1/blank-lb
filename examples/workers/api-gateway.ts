/**
 * API Gateway Example
 * 
 * Route different paths to different backend services.
 * This pattern is useful for microservices architectures.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

// Different backend pools for different services
const services = {
    auth: LoadBalancer.live({
        endpoints: [
            endpoint("https://auth1.example.com", { healthCheckPath: "/health" }),
            endpoint("https://auth2.example.com", { healthCheckPath: "/health" }),
        ],
    }),

    users: LoadBalancer.live({
        endpoints: [
            endpoint("https://users1.example.com", { healthCheckPath: "/health" }),
            endpoint("https://users2.example.com", { healthCheckPath: "/health" }),
        ],
    }),

    products: LoadBalancer.live({
        endpoints: [
            endpoint("https://products1.example.com", { healthCheckPath: "/health" }),
            endpoint("https://products2.example.com", { healthCheckPath: "/health" }),
            endpoint("https://products3.example.com", { healthCheckPath: "/health" }),
        ],
    }),

    orders: LoadBalancer.live({
        endpoints: [
            endpoint("https://orders1.example.com", { healthCheckPath: "/health" }),
            endpoint("https://orders2.example.com", { healthCheckPath: "/health" }),
        ],
    }),

    // Default/fallback service
    default: LoadBalancer.live({
        endpoints: [endpoint("https://api.example.com", { healthCheckPath: "/health" })],
    }),
}

// Route matcher - determine which service handles this request
function getServiceLayer(pathname: string) {
    if (pathname.startsWith("/auth") || pathname.startsWith("/login") || pathname.startsWith("/oauth")) {
        return services.auth
    }
    if (pathname.startsWith("/users") || pathname.startsWith("/profile")) {
        return services.users
    }
    if (pathname.startsWith("/products") || pathname.startsWith("/catalog")) {
        return services.products
    }
    if (pathname.startsWith("/orders") || pathname.startsWith("/checkout")) {
        return services.orders
    }
    return services.default
}

export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)
        const layer = getServiceLayer(url.pathname)

        return Effect.gen(function* () {
            const lb = yield* LoadBalancer
            return yield* lb.handleRequest(request)
        }).pipe(Effect.provide(layer), Effect.runPromise)
    },
}
