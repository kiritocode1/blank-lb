/**
 * GeoEndpoint tests
 */
import { describe, expect, it } from "@effect/vitest"
import { GeoEndpoint, geoEndpoint } from "../GeoEndpoint.js"

describe("GeoEndpoint", () => {
    describe("constructor", () => {
        it("creates a continent-based geo endpoint", () => {
            const ge = new GeoEndpoint({
                url: "https://us.api.example.com",
                geo: { type: "continent", continents: ["NA", "SA"] },
            })

            expect(ge.url).toBe("https://us.api.example.com")
            expect(ge.geo.type).toBe("continent")
            if (ge.geo.type === "continent") {
                expect(ge.geo.continents).toEqual(["NA", "SA"])
            }
            expect(ge.healthCheckPath).toBe("/")
            expect(ge.weight).toBe(1)
            expect(ge.timeoutMs).toBe(30000)
        })

        it("creates a country-based geo endpoint", () => {
            const ge = new GeoEndpoint({
                url: "https://uk.api.example.com",
                geo: { type: "country", countries: ["GB", "IE"] },
            })

            expect(ge.geo.type).toBe("country")
            if (ge.geo.type === "country") {
                expect(ge.geo.countries).toEqual(["GB", "IE"])
            }
        })

        it("creates a region-based geo endpoint", () => {
            const ge = new GeoEndpoint({
                url: "https://ca.api.example.com",
                geo: { type: "region", regions: ["CA-ON", "CA-QC"] },
            })

            expect(ge.geo.type).toBe("region")
            if (ge.geo.type === "region") {
                expect(ge.geo.regions).toEqual(["CA-ON", "CA-QC"])
            }
        })

        it("creates a colo-based geo endpoint", () => {
            const ge = new GeoEndpoint({
                url: "https://sfo.api.example.com",
                geo: { type: "colo", colos: ["SFO", "LAX", "SEA"] },
            })

            expect(ge.geo.type).toBe("colo")
            if (ge.geo.type === "colo") {
                expect(ge.geo.colos).toEqual(["SFO", "LAX", "SEA"])
            }
        })
    })

    describe("geoEndpoint() helper", () => {
        it("creates a geo endpoint with minimal options", () => {
            const ge = geoEndpoint("https://api.example.com", {
                type: "continent",
                continents: ["EU"],
            })

            expect(ge.url).toBe("https://api.example.com")
            expect(ge.geo.type).toBe("continent")
            expect(ge.healthCheckPath).toBe("/")
        })

        it("creates a geo endpoint with custom options", () => {
            const ge = geoEndpoint(
                "https://api.example.com",
                { type: "country", countries: ["US"] },
                { healthCheckPath: "/health", weight: 2, timeoutMs: 5000 },
            )

            expect(ge.healthCheckPath).toBe("/health")
            expect(ge.weight).toBe(2)
            expect(ge.timeoutMs).toBe(5000)
        })
    })

    describe("toEndpoint", () => {
        it("converts GeoEndpoint to Endpoint", () => {
            const ge = geoEndpoint(
                "https://api.example.com",
                { type: "continent", continents: ["NA"] },
                { healthCheckPath: "/health", weight: 3, timeoutMs: 15000 },
            )

            const ep = ge.toEndpoint()

            expect(ep.url).toBe("https://api.example.com")
            expect(ep.healthCheckPath).toBe("/health")
            expect(ep.weight).toBe(3)
            expect(ep.timeoutMs).toBe(15000)
            // Endpoint should not have geo property
            expect("geo" in ep).toBe(false)
        })
    })

    describe("normalizedUrl", () => {
        it("removes trailing slash", () => {
            const ge = geoEndpoint("https://api.example.com/", {
                type: "continent",
                continents: ["NA"],
            })

            expect(ge.normalizedUrl).toBe("https://api.example.com")
        })
    })

    describe("matchesCfProperties", () => {
        describe("continent matching", () => {
            const ge = geoEndpoint("https://api.example.com", {
                type: "continent",
                continents: ["NA", "SA"],
            })

            it("matches when continent is in list", () => {
                expect(ge.matchesCfProperties({ continent: "NA" })).toBe(true)
                expect(ge.matchesCfProperties({ continent: "SA" })).toBe(true)
            })

            it("does not match when continent is not in list", () => {
                expect(ge.matchesCfProperties({ continent: "EU" })).toBe(false)
                expect(ge.matchesCfProperties({ continent: "AS" })).toBe(false)
            })

            it("does not match when continent is undefined", () => {
                expect(ge.matchesCfProperties({})).toBe(false)
            })
        })

        describe("country matching", () => {
            const ge = geoEndpoint("https://api.example.com", {
                type: "country",
                countries: ["US", "CA", "MX"],
            })

            it("matches when country is in list", () => {
                expect(ge.matchesCfProperties({ country: "US" })).toBe(true)
                expect(ge.matchesCfProperties({ country: "CA" })).toBe(true)
            })

            it("does not match when country is not in list", () => {
                expect(ge.matchesCfProperties({ country: "GB" })).toBe(false)
            })

            it("does not match when country is undefined", () => {
                expect(ge.matchesCfProperties({})).toBe(false)
            })
        })

        describe("region matching", () => {
            const ge = geoEndpoint("https://api.example.com", {
                type: "region",
                regions: ["US-CA", "US-NY", "US-TX"],
            })

            it("matches when region is in list", () => {
                expect(ge.matchesCfProperties({ regionCode: "US-CA" })).toBe(true)
                expect(ge.matchesCfProperties({ regionCode: "US-NY" })).toBe(true)
            })

            it("does not match when region is not in list", () => {
                expect(ge.matchesCfProperties({ regionCode: "US-FL" })).toBe(false)
            })

            it("does not match when regionCode is undefined", () => {
                expect(ge.matchesCfProperties({})).toBe(false)
            })
        })

        describe("colo matching", () => {
            const ge = geoEndpoint("https://api.example.com", {
                type: "colo",
                colos: ["SFO", "LAX", "SEA"],
            })

            it("matches when colo is in list", () => {
                expect(ge.matchesCfProperties({ colo: "SFO" })).toBe(true)
                expect(ge.matchesCfProperties({ colo: "LAX" })).toBe(true)
            })

            it("does not match when colo is not in list", () => {
                expect(ge.matchesCfProperties({ colo: "EWR" })).toBe(false)
            })

            it("does not match when colo is undefined", () => {
                expect(ge.matchesCfProperties({})).toBe(false)
            })
        })

        describe("with multiple properties", () => {
            it("only checks the relevant geo type", () => {
                const continentGe = geoEndpoint("https://api.example.com", {
                    type: "continent",
                    continents: ["NA"],
                })

                // Should match on continent even if country doesn't match
                expect(
                    continentGe.matchesCfProperties({
                        continent: "NA",
                        country: "GB", // Would not match if we were checking country
                    }),
                ).toBe(true)
            })
        })
    })

    describe("GeoConfig types", () => {
        it("supports all continent codes", () => {
            const validContinents = ["AF", "AN", "AS", "EU", "NA", "OC", "SA"] as const

            for (const continent of validContinents) {
                const ge = geoEndpoint("https://api.example.com", {
                    type: "continent",
                    continents: [continent],
                })
                expect(ge.geo.type).toBe("continent")
            }
        })
    })
})
