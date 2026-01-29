/**
 * Headers utility tests
 */
import { describe, expect, it } from "@effect/vitest"
import { endpoint } from "../Endpoint.js"
import { HEADERS, addLoadBalancerHeaders } from "../Headers.js"

describe("Headers", () => {
    describe("HEADERS constants", () => {
        it("has correct header names", () => {
            expect(HEADERS.ENDPOINT).toBe("X-Load-Balancer-Endpoint")
            expect(HEADERS.LATENCY).toBe("X-Load-Balancer-Latency")
            expect(HEADERS.GATHER_LATENCY).toBe("X-Load-Balancer-Endpoint-Gather-Latency")
            expect(HEADERS.TRIED_COUNT).toBe("X-Load-Balancer-Tried-Count")
            expect(HEADERS.TRIED_ENDPOINTS).toBe("X-Load-Balancer-Tried-Endpoints")
        })
    })

    describe("addLoadBalancerHeaders", () => {
        const createMockResponse = (status = 200, body = "OK") =>
            new Response(body, {
                status,
                headers: { "Content-Type": "text/plain" },
            })

        it("adds endpoint header", () => {
            const ep = endpoint("https://api.example.com")
            const response = createMockResponse()

            const result = addLoadBalancerHeaders(response, ep, [ep], 1000, 1050)

            expect(result.headers.get(HEADERS.ENDPOINT)).toBe("https://api.example.com")
        })

        it("calculates total latency", () => {
            const ep = endpoint("https://api.example.com")
            const response = createMockResponse()
            const startTime = Date.now() - 150 // 150ms ago

            const result = addLoadBalancerHeaders(response, ep, [ep], startTime, startTime + 10)

            const latency = parseInt(result.headers.get(HEADERS.LATENCY) || "0", 10)
            expect(latency).toBeGreaterThanOrEqual(140)
            expect(latency).toBeLessThanOrEqual(200)
        })

        it("calculates gather latency", () => {
            const ep = endpoint("https://api.example.com")
            const response = createMockResponse()

            const result = addLoadBalancerHeaders(response, ep, [ep], 1000, 1025)

            expect(result.headers.get(HEADERS.GATHER_LATENCY)).toBe("25")
        })

        it("preserves original response headers", () => {
            const ep = endpoint("https://api.example.com")
            const response = createMockResponse()

            const result = addLoadBalancerHeaders(response, ep, [ep], 1000, 1050)

            expect(result.headers.get("Content-Type")).toBe("text/plain")
        })

        it("preserves response status and statusText", () => {
            const ep = endpoint("https://api.example.com")
            const response = new Response("Not Found", { status: 404, statusText: "Not Found" })

            const result = addLoadBalancerHeaders(response, ep, [ep], 1000, 1050)

            expect(result.status).toBe(404)
            expect(result.statusText).toBe("Not Found")
        })

        describe("failover headers", () => {
            it("does not add tried headers when only one endpoint", () => {
                const ep = endpoint("https://api.example.com")
                const response = createMockResponse()

                const result = addLoadBalancerHeaders(response, ep, [ep], 1000, 1050)

                expect(result.headers.has(HEADERS.TRIED_COUNT)).toBe(false)
                expect(result.headers.has(HEADERS.TRIED_ENDPOINTS)).toBe(false)
            })

            it("adds tried count when multiple endpoints tried", () => {
                const ep1 = endpoint("https://api1.example.com")
                const ep2 = endpoint("https://api2.example.com")
                const ep3 = endpoint("https://api3.example.com")
                const response = createMockResponse()

                const result = addLoadBalancerHeaders(
                    response,
                    ep3, // The one that succeeded
                    [ep1, ep2, ep3], // All tried
                    1000,
                    1050,
                )

                expect(result.headers.get(HEADERS.TRIED_COUNT)).toBe("3")
            })

            it("adds tried endpoints list when multiple endpoints tried", () => {
                const ep1 = endpoint("https://api1.example.com")
                const ep2 = endpoint("https://api2.example.com")
                const response = createMockResponse()

                const result = addLoadBalancerHeaders(response, ep2, [ep1, ep2], 1000, 1050)

                expect(result.headers.get(HEADERS.TRIED_ENDPOINTS)).toBe(
                    "https://api1.example.com, https://api2.example.com",
                )
            })
        })

        it("creates a new Response object (immutable)", async () => {
            const ep = endpoint("https://api.example.com")
            const original = createMockResponse()
            const originalBody = await original.clone().text()

            const result = addLoadBalancerHeaders(original, ep, [ep], 1000, 1050)

            expect(result).not.toBe(original)
            const resultBody = await result.text()
            expect(resultBody).toBe(originalBody)
        })
    })
})
