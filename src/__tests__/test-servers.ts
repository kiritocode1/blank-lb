/**
 * Test server utilities using Node.js http
 * 
 * Creates mock servers on ports 3000, 3001, 3002 for integration testing
 */
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http"

export interface TestServerConfig {
    port: number
    healthy?: boolean
    delay?: number
    statusCode?: number
    name?: string
}

export interface TestServer {
    server: Server
    port: number
    url: string
    stop: () => Promise<void>
}

/**
 * Create a test server with configurable behavior
 */
export const createTestServer = async (config: TestServerConfig): Promise<TestServer> => {
    const { port, healthy = true, delay = 0, statusCode = 200, name = `server-${port}` } = config

    return new Promise((resolve, reject) => {
        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            const url = new URL(req.url || "/", `http://localhost:${port}`)

            if (delay > 0) {
                await new Promise((r) => setTimeout(r, delay))
            }

            const sendJson = (data: object, status = 200) => {
                res.writeHead(status, { "Content-Type": "application/json" })
                res.end(JSON.stringify(data))
            }

            // Routes
            if (url.pathname === "/" || url.pathname === "") {
                sendJson({ name, status: "ok", port })
                return
            }

            if (url.pathname === "/health") {
                if (!healthy) {
                    sendJson({ status: "unhealthy", name }, 503)
                    return
                }
                sendJson({ status: "healthy", name }, statusCode)
                return
            }

            if (url.pathname === "/api/data") {
                sendJson({
                    data: `Response from ${name}`,
                    server: name,
                    port,
                    timestamp: Date.now(),
                })
                return
            }

            if (url.pathname === "/api/echo" && req.method === "POST") {
                let body = ""
                req.on("data", (chunk) => (body += chunk))
                req.on("end", () => {
                    try {
                        sendJson({ echo: JSON.parse(body), server: name })
                    } catch {
                        sendJson({ echo: body, server: name })
                    }
                })
                return
            }

            if (url.pathname === "/slow") {
                await new Promise((r) => setTimeout(r, 5000))
                sendJson({ status: "slow response" })
                return
            }

            if (url.pathname === "/error") {
                sendJson({ error: "Internal server error" }, 500)
                return
            }

            if (url.pathname === "/502") {
                sendJson({ error: "Bad gateway" }, 502)
                return
            }

            if (url.pathname === "/503") {
                sendJson({ error: "Service unavailable" }, 503)
                return
            }

            res.writeHead(404)
            res.end("Not Found")
        })

        server.on("error", reject)

        server.listen(port, () => {
            resolve({
                server,
                port,
                url: `http://localhost:${port}`,
                stop: () =>
                    new Promise<void>((resolveClose) => {
                        server.close(() => resolveClose())
                    }),
            })
        })
    })
}

/**
 * Create standard test servers on ports 3000, 3001, 3002
 */
export const createTestServers = async (): Promise<TestServer[]> => {
    return Promise.all([
        createTestServer({ port: 3000, name: "primary" }),
        createTestServer({ port: 3001, name: "secondary" }),
        createTestServer({ port: 3002, name: "tertiary" }),
    ])
}

/**
 * Stop all test servers
 */
export const stopTestServers = async (servers: TestServer[]): Promise<void> => {
    if (!servers) return
    await Promise.all(servers.filter(Boolean).map((s) => s.stop()))
}

/**
 * Create a mixed health scenario
 */
export const createMixedHealthServers = async (): Promise<TestServer[]> => {
    return Promise.all([
        createTestServer({ port: 3000, name: "healthy-1", healthy: true }),
        createTestServer({ port: 3001, name: "unhealthy", healthy: false }),
        createTestServer({ port: 3002, name: "healthy-2", healthy: true }),
    ])
}

/**
 * Create servers with different response times
 */
export const createDelayedServers = async (): Promise<TestServer[]> => {
    return Promise.all([
        createTestServer({ port: 3000, name: "slow", delay: 2000 }),
        createTestServer({ port: 3001, name: "medium", delay: 500 }),
        createTestServer({ port: 3002, name: "fast", delay: 50 }),
    ])
}
