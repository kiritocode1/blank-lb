/**
 * Forward request tests
 */
import { afterAll, beforeAll, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { endpoint } from "../Endpoint.js"
import {
    forwardRequest,
    bufferRequestBody,
    methodSupportsBody,
    type BufferedBody,
} from "../Forward.js"
import { createTestServer, stopTestServers, type TestServer } from "./test-servers.js"

describe("Forward", () => {
    let server: TestServer

    beforeAll(async () => {
        server = await createTestServer({ port: 3010, name: "forward-test" })
    })

    afterAll(async () => {
        await stopTestServers([server])
    })

    describe("methodSupportsBody", () => {
        it("returns false for GET", () => {
            expect(methodSupportsBody("GET")).toBe(false)
            expect(methodSupportsBody("get")).toBe(false)
        })

        it("returns false for HEAD", () => {
            expect(methodSupportsBody("HEAD")).toBe(false)
            expect(methodSupportsBody("head")).toBe(false)
        })

        it("returns false for OPTIONS", () => {
            expect(methodSupportsBody("OPTIONS")).toBe(false)
            expect(methodSupportsBody("options")).toBe(false)
        })

        it("returns true for POST", () => {
            expect(methodSupportsBody("POST")).toBe(true)
            expect(methodSupportsBody("post")).toBe(true)
        })

        it("returns true for PUT", () => {
            expect(methodSupportsBody("PUT")).toBe(true)
        })

        it("returns true for PATCH", () => {
            expect(methodSupportsBody("PATCH")).toBe(true)
        })

        it("returns true for DELETE", () => {
            expect(methodSupportsBody("DELETE")).toBe(true)
        })
    })

    describe("bufferRequestBody", () => {
        it.effect("returns null for GET requests", () =>
            Effect.gen(function* () {
                const request = new Request("https://example.com/test", {
                    method: "GET",
                })

                const body = yield* bufferRequestBody(request)

                expect(body).toBeNull()
            }),
        )

        it.effect("returns null for HEAD requests", () =>
            Effect.gen(function* () {
                const request = new Request("https://example.com/test", {
                    method: "HEAD",
                })

                const body = yield* bufferRequestBody(request)

                expect(body).toBeNull()
            }),
        )

        it.effect("returns null for OPTIONS requests", () =>
            Effect.gen(function* () {
                const request = new Request("https://example.com/test", {
                    method: "OPTIONS",
                })

                const body = yield* bufferRequestBody(request)

                expect(body).toBeNull()
            }),
        )

        it.effect("buffers body for POST requests", () =>
            Effect.gen(function* () {
                const testBody = JSON.stringify({ test: "data" })
                const request = new Request("https://example.com/test", {
                    method: "POST",
                    body: testBody,
                    headers: { "Content-Type": "application/json" },
                })

                const body = yield* bufferRequestBody(request)

                expect(body).toBeInstanceOf(ArrayBuffer)
                const decoded = new TextDecoder().decode(body as ArrayBuffer)
                expect(decoded).toBe(testBody)
            }),
        )

        it.effect("returns null for POST without body", () =>
            Effect.gen(function* () {
                const request = new Request("https://example.com/test", {
                    method: "POST",
                })

                const body = yield* bufferRequestBody(request)

                expect(body).toBeNull()
            }),
        )
    })

    describe("forwardRequest", () => {
        it.effect("forwards GET request to endpoint", () =>
            Effect.gen(function* () {
                const ep = endpoint(server.url)
                const request = new Request(`${server.url}/api/data`)

                const response = yield* forwardRequest(ep, request)

                expect(response.status).toBe(200)
            }),
        )

        it("forwards and returns correct server name", async () => {
            const ep = endpoint(server.url)
            const request = new Request(`${server.url}/api/data`)

            const program = forwardRequest(ep, request)
            const response = await Effect.runPromise(program)

            expect(response.status).toBe(200)
            const body = (await response.json()) as { server: string }
            expect(body.server).toBe("forward-test")
        })

        it.effect("preserves request path", () =>
            Effect.gen(function* () {
                const ep = endpoint(server.url)
                const request = new Request(`https://original.example.com/api/data?foo=bar`)

                const response = yield* forwardRequest(ep, request)

                expect(response.status).toBe(200)
            }),
        )

        it.effect("returns error status codes as-is", () =>
            Effect.gen(function* () {
                const ep = endpoint(server.url)
                const request = new Request(`${server.url}/error`)

                const response = yield* forwardRequest(ep, request)

                expect(response.status).toBe(500)
            }),
        )

        it.effect("fails with RequestForwardError on network error", () =>
            Effect.gen(function* () {
                const ep = endpoint("http://localhost:59999")
                const request = new Request("http://localhost:59999/test")

                const result = yield* forwardRequest(ep, request).pipe(Effect.either)

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left._tag).toBe("RequestForwardError")
                    expect(result.left.endpoint.url).toBe("http://localhost:59999")
                }
            }),
        )

        it.effect("uses buffered body when provided", () =>
            Effect.gen(function* () {
                const ep = endpoint(server.url)
                const testBody = JSON.stringify({ echo: "test-data" })

                // Buffer the body first
                const bufferedBody: BufferedBody = yield* bufferRequestBody(
                    new Request(`${server.url}/api/echo`, {
                        method: "POST",
                        body: testBody,
                        headers: { "Content-Type": "application/json" },
                    }),
                )

                // Create a new request without body (simulating consumed stream)
                const requestWithoutBody = new Request(`${server.url}/api/echo`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })

                // Forward should use the buffered body
                const response = yield* forwardRequest(ep, requestWithoutBody, bufferedBody)

                expect(response.status).toBe(200)
                const responseBody = yield* Effect.promise(() => response.json())
                const typedBody = responseBody as { echo: { echo: string } }
                expect(typedBody.echo.echo).toBe("test-data")
            }),
        )

        it.effect("strips body from GET even if bufferedBody provided", () =>
            Effect.gen(function* () {
                const ep = endpoint(server.url)

                // Create a buffered body (simulating weird edge case)
                const someBuffer = new TextEncoder().encode("should-be-stripped").buffer as ArrayBuffer

                const request = new Request(`${server.url}/api/data`, {
                    method: "GET",
                })

                // Forward should NOT use the buffered body for GET
                const response = yield* forwardRequest(ep, request, someBuffer)

                expect(response.status).toBe(200)
            }),
        )
    })
})

