/**
 * HealthChecker service tests
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { endpoint } from "../Endpoint.js"
import { EndpointUnhealthyError } from "../Errors.js"
import { HealthChecker, HealthCheckerLive, HealthCheckerTest } from "../HealthChecker.js"

describe("HealthChecker", () => {
    const testEndpoint = endpoint("https://api.example.com", {
        healthCheckPath: "/health",
    })

    describe("HealthCheckerTest", () => {
        it.effect("always returns healthy", () =>
            Effect.gen(function* () {
                const checker = yield* HealthChecker
                const result = yield* checker.check(testEndpoint)

                expect(result).toBe(true)
            }).pipe(Effect.provide(HealthCheckerTest)),
        )

        it.effect("returns healthy for any endpoint", () =>
            Effect.gen(function* () {
                const checker = yield* HealthChecker

                const endpoints = [
                    endpoint("https://api1.example.com"),
                    endpoint("https://api2.example.com"),
                    endpoint("https://unreachable.example.com"),
                ]

                for (const ep of endpoints) {
                    const result = yield* checker.check(ep)
                    expect(result).toBe(true)
                }
            }).pipe(Effect.provide(HealthCheckerTest)),
        )
    })

    describe("Custom HealthChecker implementations", () => {
        it.effect("can create a checker that always fails", () =>
            Effect.gen(function* () {
                const checker = yield* HealthChecker
                const result = yield* checker.check(testEndpoint).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left._tag).toBe("EndpointUnhealthyError")
                }
            }).pipe(
                Effect.provide(
                    Layer.succeed(HealthChecker, {
                        check: (ep) =>
                            Effect.fail(new EndpointUnhealthyError({ endpoint: ep, reason: "network" })),
                    }),
                ),
            ),
        )

        it.effect("can create a checker based on URL patterns", () =>
            Effect.gen(function* () {
                const checker = yield* HealthChecker

                const healthyEp = endpoint("https://healthy.example.com")
                const unhealthyEp = endpoint("https://unhealthy.example.com")

                const healthyResult = yield* checker.check(healthyEp).pipe(Effect.either)
                const unhealthyResult = yield* checker.check(unhealthyEp).pipe(Effect.either)

                expect(healthyResult._tag).toBe("Right")
                expect(unhealthyResult._tag).toBe("Left")
            }).pipe(
                Effect.provide(
                    Layer.succeed(HealthChecker, {
                        check: (ep) =>
                            ep.url.includes("healthy") && !ep.url.includes("unhealthy")
                                ? Effect.succeed(true)
                                : Effect.fail(
                                    new EndpointUnhealthyError({ endpoint: ep, reason: "status", statusCode: 503 }),
                                ),
                    }),
                ),
            ),
        )

        it.effect("can simulate timeout errors", () =>
            Effect.gen(function* () {
                const checker = yield* HealthChecker
                const result = yield* checker.check(testEndpoint).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left.reason).toBe("timeout")
                }
            }).pipe(
                Effect.provide(
                    Layer.succeed(HealthChecker, {
                        check: (ep) =>
                            Effect.fail(new EndpointUnhealthyError({ endpoint: ep, reason: "timeout" })),
                    }),
                ),
            ),
        )

        it.effect("can simulate status code errors", () =>
            Effect.gen(function* () {
                const checker = yield* HealthChecker
                const result = yield* checker.check(testEndpoint).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left.reason).toBe("status")
                    expect(result.left.statusCode).toBe(503)
                }
            }).pipe(
                Effect.provide(
                    Layer.succeed(HealthChecker, {
                        check: (ep) =>
                            Effect.fail(
                                new EndpointUnhealthyError({ endpoint: ep, reason: "status", statusCode: 503 }),
                            ),
                    }),
                ),
            ),
        )
    })

    describe("HealthChecker service contract", () => {
        it("HealthCheckerLive is a valid Layer", () => {
            expect(HealthCheckerLive).toBeDefined()
            // Layer type check - if this compiles, it's valid
            const _layer: Layer.Layer<HealthChecker> = HealthCheckerLive
            expect(_layer).toBe(HealthCheckerLive)
        })

        it("HealthCheckerTest is a valid Layer", () => {
            expect(HealthCheckerTest).toBeDefined()
            const _layer: Layer.Layer<HealthChecker> = HealthCheckerTest
            expect(_layer).toBe(HealthCheckerTest)
        })
    })
})
