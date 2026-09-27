# System Design Building Blocks & Core Technologies

Based on the 31 system design topics in this repository (which cover the classic Alex Xu System Design curriculum and more), you will encounter recurring architectural patterns, data structures, and technologies. 

To master system design, you should build a strong foundational understanding of the following building blocks:

## 1. Core Data Structures & Algorithms
Before jumping into infrastructure, many system design problems rely heavily on specific data structures:
- [ ] **Trie (Prefix Tree):** Used for Search Autocomplete (Ch 13).
- [x] **Quadtrees & Geohashes:** Essential for spatial indexing in Proximity Services, Nearby Friends, and Google Maps (Ch 16, 17, 18).
- [x] **Consistent Hashing (Hash Rings):** Distributes data evenly across a cluster, minimizing reorganization when nodes are added/removed (Ch 5).
- [ ] **Bloom Filters:** Probabilistic data structure to quickly test if an element is present. Used in Web Crawlers (Ch 9) and Databases (Ch 6) to avoid disk reads.
- [x] **Merkle Trees:** Tree of hashes used to detect inconsistencies in distributed data quickly, heavily used in Object Storage, Google Drive, and Dynamo (Ch 6, 15, 24).
- [x] **LSM-Trees (Log-Structured Merge-Tree) & SSTables:** The core storage engine behind high-write databases like Cassandra, RocksDB, and LevelDB (Ch 6).
- [ ] **Token Bucket / Leaky Bucket / Sliding Window:** Algorithms used for Rate Limiting (Ch 4, 30).
- [ ] **Base62 Encoding:** URL shortening and Unique ID generation (Ch 8, 7).
- [ ] **Skip Lists:** The underlying data structure for Redis Sorted Sets, used in Leaderboards (Ch 25).
- [x] **Interval Trees & Segment Trees:** Used for managing overlapping time windows (e.g., booking systems) and efficiently querying aggregate data over a specific range in `O(log N)` time.
- [ ] **DAGs (Directed Acyclic Graphs):** Used for modelling dependencies in Distributed Job Schedulers and Video Transcoding pipelines (Ch 14, 31).

### 📚 Learning Resources:
- [x] **Consistent Hashing:** [ByteByteGo - Consistent Hashing | Algorithms You Should Know](https://www.youtube.com/watch?v=UF9Iqmg94tk)
- [ ] **Bloom Filters:** [Gaurav Sen - What are Bloom Filters?](https://www.youtube.com/watch?v=bgzUdBVr5tE)
- [ ] **LSM-Trees:** [Hussein Nasser - LSM Trees Explained: Powering Cassandra, RocksDB](https://www.youtube.com/watch?v=ciGAVER_erw)
- [x] **Spatial/Geohashes:** [Hussein Nasser - Spatial Queries in PostgreSQL/PostGIS](https://www.youtube.com/watch?v=-qNSXK7s7_w)
- [ ] **Rate Limiting:** [ByteByteGo - 4 Rate Limit Algorithms](https://www.youtube.com/watch?v=YXkOdWBwqaA)

## 2. Databases & Storage Engines
Understanding *which* database to pick is a crucial skill. You need to know their capacity limits, internal workings, and trade-offs (SQL vs. NoSQL, CAP theorem).
- [x] **Relational Databases (RDBMS):** PostgreSQL, MySQL. Understand ACID properties, B-Tree indexes, sharding, and master-slave replication. Used in almost every system for structured, highly consistent data.
- [ ] **Wide-Column Stores:** Cassandra, DynamoDB. Highly available, massive write throughput, eventual consistency.
- [ ] **Key-Value Caches & Stores:** Redis, Memcached. In-memory, ultra-fast. Learn about cache invalidation strategies, Redis Pub/Sub, and Redis Sorted Sets.
- [ ] **Time-Series Databases (TSDB):** InfluxDB, Prometheus. Optimized for appending and querying time-stamped data (Ch 20).
- [ ] **Graph Databases:** Neo4j, Amazon Neptune. Used for recommendations and News Feeds (Ch 11).
- [ ] **Blob / Object Storage:** Amazon S3. For unstructured data like images and videos.

### 📚 Learning Resources:
- [ ] **General DB Internals:** The book *Designing Data-Intensive Applications (DDIA)* by Martin Kleppmann (The absolute gold standard).
- [ ] **Database Architecture:** [Hussein Nasser's Database Engineering Course/Playlist](https://www.youtube.com/playlist?list=PLQnljOFTspQXjD0HOzN7P2tgzu7scWpl2)
- [ ] **Caching:** [ByteByteGo - Top 5 Redis Use Cases](https://www.youtube.com/watch?v=a4yX7RUgTxI)
- [ ] **Dynamo (Wide Column):** [Amazon Dynamo Paper summary by System Design Interview](https://www.youtube.com/watch?v=gV-1E-7nhR8)

## 3. Distributed System Concepts
How do multiple machines coordinate and agree on the state of the system?
- [ ] **Replication & Consistency:** Quorum consensus (W + R > N), Leader/Follower vs. Leaderless replication, Eventual vs. Strong consistency.
- [ ] **CAP Theorem & PACELC:** Trade-offs between Consistency, Availability, Partition tolerance, and Latency.
- [ ] **Vector Clocks:** Resolving conflicts in masterless databases (Ch 6).
- [ ] **Gossip Protocol:** How decentralized nodes discover each other and share cluster state (Ch 6).
- [ ] **CRDTs (Conflict-Free Replicated Data Types):** Data structures that can be replicated across nodes and merged without conflicts (Rate Limiter - Ch 30).
- [ ] **Distributed Locks & Coordination:** ZooKeeper, etcd. Used for electing leaders, managing configuration, and ensuring mutually exclusive access to resources (Ch 7, 31).

### 📚 Learning Resources:
- [ ] **CRDTs:** [Martin Kleppmann - CRDTs: The Hard Parts](https://www.youtube.com/watch?v=x7drE24geUw)
- [ ] **Distributed Locks & Zookeeper:** [Hussein Nasser - What is Apache Zookeeper?](https://www.youtube.com/watch?v=R873BlNVUB4)
- [ ] **CAP Theorem:** [IBM Technology - CAP Theorem Explained](https://www.youtube.com/watch?v=HTaKhMv_ZYU)
- [ ] **MIT Distributed Systems:** [MIT 6.824 Distributed Systems Class (Full Playlist)](https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB) (For a deep academic understanding)

## 4. Communication Protocols & Web Technologies
How do clients and servers, or internal microservices, talk to each other?
- [ ] **HTTP/REST & GraphQL:** Standard stateless communication.
- [x] **WebSockets & Server-Sent Events (SSE):** Persistent, bi-directional connections for Real-time Chat and News Feeds (Ch 12, 11).
- [ ] **Long Polling:** The fallback for older clients that don't support WebSockets.
- [x] **gRPC / Protocol Buffers (Protobuf):** Highly efficient, binary RPC frameworks used for internal microservice-to-microservice communication.
- [ ] **UDP vs. TCP:** UDP for low-latency where packet loss is acceptable (Video Streaming, early layers of Stock Exchanges - Ch 28).
- [x] **Load Balancing & TLS:** Understanding L4 vs L7 routing, proxying, and secure transport (TLS/SSL).
- [x] **DNS & CDNs:** Resolving domains to IPs and globally caching static content.
- [x] **Authentication & Authorization:** Securely verifying user identity (Session, JWT, OAuth) and verifying access control (RBAC, ABAC).

### 📚 Learning Resources:
- [ ] **HTTP Crash Course:** [Hussein Nasser - HTTP 1.0, 1.1, HTTP/2, HTTP/3](https://www.youtube.com/watch?v=0OrmKCB0UrQ)
- [x] **TLS 1.2 & 1.3:** [Hussein Nasser - Transport Layer Security](https://www.youtube.com/watch?v=AlE5X1NlHgg)
- [x] **Load Balancing:** [Hussein Nasser - Load balancing in Layer 4 vs Layer 7](https://www.youtube.com/watch?v=aKMLgFVxZYk)
- [x] **WebSockets/SSE/Polling:** [Hussein Nasser - Push Technology Crash Course (WebSockets, SSE, Polling)](https://www.youtube.com/watch?v=2Nt-ZrNP22A)
- [x] **gRPC vs REST:** [Hussein Nasser - gRPC Crash Course](https://www.youtube.com/watch?v=Yw4rkaTc0f8)

## 5. Messaging & Streaming (Decoupling)
Asynchronous communication is vital for scaling and fault tolerance.
- [x] **Message Queues:** RabbitMQ, Amazon SQS. Used for task decoupling (Email Service, Transcoding).
- [ ] **Event Streaming:** Apache Kafka, Amazon Kinesis. Immutable, append-only logs for high-throughput, ordered event processing (Ad Click Aggregation, Payment Systems).
- [ ] **Stream Processing Frameworks:** Apache Flink, Spark Streaming. For aggregating real-time data over windows (Ch 21).

### 📚 Learning Resources:
- [ ] **Kafka vs RabbitMQ:** [ByteByteGo - Kafka vs RabbitMQ](https://www.youtube.com/watch?v=x4k1XEjNzYQ)
- [ ] **Kafka Internals:** [Confluent - Apache Kafka in 100 Seconds](https://www.youtube.com/watch?v=uvb00oaa3k8) (and the rest of the Confluent channel)
- [ ] **Stream Processing:** [Gaurav Sen - Event Driven Architecture / Stream Processing](https://www.youtube.com/watch?v=rJHTK2TfZ1I)

## 6. Architecture Patterns
- [ ] **Event Sourcing & CQRS:** Storing state as a sequence of immutable events rather than overwriting data. Critical for Payment Systems, Wallets, and Stock Exchanges (Ch 26, 27, 28) for auditing and reproducibility.
- [x] **Distributed Transactions & Sagas:** How to maintain consistency across multiple microservices without locking up the system (Hotel Reservations, Payments - Ch 22, 26).
- [x] **Idempotency:** Ensuring that retrying an operation (like a payment) doesn't result in duplicate side effects (Payment & Wallet - Ch 26, 27).
- [ ] **Fan-out:** Pushing data to many followers. News Feed uses "Fan-out on write" vs "Fan-out on read" (Ch 11).
- [ ] **Lambda vs. Kappa Architecture:** Big data processing paradigms (Ad Click Aggregation - Ch 21).

### 📚 Learning Resources:
- [ ] **CQRS and Event Sourcing:** [Greg Young - CQRS and Event Sourcing](https://www.youtube.com/watch?v=JHGkaShoyNs)
- [ ] **Sagas & Distributed Transactions:** [Couchbase - Distributed Transactions & Saga Pattern](https://www.youtube.com/watch?v=D2R_NBu8Arw) (Also check out Chris Richardson's Microservices.io resources)
- [x] **Idempotency:** [ByteByteGo - What is Idempotency?](https://www.youtube.com/watch?v=XAccGbtl3Z8)

## Recommended Learning Path (Where to start?)
If you are feeling overwhelmed, here is the order you should learn these concepts:
- [x] **Network & Proxies:** HTTP, Load Balancers, DNS, CDNs.
- [ ] **Databases:** Relational vs NoSQL trade-offs, Sharding, Replication, Indexing. *(Read DDIA by Martin Kleppmann)*
- [ ] **Caching:** Memcached/Redis, Cache eviction policies.
- [ ] **Asynchronous Processing:** Message Queues (RabbitMQ) vs. Event Streams (Kafka).
- [x] **Specialized Data Structures:** Consistent Hashing, Bloom Filters, Quadtrees.
- [ ] **Advanced Distributed Concepts:** Distributed locks (ZooKeeper), Consensus, CRDTs, Event Sourcing.
