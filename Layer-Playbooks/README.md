# System Design Layer Selection & Trade-off Playbooks

> **The Interview Decision Framework:** In Staff and Principal (L5–L7+) system design interviews, your technical decisions must be justified using **mechanical first principles** (CPU, memory, disk I/O, network) and battle-tested **trade-offs**.

This directory contains 7 comprehensive playbooks—one for each fundamental layer of a modern distributed system. Each document provides:
1. **60-Second Interview Decision Trees & Matrices** (Instant mental lookup)
2. **Mechanical First Principles** (Storage physics, concurrency models, serialization, network protocols)
3. **Head-to-Head Architectural Shootouts** (Direct comparisons with deep under-the-hood trade-offs)
4. **The Interview Defense Playbook** (3-sentence justification formulas, trap questions, and rebuttal scripts)
5. **System Design Mapping** (Cross-references to all 31 interview designs and deep-dive notes)

---

## The 7-Layer Navigation Index

| Layer Playbook | Core Architectural Dilemmas Covered | Quick Link |
| :--- | :--- | :--- |
| **01. Storage & Databases** | • SQL vs NoSQL Taxonomy<br>• PostgreSQL vs MySQL (Heap/MVCC vs Clustered/Undo)<br>• CockroachDB vs Spanner (Distributed NewSQL)<br>• DynamoDB vs Cassandra / ScyllaDB (Wide-Column)<br>• MongoDB vs PostgreSQL JSONB<br>• Time-Series (Timescale vs Influx) & Vector DBs | [**Read Layer 01 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/01-Storage-and-Databases.md) |
| **02. Caching & In-Memory** | • Multi-Tier Topology (L1 Local vs L2 Distributed vs CDN)<br>• Redis/Valkey vs Memcached (Single-thread + Rich Types vs Multi-core Bytes)<br>• Cache Invalidation: Cache-Aside vs Write-Through vs Write-Back<br>• The 3 Traps: Stampede (XFetch/Mutex), Penetration (Bloom Filters), Avalanche (Jitter)<br>• Eviction: LRU vs LFU vs W-TinyLFU | [**Read Layer 02 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/02-Caching-and-In-Memory.md) |
| **03. Messaging & Streaming** | • Queue vs Log: Destructive Ack vs Immutable Replay<br>• Apache Kafka vs RabbitMQ vs AWS SQS/SNS vs Apache Pulsar<br>• Kafka Storage Physics: OS Page Cache, Zero-Copy (`sendfile`), ISR replication<br>• Ordering boundaries (Per-Key vs Total) & Hot partition mitigation<br>• Exactly-Once Semantics & The Transactional Outbox Pattern with CDC | [**Read Layer 03 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/03-Messaging-and-Streaming.md) |
| **04. Networking & Protocols** | • gRPC (HTTP/2 + Protobuf) vs REST (JSON) vs GraphQL<br>• Real-Time Push: WebSockets vs Server-Sent Events (SSE) vs Long Polling<br>• HTTP Evolution: HTTP/1.1 vs HTTP/2 (Multiplexing) vs HTTP/3 QUIC (Zero HoL)<br>• Ingress Topology: L4 (AWS NLB/IPVS) vs L7 (ALB/Envoy) vs API Gateways<br>• Handling 1M concurrent sockets (Kernel `rmem`/`wmem` buffer tuning) | [**Read Layer 04 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/04-Networking-and-Protocols.md) |
| **05. Distributed Coordination** | • Linearizable Consensus: etcd vs Apache ZooKeeper vs Consul (Raft vs ZAB)<br>• Quorum Math ($2F + 1$) and Split-Brain prevention<br>• Distributed Locking: Why Redis Redlock is unsafe vs etcd Leases + Fencing Tokens<br>• The Fallacy of Time: Clock skew, NTP steps, HLC, and TrueTime<br>• Unique ID Engines: Twitter Snowflake (64-bit) vs UUIDv7 vs Ticket Servers | [**Read Layer 05 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/05-Distributed-Coordination.md) |
| **06. Search & OLAP Engines** | • OLTP (Row) vs OLAP (Columnar) Physics: I/O projection pruning & SIMD<br>• Inverted Index Mechanics: Lucene Term Dictionaries, Posting Lists, Roaring Bitmaps<br>• Elasticsearch / OpenSearch vs PostgreSQL GIN Indexes<br>• ClickHouse vs Trino (Presto) vs Embedded DuckDB<br>• Lakehouse Storage: Apache Iceberg vs Raw S3 Parquet (`LIST` bottleneck) | [**Read Layer 06 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/06-Search-and-OLAP-Engines.md) |
| **07. Compute & Orchestration** | • Stream Processing: Apache Flink (True Streaming) vs Spark Structured Streaming (Micro-Batch)<br>• Event-time processing, Watermarking, and Chandy-Lamport distributed checkpoints<br>• Workflow Orchestration: Temporal (Durable execution / Sagas) vs Apache Airflow (Batch DAGs)<br>• Execution Models: Serverless (Lambda) vs Containerized Kubernetes (Keda + Karpenter) | [**Read Layer 07 Playbook**](file:///Users/abhinnaagarwal/Documents/system-design-notes/Layer-Playbooks/07-Compute-and-Async-Execution.md) |

---

### How to Use These Playbooks During System Design Preparation

1. **When Designing a System:** Jump to the specific layer playbook whenever you need to justify an architectural component in high-level or deep-dive design.
2. **Reviewing Pushbacks:** Practice reciting the **Part 4 Interview Defense Scripts** aloud until the 3-sentence justification formula and trap rebuttals become second nature.
3. **Deepening Mechanical Intuition:** Read the **Part 2 First Principles** and follow the cross-repository links into [`coding-practice/systems-engineering`](file:///Users/abhinnaagarwal/Documents/coding-practice/systems-engineering) to master the low-level engine internals.
