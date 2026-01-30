# Examples

This directory contains ready-to-use Cloudflare Worker examples demonstrating various load balancer patterns.

## Quick Start

Each example can be deployed as a Cloudflare Worker. Copy the example to your project and customize the endpoints.

```bash
# Create a new worker project
mkdir my-load-balancer && cd my-load-balancer
pnpm init
pnpm add @blank-utils/load-balancer effect

# Copy an example
cp examples/workers/basic.ts src/index.ts

# Deploy with Wrangler
npx wrangler deploy
```

## Examples Overview

### [basic.ts](./workers/basic.ts)
Simple load balancer with 3 backend servers and automatic failover.

```mermaid
flowchart LR
    User((User)) --> LB[Load Balancer]
    LB --> B1[Backend 1]
    LB -.-> B2[Backend 2]
    LB -.-> B3[Backend 3]
    
    style B2 stroke-dasharray: 5 5
    style B3 stroke-dasharray: 5 5
```

### [api-gateway.ts](./workers/api-gateway.ts)
Route different paths to different backend services (microservices pattern).

```mermaid
flowchart LR
    User((User)) --> LB[Load Balancer]
    LB -->|/auth/*| Auth[Auth Service]
    LB -->|/users/*| Users[Users Service]
    LB -->|/products/*| Products[Products Service]
    LB -->|/orders/*| Orders[Orders Service]
    
    style Auth fill:#e91e63
    style Users fill:#2196f3
    style Products fill:#4caf50
    style Orders fill:#ff9800
```

### [geo-steering.ts](./workers/geo-steering.ts)
Route users to the nearest backend based on geographic location.

```mermaid
flowchart TB
    User((User)) --> Edge[Cloudflare Edge]
    Edge --> LB[Load Balancer]
    
    LB -->|NA/SA| US[🇺🇸 US Backend]
    LB -->|EU/AF| EU[🇪🇺 EU Backend]
    LB -->|AS/OC| Asia[🌏 Asia Backend]
    
    style US fill:#3f51b5
    style EU fill:#009688
    style Asia fill:#ff5722
```

### [blue-green.ts](./workers/blue-green.ts)
Gradually shift traffic between two deployment environments.

```mermaid
flowchart LR
    User((User)) --> LB[Load Balancer]
    LB -->|80%| Blue[Blue Deployment<br/>v1.2.3]
    LB -->|20%| Green[Green Deployment<br/>v1.2.4]
    
    style Blue fill:#2196f3
    style Green fill:#4caf50
```

### [canary.ts](./workers/canary.ts)
Route specific users (beta testers, internal team) to canary backend.

```mermaid
flowchart LR
    User((Users)) --> LB[Load Balancer]
    Beta((Beta Testers)) --> LB
    
    LB -->|Normal Users| Stable[Stable<br/>v1.2.3]
    LB -->|X-Canary: true| Canary[🐤 Canary<br/>v1.3.0-beta]
    
    style Stable fill:#4caf50
    style Canary fill:#ff9800
```

### [data-residency.ts](./workers/data-residency.ts)
Route traffic based on country for GDPR/data residency compliance.

```mermaid
flowchart TB
    User((User)) --> LB[Load Balancer]
    
    LB -->|🇩🇪🇫🇷🇮🇹...| EU[EU Datacenter<br/>Frankfurt]
    LB -->|🇬🇧| UK[UK Datacenter<br/>London]
    LB -->|🇮🇳| India[India Datacenter<br/>Mumbai]
    LB -->|🇺🇸🇨🇦🇲🇽| US[US Datacenter<br/>Virginia]
    
    style EU fill:#3f51b5
    style UK fill:#9c27b0
    style India fill:#ff9800
    style US fill:#4caf50
```

### [api-versioning.ts](./workers/api-versioning.ts)
Route different API versions to different backend clusters.

```mermaid
flowchart LR
    subgraph Detection
        H[X-API-Version Header]
        P[URL Path /v2/...]
        Q[Query ?version=v2]
    end
    
    Detection --> LB[Load Balancer]
    
    LB -->|v1| V1[v1 Backends]
    LB -->|v2| V2[v2 Backends]
    LB -->|v3| V3[v3 Backends]
    
    style V1 fill:#9e9e9e
    style V2 fill:#2196f3
    style V3 fill:#4caf50
```

### [recovery-handler.ts](./workers/recovery-handler.ts)
Handle total backend failures gracefully with logging, alerting, and fallback responses.

```mermaid
flowchart TB
    User((User)) --> LB[Load Balancer]
    LB -->|Try| B1[Backend 1] -.-> |❌ Failed| LB
    LB -->|Failover| B2[Backend 2] -.-> |❌ Failed| LB
    
    LB --> Recovery[Recovery Function]
    Recovery --> Log[📋 Console Log]
    Recovery --> R2[💾 Store in R2]
    Recovery --> Webhook[🔔 Alert Webhook]
    Recovery --> Response[📤 503 Response]
    
    style B1 fill:#f44336
    style B2 fill:#f44336
    style Recovery fill:#ff9800
```

## Integration Testing

See the [integration/](./integration/) directory for testing the load balancer locally with Wrangler dev server.
