/**
 * Forward request tests
 */
import { afterAll, beforeAll, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { endpoint } from "../Endpoint.js"
import { forwardRequest } from "../Forward.js"
import { createTestServer, stopTestServers, type TestServer } from "./test-servers.js"

describe("Forward", () => {
    let server: TestServer

    beforeAll(async () => {
        server = await createTestServer({ port: 3010, name: "forward-test" })
    })

    afterAll(async () => {
        await stopTestServers([server])
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
    })
})
