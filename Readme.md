
# System Design Masterclass: Staff & Principal Engineer Edition (L6+)

These comprehensive system design study notes are synthesized from **Alex Xu's System Design Interview (Volumes 1 & 2)**, **Donne Martin's `system-design-primer`** (cloned locally in parallel), **System Design Fight Club (SDFC)**, and real-world high-throughput production architectures at Google, Meta, Amazon, and Stripe.

Every chapter has been audited, upgraded, and enriched with:
1. **Executive Framing (Senior L5 vs. Staff L6+):** What separates an average candidate from a top-of-band Staff engineer.
2. **5-Pillar Staff System Design Assessment Rubric:** Concrete behavioral evidence across Decision Making, Technical Proficiency, Problem Solving, Operational Mindset, and Adaptability.
3. **Hardware & Physics-Grounded Napkin Math:** Real numbers (L1 cache vs. RAM vs. NVMe vs. WAN, zero-copy `sendfile(2)`, page cache vs. JVM heap, packet serialization).
4. **Staff Curveball Playbooks:** Countermeasures for production incidents, partition splits, celebrity hotspots, and thundering herds.

---

## 🎯 The 5-Pillar Staff Assessment Rubric

During Staff/Principal level evaluations, interviewers look for specific behaviors across five core pillars:

| Pillar | Core Behavioral Expectation & Evidence |
| :--- | :--- |
| **1. Decision Making** | • **Clarifies before committing:** Probes functional bounds, SLAs, and data retention before drawing boxes.<br>• **Compares 2–3 credible alternatives:** Never pitches a single "silver bullet"; weighs trade-offs explicitly.<br>• **Names accepted architectural taxes:** Clearly states what is sacrificed (e.g., eventual consistency, memory overhead, write latency).<br>• **Revisits choices:** Dynamically adapts topology as scale or constraints shift. |
| **2. Technical Proficiency** | • **Grounded in hardware physics:** Connects choices to OS page cache, B-tree splits, LSM compaction, network NIC limits, and CPU cache lines.<br>• **Precise data access patterns:** Avoids slogans ("use NoSQL for scale"); links relational vs. wide-column vs. LSM to query predicates.<br>• **Explains underlying mechanisms:** Explains Raft terms, RocksDB SSTable level compaction, Bloom filter bit math, and TCP window scaling when probed. |
| **3. Problem Solving & Analytical Thinking** | • **Decomposes complexity:** Breaks monolithic architectures into isolated, decoupled failure domains.<br>• **Napkin estimation with explicit units:** Derives storage, bandwidth, and CPU slot counts cleanly (e.g., $100\text{k req/s} \times 1\text{KB} = 100\text{MB/s} \approx 800\text{Mbps}$).<br>• **Connects the whole stack:** Unifies client protocols, ingress gateways, worker tiers, caches, and storage engines. |
| **4. Operational Mindset** | • **Proactive production realism:** Independently addresses circuit breakers, dead letter queues (DLQs), fencing tokens, idempotency keys, and graceful drains.<br>• **Zero-downtime operations:** Plans online database migrations, shadow testing modes, tombstone compaction, and backpressure.<br>• **Observability:** Identifies critical golden signals (P99 latency, queue consumer lag, error budgets, and alert storm suppression). |
| **5. Adaptability & Collaboration** | • **Constructive curveball response:** Absorbs unexpected constraints (e.g., "traffic doubles", "fiber cut between regions") without panicking or restarting from scratch.<br>• **Executive communication:** Explains trade-offs clearly, drives technical alignment, and balances immediate MVP scope with multi-year extensibility. |

---

## 📚 Chapters Index

### Foundation & Scale Journey
* [Chapter 01 - Scale From Zero To Millions Of Users (Donne Martin + Alex Xu Scaling Journey)](./01.%20Scaling/)
* [Chapter 02 - Back-of-the-Envelope Estimation (Jeff Dean Latency Numbers & Napkin Math)](./02.%20Back%20Of%20the%20Envelope%20Estimation/)
* [Chapter 03 - A Framework For System Design Interviews (45-Minute Staff Playbook & Rubric)](./03.%20System%20Design%20Framework/)

### Distributed Infrastructure & Core Services
* [Chapter 04 - Design A Rate Limiter (Token Leasing, Atomic Lua, Fail-Open/Closed)](./04.%20Rate%20Limiter/)
* [Chapter 05 - Design Consistent Hashing (Ketama, Maglev O(1), Virtual Node Math)](./05.%20Consistent%20Hashing/)
* [Chapter 06 - Design A Key-Value Store (LSM-Trees, Quorums, Merkle Trees, Compaction)](./06.%20Key-Value%20Store/)
* [Chapter 07 - Design A Unique ID Generator (UUIDv7, Snowflake, Clock Drift Defenses)](./07.%20Unique-Id%20Generator/)
* [Chapter 08 - Design A URL Shortener (Base62, Feistel Ciphers, Decoupled Analytics)](./08.%20URL%20Shortener/)
* [Chapter 09 - Design A Web Crawler (Mercator Queues, Bloom Filters, SimHash)](./09.%20Web%20Crawler/)
* [Chapter 10 - Design A Notification System (Queue Isolation, APNs HTTP/2, Dead Letter Queues)](./10.%20Notification%20System/)

### Real-Time & Consumer Scale Applications
* [Chapter 11 - Design A News Feed System (Hybrid Fanout, Celebrity Bypass, Memory ZSETs)](./11.%20News%20Feed%20System/)
* [Chapter 12 - Design A Chat System (WebSocket Fleets, Heartbeat Leases, E2EE Double Ratchet)](./12.%20Chat%20System/)
* [Chapter 13 - Design A Search Autocomplete System (In-Memory Trie, Double Buffering Pointer Swap)](./13.%20Search%20Autocomplete/)
* [Chapter 14 - Design YouTube (TUS Resumable Uploads, GOP DAG Transcoding, CDN Peering)](./14.%20Youtube/)
* [Chapter 15 - Design Google Drive (Rabin Fingerprint Chunking, Content-Addressable Storage)](./15.%20Google%20Drive/)

### Geospatial & Location Services
* [Chapter 16 - Proximity Service (S2 Hilbert Curves, Geohash Bounding, Spatial Cache)](./16.%20Proximity%20Service/)
* [Chapter 17 - Nearby Friends (Uber H3 Pub/Sub Channels, Adaptive Battery Throttling)](./17.%20Nearby%20Friends/)
* [Chapter 18 - Design Google Maps (Contraction Hierarchies, Vector Tiles, HMM Map Matching)](./18.%20Google%20Maps/)

### Streaming, Analytics & High-Throughput Engines
* [Chapter 19 - Distributed Message Queue (Zero-Copy sendfile(2), OS Page Cache, KRaft, ISR)](./19.%20Distributed%20Message%20Queue/)
* [Chapter 20 - Metrics Monitoring & Alerting (Gorilla TSDB Delta-of-Deltas, Push/Pull Scraping)](./20.%20Metrics%20Monitoring%20and%20Alerting%20System/)
* [Chapter 21 - Ad Click Event Aggregation (Kappa Flink, Watermarks, ClickHouse OLAP)](./21.%20Ad%20Click%20Event%20Aggregation/)
* [Chapter 22 - Hotel Reservation System (Room Inventory, Optimistic Locking, 10-Min Hold, Saga)](./22.%20Hotel%20Reservation%20System/)
* [Chapter 23 - Distributed Email Service (Cassandra Wide-Column, CAS Attachments, SPF/DKIM)](./23.%20Distributed%20Email%20Service/)
* [Chapter 24 - S3-like Object Storage (Haystack/Bitcask Append Files, Reed-Solomon Erasure Coding)](./24.%20S3-like%20Object%20Storage/)
* [Chapter 25 - Real-time Gaming Leaderboard (Skip List ZRANK, Range Sharding, Fenwick Trees)](./25.%20Real-time%20Gaming%20Leaderboard/)

### Mission-Critical Financial & Exchange Systems
* [Chapter 26 - Payment System (Double-Entry Ledger, Multi-Tier Idempotency, 3-Way Reconciliation)](./26.%20Payment%20System/)
* [Chapter 27 - Digital Wallet (1M+ TPS Multi-Raft State Machines, In-Memory WAL, TC/C Sagas)](./27.%20%20Digital%20Wallet/)
* [Chapter 28 - Stock Exchange (LMAX Disruptor, Ring Buffers, Deterministic Sequencer, UDP Replay)](./28.%20Stock%20Exchange/)

### Advanced Enterprise & Atlassian Architectures
* [Chapter 29 - Design a Tagging Service (Roaring Bitmaps, GIN Indexes, Zero-Lock Tag Merges)](./29.%20Tagging%20Service/)
* [Chapter 30 - Distributed Rate Limiter: 5+ Approaches (Sliding Window Counter, CRDTs, Token Leasing)](./30.%20Distributed%20Rate%20Limiter/)
* [Chapter 31 - Distributed Job Scheduler: 6+ Approaches (Hierarchical Timing Wheels, Fencing Tokens, DLQ)](./31.%20Distributed%20Job%20Scheduler/)

## Study Guides
 * [Core Building Blocks & Technologies](./Building_Blocks.md)
 * [**System Design Patterns Playbooks (HelloInterview Framework)**](./Patterns/)
   * [Pattern 01: Real-Time Updates (SSE vs WebSockets, 2-Hop Architecture, Pub/Sub Fanout)](./Patterns/01-Real-Time-Updates.md)
   * [Pattern 02: Dealing with Contention (Atomic Writes, OCC, Pessimistic Locking, Fencing Tokens)](./Patterns/02-Dealing-with-Contention.md)
   * [Pattern 03: Multi-Step Processes (Sagas, Temporal Durable Execution, Idempotency, Outbox)](./Patterns/03-Multi-Step-Processes.md)
   * [Pattern 04: Scaling Reads (Covering Indexes, Replicas, Session Pinning, SingleFlight, Invalidation)](./Patterns/04-Scaling-Reads.md)
   * [Pattern 05: Scaling Writes (LSM-Trees, Write Buffering, Micro-Batching, Key Salting, Sharding)](./Patterns/05-Scaling-Writes.md)
   * [Pattern 06: Handling Large Blobs (Direct Presigned URLs, Multipart Parallel Uploads, CDN)](./Patterns/06-Handling-Large-Blobs.md)
   * [Pattern 07: Managing Long-Running Tasks (Async 202, Queue & Worker Pools, Visibility Timeouts, DLQ)](./Patterns/07-Managing-Long-Running-Tasks.md)
 * [**Architectural Layer Selection Playbooks (Interview Decision Guides)**](./Layer-Playbooks/)
   * [Layer 01: Storage & Database Selection (SQL vs NoSQL, PG vs MySQL, Distributed SQL, Cassandra)](./Layer-Playbooks/01-Storage-and-Databases.md)
   * [Layer 02: Caching & In-Memory (Redis/Valkey vs Memcached, Multi-Tier, Stampede/Avalanche)](./Layer-Playbooks/02-Caching-and-In-Memory.md)
   * [Layer 03: Messaging & Streaming (Kafka vs RabbitMQ vs SQS vs Pulsar, Outbox + CDC)](./Layer-Playbooks/03-Messaging-and-Streaming.md)
   * [Layer 04: Networking & Protocols (gRPC vs REST vs WebSockets vs SSE, L4/L7 Ingress)](./Layer-Playbooks/04-Networking-and-Protocols.md)
   * [Layer 05: Distributed Coordination (etcd vs ZooKeeper, Redlock vs Fencing Tokens, Snowflake)](./Layer-Playbooks/05-Distributed-Coordination.md)
   * [Layer 06: Search & OLAP Engines (ClickHouse vs Trino, Elasticsearch vs GIN, Iceberg)](./Layer-Playbooks/06-Search-and-OLAP-Engines.md)
   * [Layer 07: Compute & Orchestration (Flink vs Spark Streaming, Temporal vs Airflow)](./Layer-Playbooks/07-Compute-and-Async-Execution.md)
   * [Layer 08: Multi-Tenant Architecture (Silo vs Pool vs Bridge, DB-per-tenant, Postgres RLS, Fair Queues)](./Layer-Playbooks/08-Multi-Tenant-Architecture.md)
   * [Layer 09: Security, AuthN & AuthZ (OAuth2/PKCE, OIDC, Asymmetric JWKS, Zanzibar ReBAC, Envelope Encryption)](./Layer-Playbooks/09-Security-AuthN-and-AuthZ.md)
   * [Layer 10: Observability, Telemetry & SRE Reliability (OpenTelemetry, SLI/SLO/SLA, Error Budgets, Jaeger Tracing)](./Layer-Playbooks/10-Observability-Telemetry-and-Reliability.md)
   * [Layer 11: Deployment Strategies & CI/CD (Rolling, Blue/Green, Canary, Expand/Contract DB Migrations, GitOps)](./Layer-Playbooks/11-Deployment-Strategies-and-CICD.md)
   * [Layer 12: Distributed Failure Modes & Resiliency (Cascading Failures, Deadlines, Retry Budgets, Little's Law, Shuffle Sharding)](./Layer-Playbooks/12-Distributed-Failure-Modes-and-Resiliency.md)

## Core Concepts
 * [WebSockets Crash Course](./Core%20Concepts/WebSockets/)
 * [Encryption & TLS (1.2 vs 1.3)](./Core%20Concepts/Encryption%20and%20TLS/)
 * [Authentication & Authorization (JWT, OAuth, RBAC, ABAC)](./Core%20Concepts/Authentication%20and%20Authorization/)
 * [Networking Foundations (OSI, NAT, Proxies, L4/L7 Load Balancing)](./Core%20Concepts/Networking%20Foundations/)
 * [DNS and CDNs](./Core%20Concepts/DNS%20and%20CDN/)
 * [gRPC (Google RPC)](./Core%20Concepts/gRPC/)
 * [Geospatial Indexes & Proximity Search (QuadTree, BKD, R-Tree, GeoHash, S2, H3)](./Core%20Concepts/Geospatial%20Indexes/)
 * [Advanced Data Structures (Merkle, Segment, Fenwick, Sqrt Decomp)](./Core%20Concepts/Advanced%20Data%20Structures/)
 * [Consistent Hashing](./Core%20Concepts/Consistent%20Hashing/)
 * [Message Brokers & Strong Consistency](./Core%20Concepts/Message%20Brokers%20and%20Consistency/)
 * [Partial Failures & Idempotency](./Core%20Concepts/Partial%20Failures/)
 * [Database Indexes & The RUM Conjecture](./Core%20Concepts/Database%20Indexes/)
 * [Caching Strategies (Architectures, Eviction, Stampedes)](./Core%20Concepts/Caching%20Strategies/)
 * [Database Sharding & Partitioning](./Core%20Concepts/Sharding/)
 * [Apache Cassandra Deep Dive](./Core%20Concepts/Cassandra/)
 * [Amazon DynamoDB Deep Dive](./Core%20Concepts/DynamoDB/)
 * [Data Structures for Big Data (Bloom Filter, Count-Min, HyperLogLog)](./Core%20Concepts/Data%20Structures%20for%20Big%20Data/)
 * [Time Series Databases (Prometheus, InfluxDB, Gorilla)](./Core%20Concepts/Time%20Series%20Databases/)
 * [Conflict-Free Replicated Data Types (CRDTs)](./Core%20Concepts/CRDTs/)
 * [CockroachDB & Distributed SQL Architecture](./Core%20Concepts/CockroachDB/)
 * [Redis Internals & Architecture](./Core%20Concepts/Redis/)
 * [Distributed Transactions (2PC vs. SAGA Pattern)](./Core%20Concepts/Distributed%20Transactions/)
 * [Timing Mechanisms in Distributed Systems (Physical Clocks, Logical Clocks, Vector Clocks, HLC & TrueTime)](./Core%20Concepts/Timing%20Mechanisms%20in%20Distributed%20Systems/)
 * [Vector Databases & ANN Search (HNSW, IVF, pgvector, Pinecone)](./Core%20Concepts/Vector%20Databases/)
 * [Apache Spark Internals (Catalyst, AQE, Tungsten, Shuffle, Native Engines, Version Optimization Map)](./Core%20Concepts/Spark%20Internals/)

# Additonal Resources

### Rate Limiting
- [Rate Limiter (5+ Approaches) - System Design Fight Club](https://www.youtube.com/watch?v=NvQXO7tleDI)
- [Circuit Breaker Algorithm](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Uber Rate Limiter](https://github.com/uber-go/ratelimit/blob/master/ratelimit.go)


### Consistent Hashing
- [Consistent Hashing](https://tom-e-white.com/2007/11/consistent-hashing.html)
- [CS168: Introduction and Consistent Hashing:]( http://theory.stanford.edu/~tim/s16/l/l1.pdf)
- [Apache Cassandra](http://www.cs.cornell.edu/Projects/ladis2009/papers/Lakshman-ladis2009.PDF)
- [Scaling Discord](https://blog.discord.com/scaling-elixir-f9b8e1e7c29b)
- [Google Maglev](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/44824.pdf)


### Key-Value Store
- [Amazon Dynamo](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Cassandra Architecture](https://docs.datastax.com/en/archived/cassandra/3.0/cassandra/architecture/archIntro.html)
- [Google BigTable Architecture](https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf)
- [Amazon Dynamo DB Internals](https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html)
- [Design Patterns in Amazon Dynamo DB](https://www.youtube.com/watch?v=HaEPXoXVf2k)
- [Internals of Amazon Dynamo DB](https://www.youtube.com/watch?v=yvBR71D0nAQ)


### Unique-ID Generator
- [Ticket Servers: Distributed Unique Primary Keys on the Cheap](https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap)
- [Snowflake](https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake.html)


### Web Crawler
- [Web Crawling](http://infolab.stanford.edu/~olston/publications/crawling_survey.pdf)
- [Google Dynamic Rendering](https://developers.google.com/search/docs/guides/dynamic-rendering)



### Chat Systems
- [How Discord stores billions of messages](https://discord.com/blog/how-discord-stores-billions-of-messages)
- [Flannel: An Application-Level Edge Cache to Make Slack Scale](https://slack.engineering/flannel-an-application-level-edge-cache-to-make-slack-scale/)


### Search Autocomplete
- [How We Built Prefixy](https://medium.com/@prefixyteam/how-we-built-prefixy-a-scalable-prefix-search-service-for-powering-autocomplete-c20f98e2eff1)
- [Prefix Hash Tree](https://people.eecs.berkeley.edu/~sylvia/papers/pht.pdf)


### Youtube
- [YouTube Architecture](http://highscalability.com/youtube-architecture)
- [YouTube scalability 2012](https://www.youtube.com/watch?v=w5WVu624fY8)
- [Transcoding Videos at Scale](https://www.egnyte.com/blog/2018/12/transcoding-how-we-serve-videos-at-scale/)
- [Facebook Video Broadcasting](https://engineering.fb.com/ios/under-the-hood-broadcasting-live-video-to-millions/)
- [Netflix Video Encoding at Scale](https://netflixtechblog.com/high-quality-video-encoding-at-scale-d159db052746)
- [Netflix Shot based encoding](https://netflixtechblog.com/optimized-shot-based-encodes-now-streaming-4b9464204830)


### Google Drive
- [Differential Synchronization](https://neil.fraser.name/writing/sync/)
- [Differential Synchronization Video](https://www.youtube.com/watch?v=S2Hp_1jqpY8)
- [How We’ve Scaled Dropbox](https://www.youtube.com/watch?v=PE4gwstWhmc&feature=youtu.be)


### Tagging Service
- [System Design: Tagging Service (System Design Fight Club)](https://www.youtube.com/watch?v=WNIR7eiv0Hk)
- [Design a Tagging System (LeetCode Discussion)](https://leetcode.com/discuss/interview-question/system-design/838025/Design-a-tagging-system-like-tags-used-in-stack-overflow)


### Job Scheduler
- [Job Scheduler (6+ Approaches) - System Design Fight Club](https://www.youtube.com/watch?v=ur3ioZhwG8w)


### Database Sharding & Partitioning
- [Sharding in System Design Interviews w/ Meta Staff Engineer (Hello Interview)](https://www.youtube.com/watch?v=L521gizea4s)


### Apache Cassandra
- [Cassandra Deep Dive w/ Ex-Meta Staff Engineer (Hello Interview)](https://www.youtube.com/watch?v=TD3-INhm60Q)


### Amazon DynamoDB
- [DynamoDB Deep Dive w/ Ex-Meta Staff Engineer (Hello Interview)](https://www.youtube.com/watch?v=2X2SO3Y-af8)


### Data Structures for Big Data
- [Data Structures for Big Data in Interviews - Bloom Filters, Count-Min Sketch, HyperLogLog (Hello Interview)](https://www.youtube.com/watch?v=IgyU0iFIoqM)


### Time Series Databases
- [How do Time Series Databases Work? (Hello Interview)](https://www.youtube.com/watch?v=Qd76ZmfRs_Q)


### Geospatial Indexes & Proximity Search
- [Proximity Search & Geospatial Indexes Explained (Hello Interview)](https://www.youtube.com/watch?v=dQXdSxn7d1g)
- [Designing a Location Database: QuadTrees and Hilbert Curves (Gaurav Sen)](https://www.youtube.com/watch?v=OcUKFIjhKu0)
- [Spatial Queries in PostgreSQL / PostGIS (Hussein Nasser)](https://www.youtube.com/watch?v=-qNSXK7s7_w)


### Conflict-Free Replicated Data Types (CRDTs)
- [Conflict Resolution for Eventual Consistency • Martin Kleppmann (GOTO 2016)](https://www.youtube.com/watch?v=yCcWpzY8dIA)
- [CRDTs and the Quest for Distributed Consistency • Martin Kleppmann (InfoQ)](https://www.youtube.com/watch?v=B5NULPSiOGw)
- [CRDTs: The Hard Parts • Martin Kleppmann](https://www.youtube.com/watch?v=x7drE24geUw)


### CockroachDB & Distributed SQL
- [Everything you need to know about CockroachDB w/ Ben Darnell | Ep 6 (Arpit Bhayani)](https://www.youtube.com/watch?v=yhqW82Ka-gw)


### Redis Internals & Architecture
- [Redis Internals Masterclass • Arpit Bhayani](https://www.youtube.com/watch?v=h30k7YixrMo&list=PLsdq-3Z1EPT0eElcdOON9fdaeaQjlyXDt)


### Distributed Transactions & Sagas
- [Distributed Transactions Explained: 2 Phase Commit vs Saga Pattern (Hello Interview)](https://www.youtube.com/watch?v=DOFflggE_0Q)
- [Life Beyond Distributed Transactions: An Apostate's Opinion (Pat Helland)](https://queue.acm.org/detail.cfm?id=1281891)


### Vector Databases & Semantic Search
- [Vector Databases Explained for System Design Interviews (Hello Interview)](https://www.youtube.com/watch?v=Fq73E8DQprc)
- [Efficient and robust approximate nearest neighbor search using HNSW (Malkov & Yashunin)](https://arxiv.org/abs/1603.09320)


### Apache Spark Internals
- [The Internals of Apache Spark (Jacek Laskowski)](https://books.japila.pl/apache-spark-internals)
- [The Internals of Spark SQL (Jacek Laskowski)](https://books.japila.pl/spark-sql-internals)
- [Resilient Distributed Datasets (NSDI '12)](https://people.csail.mit.edu/matei/papers/2012/nsdi_spark.pdf)
- [Spark SQL: Relational Data Processing in Spark (SIGMOD '15)](https://people.csail.mit.edu/matei/papers/2015/sigmod_spark_sql.pdf)
- [Project Tungsten: Bringing Spark Closer to Bare Metal (Databricks)](https://www.databricks.com/blog/2015/04/28/project-tungsten-bringing-spark-closer-to-bare-metal.html)
- [Spark as a Compiler (Databricks)](https://www.databricks.com/blog/2016/05/23/apache-spark-as-a-compiler-joining-a-billion-rows-per-second-on-a-laptop.html)
- [Adaptive Query Execution: Speeding Up Spark SQL at Runtime (Databricks)](https://www.databricks.com/blog/2020/05/29/adaptive-query-execution-speeding-up-spark-sql-at-runtime.html)
- [Shuffle Deep Dive (Aaron Davidson)](https://www.youtube.com/watch?v=dmL0N3qfSc8)




