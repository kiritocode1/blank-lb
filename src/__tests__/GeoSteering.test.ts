/**
 * GeoSteering tests
 */
import { describe, expect, it } from "@effect/vitest"
import { endpoint } from "../Endpoint.js"
import { geoEndpoint } from "../GeoEndpoint.js"
import { selectGeoEndpoints } from "../GeoSteering.js"

describe("GeoSteering", () => {
    // Test geo endpoints
    const usEndpoint = geoEndpoint("https://us.api.example.com", {
        type: "continent",
        continents: ["NA"],
    })

    const euEndpoint = geoEndpoint("https://eu.api.example.com", {
        type: "continent",
        continents: ["EU"],
    })

    const asiaEndpoint = geoEndpoint("https://asia.api.example.com", {
        type: "continent",
        continents: ["AS"],
    })

    const allEndpoints = [usEndpoint, euEndpoint, asiaEndpoint]

    // Default endpoint
    const defaultEndpoint = endpoint("https://default.api.example.com")

    describe("selectGeoEndpoints", () => {
        describe("when CF properties are undefined", () => {
            it("returns default endpoints if provided", () => {
                const result = selectGeoEndpoints(allEndpoints, undefined, [defaultEndpoint])

                expect(result).toHaveLength(1)
                expect(result[0]?.url).toBe("https://default.api.example.com")
            })

            it("returns all geo endpoints converted to endpoints if no defaults", () => {
                const result = selectGeoEndpoints(allEndpoints, undefined, [])

                expect(result).toHaveLength(3)
                expect(result.map((ep) => ep.url)).toEqual([
                    "https://us.api.example.com",
                    "https://eu.api.example.com",
                    "https://asia.api.example.com",
                ])
            })
        })

        describe("when CF properties are provided", () => {
            it("returns matching endpoints first when continent matches", () => {
                const result = selectGeoEndpoints(allEndpoints, { continent: "NA" })

                expect(result[0]?.url).toBe("https://us.api.example.com")
            })

            it("returns EU endpoint for EU continent", () => {
                const result = selectGeoEndpoints(allEndpoints, { continent: "EU" })

                expect(result[0]?.url).toBe("https://eu.api.example.com")
            })

            it("returns Asia endpoint for AS continent", () => {
                const result = selectGeoEndpoints(allEndpoints, { continent: "AS" })

                expect(result[0]?.url).toBe("https://asia.api.example.com")
            })

            it("includes non-matching endpoints as fallback", () => {
                const result = selectGeoEndpoints(allEndpoints, { continent: "NA" })

                // First should be matched, rest should be fallbacks
                expect(result).toHaveLength(3)
                expect(result[0]?.url).toBe("https://us.api.example.com")
                // Other endpoints available as fallback
                expect(result.map((ep) => ep.url)).toContain("https://eu.api.example.com")
                expect(result.map((ep) => ep.url)).toContain("https://asia.api.example.com")
            })
        })

        describe("when no geo match found", () => {
            it("returns default endpoints if provided", () => {
                const result = selectGeoEndpoints(
                    allEndpoints,
                    { continent: "AF" }, // Africa - not in any geo config
                    [defaultEndpoint],
                )

                expect(result).toHaveLength(1)
                expect(result[0]?.url).toBe("https://default.api.example.com")
            })

            it("returns all geo endpoints if no defaults", () => {
                const result = selectGeoEndpoints(
                    allEndpoints,
                    { continent: "AF" }, // Not matched
                    [],
                )

                expect(result).toHaveLength(3)
            })
        })

        describe("ordering with defaults", () => {
            it("places matched endpoints before defaults", () => {
                const result = selectGeoEndpoints(allEndpoints, { continent: "NA" }, [defaultEndpoint])

                expect(result[0]?.url).toBe("https://us.api.example.com")
                // Default should be in the list
                expect(result.map((ep) => ep.url)).toContain("https://default.api.example.com")
            })

            it("places defaults before non-matched geo endpoints", () => {
                const result = selectGeoEndpoints(allEndpoints, { continent: "NA" }, [defaultEndpoint])

                // Order: matched -> defaults -> remaining
                const urls = result.map((ep) => ep.url)
                const matchedIdx = urls.indexOf("https://us.api.example.com")
                const defaultIdx = urls.indexOf("https://default.api.example.com")
                const euIdx = urls.indexOf("https://eu.api.example.com")

                expect(matchedIdx).toBe(0)
                expect(defaultIdx).toBeLessThan(euIdx)
            })
        })

        describe("deduplication", () => {
            it("does not duplicate endpoints", () => {
                // Create a scenario where the default is also a geo endpoint
                const usDefault = endpoint("https://us.api.example.com")

                const result = selectGeoEndpoints(allEndpoints, { continent: "NA" }, [usDefault])

                const usUrls = result.filter((ep) => ep.url === "https://us.api.example.com")
                expect(usUrls).toHaveLength(1)
            })
        })

        describe("country-based routing", () => {
            const ukEndpoint = geoEndpoint("https://uk.api.example.com", {
                type: "country",
                countries: ["GB"],
            })

            const frEndpoint = geoEndpoint("https://fr.api.example.com", {
                type: "country",
                countries: ["FR"],
            })

            it("matches by country code", () => {
                const result = selectGeoEndpoints([ukEndpoint, frEndpoint], { country: "GB" })

                expect(result[0]?.url).toBe("https://uk.api.example.com")
            })
        })

        describe("region-based routing", () => {
            const californiaEndpoint = geoEndpoint("https://ca.api.example.com", {
                type: "region",
                regions: ["US-CA"],
            })

            const newYorkEndpoint = geoEndpoint("https://ny.api.example.com", {
                type: "region",
                regions: ["US-NY"],
            })

            it("matches by region code", () => {
                const result = selectGeoEndpoints([californiaEndpoint, newYorkEndpoint], {
                    regionCode: "US-CA",
                })

                expect(result[0]?.url).toBe("https://ca.api.example.com")
            })
        })

        describe("colo-based routing", () => {
            const sfoEndpoint = geoEndpoint("https://sfo.api.example.com", {
                type: "colo",
                colos: ["SFO"],
            })

            const ewrEndpoint = geoEndpoint("https://ewr.api.example.com", {
                type: "colo",
                colos: ["EWR"],
            })

            it("matches by colo", () => {
                const result = selectGeoEndpoints([sfoEndpoint, ewrEndpoint], { colo: "SFO" })

                expect(result[0]?.url).toBe("https://sfo.api.example.com")
            })
        })

        describe("multiple matching endpoints", () => {
            const naEndpoint1 = geoEndpoint("https://na1.api.example.com", {
                type: "continent",
                continents: ["NA"],
            })

            const naEndpoint2 = geoEndpoint("https://na2.api.example.com", {
                type: "continent",
                continents: ["NA"],
            })

            it("returns all matching endpoints first", () => {
                const result = selectGeoEndpoints([naEndpoint1, naEndpoint2, euEndpoint], {
                    continent: "NA",
                })

                expect(result[0]?.url).toBe("https://na1.api.example.com")
                expect(result[1]?.url).toBe("https://na2.api.example.com")
                expect(result[2]?.url).toBe("https://eu.api.example.com")
            })
        })

        describe("edge cases", () => {
            it("handles empty geo endpoints array", () => {
                const result = selectGeoEndpoints([], { continent: "NA" })

                expect(result).toHaveLength(0)
            })

            it("handles empty geo endpoints with defaults", () => {
                const result = selectGeoEndpoints([], { continent: "NA" }, [defaultEndpoint])

                // Returns defaults when no geo match and no geo endpoints
                expect(result).toHaveLength(1)
                expect(result[0]?.url).toBe("https://default.api.example.com")
            })

            it("handles empty CF properties object", () => {
                const result = selectGeoEndpoints(allEndpoints, {}, [defaultEndpoint])

                // No matches (empty cf), returns defaults
                expect(result).toHaveLength(1)
                expect(result[0]?.url).toBe("https://default.api.example.com")
            })
        })
    })
})
