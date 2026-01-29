/**
 * @blank-utils/load-balancer
 *
 * Geo steering - route requests based on geographic location
 */
import type { Endpoint } from "./Endpoint.js";
import type { GeoEndpoint } from "./GeoEndpoint.js";
/**
 * Cloudflare request properties for geo data
 */
export interface CfProperties {
    readonly continent?: string;
    readonly country?: string;
    readonly regionCode?: string;
    readonly colo?: string;
}
/**
 * Select endpoints based on geographic location.
 *
 * Priority order:
 * 1. Geo-matched endpoints (if geo steering enabled)
 * 2. Default endpoints (if configured and different from matched)
 * 3. All remaining endpoints
 */
export declare const selectGeoEndpoints: (geoEndpoints: ReadonlyArray<GeoEndpoint>, cf: CfProperties | undefined, defaultEndpoints?: ReadonlyArray<Endpoint>) => ReadonlyArray<Endpoint>;
//# sourceMappingURL=GeoSteering.d.ts.map