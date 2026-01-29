/**
 * @blank-utils/load-balancer
 *
 * GeoEndpoint - Endpoint with geographic targeting configuration
 */
import { Schema } from "effect"
import { Endpoint } from "./Endpoint.js"

/**
 * Continent codes as defined by Cloudflare
 */
export const ContinentCode = Schema.Literal(
    "AF", // Africa
    "AN", // Antarctica
    "AS", // Asia
    "EU", // Europe
    "NA", // North America
    "OC", // Oceania
    "SA", // South America
)
export type ContinentCode = typeof ContinentCode.Type

/**
 * Geo configuration for continent-based routing
 */
export const GeoContinentConfig = Schema.Struct({
    type: Schema.Literal("continent"),
    continents: Schema.Array(ContinentCode),
})

/**
 * Geo configuration for country-based routing (ISO 3166-1 alpha-2)
 */
export const GeoCountryConfig = Schema.Struct({
    type: Schema.Literal("country"),
    countries: Schema.Array(Schema.String),
})

/**
 * Geo configuration for region-based routing (ISO 3166-2)
 */
export const GeoRegionConfig = Schema.Struct({
    type: Schema.Literal("region"),
    regions: Schema.Array(Schema.String),
})

/**
 * Geo configuration for Cloudflare colo-based routing (IATA codes)
 */
export const GeoColoConfig = Schema.Struct({
    type: Schema.Literal("colo"),
    colos: Schema.Array(Schema.String),
})

/**
 * Union of all geo configuration types
 */
export const GeoConfig = Schema.Union(
    GeoContinentConfig,
    GeoCountryConfig,
    GeoRegionConfig,
    GeoColoConfig,
)
export type GeoConfig = typeof GeoConfig.Type

/**
 * A GeoEndpoint is an Endpoint with geographic targeting configuration.
 * Used with geo steering to route requests based on client location.
 */
export class GeoEndpoint extends Schema.Class<GeoEndpoint>("GeoEndpoint")({
    /**
     * The base URL of the endpoint
     */
    url: Schema.String,

    /**
     * Health check pathname
     */
    healthCheckPath: Schema.optionalWith(Schema.String, { default: () => "/" }),

    /**
     * Weight for weighted load balancing
     */
    weight: Schema.optionalWith(Schema.Number.pipe(Schema.positive()), {
        default: () => 1,
    }),

    /**
     * Timeout in milliseconds
     */
    timeoutMs: Schema.optionalWith(Schema.Number.pipe(Schema.positive()), {
        default: () => 30000,
    }),

    /**
     * Geographic targeting configuration
     */
    geo: GeoConfig,
}) {
    /**
     * Convert to a regular Endpoint (for forwarding requests)
     */
    toEndpoint(): Endpoint {
        return new Endpoint({
            url: this.url,
            healthCheckPath: this.healthCheckPath,
            weight: this.weight,
            timeoutMs: this.timeoutMs,
        })
    }

    /**
     * Get the normalized URL
     */
    get normalizedUrl(): string {
        return this.url.replace(/\/$/, "")
    }

    /**
     * Check if this endpoint matches the given Cloudflare request properties
     */
    matchesCfProperties(cf: {
        readonly continent?: string
        readonly country?: string
        readonly regionCode?: string
        readonly colo?: string
    }): boolean {
        switch (this.geo.type) {
            case "continent":
                return (
                    cf.continent !== undefined &&
                    this.geo.continents.includes(cf.continent as ContinentCode)
                )
            case "country":
                return (
                    cf.country !== undefined && this.geo.countries.includes(cf.country)
                )
            case "region":
                return (
                    cf.regionCode !== undefined &&
                    this.geo.regions.includes(cf.regionCode)
                )
            case "colo":
                return cf.colo !== undefined && this.geo.colos.includes(cf.colo)
        }
    }
}

/**
 * Create a geo endpoint (convenience function)
 */
export const geoEndpoint = (
    url: string,
    geo: GeoConfig,
    options?: {
        readonly healthCheckPath?: string
        readonly weight?: number
        readonly timeoutMs?: number
    },
): GeoEndpoint =>
    new GeoEndpoint({
        url,
        geo,
        healthCheckPath: options?.healthCheckPath ?? "/",
        weight: options?.weight ?? 1,
        timeoutMs: options?.timeoutMs ?? 30000,
    })
