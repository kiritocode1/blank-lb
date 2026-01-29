/**
 * @blank-utils/load-balancer
 *
 * GeoEndpoint - Endpoint with geographic targeting configuration
 */
import { Schema } from "effect";
import { Endpoint } from "./Endpoint.js";
/**
 * Continent codes as defined by Cloudflare
 */
export declare const ContinentCode: Schema.Literal<["AF", "AN", "AS", "EU", "NA", "OC", "SA"]>;
export type ContinentCode = typeof ContinentCode.Type;
/**
 * Geo configuration for continent-based routing
 */
export declare const GeoContinentConfig: Schema.Struct<{
    type: Schema.Literal<["continent"]>;
    continents: Schema.Array$<Schema.Literal<["AF", "AN", "AS", "EU", "NA", "OC", "SA"]>>;
}>;
/**
 * Geo configuration for country-based routing (ISO 3166-1 alpha-2)
 */
export declare const GeoCountryConfig: Schema.Struct<{
    type: Schema.Literal<["country"]>;
    countries: Schema.Array$<typeof Schema.String>;
}>;
/**
 * Geo configuration for region-based routing (ISO 3166-2)
 */
export declare const GeoRegionConfig: Schema.Struct<{
    type: Schema.Literal<["region"]>;
    regions: Schema.Array$<typeof Schema.String>;
}>;
/**
 * Geo configuration for Cloudflare colo-based routing (IATA codes)
 */
export declare const GeoColoConfig: Schema.Struct<{
    type: Schema.Literal<["colo"]>;
    colos: Schema.Array$<typeof Schema.String>;
}>;
/**
 * Union of all geo configuration types
 */
export declare const GeoConfig: Schema.Union<[Schema.Struct<{
    type: Schema.Literal<["continent"]>;
    continents: Schema.Array$<Schema.Literal<["AF", "AN", "AS", "EU", "NA", "OC", "SA"]>>;
}>, Schema.Struct<{
    type: Schema.Literal<["country"]>;
    countries: Schema.Array$<typeof Schema.String>;
}>, Schema.Struct<{
    type: Schema.Literal<["region"]>;
    regions: Schema.Array$<typeof Schema.String>;
}>, Schema.Struct<{
    type: Schema.Literal<["colo"]>;
    colos: Schema.Array$<typeof Schema.String>;
}>]>;
export type GeoConfig = typeof GeoConfig.Type;
declare const GeoEndpoint_base: Schema.Class<GeoEndpoint, {
    /**
     * The base URL of the endpoint
     */
    url: typeof Schema.String;
    /**
     * Health check pathname
     */
    healthCheckPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    /**
     * Weight for weighted load balancing
     */
    weight: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
    /**
     * Timeout in milliseconds
     */
    timeoutMs: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
    /**
     * Geographic targeting configuration
     */
    geo: Schema.Union<[Schema.Struct<{
        type: Schema.Literal<["continent"]>;
        continents: Schema.Array$<Schema.Literal<["AF", "AN", "AS", "EU", "NA", "OC", "SA"]>>;
    }>, Schema.Struct<{
        type: Schema.Literal<["country"]>;
        countries: Schema.Array$<typeof Schema.String>;
    }>, Schema.Struct<{
        type: Schema.Literal<["region"]>;
        regions: Schema.Array$<typeof Schema.String>;
    }>, Schema.Struct<{
        type: Schema.Literal<["colo"]>;
        colos: Schema.Array$<typeof Schema.String>;
    }>]>;
}, Schema.Struct.Encoded<{
    /**
     * The base URL of the endpoint
     */
    url: typeof Schema.String;
    /**
     * Health check pathname
     */
    healthCheckPath: Schema.optionalWith<typeof Schema.String, {
        default: () => string;
    }>;
    /**
     * Weight for weighted load balancing
     */
    weight: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
    /**
     * Timeout in milliseconds
     */
    timeoutMs: Schema.optionalWith<Schema.filter<typeof Schema.Number>, {
        default: () => number;
    }>;
    /**
     * Geographic targeting configuration
     */
    geo: Schema.Union<[Schema.Struct<{
        type: Schema.Literal<["continent"]>;
        continents: Schema.Array$<Schema.Literal<["AF", "AN", "AS", "EU", "NA", "OC", "SA"]>>;
    }>, Schema.Struct<{
        type: Schema.Literal<["country"]>;
        countries: Schema.Array$<typeof Schema.String>;
    }>, Schema.Struct<{
        type: Schema.Literal<["region"]>;
        regions: Schema.Array$<typeof Schema.String>;
    }>, Schema.Struct<{
        type: Schema.Literal<["colo"]>;
        colos: Schema.Array$<typeof Schema.String>;
    }>]>;
}>, never, {
    readonly url: string;
} & {
    readonly healthCheckPath?: string;
} & {
    readonly weight?: number;
} & {
    readonly timeoutMs?: number;
} & {
    readonly geo: {
        readonly type: "continent";
        readonly continents: readonly ("AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA")[];
    } | {
        readonly type: "country";
        readonly countries: readonly string[];
    } | {
        readonly type: "region";
        readonly regions: readonly string[];
    } | {
        readonly type: "colo";
        readonly colos: readonly string[];
    };
}, {}, {}>;
/**
 * A GeoEndpoint is an Endpoint with geographic targeting configuration.
 * Used with geo steering to route requests based on client location.
 */
export declare class GeoEndpoint extends GeoEndpoint_base {
    /**
     * Convert to a regular Endpoint (for forwarding requests)
     */
    toEndpoint(): Endpoint;
    /**
     * Get the normalized URL
     */
    get normalizedUrl(): string;
    /**
     * Check if this endpoint matches the given Cloudflare request properties
     */
    matchesCfProperties(cf: {
        readonly continent?: string;
        readonly country?: string;
        readonly regionCode?: string;
        readonly colo?: string;
    }): boolean;
}
/**
 * Create a geo endpoint (convenience function)
 */
export declare const geoEndpoint: (url: string, geo: GeoConfig, options?: {
    readonly healthCheckPath?: string;
    readonly weight?: number;
    readonly timeoutMs?: number;
}) => GeoEndpoint;
export {};
//# sourceMappingURL=GeoEndpoint.d.ts.map