/**
 * Recovery function tests
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { endpoint } from "../Endpoint.js"
import { NoHealthyEndpointsError } from "../Errors.js"
import { withRecovery, type RecoveryContext, type RecoveryFn } from "../Recovery.js"

describe("Recovery", () => {
    const testEndpoint = endpoint("https://api.example.com")
    const createRequest = (url = "https://example.com/test") => new Request(url, { method: "GET" })

    describe("withRecovery", () => {
        it.effect("passes through successful effects unchanged", () =>
            Effect.gen(function* () {
                const successEffect = Effect.succeed(new Response("OK"))
                const result = yield* withRecovery(successEffect, createRequest(), undefined, () => ({ triedEndpoints: [] }))
                expect(result.status).toBe(200)
            }),
        )

        it.effect("passes through failed effects when no recovery", () =>
            Effect.gen(function* () {
                const failedEffect = Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [testEndpoint] }))
                const result = yield* withRecovery(failedEffect, createRequest(), undefined, () => ({ triedEndpoints: [testEndpoint] })).pipe(Effect.either)
                expect(result._tag).toBe("Left")
            }),
        )

        it.effect("does not call recovery on success", () =>
            Effect.gen(function* () {
                let called = false
                const recoveryFn: RecoveryFn = () => Effect.sync(() => { called = true; return undefined })
                yield* withRecovery(Effect.succeed(new Response("OK")), createRequest(), recoveryFn, () => ({ triedEndpoints: [] }))
                expect(called).toBe(false)
            }),
        )

        it.effect("calls recovery on failure", () =>
            Effect.gen(function* () {
                let called = false
                const recoveryFn: RecoveryFn = () => Effect.sync(() => { called = true; return undefined })
                const failedEffect = Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [] }))
                yield* withRecovery(failedEffect, createRequest(), recoveryFn, () => ({ triedEndpoints: [] })).pipe(Effect.either)
                expect(called).toBe(true)
            }),
        )

        it.effect("receives correct request in recovery", () =>
            Effect.gen(function* () {
                let receivedUrl: string | undefined
                const recoveryFn: RecoveryFn = (req) => Effect.sync(() => { receivedUrl = req.url; return undefined })
                const failedEffect = Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [] }))
                yield* withRecovery(failedEffect, createRequest("https://test.com/path"), recoveryFn, () => ({ triedEndpoints: [] })).pipe(Effect.either)
                expect(receivedUrl).toBe("https://test.com/path")
            }),
        )

        it.effect("receives correct context in recovery", () =>
            Effect.gen(function* () {
                let ctx: RecoveryContext | undefined
                const recoveryFn: RecoveryFn = (_, c) => Effect.sync(() => { ctx = c; return undefined })
                const failedEffect = Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [testEndpoint] }))
                yield* withRecovery(failedEffect, createRequest(), recoveryFn, () => ({ triedEndpoints: [testEndpoint], lastError: new Error("test") })).pipe(Effect.either)
                expect(ctx?.triedEndpoints).toHaveLength(1)
            }),
        )

        it.effect("returns recovery response when provided", () =>
            Effect.gen(function* () {
                const recoveryFn: RecoveryFn = () => Effect.succeed(new Response("Fallback", { status: 503 }))
                const failedEffect = Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [] }))
                const result = yield* withRecovery(failedEffect, createRequest(), recoveryFn, () => ({ triedEndpoints: [] }))
                expect(result.status).toBe(503)
            }),
        )

        it.effect("re-throws error when recovery returns undefined", () =>
            Effect.gen(function* () {
                const recoveryFn: RecoveryFn = () => Effect.succeed(undefined)
                const failedEffect = Effect.fail(new NoHealthyEndpointsError({ triedEndpoints: [testEndpoint] }))
                const result = yield* withRecovery(failedEffect, createRequest(), recoveryFn, () => ({ triedEndpoints: [testEndpoint] })).pipe(Effect.either)
                expect(result._tag).toBe("Left")
            }),
        )
    })
})
