/**
 * Select endpoints based on geographic location.
 *
 * Priority order:
 * 1. Geo-matched endpoints (if geo steering enabled)
 * 2. Default endpoints (if configured and different from matched)
 * 3. All remaining endpoints
 */
export const selectGeoEndpoints = (geoEndpoints, cf, defaultEndpoints = []) => {
    // No CF data, use defaults or all endpoints
    if (!cf) {
        return defaultEndpoints.length > 0
            ? [...defaultEndpoints]
            : geoEndpoints.map((ge) => ge.toEndpoint());
    }
    // Find matching endpoints
    const matched = geoEndpoints.filter((ge) => ge.matchesCfProperties(cf));
    if (matched.length > 0) {
        // Build ordered list: matched -> defaults -> remaining
        const orderedEndpoints = [];
        const seen = new Set();
        // Add geo-matched endpoints first
        for (const ge of matched) {
            orderedEndpoints.push(ge.toEndpoint());
            seen.add(ge.url);
        }
        // Add default endpoints if not already included
        for (const ep of defaultEndpoints) {
            if (!seen.has(ep.url)) {
                orderedEndpoints.push(ep);
                seen.add(ep.url);
            }
        }
        // Add remaining endpoints for failover
        for (const ge of geoEndpoints) {
            if (!seen.has(ge.url)) {
                orderedEndpoints.push(ge.toEndpoint());
                seen.add(ge.url);
            }
        }
        return orderedEndpoints;
    }
    // No matches, use defaults or all
    return defaultEndpoints.length > 0
        ? [...defaultEndpoints]
        : geoEndpoints.map((ge) => ge.toEndpoint());
};
//# sourceMappingURL=GeoSteering.js.map