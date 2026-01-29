/**
 * LoadBalancer service integration tests
 */
import { afterAll, beforeAll, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { endpoint } from "../Endpoint.js"
import { geoEndpoint } from "../GeoEndpoint.js"
import { LoadBalancer } from "../LoadBalancer.js"
import { createTestServer, stopTestServers, type TestServer } from "./test-servers.js"

describe("LoadBalancer", () => {
    let servers: TestServer[]

    beforeAll(async () => {
        servers = await Promise.all([
            createTestServer({ port: 3030, name: "lb-primary" }),
            createTestServer({ port: 3031, name: "lb-secondary" }),
            createTestServer({ port: 3032, name: "lb-tertiary" }),
        ])
    })

    afterAll(async () => {
        await stopTestServers(servers)
    })

    describe("LoadBalancer.live", () => {
        it.effect("handles request with single endpoint", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.status).toBe(200)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: [endpoint(servers[0]!.url)],
                    }),
                ),
            ),
        )

        it("returns correct server in response", async () => {
            const layer = LoadBalancer.live({
                endpoints: [endpoint(servers[0]!.url)],
            })

            const program = Effect.gen(function* () {
                const lb = yield* LoadBalancer
                return yield* lb.handleRequest(new Request("http://example.com/api/data"))
            }).pipe(Effect.provide(layer))

            const response = await Effect.runPromise(program)

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("lb-primary")
        })

        it.effect("handles request with multiple endpoints", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.status).toBe(200)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: servers.map((s) => endpoint(s.url)),
                    }),
                ),
            ),
        )

        it.effect("adds load balancer headers", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.headers.get("X-Load-Balancer-Endpoint")).toBe(servers[0]!.url)
                expect(response.headers.has("X-Load-Balancer-Latency")).toBe(true)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: [endpoint(servers[0]!.url)],
                    }),
                ),
            ),
        )
    })

    describe("availability methods", () => {
        it.effect("uses fail-forward by default", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.status).toBe(200)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: servers.map((s) => endpoint(s.url)),
                    }),
                ),
            ),
        )

        it.effect("supports explicit fail-forward config", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.status).toBe(200)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: servers.map((s) => endpoint(s.url)),
                        availability: { type: "fail-forward", failoverOnStatuses: [502, 503] },
                    }),
                ),
            ),
        )

        it.effect("supports async-block method", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.status).toBe(200)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: servers.map((s) => endpoint(s.url, { healthCheckPath: "/health" })),
                        availability: { type: "async-block" },
                    }),
                ),
            ),
        )

        it.effect("supports promise-any method", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const response = yield* lb.handleRequest(request)

                expect(response.status).toBe(200)
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: servers.map((s) => endpoint(s.url, { healthCheckPath: "/health" })),
                        availability: { type: "promise-any" },
                    }),
                ),
            ),
        )
    })

    describe("geo steering", () => {
        it("routes based on continent config", async () => {
            const layer = LoadBalancer.live({
                geoEndpoints: [
                    geoEndpoint(servers[0]!.url, { type: "continent", continents: ["NA"] }),
                    geoEndpoint(servers[1]!.url, { type: "continent", continents: ["EU"] }),
                    geoEndpoint(servers[2]!.url, { type: "continent", continents: ["AS"] }),
                ],
                steering: { type: "geo" },
            })

            const program = Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = Object.assign(new Request("http://example.com/api/data"), {
                    cf: { continent: "NA" },
                })
                return yield* lb.handleRequest(request)
            }).pipe(Effect.provide(layer))

            const response = await Effect.runPromise(program)

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("lb-primary")
        })

        it("routes EU requests to EU endpoint", async () => {
            const layer = LoadBalancer.live({
                geoEndpoints: [
                    geoEndpoint(servers[0]!.url, { type: "continent", continents: ["NA"] }),
                    geoEndpoint(servers[1]!.url, { type: "continent", continents: ["EU"] }),
                    geoEndpoint(servers[2]!.url, { type: "continent", continents: ["AS"] }),
                ],
                steering: { type: "geo" },
            })

            const program = Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = Object.assign(new Request("http://example.com/api/data"), {
                    cf: { continent: "EU" },
                })
                return yield* lb.handleRequest(request)
            }).pipe(Effect.provide(layer))

            const response = await Effect.runPromise(program)

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("lb-secondary")
        })

        it("falls back to default endpoints when no geo match", async () => {
            const layer = LoadBalancer.live({
                geoEndpoints: [
                    geoEndpoint(servers[0]!.url, { type: "continent", continents: ["NA"] }),
                    geoEndpoint(servers[1]!.url, { type: "continent", continents: ["EU"] }),
                ],
                steering: {
                    type: "geo",
                    defaultEndpoints: [endpoint(servers[2]!.url)],
                },
            })

            const program = Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = Object.assign(new Request("http://example.com/api/data"), {
                    cf: { continent: "AF" },
                })
                return yield* lb.handleRequest(request)
            }).pipe(Effect.provide(layer))

            const response = await Effect.runPromise(program)

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("lb-tertiary")
        })
    })

    describe("recovery function", () => {
        it("returns recovery response on failure", async () => {
            const layer = LoadBalancer.live({
                endpoints: [endpoint("http://localhost:59999")],
                recoveryFn: () => Effect.succeed(new Response("All backends down", { status: 503 })),
            })

            const program = Effect.gen(function* () {
                const lb = yield* LoadBalancer
                return yield* lb.handleRequest(new Request("http://example.com/api/data"))
            }).pipe(Effect.provide(layer))

            const response = await Effect.runPromise(program)

            expect(response.status).toBe(503)
            expect(await response.text()).toBe("All backends down")
        })
    })

    describe("error handling", () => {
        it.effect("fails with NoHealthyEndpointsError when no endpoints", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const result = yield* lb.handleRequest(request).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left._tag).toBe("NoHealthyEndpointsError")
                }
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: [],
                    }),
                ),
            ),
        )

        it.effect("fails when all endpoints are unreachable", () =>
            Effect.gen(function* () {
                const lb = yield* LoadBalancer
                const request = new Request("http://example.com/api/data")

                const result = yield* lb.handleRequest(request).pipe(Effect.either)

                expect(result._tag).toBe("Left")
            }).pipe(
                Effect.provide(
                    LoadBalancer.live({
                        endpoints: [
                            endpoint("http://localhost:59997"),
                            endpoint("http://localhost:59998"),
                            endpoint("http://localhost:59999"),
                        ],
                    }),
                ),
            ),
        )
    })
})
