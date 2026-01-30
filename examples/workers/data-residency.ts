/**
 * GDPR Data Residency Example
 * 
 * Route traffic based on country for data residency compliance.
 * EU users → EU datacenter, UK users → UK datacenter, etc.
 */
import { Effect } from "effect"
import { LoadBalancer, geoEndpoint, endpoint } from "@blank-utils/load-balancer"

const lb = LoadBalancer.live({
    geoEndpoints: [
        // EU GDPR countries → Frankfurt datacenter
        geoEndpoint(
            "https://eu.api.example.com",
            {
                type: "country",
                countries: [
                    "DE",
                    "FR",
                    "IT",
                    "ES",
                    "NL",
                    "BE",
                    "AT",
                    "PL",
                    "SE",
                    "FI",
                    "DK",
                    "IE",
                    "PT",
                    "GR",
                    "CZ",
                    "RO",
                    "HU",
                    "SK",
                    "BG",
                    "HR",
                    "LT",
                    "LV",
                    "EE",
                    "SI",
                    "LU",
                    "CY",
                    "MT",
                ],
            },
            { healthCheckPath: "/health" },
        ),

        // UK → London datacenter (post-Brexit separate data handling)
        geoEndpoint("https://uk.api.example.com", { type: "country", countries: ["GB"] }, { healthCheckPath: "/health" }),

        // India → Mumbai datacenter (data localization laws)
        geoEndpoint("https://in.api.example.com", { type: "country", countries: ["IN"] }, { healthCheckPath: "/health" }),

        // China → Beijing datacenter (requires separate infrastructure)
        geoEndpoint("https://cn.api.example.com", { type: "country", countries: ["CN"] }, { healthCheckPath: "/health" }),

        // Brazil → São Paulo datacenter (LGPD compliance)
        geoEndpoint("https://br.api.example.com", { type: "country", countries: ["BR"] }, { healthCheckPath: "/health" }),

        // North America → US datacenter
        geoEndpoint("https://us.api.example.com", { type: "country", countries: ["US", "CA", "MX"] }, { healthCheckPath: "/health" }),
    ],

    steering: {
        type: "geo",
        // Default for countries not explicitly listed
        defaultEndpoints: [endpoint("https://us.api.example.com", { healthCheckPath: "/health" })],
    },

    availability: { type: "fail-forward", failoverOnStatuses: [502, 503, 504] },
})

export default {
    async fetch(request: Request): Promise<Response> {
        const response = await Effect.gen(function* () {
            const loadBalancer = yield* LoadBalancer
            return yield* loadBalancer.handleRequest(request)
        }).pipe(Effect.provide(lb), Effect.runPromise)

        // Add data residency header for transparency
        const cf = (request as { cf?: { country?: string } }).cf
        const newResponse = new Response(response.body, response)
        newResponse.headers.set("X-Data-Region", response.headers.get("X-Load-Balancer-Endpoint") || "unknown")
        newResponse.headers.set("X-User-Country", cf?.country || "unknown")

        return newResponse
    },
}
