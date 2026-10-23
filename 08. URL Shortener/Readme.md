# Chapter 08: Design a URL Shortener (TinyURL / Bitly)

---

## 1. Executive Interview Framing & Staff-Level Bar

A URL Shortener (like TinyURL or Bitly) is deceptively simple at first glance: map a long URL to a short alphanumeric key and redirect users. Because junior and mid-level engineers can easily sketch a basic database and Base62 converter in 10 minutes, **interviewers at Staff and Principal levels (L6/L7+, P60) use this problem to grill candidates on production-grade systems realities**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE INTERVIEW SPECTRUM                                 │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ L5 / Senior Engineer                   │ L6+ / Staff & Principal Engineer              │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • MD5/SHA-256 hash or DB auto-increment│ • Base62 of 64-bit distributed ID with        │
│ • "Just use Redis for caching"         │   Feistel cipher (prevents URL scraping)      │
│ • Simple 301 vs 302 mention            │ • Edge worker termination (Cloudflare/Lambda) │
│ • Relational DB with a unique index    │ • 301 caching trap vs 302 analytics fidelity  │
│ • Ignores concurrent alias claiming    │ • Asynchronous decoupled analytics (Kafka -> │
│ • Ignores malware / phishing abuse     │   ClickHouse) with zero-cost redirect path    │
│                                        │ • Race-condition proof custom vanity aliases  │
│                                        │ • Google Safe Browsing async malware scanning │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 2. Requirements & System Scope

### Functional Requirements
1. **URL Shortening:** Given a long URL, return a unique, short URL (e.g., `https://tiny.url/zn9edcu`).
2. **URL Redirection:** Accessing the short URL quickly redirects the user to the original destination.
3. **Custom Vanity Aliases:** Allow enterprise/authenticated users to specify a custom short slug (e.g., `https://tiny.url/blackfriday2026`).
4. **Configurable Expiration (TTL):** Links can expire after a user-defined timeframe or default to 5 years.
5. **Real-time Click Analytics:** Track click count, referring domain, user geography (country/city), device/OS, and timestamp.
6. **Security & Abuse Mitigation:** Detect and block phishing, malware links, and recursive shortening spam.

### Non-Functional Requirements (SLAs & SLOs)
* **Ultra-Low Latency:** Redirection p99 latency < **15ms**; cached edge redirection < **5ms**.
* **High Availability:** **99.999%** availability for the read path (redirects must never fail even if analytics pipelines back up).
* **High Read-to-Write Ratio:** Heavily read-dominated (~100:1 to 50:1 read-to-write).
* **Zero Guessability / Enumeration Resistance:** Short URLs must not be sequential to prevent malicious scraping of private/unlisted enterprise links.

---

## 3. Capacity Estimation & Hardware Reality (Back-of-the-Envelope)

Let's establish concrete production numbers:

```
Writes: 100 Million new URLs / day
Reads:  10 Billion redirects / day (100:1 read:write ratio)
Retention: 5 Years
```

### 3.1 Throughput Math
* **Write QPS:**
  $$\text{Daily Writes} = 100,000,000 / 86,400 \approx 1,160 \text{ writes/sec}$$
  $$\text{Peak Write QPS (2.5x)} \approx 2,900 \text{ writes/sec}$$
* **Read QPS:**
  $$\text{Daily Reads} = 10,000,000,000 / 86,400 \approx 115,740 \text{ reads/sec}$$
  $$\text{Peak Read QPS (2x)} \approx 230,000 \text{ reads/sec}$$

### 3.2 Storage Math (5-Year Window)
* Total URLs over 5 years:
  $$100 \text{M/day} \times 365 \times 5 = 182.5 \text{ Billion records}$$
* Size per record:
  - `short_key`: 7 bytes
  - `long_url`: 500 bytes (average)
  - `user_id`: 16 bytes (UUIDv4)
  - `created_at`: 8 bytes (epoch ms)
  - `expires_at`: 8 bytes
  - Indexes & B-tree/LSM metadata overhead: ~150 bytes
  - **Total per record:** $\approx 700 \text{ bytes}$
* Total Primary Storage:
  $$182.5 \times 10^9 \times 700 \text{ bytes} \approx 127.75 \text{ TB}$$
  *(With 3x replication across availability zones: $\approx 383 \text{ TB}$)*.

### 3.3 Cache Sizing (Pareto 80/20 Rule)
* 20% of the daily read URLs generate 80% of daily redirect traffic.
* Daily unique active links accessed:
  $$20\% \times (100\text{M writes/day} \times 30\text{ active days}) \approx 600\text{M links}$$
* Memory footprint to cache top hot links in Redis:
  $$600\text{M} \times 500 \text{ bytes} \approx 300 \text{ GB RAM}$$
  *(A cluster of 10 nodes with 64 GB RAM easily accommodates the hot working set with plenty of headroom).*

### 3.4 Bandwidth Egress Math
* Egress on Redirects:
  $$116,000 \text{ reads/sec} \times 500 \text{ bytes (HTTP 302 Header)} \approx 58 \text{ MB/sec} = 464 \text{ Mbps}$$
  Peak egress $\approx 1.15 \text{ Gbps}$ — fits comfortably within standard 10Gbps AWS/GCP cloud egress interfaces.

---

## 4. API Design

### 4.1 Shorten URL
```http
POST /api/v1/urls
Content-Type: application/json
Authorization: Bearer <jwt_token>
Idempotency-Key: 7b56a1b0-9b4e-4f51-b841-a1288e7a0f62

{
  "long_url": "https://company.internal.atlassian.net/wiki/spaces/ENG/pages/91823910/Architecture-Review",
  "custom_alias": "arch-review", // Optional
  "ttl_seconds": 604800          // Optional (7 days)
}
```

**Response (`201 Created`):**
```json
{
  "short_url": "https://tiny.url/arch-review",
  "short_key": "arch-review",
  "long_url": "https://company.internal.atlassian.net/wiki/spaces/ENG/pages/91823910/Architecture-Review",
  "created_at": 1774345200000,
  "expires_at": 1774950000000
}
```

### 4.2 Redirect (Resolve URL)
```http
GET /{short_key}
```

**Response (`302 Found` or `307 Temporary Redirect`):**
```http
HTTP/1.1 302 Found
Location: https://company.internal.atlassian.net/wiki/spaces/ENG/pages/91823910/Architecture-Review
Cache-Control: private, max-age=90
```

---

## 5. Architectural Deep Dives: Staff & SDFC Insights

### 5.1 The Redirect Status Code Debate: 301 vs 302 vs 307

One of the quickest ways interviewers probe your depth is asking: *"Why not return HTTP 301 Permanent Redirect?"*

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              HTTP STATUS CODE COMPARISON                               │
├────────────────────┬───────────────────────────────────┬───────────────────────────────┤
│ Status Code        │ Browser Behavior                  │ Engineering Tradeoff          │
├────────────────────┼───────────────────────────────────┼───────────────────────────────┤
│ 301 Moved          │ Browser caches destination in     │ • Saves massive origin traffic│
│ Permanently        │ disk cache permanently. Next time │ • DESTROYS real-time click    │
│                    │ user clicks, browser bypasses     │   analytics and attribution.  │
│                    │ TinyURL completely!               │ • Impossible to revoke/edit.  │
├────────────────────┼───────────────────────────────────┼───────────────────────────────┤
│ 302 Found          │ Temporary redirect. Browser       │ • 100% accurate click metrics.│
│ (Default)          │ re-queries TinyURL edge on every  │ • Enables link revocation and │
│                    │ single click.                     │   malware blocking instantly. │
│                    │                                   │ • Higher origin / edge load.  │
├────────────────────┼───────────────────────────────────┼───────────────────────────────┤
│ 307 Temporary      │ Guarantees the HTTP request method│ • Prevents HTTP method mutate │
│ Redirect           │ (POST/PUT/GET) is NOT rewritten.  │   (e.g., POST mutating to GET)│
└────────────────────┴───────────────────────────────────┴───────────────────────────────┘
```

> [!IMPORTANT]
> **Staff-Level Recommendation:** Return **`302 Found`** (or `307`) with a short `Cache-Control: private, max-age=90` header. This allows downstream browser caching for 90 seconds (mitigating rapid double-clicking thundering herds) while retaining near-perfect analytics fidelity and instant link takedown capability.

---

### 5.2 Encoding & ID Generation Mechanics

#### Why MD5/SHA-256 Truncation Fails
A common junior mistake: *"Hash the long URL using MD5 or SHA-256 and take the first 7 characters."*
* **The Math Behind the Failure (The Birthday Paradox):**
  - Base62 character set: $[0-9, a-z, A-Z] \implies 62 \text{ characters}$.
  - A 7-character string has $62^7 \approx 3.52 \text{ Trillion combinations}$.
  - By the Birthday Paradox, the collision probability reaches $50\%$ at:
    $$N \approx \sqrt{2 \times 62^7 \times \ln(2)} \approx 1.87 \text{ Million hashes!}$$
  - At **100 Million writes/day**, you will encounter collisions within **hours of launch**! Resolving collisions via iterative rehashing causes catastrophic database write latency amplification.

#### The Staff Solution: Base62 of a 64-Bit Distributed Monotonic ID
Instead of hashing the payload, generate a unique 64-bit integer and convert it directly to Base62:

$$\text{ID: } 2009215674938 \xrightarrow{\text{Base62}} \text{"zn9edcu"}$$

$$\begin{aligned}
2009215674938 &= 14 \cdot 62^6 + 49 \cdot 62^5 + 9 \cdot 62^4 + 14 \cdot 62^3 + 13 \cdot 62^2 + 12 \cdot 62^1 + 50 \cdot 62^0 \\
&= \text{'z', 'n', '9', 'e', 'd', 'c', 'u'}
\end{aligned}$$

```mermaid
flowchart LR
    A["ID Generator<br/>(64-bit Int)"] --> B["Feistel Cipher /<br/>Bit-Shuffle Permutation"]
    B --> C["Obfuscated<br/>64-bit Int"]
    C --> D["Base62<br/>Encoder"]
    D --> E["Short Key<br/>(e.g. 'zn9edcu')"]
```

#### Mitigating Sequential Enumeration (The Security Trap)
If you directly encode sequential IDs (`1000001` $\to$ `1000002` $\to$ `1000003`), attackers can trivially scrape your entire URL repository by incrementing numbers.
* **The Solution:** Pass the 64-bit integer through a **Pseudo-Random Permutation (Feistel Cipher or Skip32)** before Base62 encoding.
* A Feistel cipher is a bijective (1-to-1) reversible permutation: zero collisions, perfectly deterministic, but visually scrambles consecutive IDs into pseudorandom numbers!

---

### 5.3 Distributed ID Generation Architecture

How do we generate 1,160 to 3,000 unique 64-bit IDs per second without a single point of failure?

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          DISTRIBUTED ID GENERATION STRATEGIES                          │
├────────────────────┬───────────────────────────────────┬───────────────────────────────┤
│ Strategy           │ Mechanics                         │ Staff Tradeoff Evaluation     │
├────────────────────┼───────────────────────────────────┼───────────────────────────────┤
│ Range Allocation   │ Central coordination (etcd / ZK)  │ RECOMMENDED for TinyURL. Zero │
│ (Ticket / Chunk)   │ hands out 1,000,000 ID ranges     │ cross-node network chatter    │
│                    │ (e.g. Node 1 gets 1M-2M, Node 2   │ during URL generation. If a   │
│                    │ gets 2M-3M). Nodes allocate       │ node crashes, unallocated IDs │
│                    │ locally from memory.              │ are burned (acceptable loss). │
├────────────────────┼───────────────────────────────────┼───────────────────────────────┤
│ Snowflake ID       │ 41-bit timestamp + 10-bit node ID │ Excellent, but 64-bit range is│
│ (Twitter Style)    │ + 12-bit sequence counter.        │ unevenly distributed; requires│
│                    │                                   │ NTP clock synchronization.    │
├────────────────────┼───────────────────────────────────┼───────────────────────────────┤
│ Database Auto-Inc  │ Multiple DBs with step increment  │ Operational nightmare to scale│
│ (Flickr Ticket)    │ (Server 1: 1, 3, 5; Server 2: 2,  │ or re-shard; creates single   │
│                    │ 4, 6).                            │ point of failure bottlenecks. │
└────────────────────┴───────────────────────────────────┴───────────────────────────────┘
```

```mermaid
sequenceDiagram
    autonumber
    participant App as API Server (Node A)
    participant Coord as Central Coord (etcd / ZooKeeper)
    participant Cache as Local Atomic Counter
    
    App->>Coord: Request ID Chunk (lease)
    Coord-->>App: Assigned Range: [15,000,000 - 15,999,999]
    Note over App,Cache: Node A increments counter in RAM (AtomicLong)<br/>Zero network hops for next 1M writes!
    App->>Cache: Fetch next ID: 15,000,001
    Note over App: Pass through Feistel Permutation -> Base62
```

---

### 5.4 Database Architecture & Schema Design

TinyURL's access pattern is pure key-value lookup:
* **Write:** Given `short_key`, insert `<short_key, long_url, user_id, created_at, expires_at>`.
* **Read:** Given `short_key`, fetch `long_url`.
* **Zero multi-row transactions or table joins required.**

#### Database Selection: DynamoDB / ScyllaDB vs PostgreSQL
* **Why NoSQL (DynamoDB / Cassandra / ScyllaDB) Wins:**
  - Partition key: `short_key` guarantees $O(1)$ single-digit millisecond primary index seeks.
  - Native **Time-To-Live (TTL)** support: DynamoDB automatically purges expired links asynchronously in the background without needing scheduled cron batch sweeps that lock database tables!
  - Linear horizontal scaling to petabytes without manual sharding scripts.

#### Concrete NoSQL Schema (DynamoDB / ScyllaDB)
```sql
-- ScyllaDB / Cassandra CQL Equivalent
CREATE TABLE urls (
    short_key text,
    long_url text,
    user_id uuid,
    created_at timestamp,
    expires_at timestamp,
    click_count counter,
    PRIMARY KEY (short_key)
);

-- Secondary Index for Reverse Lookup (Optional / Enterprise)
CREATE INDEX idx_user_urls ON urls (user_id, created_at) 
    WITH CLUSTERING ORDER BY (created_at DESC);
```

#### Long-URL Deduplication: To Deduplicate or Not?
*"What if User A and User B submit `https://google.com`?"*
* **Option 1 (Deduplicate):** Store only one record.
  - *Tradeoff:* Requires a global reverse index on `hash(long_url)`. Every write requires a read-before-write, doubling write latency. Furthermore, if User A deletes their link or requests custom TTL/analytics, it breaks User B's link!
* **Option 2 (No Deduplication - Recommended):** Each request generates a new short URL.
  - *Tradeoff:* Consumes an extra 700 bytes of cheap disk storage ($127 TB over 5 years is under \$3,000/month on AWS S3/DynamoDB). Protects user isolation, custom vanity names, and private analytics.

---

### 5.5 Handling Custom Vanity Aliases & Concurrent Race Conditions

When an enterprise customer requests `custom_alias: "blackfriday2026"`:
Two concurrent requests attempt to claim the exact same alias at the same millisecond. How do we prevent race condition overwrites?

```mermaid
sequenceDiagram
    autonumber
    participant Client1 as User 1
    participant Client2 as User 2
    participant API as API Server
    participant DB as DynamoDB
    
    par Concurrent Requests
        Client1->>API: POST /urls (alias: "blackfriday")
    and
        Client2->>API: POST /urls (alias: "blackfriday")
    end
    
    API->>DB: Conditional PutItem: attribute_not_exists(short_key)
    DB-->>API: 200 OK (User 1 wins)
    API-->>Client1: 201 Created (Claimed!)
    
    API->>DB: Conditional PutItem: attribute_not_exists(short_key)
    DB-->>API: 400 ConditionalCheckFailedException (User 2 loses)
    API-->>Client2: 409 Conflict ("Alias already in use")
```

* **Implementation:** Use atomic conditional writes at the database layer (`attribute_not_exists(short_key)` in DynamoDB, or `INSERT ... ON CONFLICT DO NOTHING` in PostgreSQL). Never do a check-then-insert in application memory!

---

## 6. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Edge Tier"]
        Browser["User Browser / Client"]
        Cloudflare["Cloudflare / Edge Workers<br/>(Edge KV Cache)"]
    end

    subgraph Ingress["Ingress Tier"]
        ALB["Application Load Balancer"]
        APIGW["API Gateway (Rate Limiting & Auth)"]
    end

    subgraph Services["Core Microservices Tier"]
        ReadSvc["Redirect Service<br/>(Stateless Go/Rust)"]
        WriteSvc["Shortening Service<br/>(Stateless)"]
        MalwareSvc["Malware Scanner<br/>(Google Safe Browsing)"]
    end

    subgraph StorageTier["Data & Cache Tier"]
        RedisCluster[("Redis Cluster<br/>(Hot Working Set)")]
        PrimaryDB[("DynamoDB / ScyllaDB<br/>(Primary Key: short_key)")]
        Coord["etcd / ZooKeeper<br/>(ID Chunk Allocator)"]
    end

    subgraph AnalyticsPipeline["Async Analytics Pipeline"]
        Kafka["Kafka Event Stream<br/>(click-events)"]
        Flink["Apache Flink<br/>(Tumbling Windows)"]
        ClickHouse[("ClickHouse OLAP<br/>(Real-Time Analytics)")]
    end

    Browser -->|1. Click Short URL| Cloudflare
    Cloudflare -->|Cache Miss| ALB
    ALB --> APIGW
    APIGW --> ReadSvc
    ReadSvc -->|2. Check Cache| RedisCluster
    RedisCluster -.->|Cache Miss| PrimaryDB
    ReadSvc -->|3. Emit Click Event| Kafka
    ReadSvc -->|4. HTTP 302 Redirect| Browser

    Browser -->|POST Shorten URL| APIGW
    APIGW --> WriteSvc
    WriteSvc -->|Get ID Range| Coord
    WriteSvc -->|Write Mapping| PrimaryDB
    WriteSvc -->|Warm Cache| RedisCluster
    WriteSvc -->|Async Security Scan| MalwareSvc
    
    Kafka --> Flink
    Flink --> ClickHouse
```

---

## 7. Deep Dive: Write & Read Path Mechanics

### 7.1 Write Path Step-by-Step
1. **Authentication & Rate Limiting:** API Gateway validates JWT and checks client token-bucket quota (e.g. 100 writes/min).
2. **Malware / Phishing Check:** Long URL domain is verified against an in-memory Bloom filter of known malicious domains.
3. **ID Generation:**
   - If `custom_alias` provided: Execute atomic conditional insert directly to Primary DB.
   - If auto-generated: Grab next 64-bit integer from memory (pre-allocated chunk from etcd), apply Feistel permutation, encode to Base62 (7 chars).
4. **Primary Persistence:** Write `<short_key, long_url, user_id, expires_at>` into DynamoDB with TTL enabled.
5. **Cache Warming:** Populate Redis with key `short_key` and value `long_url` (with TTL).
6. **Return `201 Created`** with full short URL payload.

### 7.2 Read Path Step-by-Step (Sub-15ms p99)
1. User clicks `https://tiny.url/zn9edcu`.
2. **Edge Worker Execution (Cloudflare Workers / Lambda@Edge):**
   - Check local Edge KV cache. If present, return HTTP 302 immediately ($\approx 2-5\text{ms}$ global latency).
3. **Origin Cache Check:** On edge miss, request hits Load Balancer $\to$ Redirect Service $\to$ Redis Cluster:
   - Redis hit: Return HTTP 302 immediately.
4. **Origin Database Check:** On Redis miss, query DynamoDB by `short_key`:
   - If not found or `expires_at < now()`: Return `404 Not Found`.
   - If found: Asynchronously backfill Redis and return HTTP 302.
5. **Asynchronous Telemetry Dispatch:**
   - Redirect service pushes a lightweight event to Kafka:
     ```json
     {
       "short_key": "zn9edcu",
       "timestamp": 1774345200000,
       "ip": "203.0.113.195",
       "user_agent": "Mozilla/5.0 (iPhone; CPU OS 17_4)...",
       "referrer": "https://twitter.com"
     }
     ```
   - Redirect service **never waits** for Kafka ack or database click increments; response is returned to the user instantly.

---

## 8. Failure Modes, Resilience & Edge Cases

### 8.1 Thundering Herd / Cache Stampede
* **Scenario:** A celebrity tweets a shortened link (`tiny.url/superbowl`). 50,000 requests hit the redirect service at the exact millisecond when the Redis cache key expires.
* **Failure:** All 50,000 requests bypass cache and hammer DynamoDB, causing read throttling exceptions.
* **Mitigations:**
  1. **Probabilistic Early Expiration (XFetch algorithm):** Refresh cache before it actually expires using probabilistic background worker refreshes.
  2. **Mutex Locking in Gateway:** Use a distributed lock or singleflight pattern (e.g. Go `singleflight`) so only ONE upstream request fetches from the database while the other 49,999 wait on the local channel.

### 8.2 Database Outage & Edge Caching Resiliency
* If DynamoDB experiences an outage in `us-east-1`, read path survives via **Redis Multi-AZ replicas** and **Cloudflare Edge KV**.
* The Read path is completely decoupled from the Write path: read service is stateless and reads from local read replicas.

### 8.3 Spider & Bot Filtering in Analytics
* Over 40% of public URL clicks originate from web scrapers, crawler bots (Googlebot, Twitterbot unfurling previews), and health checkers.
* If written directly to analytics, customer click graphs will be wildly inaccurate.
* **Mitigation:** The stream consumer pipeline checks `User-Agent` against an updated crawler database (e.g., ua-parser) and filters automated bot traffic into a separate `bot_clicks` table in ClickHouse.

### 8.4 Recursive Redirection Loop Attack
* Malicious user attempts to shorten a URL that points back to the shortener: `POST long_url = "https://tiny.url/loop"`.
* **Mitigation:** Strict domain validation at the API Gateway. Disallow any `long_url` whose host matches the service's own domain or known affiliate shortening domains.

---

## 9. Interview Wrap-Up: Staff-Level Decision Matrix

| Dimension | Junior / Mid-Level Choice | Staff / Principal Choice | Justification |
| :--- | :--- | :--- | :--- |
| **Redirect Code** | `301 Moved Permanently` | **`302 Found` with `Cache-Control: 90s`** | Balances micro-caching against 100% analytics fidelity and instant revocation. |
| **ID Generation** | MD5 hash truncated to 7 chars | **64-bit ID from etcd chunk + Feistel cipher + Base62** | Eliminates hash collisions and prevents URL enumeration scraping attacks. |
| **Primary Storage** | MySQL / PostgreSQL | **ScyllaDB / DynamoDB (Key: `short_key`)** | Constant $O(1)$ read latency, seamless horizontal scaling, native TTL background purge. |
| **Analytics Write** | Synchronous DB counter increment | **Asynchronous Kafka $\to$ Flink $\to$ ClickHouse** | Zero impact on critical read latency; rich multi-dimensional analytics. |
| **Edge Optimization** | None (Origin only) | **Cloudflare / CloudFront Edge Workers + KV** | Sub-5ms redirect globally without touching origin infrastructure. |
