/**
 * Error types tests
 */
import { describe, expect, it } from "@effect/vitest"
import { endpoint } from "../Endpoint.js"
import {
    NoHealthyEndpointsError,
    EndpointUnhealthyError,
    CircuitOpenError,
    RequestForwardError,
} from "../Errors.js"

describe("Errors", () => {
    const testEndpoint = endpoint("https://api.example.com")

    describe("NoHealthyEndpointsError", () => {
        it("creates error with tried endpoints", () => {
            const error = new NoHealthyEndpointsError({
                triedEndpoints: [testEndpoint],
            })

            expect(error._tag).toBe("NoHealthyEndpointsError")
            expect(error.triedEndpoints).toHaveLength(1)
            expect(error.triedEndpoints[0]?.url).toBe("https://api.example.com")
        })

        it("creates error with last error", () => {
            const lastError = new Error("Connection refused")
            const error = new NoHealthyEndpointsError({
                triedEndpoints: [testEndpoint],
                lastError,
            })

            expect(error.lastError).toBe(lastError)
        })

        it("generates descriptive message with endpoints", () => {
            const ep1 = endpoint("https://api1.example.com")
            const ep2 = endpoint("https://api2.example.com")

            const error = new NoHealthyEndpointsError({
                triedEndpoints: [ep1, ep2],
            })

            expect(error.message).toContain("No healthy endpoints available")
            expect(error.message).toContain("https://api1.example.com")
            expect(error.message).toContain("https://api2.example.com")
        })

        it("generates message when no endpoints tried", () => {
            const error = new NoHealthyEndpointsError({
                triedEndpoints: [],
            })

            expect(error.message).toContain("No healthy endpoints available")
            expect(error.message).toContain("(none)")
        })
    })

    describe("EndpointUnhealthyError", () => {
        it("creates timeout error", () => {
            const error = new EndpointUnhealthyError({
                endpoint: testEndpoint,
                reason: "timeout",
            })

            expect(error._tag).toBe("EndpointUnhealthyError")
            expect(error.endpoint).toBe(testEndpoint)
            expect(error.reason).toBe("timeout")
            expect(error.message).toContain("timed out")
            expect(error.message).toContain("https://api.example.com")
        })

        it("creates status error with status code", () => {
            const error = new EndpointUnhealthyError({
                endpoint: testEndpoint,
                reason: "status",
                statusCode: 503,
            })

            expect(error.reason).toBe("status")
            expect(error.statusCode).toBe(503)
            expect(error.message).toContain("returned status 503")
        })

        it("creates network error", () => {
            const error = new EndpointUnhealthyError({
                endpoint: testEndpoint,
                reason: "network",
            })

            expect(error.reason).toBe("network")
            expect(error.message).toContain("network error")
        })
    })

    describe("CircuitOpenError", () => {
        it("creates circuit open error", () => {
            const openedAt = new Date("2026-01-29T12:00:00Z")

            const error = new CircuitOpenError({
                endpoint: testEndpoint,
                openedAt,
                failures: 5,
            })

            expect(error._tag).toBe("CircuitOpenError")
            expect(error.endpoint).toBe(testEndpoint)
            expect(error.openedAt).toBe(openedAt)
            expect(error.failures).toBe(5)
        })

        it("generates descriptive message", () => {
            const openedAt = new Date("2026-01-29T12:00:00Z")

            const error = new CircuitOpenError({
                endpoint: testEndpoint,
                openedAt,
                failures: 5,
            })

            expect(error.message).toContain("Circuit open")
            expect(error.message).toContain("https://api.example.com")
            expect(error.message).toContain("5 failures")
            expect(error.message).toContain("2026-01-29")
        })
    })

    describe("RequestForwardError", () => {
        it("creates forward error with cause", () => {
            const cause = new Error("Connection reset")

            const error = new RequestForwardError({
                endpoint: testEndpoint,
                cause,
            })

            expect(error._tag).toBe("RequestForwardError")
            expect(error.endpoint).toBe(testEndpoint)
            expect(error.cause).toBe(cause)
        })

        it("generates message with cause", () => {
            const cause = new Error("Connection reset")

            const error = new RequestForwardError({
                endpoint: testEndpoint,
                cause,
            })

            expect(error.message).toContain("Failed to forward request")
            expect(error.message).toContain("https://api.example.com")
            expect(error.message).toContain("Connection reset")
        })

        it("handles non-Error cause", () => {
            const error = new RequestForwardError({
                endpoint: testEndpoint,
                cause: "Network error",
            })

            expect(error.message).toContain("Network error")
        })
    })

    describe("Error discrimination", () => {
        it("can discriminate errors by _tag", () => {
            const errors = [
                new NoHealthyEndpointsError({ triedEndpoints: [] }),
                new EndpointUnhealthyError({ endpoint: testEndpoint, reason: "timeout" }),
                new CircuitOpenError({
                    endpoint: testEndpoint,
                    openedAt: new Date(),
                    failures: 1,
                }),
                new RequestForwardError({ endpoint: testEndpoint, cause: "error" }),
            ]

            expect(errors.map((e) => e._tag)).toEqual([
                "NoHealthyEndpointsError",
                "EndpointUnhealthyError",
                "CircuitOpenError",
                "RequestForwardError",
            ])
        })
    })
})
