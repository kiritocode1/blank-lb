/**
 * Test server utilities using Node.js http
 *
 * Creates mock servers on ports 3000, 3001, 3002 for integration testing
 */
import { type Server } from "node:http";
export interface TestServerConfig {
    port: number;
    healthy?: boolean;
    delay?: number;
    statusCode?: number;
    name?: string;
}
export interface TestServer {
    server: Server;
    port: number;
    url: string;
    stop: () => Promise<void>;
}
/**
 * Create a test server with configurable behavior
 */
export declare const createTestServer: (config: TestServerConfig) => Promise<TestServer>;
/**
 * Create standard test servers on ports 3000, 3001, 3002
 */
export declare const createTestServers: () => Promise<TestServer[]>;
/**
 * Stop all test servers
 */
export declare const stopTestServers: (servers: TestServer[]) => Promise<void>;
/**
 * Create a mixed health scenario
 */
export declare const createMixedHealthServers: () => Promise<TestServer[]>;
/**
 * Create servers with different response times
 */
export declare const createDelayedServers: () => Promise<TestServer[]>;
//# sourceMappingURL=test-servers.d.ts.map