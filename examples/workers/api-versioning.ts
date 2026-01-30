/**
 * API Versioning Example
 * 
 * Route different API versions to different backend clusters.
 * Version can be specified via header, query param, or URL path.
 */
import { Effect } from "effect"
import { LoadBalancer, endpoint } from "@blank-utils/load-balancer"

// Backend pools for different API versions
const versionLayers = {
    v1: LoadBalancer.live({
        endpoints: [
            endpoint("https://v1-1.api.example.com", { healthCheckPath: "/health" }),
            endpoint("https://v1-2.api.example.com", { healthCheckPath: "/health" }),
        ],
        availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
    }),

    v2: LoadBalancer.live({
        endpoints: [
            endpoint("https://v2-1.api.example.com", { healthCheckPath: "/health" }),
            endpoint("https://v2-2.api.example.com", { healthCheckPath: "/health" }),
        ],
        availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
    }),

    v3: LoadBalancer.live({
        endpoints: [
            endpoint("https://v3-1.api.example.com", { healthCheckPath: "/health" }),
            endpoint("https://v3-2.api.example.com", { healthCheckPath: "/health" }),
        ],
        availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
    }),
}

type ApiVersion = keyof typeof versionLayers

function detectVersion(request: Request): ApiVersion {
    const url = new URL(request.url)

    // 1. Check URL path (e.g., /v2/users)
    const pathMatch = url.pathname.match(/^\/(v[1-3])\//)
    if (pathMatch) {
        return pathMatch[1] as ApiVersion
    }

    // 2. Check header (e.g., X-API-Version: v2)
    const headerVersion = request.headers.get("X-API-Version")
    if (headerVersion && headerVersion in versionLayers) {
        return headerVersion as ApiVersion
    }

    // 3. Check query param (e.g., ?version=v2)
    const queryVersion = url.searchParams.get("version")
    if (queryVersion && queryVersion in versionLayers) {
        return queryVersion as ApiVersion
    }

    // 4. Check Accept header (e.g., application/vnd.api.v2+json)
    const accept = request.headers.get("Accept") || ""
    const acceptMatch = accept.match(/application\/vnd\.api\.(v[1-3])\+json/)
    if (acceptMatch) {
        return acceptMatch[1] as ApiVersion
    }

    // Default to v1
    return "v1"
}

export default {
    async fetch(request: Request): Promise<Response> {
        const version = detectVersion(request)
        const layer = versionLayers[version]

        const response = await Effect.gen(function* () {
            const lb = yield* LoadBalancer
            return yield* lb.handleRequest(request)
        }).pipe(Effect.provide(layer), Effect.runPromise)

        // Add version headers
        const newResponse = new Response(response.body, response)
        newResponse.headers.set("X-API-Version", version)
        newResponse.headers.set("X-Supported-Versions", Object.keys(versionLayers).join(", "))

        return newResponse
    },
}
