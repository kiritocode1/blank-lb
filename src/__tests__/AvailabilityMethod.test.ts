/**
 * AvailabilityMethod tests
 */
import { afterAll, beforeAll, describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { endpoint } from "../Endpoint.js"
import { EndpointUnhealthyError } from "../Errors.js"
import { HealthChecker } from "../HealthChecker.js"
import { failForward, asyncBlock, promiseAny, DEFAULT_FAILOVER_STATUSES } from "../AvailabilityMethod.js"
import { createTestServer, stopTestServers, type TestServer } from "./test-servers.js"

describe("AvailabilityMethod", () => {
    let servers: TestServer[]

    beforeAll(async () => {
        servers = await Promise.all([
            createTestServer({ port: 3020, name: "primary", healthy: true }),
            createTestServer({ port: 3021, name: "secondary", healthy: true }),
            createTestServer({ port: 3022, name: "tertiary", healthy: true }),
        ])
    })

    afterAll(async () => {
        await stopTestServers(servers)
    })

    describe("DEFAULT_FAILOVER_STATUSES", () => {
        it("includes 502, 503, 504", () => {
            expect(DEFAULT_FAILOVER_STATUSES).toContain(502)
            expect(DEFAULT_FAILOVER_STATUSES).toContain(503)
            expect(DEFAULT_FAILOVER_STATUSES).toContain(504)
        })
    })

    describe("failForward", () => {
        it.effect("returns response from first healthy endpoint", () =>
            Effect.gen(function* () {
                const endpoints = servers.map((s) => endpoint(s.url))
                const request = new Request("http://example.com/api/data")

                const response = yield* failForward(endpoints, request)

                expect(response.status).toBe(200)
            }),
        )

        it("returns correct server in response", async () => {
            const endpoints = servers.map((s) => endpoint(s.url))
            const request = new Request("http://example.com/api/data")

            const response = await Effect.runPromise(failForward(endpoints, request))

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("primary")
        })

        it.effect("adds load balancer headers", () =>
            Effect.gen(function* () {
                const endpoints = servers.map((s) => endpoint(s.url))
                const request = new Request("http://example.com/api/data")

                const response = yield* failForward(endpoints, request)

                expect(response.headers.has("X-Load-Balancer-Endpoint")).toBe(true)
                expect(response.headers.has("X-Load-Balancer-Latency")).toBe(true)
            }),
        )

        it.effect("fails over on 502 status to next endpoint", () =>
            Effect.gen(function* () {
                // Request /502 which returns 502 on first endpoint, triggering failover
                // Second endpoint also returns 502 since path is the same
                // This should exhaust all endpoints and fail
                const badEndpoint = endpoint(servers[0]!.url)
                const goodEndpoint = endpoint(servers[1]!.url)
                const request = new Request("http://example.com/502")

                const result = yield* failForward([badEndpoint, goodEndpoint], request).pipe(Effect.either)

                // Since BOTH endpoints return 502, we exhaust all and get an error
                expect(result._tag).toBe("Left")
            }),
        )

        it.effect("fails with NoHealthyEndpointsError when all fail", () =>
            Effect.gen(function* () {
                const badEndpoint = endpoint("http://localhost:59999")
                const request = new Request("http://example.com/test")

                const result = yield* failForward([badEndpoint], request).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left._tag).toBe("NoHealthyEndpointsError")
                    expect(result.left.triedEndpoints).toHaveLength(1)
                }
            }),
        )

        it.effect("respects custom failover statuses", () =>
            Effect.gen(function* () {
                const endpoints = servers.map((s) => endpoint(s.url))
                const request = new Request("http://example.com/error")

                const response = yield* failForward(endpoints, request, [502, 503, 504])

                expect(response.status).toBe(500)
            }),
        )
    })

    describe("asyncBlock", () => {
        const AlwaysHealthyChecker = Layer.succeed(HealthChecker, {
            check: () => Effect.succeed(true),
        })

        it.effect("uses first healthy endpoint after health check", () =>
            Effect.gen(function* () {
                const endpoints = servers.map((s) => endpoint(s.url, { healthCheckPath: "/health" }))
                const request = new Request("http://example.com/api/data")

                const response = yield* asyncBlock(endpoints, request)

                expect(response.status).toBe(200)
            }).pipe(Effect.provide(AlwaysHealthyChecker)),
        )

        it("skips unhealthy endpoints", async () => {
            const endpoints = servers.map((s) => endpoint(s.url))
            const request = new Request("http://example.com/api/data")

            const SkipFirstChecker = Layer.succeed(HealthChecker, {
                check: (ep) =>
                    ep.url.includes("3020")
                        ? Effect.fail(new EndpointUnhealthyError({ endpoint: ep, reason: "network" }))
                        : Effect.succeed(true),
            })

            const response = await Effect.runPromise(
                asyncBlock(endpoints, request).pipe(Effect.provide(SkipFirstChecker)),
            )

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("secondary")
        })

        it.effect("fails when all health checks fail", () =>
            Effect.gen(function* () {
                const endpoints = servers.map((s) => endpoint(s.url))
                const request = new Request("http://example.com/api/data")

                const result = yield* asyncBlock(endpoints, request).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left._tag).toBe("NoHealthyEndpointsError")
                }
            }).pipe(
                Effect.provide(
                    Layer.succeed(HealthChecker, {
                        check: (ep) => Effect.fail(new EndpointUnhealthyError({ endpoint: ep, reason: "network" })),
                    }),
                ),
            ),
        )
    })

    describe("promiseAny", () => {
        const AlwaysHealthyChecker = Layer.succeed(HealthChecker, {
            check: () => Effect.succeed(true),
        })

        it.effect("races health checks and uses first healthy", () =>
            Effect.gen(function* () {
                const endpoints = servers.map((s) => endpoint(s.url))
                const request = new Request("http://example.com/api/data")

                const response = yield* promiseAny(endpoints, request)

                expect(response.status).toBe(200)
            }).pipe(Effect.provide(AlwaysHealthyChecker)),
        )

        it.effect("fails when no endpoints provided", () =>
            Effect.gen(function* () {
                const request = new Request("http://example.com/api/data")

                const result = yield* promiseAny([], request).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left._tag).toBe("NoHealthyEndpointsError")
                    expect(result.left.triedEndpoints).toHaveLength(0)
                }
            }).pipe(Effect.provide(AlwaysHealthyChecker)),
        )

        it("picks fastest healthy endpoint", async () => {
            const endpoints = servers.map((s) => endpoint(s.url))
            const request = new Request("http://example.com/api/data")

            const FastThirdChecker = Layer.succeed(HealthChecker, {
                check: (ep) =>
                    ep.url.includes("3022")
                        ? Effect.succeed(true)
                        : Effect.delay(Effect.succeed(true), "100 millis"),
            })

            const response = await Effect.runPromise(
                promiseAny(endpoints, request).pipe(Effect.provide(FastThirdChecker)),
            )

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("tertiary")
        })
    })
})
