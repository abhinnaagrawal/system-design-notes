# Chapter 30: Design a Distributed Rate Limiter (5+ Approaches)

Based on the system design breakdown from **[System Design Fight Club - Atlassian Interview Question: Rate Limiter (5+ Approaches)](https://www.youtube.com/watch?v=NvQXO7tleDI)**.

---

## 1. Understand the Problem & Establish Scope

A Rate Limiter controls the rate at which requests are processed by a network or API service. Depending on the company and context (e.g., Atlassian, Amazon, Cloudflare, OpenAI), rate limiting serves three fundamentally distinct purposes:

1. **DDoS & Malicious Abuse Prevention:** Filtering high-volume brute-force attacks at the perimeter (millions of QPS). Exact precision is not required; being off by $\pm 5\text{--}10\%$ is completely acceptable if it prevents server crashes.
2. **Strict Quota & Billing Enforcement:** Enforcing customer tier budgets (e.g., free tier allows 20 LLM requests per day). Requires **100% exact counting** with zero tolerance for double counting or phantom increments.
3. **Downstream Service Protection (Microservice-to-Microservice):** Internal services throttling callers to force downstream clients to cache static/semi-static data (e.g., an internal localization service translating UI strings).

### Requirements

#### Functional Requirements
- **Throttling Decisions:** Evaluate incoming requests against configured thresholds and allow or reject them.
- **Client Feedback:** Return HTTP status code `429 (Too Many Requests)` with standard headers (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`).
- **Flexible Identification Keys:** Support rate limiting by IP address, authenticated `user_id`, API token, or upstream service name.
- **Configurable & Dynamic Rules:** Support tiered rules (e.g., Free vs. Enterprise, read vs. write endpoints).

#### Non-Functional Requirements
- **Ultra-Low Latency:** Checking the rate limiter must add minimal overhead ($< 2\text{--}5\text{ ms}$) to the critical request path.
- **High Availability & Fault Tolerance:** If the rate limiter encounters an internal error or times out, it should **fail open** (allow traffic) for standard services, or **fail closed** for expensive billing operations.
- **Distributed Scale:** Handle tens of thousands to millions of requests per second across horizontally scaled fleets.

---

## 2. Capacity & Back-of-the-Envelope Estimation

Understanding the scale difference between rate-limiting algorithms:

### Sizing Scenario (1 Million Active Users / 50,000 QPS)
- **Active Users per Day:** $1,000,000$ users.
- **Peak Request Throughput:** $50,000\text{ QPS}$.

#### Memory Comparison: Fixed Window vs. Sliding Window Log
- **Fixed Window Counter (Redis String):**
  - Key: `user_123:1672531140` (user + floored minute timestamp) $\approx 24\text{ bytes}$.
  - Value: Integer counter $\approx 8\text{ bytes}$.
  - Overhead per entry in Redis: $\approx 64\text{ bytes}$.
  - Total Memory: $1,000,000 \times 64\text{ bytes} \approx \mathbf{64\text{ MB}}$ RAM.
- **Sliding Window Log (Redis Sorted Set):**
  - Must store an entry for *every single request* inside the window.
  - At $50,000\text{ QPS}$ with a 1-minute window: $50,000 \times 60 = 3,000,000\text{ records}$.
  - Each sorted set member: 8-byte timestamp + metadata $\approx 32\text{ bytes} + \text{Redis skip-list overhead} \approx 64\text{ bytes}$.
  - Total Memory: $3,000,000 \times 64\text{ bytes} \approx \mathbf{192\text{ MB}}$ RAM constantly rotating.

> **Key Sizing Takeaway:**
> While fixed windows require static memory proportional to the number of *users*, sliding window logs require memory proportional to the number of *requests*. Memory must always reside in high-speed RAM (e.g., Redis) because disk reads cannot satisfy sub-5ms latencies.

---

## 3. High-Level Design: 5+ Evolutionary Approaches

```
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 1: Local In-Memory (Per-Host / Library)                                  |
|   App Instance [ In-Memory Cache / Guava ] ---> Direct processing                 |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Need cluster-wide global quota)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 2: Centralized Standalone Service + Sharded Redis (Fixed Window)         |
|   API Gateway ---> Rate Limiter Service ---> Sharded Redis (INCR + EXPIRE)        |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Multi-region / DDoS without single leader)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 3: Leaderless Cluster with CRDTs (DDoS Scale)                            |
|   Edge Nodes ---> Redis Enterprise / DynamoDB Multi-Region CRDT Counter           |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Need smooth rolling window precision)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 4: Sliding Window Log via Redis Sorted Sets (ZSET)                       |
|   Rate Limiter ---> Redis ZSET (ZREMRANGEBYSCORE + ZCARD + ZADD)                  |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Complex, multi-tenant policy logic)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 5: Multi-Tier with Business Rules Engine (Drools / GCP Rules)            |
|   Rate Limiter ---> Fetch Count ---> Rules Engine (Tier / Pricing Logic)         |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Continuous event-stream rate limiting)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 6: Real-time Streaming Sliding Window (Kafka + Apache Flink)             |
|   API Ingest ---> Kafka Topic ---> Apache Flink Sliding Window ---> State Query   |
+───────────────────────────────────────────────────────────────────────────────────+
```

---

### Approach 1: Per-Host / Local In-Memory Rate Limiting
- **Architecture:** Implemented as a code library (e.g., Guava `RateLimiter`, bucket4j) or local daemon directly inside the application process.
- **How it works:** Each server instance tracks counts in a local thread-safe hash map.
- **Trade-offs:**
  - **Pros:** Zero network hops; absolute lowest latency ($<0.1\text{ ms}$).
  - **Cons:** No synchronization across servers. If traffic is unevenly distributed by the load balancer, a client routed to multiple servers can exceed global limits by $N\times$ (where $N$ is the number of servers).

---

### Approach 2: Centralized Service with Sharded Redis (Fixed Window Counter)
- **Architecture:** A dedicated Rate Limiter microservice or middleware layer querying a shared, sharded Redis cluster.

```
Client ──> [ Load Balancer ] ──> [ API Gateway / Rate Limiter ] ──> [ Sharded Redis ]
                                             │ (Allow)
                                             ▼
                                   [ Backend Services ]
```

- **Data Schema:**
  - Key: `<identifier>:<floored_timestamp>` (e.g., `user_42:1672531200` for a 1-hour window).
  - Value: Integer counter.
- **Atomic Execution (Lua Script):**
  ```lua
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  if current > tonumber(ARGV[2]) then
      return 0 -- Rejected
  end
  return 1 -- Allowed
  ```
- **Trade-offs:**
  - **Pros:** Consistent cluster-wide limits; Redis executes in-memory with sub-2ms response times.
  - **Cons:** Burst traffic at window boundaries (can allow $2\times$ threshold across boundary ticks).

---

### Approach 3: Leaderless Multi-Region Clusters with Conflict-Free Replicated Data Types (CRDTs)

When rate limiting must scale across **multiple geographic regions** (e.g., US-East, EU-Central, AP-Southeast) for global DDoS mitigation, a centralized leader database is unusable because cross-continent network round trips (100–250 ms) violate the sub-5ms latency SLA.

```
       [ Client in US ]                                [ Client in EU ]
              │                                               │
              ▼                                               ▼
     [ US API Gateway ]                              [ EU API Gateway ]
              │                                               │
              ▼                                               ▼
   [ US-East CRDT Node ] <══(Async WAN Gossip / Sync)══> [ EU-West CRDT Node ]
   (Local Increment: <1ms)                           (Local Increment: <1ms)
              │                                               │
              ▼ (Allow/Reject)                                ▼ (Allow/Reject)
     [ US Microservices ]                            [ EU Microservices ]
```

#### 1. Why CRDTs for Rate Limiting?
A **Conflict-Free Replicated Data Type (CRDT)** is an abstract data type designed for distributed systems that can be replicated across multiple nodes without centralized coordination or distributed locks (no 2-Phase Commit, Paxos, or Raft needed on write). 

Replicas satisfy **Strong Eventual Consistency (SEC)** by ensuring that concurrent operations form a **Join Semi-Lattice** with three mathematical properties:
- **Associative:** $(A \lor B) \lor C = A \lor (B \lor C)$ (grouping does not affect outcome)
- **Commutative:** $A \lor B = B \lor A$ (order of message arrival does not matter)
- **Idempotent:** $A \lor A = A$ (duplicate messages produce identical state)

Regardless of network delays, packet drops, or out-of-order delivery across the WAN, all regions independently converge to the exact same value.

---

#### 2. CRDT Counter Primitives Used in Rate Limiting

##### A. G-Counter (Grow-Only Counter)
- **State Representation:** A vector $V$ of size $N$ (where $N$ is the number of nodes or geographic regions):
  $$V = [c_1, c_2, \dots, c_N]$$
- **Local Write:** Region $i$ only increments its own slot:
  $$c_i \leftarrow c_i + 1$$
- **Global Read (Local Sum):**
  $$\text{Value} = \sum_{k=1}^N c_k$$
- **Merge Operation (across regions $A$ and $B$):**
  $$V_{\text{merged}}[k] = \max(V_A[k], V_B[k]) \quad \forall k \in [1, N]$$
- **Fit for Rate Limiting:** Tracking total requests in a fixed window across regions.

##### B. PN-Counter (Positive-Negative Counter)
- **State Representation:** A pair of two G-Counters: $\langle P, N \rangle$, where $P$ tracks increments and $N$ tracks decrements.
- **Value:** $\sum P - \sum N$.
- **Fit for Rate Limiting:** Useful when tokens can be refunded (e.g., if a downstream service returns a transient failure or validation error and the user's quota should be restored).

##### C. Bounded Counter (Escrow / Quota Leases)
- **The Problem with Raw Counters:** Because CRDT synchronization across WAN has latency ($\approx 100\text{--}500\text{ ms}$), two regions could simultaneously see $5$ tokens remaining on a $10$-token limit and both allow $5$ requests, permitting $10$ total requests ($2\times$ over-limit).
- **The Solution:** A Bounded Counter partitions the global quota into **local escrow reservations** (e.g., US gets 5 tokens, EU gets 5 tokens). A region can only grant requests up to its local leased allocation. If US exhausts its quota, it must asynchronously request a quota transfer from EU.

---

#### 3. Technology Stack & Infrastructure Options for CRDTs

Depending on your architecture, CRDTs can be deployed at the **datastore layer**, **application actor layer**, or **edge network**:

```
+────────────────────────────────────────────────────────────────────────────────────────+
| Layer 1: In-Memory Datastores with Native CRDTs (Fastest & Easiest to Adopt)           |
|   • Redis Enterprise (Active-Active CRDT)                                             |
|   • Riak KV (Basho)                                                                    |
|   • Aerospike (Cross-Datacenter Replication - XDR)                                    |
+────────────────────────────────────────────────────────────────────────────────────────+
                                           │
+────────────────────────────────────────────────────────────────────────────────────────+
| Layer 2: Peer-to-Peer NoSQL Distributed Databases (Emulated CRDTs)                     |
|   • Apache Cassandra / ScyllaDB (Distributed Counter Columns)                          |
|   • Amazon DynamoDB Global Tables (Per-Region Attribute Aggregation)                   |
+────────────────────────────────────────────────────────────────────────────────────────+
                                           │
+────────────────────────────────────────────────────────────────────────────────────────+
| Layer 3: Application-Level In-Process Actor Frameworks (Zero External DB Dependency)   |
|   • Akka Distributed Data / Apache Pekko (JVM - GCounter, PNCounter, ORSet)            |
|   • Microsoft Orleans (Virtual Actors) / Dapr State Stores                             |
+────────────────────────────────────────────────────────────────────────────────────────+
                                           │
+────────────────────────────────────────────────────────────────────────────────────────+
| Layer 4: Global CDN & Edge Worker Runtimes (Edge Rate Limiting)                        |
|   • Cloudflare Workers KV & Durable Objects                                            |
|   • Fastly Compute@Edge (Dictionary Replication)                                       |
+────────────────────────────────────────────────────────────────────────────────────────+
```

##### Tier 1: In-Memory Managed Datastores with Native CRDTs

1. **Redis Enterprise (Active-Active Geo-Distribution):**
   - **How it works:** Implements patent-backed, academically grounded CRDT types directly inside Redis engine cores.
   - **Types Supported:** `CRDT.COUNTER` (PN-Counter), `CRDT.SET`, `CRDT.REGISTER`.
   - **Performance:** Local reads and writes run in $<1\text{ ms}$ in local RAM. Background threads gossip delta changes over WAN to peer Redis clusters in other AWS/GCP regions.
   - **Verdict:** The gold standard if the organization has enterprise budget and needs drop-in Redis API compatibility without custom distributed math.

2. **Riak KV (Basho):**
   - **How it works:** Open-source, Erlang-based leaderless distributed key-value store modeled on Amazon's original 2007 Dynamo paper.
   - **CRDT Support:** First-class native support for `pn_counter`, `g_counter`, `or_set` (Observed-Remove Set).
   - **Verdict:** Highly resilient peer-to-peer ring topology, but has higher operational maintenance compared to managed cloud caches.

3. **Aerospike (Multi-Site Clustering / XDR):**
   - **How it works:** Flash/RAM-optimized NoSQL database with Cross-Datacenter Replication (XDR) supporting conflict-resolution counters.
   - **Verdict:** Best for extreme write throughput (millions of writes/sec) with hardware-accelerated NVMe storage.

---

##### Tier 2: Peer-to-Peer NoSQL Databases

1. **Apache Cassandra / ScyllaDB (Distributed `COUNTER` Columns):**
   - **How it works:** Cassandra tables support counter columns (`UPDATE users SET count = count + 1 WHERE id = 'user_123';`).
   - **Mechanics:** Under the hood, Cassandra counters operate similarly to PN-counters, replicating mutations using a leaderless gossip topology.
   - **Critical Caveat (The Jepsen Test Finding):** In Cassandra, counter increments are **not idempotent**. If a write times out due to packet loss and the client retries, the counter increments twice (the "straw write" issue). ScyllaDB provides a faster C++ drop-in alternative with reduced tail latencies.

2. **Amazon DynamoDB Global Tables:**
   - **How it works:** Provides fully managed, multi-region active-active tables with automatic cross-region replication.
   - **Counter Handling:** Standard DynamoDB uses Last-Write-Wins (LWW) conflict resolution, which can drop concurrent writes to a single scalar attribute. To implement a CRDT G-Counter in DynamoDB, structure the item with separate regional attributes:
     ```json
     {
       "user_id": "usr_42#2026-09-26T18:00",
       "us_east_count": 142,
       "eu_west_count": 89,
       "ap_south_count": 12
     }
     ```
     Each region updates only its own regional counter column atomically (`ADD us_east_count 1`), and sums all columns on read.

---

##### Tier 3: Application-Level In-Process Actor Frameworks (No External DB)

1. **Akka Distributed Data / Apache Pekko Distributed Data (Scala / Java / JVM):**
   - **How it works:** CRDTs run **directly inside the heap memory of the application servers**.
   - **Mechanics:** Application nodes form an Akka Cluster. When a request hits Node A, it increments a local `GCounter` in RAM ($<0.01\text{ ms}$). An internal Akka background actor gossips delta changes across the cluster nodes over TCP/UDP.
   - **Built-in Primitives:** `GCounter`, `PNCounter`, `ORSet`, `LWWRegister`, `PNCounterMap`.
   - **Pros:** Zero external database infrastructure to purchase, host, or monitor.
   - **Cons:** Coupling rate-limiter lifecycle to application service deployments.

---

##### Tier 4: Global Edge & CDN Compute Platforms

1. **Cloudflare Workers & Edge Rate Limiting:**
   - **How it works:** Cloudflare executes rate limiting directly across 300+ Point of Presence (PoP) edge locations.
   - **Mechanics:** Edge PoPs track local sliding window logs. Local PoPs gossip counts periodically to regional edge core aggregators.
   - **Trade-off:** Fast drop of volumetric DDoS attacks at the ISP boundary before malicious packets ever reach the origin cloud VPC.

---

#### 4. The "Straw Write" / Double-Counting Dilemma & Solutions

A fundamental operational hazard with distributed counters is **network retry over-counting**:

```
[ Gateway ] ──(1. Increment +1)──> [ CRDT Node ] (Counter becomes 10)
     │                                    │
     │ <────(2. ACK Dropped by Network)───┘
     │
     ├──(3. Gateway Retries Increment +1)──> [ CRDT Node ] (Counter becomes 11! - OVERCOUNTED)
```

##### Mitigations:
1. **Idempotency Window (Request-ID Deduplication):**
   Maintain a short-lived CRDT Set (`ORSet` / Observed-Remove Set) of `(request_id, timestamp)` with a 30-to-60 second TTL. If the incoming `request_id` has already been observed by the set, the counter increment is bypassed.
2. **Accept Coarse Accuracy for DDoS:**
   In DDoS and anti-scraping scenarios, over-counting by $5\%$ is completely harmless; it merely tightens the filter slightly against hostile traffic while protecting downstream origin infrastructure.

---

#### 5. CRDT Technology Decision Matrix

| Technology | Latency | Multi-Region Active-Active | Quota Precision | Operational Complexity | Cost Profile |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Redis Enterprise (CRDT)** | $<1\text{ ms}$ (In-memory) | Native & Automatic | High (with bounded counters) | Low (Fully managed) | High (Enterprise license) |
| **Akka / Pekko Dist. Data** | $<0.05\text{ ms}$ (In-heap) | Yes (Cluster peering) | High | Medium (JVM actor code) | Zero (Runs in existing pods) |
| **Cassandra / ScyllaDB** | $2\text{--}8\text{ ms}$ (Disk/RAM) | Native peer-to-peer ring | Coarse (Retry drift) | High (Requires DB cluster tuning) | Medium (Open source / self-hosted) |
| **DynamoDB Global Tables** | $5\text{--}15\text{ ms}$ (HTTP API) | Managed Multi-Region | High (Vector attributes) | Minimal (AWS managed) | Pay-per-write capacity |
| **Edge CDN (Cloudflare)** | $<1\text{ ms}$ (At ISP edge) | Global Edge PoPs | Coarse ($\pm 5\%$) | Very Low (Serverless / Managed) | SaaS subscription |

---

### Approach 4: Sliding Window Log using Redis Sorted Sets (`ZSET`)
- **Architecture:** Solves the boundary bursting issue of fixed windows by tracking the timestamp of every request.

```
Redis Key: "ratelimit:user_42" (ZSET)
  Score: 1672531195   Member: "1672531195.101"
  Score: 1672531198   Member: "1672531198.204"
  Score: 1672531201   Member: "1672531201.002"
```

- **Algorithm Steps:**
  1. Remove expired timestamps:
     `ZREMRANGEBYSCORE key 0 (current_timestamp - window_size)`
  2. Count remaining timestamps:
     `ZCARD key`
  3. If count $\ge \text{limit}$, reject (HTTP 429).
  4. If count $< \text{limit}$, add current request:
     `ZADD key current_timestamp unique_request_id`
  5. Set TTL on the key to ensure automatic cleanup.
- **Trade-offs:**
  - **Pros:** 100% mathematically smooth rolling window; completely eliminates edge-case boundary bursts.
  - **Cons:** Memory footprint explodes with request volume since every request occupies a sorted set entry.

---

### Approach 5: Multi-Tier Architecture with a Business Rules Engine
- **Architecture:** When rate limiting policies depend on complex enterprise tiers, contracts, time-of-day discounts, and endpoint sensitivities.

```
[ Incoming Request ]
         │
         ▼
[ Rate Limiter Service ] ──> Fetch Usage Count ──> [ Redis Cache ]
         │                                                │
         │ (Usage Count + User Context)                   │ (Returns Count)
         ▼                                                ▼
[ Business Rules Engine ] <───────────────────────────────┘
  (e.g., Drools / GCP Rules Engine)
         │
         ├── Rule: "Enterprise tier gets 1000 req/min during peak, unlimited off-peak"
         ├── Rule: "Trial accounts cannot exceed 5 calls to /v1/ai/generate"
         │
         ▼
    [ Allow / Reject (HTTP 429) ]
```

- **Why Separate the Rules Engine?**
  Hardcoding enterprise rules or pricing tiers into application code or Redis scripts creates deployment friction. A business rules engine (like **Drools** or cloud policy engines) decouples rate state from dynamic business rules.

---

### Approach 6: Real-time Streaming Sliding Window (Kafka + Apache Flink)
- **Architecture:** Uses event stream processing for asynchronous, stateful rate auditing and complex sliding window computations across high-volume pipelines.

```
[ API Gateway ] ──(Async Event Log)──> [ Kafka Topic ]
                                              │
                                              ▼
[ Downstream Service ] <──(Throttling State)── [ Apache Flink Job ]
                                              (Sliding Window Aggregation)
```

- **How it works:** Flink continuously ingests request events from Kafka, maintains an in-memory keyed sliding window state, and outputs violation flags to a fast key-value cache or control plane.
- **Use Case:** Primarily used for **downstream service protection** and forensic abuse detection where rate decisions can be computed asynchronously.

---

## 4. Deep Dives & Engineering Dilemmas

### 1. Throttling Key Selection
- **IP Address:**
  - *Pros:* Works for unauthenticated endpoints.
  - *Cons:* Multiple corporate users share an office NAT/proxy IP; attackers bypass IP throttling via botnets and proxy pools.
- **User ID / API Token:**
  - *Pros:* Reliable for authenticated APIs and subscription plans.
  - *Cons:* Does not protect public login/registration endpoints from credential stuffing.
- **Hybrid Identification:**
  - Public routes: IP + Device Fingerprint.
  - Authenticated routes: `user_id` + API endpoint.

### 2. Distributed Race Conditions: Lua vs. Locks
In high-concurrency environments, a naive `GET count` followed by `SET count + 1` produces race conditions where multiple requests pass before the limit registers.
- **Solution:** Execute all validation logic inside an atomic **Redis Lua script**. Redis executes scripts single-threaded, guaranteeing atomicity without distributed locks.

### 3. Fail-Open vs. Fail-Closed
- **Fail-Open (Recommended for Core Apps):** If Redis crashes or experiences network partitions, the rate limiter logs an alert and allows the request through to preserve user experience.
- **Fail-Closed (Recommended for High-Cost APIs):** If the service calls expensive external APIs (e.g., third-party SMS gateways, paid LLM APIs), requests must be rejected when rate state cannot be verified.

---

## 5. Summary Comparison Matrix

| Approach | Latency | Precision | Memory Usage | Implementation Complexity | Primary Best Fit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Per-Host In-Memory** | $<0.1\text{ ms}$ | Low (Uneven across cluster) | Minimal | Low | Single instances / coarse limits |
| **2. Sharded Redis Fixed Window** | $\sim 1\text{--}3\text{ ms}$ | Medium (Boundary burst risk) | Low ($O(\text{users})$) | Medium | Standard web APIs & tier quotas |
| **3. Leaderless CRDTs** | $\sim 2\text{--}5\text{ ms}$ | Coarse ($\pm 5\text{--}10\%$) | Low | High | Global multi-region DDoS mitigation |
| **4. Redis Sorted Set Sliding Log** | $\sim 2\text{--}5\text{ ms}$ | Exact (Zero burst leakage) | High ($O(\text{requests})$) | Medium | Strict, low-volume rolling limits |
| **5. Business Rules Engine** | $\sim 5\text{--}15\text{ ms}$ | High + Dynamic Policies | Medium | High | Multi-tenant SaaS with complex tiers |
| **6. Kafka + Apache Flink** | Async | Exact (Sliding window) | Managed in Flink state | Very High | Asynchronous streaming & downstream auditing |
