# System Design Layer Selection & Trade-off Playbooks

> **The Interview Decision Framework:** In Staff and Principal (L5–L7+) system design interviews, your technical decisions must be justified using **mechanical first principles** (CPU, memory, disk I/O, network) and battle-tested **trade-offs**.

This directory contains 12 comprehensive playbooks—covering the fundamental layers and specialized architectural paradigms of modern distributed systems. Each document provides:
1. **60-Second Interview Decision Trees & Matrices** (Instant mental lookup)
2. **Mechanical First Principles** (Storage physics, concurrency models, serialization, network protocols, cryptography)
3. **Head-to-Head Architectural Shootouts** (Direct comparisons with deep under-the-hood trade-offs)
4. **The Interview Defense Playbook** (3-candidate justification formulas, trap questions, and rebuttal scripts)
5. **System Design Mapping** (Cross-references to all 31 interview designs and deep-dive notes)

---

## Evidence and Maintenance

For quotas, defaults and performance comparisons, include:

1. **Version and source:** engine/connector versions, cloud region/account/tier, API action, date and primary documentation.
2. **Workload:** payload/schema, selectivity, cardinality, hot-key distribution, fanout, concurrency, dataset/working set and read/write mix.
3. **Deployment:** hardware, kernel/runtime, topology/RTT, TLS/compression, replication, fsync/ACK policy and failure headroom.
4. **Measurement:** p50/p95/p99, throughput, warm/cold state, duration, errors, cost and configuration; label calculated values as estimates.
5. **Correctness boundary:** accepted versus committed/applied/delivered, transaction/read scope, stable retry key and deduplication retention, timeout/unknown handling and recovery owner.

Spark's [source registry](../Core%20Concepts/Spark%20Internals/SOURCES.md) lists its versioned references. Keep shared explanations in the [concept notes](../Building_Blocks.md) and workload-specific applications in the playbooks and chapters.

## The 12-Layer Navigation Index

| Layer Playbook | Core Architectural Dilemmas Covered | Quick Link |
| :--- | :--- | :--- |
| **01. Storage & Databases** | • SQL vs NoSQL Taxonomy<br>• PostgreSQL vs MySQL (Heap/MVCC vs Clustered/Undo)<br>• Sub-ms Key-Value: Aerospike vs Redis vs DynamoDB<br>• Wide-Column: Cassandra vs ScyllaDB vs Bigtable<br>• Distributed NewSQL: CockroachDB vs Spanner<br>• Real-time OLAP: ClickHouse vs Pinot vs Trino | [**Read Layer 01 Playbook**](01-Storage-and-Databases.md) |
| **02. Caching & In-Memory** | • Multi-Tier Topology (L1 Local vs L2 Distributed vs CDN)<br>• Redis/Valkey vs Memcached vs Aerospike (Flash Cache)<br>• Cache Invalidation: Cache-Aside vs Write-Through vs Write-Back<br>• The 3 Traps: Stampede (XFetch/Mutex), Penetration (Bloom Filters), Avalanche (Jitter)<br>• Eviction: LRU vs LFU vs W-TinyLFU | [**Read Layer 02 Playbook**](02-Caching-and-In-Memory.md) |
| **03. Messaging & Streaming** | • Queue vs Log: Destructive Ack vs Immutable Replay<br>• Apache Kafka vs RabbitMQ vs AWS SQS/SNS vs Apache Pulsar<br>• Kafka Storage Physics: OS Page Cache, Zero-Copy (`sendfile`), ISR replication<br>• Ordering boundaries (Per-Key vs Total) & Hot partition mitigation<br>• Exactly-Once Semantics & The Transactional Outbox Pattern with CDC | [**Read Layer 03 Playbook**](03-Messaging-and-Streaming.md) |
| **04. Networking & Protocols** | • gRPC (HTTP/2 + Protobuf) vs REST (JSON) vs GraphQL<br>• Real-Time Push: WebSockets vs Server-Sent Events (SSE) vs Long Polling<br>• HTTP Evolution: HTTP/1.1 vs HTTP/2 (Multiplexing) vs HTTP/3 QUIC (Zero HoL)<br>• Ingress Topology: L4 (AWS NLB/IPVS) vs L7 (ALB/Envoy) vs API Gateways<br>• Handling 1M concurrent sockets (Kernel `rmem`/`wmem` buffer tuning) | [**Read Layer 04 Playbook**](04-Networking-and-Protocols.md) |
| **05. Distributed Coordination** | • Linearizable Consensus: etcd vs Apache ZooKeeper vs Consul (Raft vs ZAB)<br>• Quorum Math ($2F + 1$) and Split-Brain prevention<br>• Distributed Locking: Why Redis Redlock is unsafe vs etcd Leases + Fencing Tokens<br>• The Fallacy of Time: Clock skew, NTP steps, HLC, and TrueTime<br>• Unique ID Engines: Twitter Snowflake (64-bit) vs UUIDv7 vs Ticket Servers | [**Read Layer 05 Playbook**](05-Distributed-Coordination.md) |
| **06. Search & OLAP Engines** | • OLTP (Row) vs OLAP (Columnar) Physics: I/O projection pruning & SIMD<br>• Inverted Index Mechanics: Lucene Term Dictionaries, Posting Lists, Roaring Bitmaps<br>• Elasticsearch / OpenSearch vs PostgreSQL GIN Indexes<br>• ClickHouse vs Apache Pinot vs Trino (Presto)<br>• Lakehouse Storage: Apache Iceberg vs Raw S3 Parquet (`LIST` bottleneck) | [**Read Layer 06 Playbook**](06-Search-and-OLAP-Engines.md) |
| **07. Compute & Orchestration** | • Stream Processing: Apache Flink (True Streaming) vs Spark Structured Streaming (Micro-Batch)<br>• Event-time processing, Watermarking, and Chandy-Lamport distributed checkpoints<br>• Workflow Orchestration: Temporal (Durable execution / Sagas) vs Apache Airflow (Batch DAGs)<br>• Execution Models: Serverless (Lambda) vs Containerized Kubernetes (Keda + Karpenter) | [**Read Layer 07 Playbook**](07-Compute-and-Async-Execution.md) |
| **08. Multi-Tenant Architecture** | • Tenancy Models: Silo (Dedicated) vs Pool (Shared) vs Bridge (Hybrid)<br>• Database Multi-Tenancy: DB-per-tenant vs Schema-per-tenant vs Shared Table with PostgreSQL Row-Level Security (RLS)<br>• Noisy Neighbor Defense: Weighted Fair Queuing (WFQ) & Tenant Sharding<br>• Context Propagation: Ingress JWT to ThreadLocal/gRPC metadata<br>• Tenant-Aware Caching: Namespacing & Virtual Epoch Invalidation | [**Read Layer 08 Playbook**](08-Multi-Tenant-Architecture.md) |
| **09. Security, AuthN & AuthZ** | • AuthN: Stateful Session Cookies vs Stateless JWTs vs OAuth 2.0 PKCE / OIDC<br>• Asymmetric Verification: Zero-network JWKS (`.well-known/jwks.json`) in microservices<br>• The Token Revocation Dilemma: Refresh token family rotation + Redis blocklists<br>• AuthZ Models: RBAC vs ABAC (OPA/Rego) vs ReBAC (Google Zanzibar / SpiceDB)<br>• Data Protection: Envelope Encryption (KMS/HSM + local DEK) & Zero-Trust mTLS | [**Read Layer 09 Playbook**](09-Security-AuthN-and-AuthZ.md) |
| **10. Observability & SRE** | • Observability Levels: eBPF/Kernel, Continuous Profiling, 4 Golden Signals, RUM Vitals, Business KPIs<br>• Reliability Math: Exact SLI/SLO/SLA formulas & 30-Day Rolling Error Budgets<br>• Multi-Window Multi-Burn-Rate Alerting ($14.4\times$ 1h/5m, $6\times$ 6h/30m)<br>• OpenTelemetry Standard: API vs SDK vs Collector pipeline, OTLP Protobuf<br>• Distributed Tracing (Jaeger): W3C `traceparent` context, Tail-Based Sampling vs Cost Explosion<br>• Metrics TSDB: Gorilla delta-of-deltas & XOR bit-packing vs Cardinality Meltdown | [**Read Layer 10 Playbook**](10-Observability-Telemetry-and-Reliability.md) |
| **11. Deployment & CI/CD** | • The 5 Strategies: Rolling vs Blue/Green vs Canary vs Dark Launch (Shadowing) vs Feature Flags<br>• Zero-Downtime Database Migrations: The 4-Phase Expand/Contract (Parallel Run) Pattern<br>• Automated Canary Analysis (ACA): Kayenta / Argo Rollouts Mann-Whitney U-Test<br>• Version Skew Physics: Backward/Forward wire compatibility & Protobuf tag stability<br>• GitOps: Declarative pull reconciliation, immutable SHA digests, and automated rollback gates | [**Read Layer 11 Playbook**](11-Deployment-Strategies-and-CICD.md) |
| **12. Failure Modes & Resiliency** | • Distributed Failure Models: Crash-Stop vs Crash-Recovery vs Timing/Omission Faults<br>• Cascading Failures: Positive feedback death spirals & load-shift queue collapse<br>• Downstream Defenses: Propagated Deadlines (`grpc-timeout`), Exponential Backoff with Full Jitter, Token-Bucket Retry Budgets ($\le 10\%$), Circuit Breakers<br>• Upstream Defenses: Ingress Load Shedding (CoDel queue delay) & Little's Law Adaptive Concurrency Limits ($L = \lambda W$)<br>• Architectural Fault Isolation: Process/Thread Bulkheads, Cell-Based Swimlanes, and Combinatorial Shuffle Sharding ($\binom{N}{k}$ blast radius reduction) | [**Read Layer 12 Playbook**](12-Distributed-Failure-Modes-and-Resiliency.md) |

---

### How to Use These Playbooks During System Design Preparation

1. **When Designing a System:** Jump to the specific layer playbook whenever you need to justify an architectural component in high-level or deep-dive design.
2. **Reviewing Pushbacks:** Practice reciting the **Part 4 Interview Defense Scripts** aloud until the 3-sentence justification formula and trap rebuttals become second nature.
3. **Deepening Mechanical Intuition:** Read the **Part 2 First Principles** and follow the cross-repository links into [`coding-practice/systems-engineering`](https://github.com/abhinnaagrawal/coding-practice/blob/HEAD/systems-engineering) to master the low-level engine internals.
