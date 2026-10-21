# Layer 01: Storage & Database Selection Playbook

> **The System Design Interview Lens:** In a Staff/Principal interview, you are never asked *"what database exists?"*—you are asked *"why this storage engine for this access pattern, what are the mechanical trade-offs at the hardware level (CPU, disk I/O, memory, network), and how does your choice fail when scale increases by 100x?"*

---

## 1. 60-Second Interview Decision Matrix & Flowchart

### The Master Decision Matrix

| Workload / Primary Access Pattern | Primary Choice | Alternative / Runner-Up | Third Contender / Trade-off | Decisive Mechanical Reason |
| :--- | :--- | :--- | :--- | :--- |
| **High-QPS, Sub-Millisecond Profile & Feature Store** (User profiles, Ad tech DSP bid lookups, fraud features) | **Aerospike** | **Redis / Valkey** | **AWS DynamoDB** | **Aerospike:** Hybrid Memory Architecture (primary index in RAM, data on raw NVMe flash bypassing OS page cache) provides sub-1.5ms P99 across terabytes at 1/5th the DRAM cost of Redis. |
| **High-Concurrency OLTP with Frequent Updates on Secondary Indexes** (Ride-sharing trips, order tracking) | **MySQL (InnoDB)** | **PostgreSQL** | **CockroachDB** | **MySQL:** Clustered index stores PK in secondary indexes; updating non-indexed columns causes zero secondary index write amplification; row-based binlog minimizes WAN replication lag. |
| **Complex Relational Domain, Rich Data Types & Auditing** (Financial ledger, double-entry bookkeeping, GIS) | **PostgreSQL** | **MySQL (InnoDB)** | **CockroachDB** (if >5TB) | **PostgreSQL:** Heap table with in-heap MVCC, true Serializable Snapshot Isolation (SSI), native `JSONB` with GIN, and PostGIS geospatial extensions. |
| **Ultra-High Write Throughput + Time-Sliced Scans** (Chat history, IoT sensor telemetry, audit trails) | **Cassandra / ScyllaDB** | **Google Cloud Bigtable** | **AWS DynamoDB** | **Cassandra/ScyllaDB:** LSM-Tree append-only writes bypass random disk I/O; Murmur3 partition hash + sorted clustering keys allow sequential SSTable disk reads. |
| **Global Distributed OLTP with Multi-Region ACID** (Global user balance, inventory checkout) | **CockroachDB** | **Google Cloud Spanner** | **YugabyteDB** | **CockroachDB/Spanner:** Automatic Multi-Raft / Paxos consensus ranges; external consistency via Hybrid Logical Clocks (HLC) or TrueTime atomic clocks. |
| **Real-Time User-Facing Analytics Dashboards** (High-concurrency filtered aggregations on Kafka streams) | **Apache Pinot** | **ClickHouse** | **Trino (Presto)** | **Pinot:** Star-Tree multidimensional pre-aggregation cubes + inverted column indexes; sub-50ms P99 under thousands of concurrent user queries. |
| **Batch & Analytical Event Aggregation at Scale** (Ad click reporting, internal analytics, log scans) | **ClickHouse** | **Apache Pinot** | **DuckDB** (Single node) | **ClickHouse:** Vectorized SIMD execution over columnar MergeTree storage; maximum raw scan throughput across billions of flat rows. |
| **High-Dimensional Vector Embeddings (RAG / Search)** | **Milvus / Qdrant** | **Pinecone** | **pgvector** (<1M vectors) | **Milvus/Qdrant:** Dedicated graph-based ANN indexes (HNSW, IVF-PQ) with AVX-512 SIMD memory acceleration and vector quantization. |

---

### The Architecture Decision Flowchart

```mermaid
flowchart TD
    Start["New Storage Requirement"] --> Q_ACID{"Do you require multi-row ACID transactions & relational joins?"}
    
    %% Relational Path
    Q_ACID -- Yes --> Q_Scale{"Does write scale or data size exceed a single node? (>20k writes/sec, >3-5 TB)"}
    Q_Scale -- No (Fits single master + read replicas) --> Q_Type{"Rich data types (JSONB, GIS, Arrays) or Heavy Extensibility?"}
    Q_Type -- Yes --> Choice_PG["PostgreSQL\n(Heap Storage + In-Heap MVCC + GIN/GiST)"]
    Q_Type -- No (Simple PK OLTP, pure index-organized reads) --> Choice_MySQL["MySQL (InnoDB)\n(Clustered B+Tree + Undo Log Rollback)"]
    
    Q_Scale -- Yes (Requires Horizontal Write Scale + ACID) --> Q_Managed{"Can you use proprietary cloud hardware (Atomic Clocks)?"}
    Q_Managed -- Yes (GCP Native) --> Choice_Spanner["Google Cloud Spanner\n(TrueTime API + Paxos Consensus + Distributed RDBMS)"]
    Q_Managed -- No (Multi-Cloud / Open Source) --> Choice_CRDB["CockroachDB / TiDB\n(Multi-Raft Consensus Ranges + Hybrid Logical Clocks)"]
    
    %% Non-Relational Path
    Q_ACID -- No --> Q_Model{"Primary Query & Data Model?"}
    
    Q_Model -- "High Write Volume + Time-Sliced Scans by Entity" --> Choice_Cass["Cassandra / ScyllaDB\n(LSM-Tree + Murmur3 Token Hash + Sorted Clustering Keys)"]
    Q_Model -- "Pure KV Point Lookups (<10ms P99, Massive Scale)" --> Q_Durability{"Working set fits in RAM and requires sub-ms latency?"}
    Q_Durability -- Yes --> Choice_Redis["Redis / Valkey\n(In-Memory Hash Table + Epoll Single Thread / IO Threads)"]
    Q_Durability -- No --> Choice_DDB["AWS DynamoDB\n(Managed Partition Hash + Paxos Replication)"]
    
    Q_Model -- "Dynamic Nested Documents / Polymorphic Catalog" --> Choice_Mongo["MongoDB\n(WiredTiger B-Tree Document Store)"]
    Q_Model -- "Time-Stamped Metrics & Downsampling" --> Choice_TSDB["TimescaleDB / ClickHouse\n(Columnar / Time Chunked Hypertables)"]
    Q_Model -- "Vector Embeddings & Semantic ANN Search" --> Choice_Vector["Dedicated Vector DB (Milvus / Qdrant / Pinecone)\nor pgvector (Small Scale)"]
```

---

## 2. Mechanical First Principles: The Physics of Storage Engines

In an interview, you demonstrate seniority by rooting your choice in the **physical constraints of disk, memory, and CPU cache lines**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE ENGINE PARADIGMS                          │
├───────────────────────────────────┬─────────────────────────────────────────┤
│          B+ TREE ENGINES          │             LSM-TREE ENGINES            │
│  (Postgres, MySQL, WiredTiger)    │  (Cassandra, RocksDB, ScyllaDB, LevelDB)│
├───────────────────────────────────┼─────────────────────────────────────────┤
│ • In-place page updates (8KB-16KB)│ • Append-only sequential writes to log  │
│ • Optimized for: Point/Range READS│ • Optimized for: Extremely fast WRITES  │
│ • Random Disk I/O on updates      │ • Sequential Disk I/O on writes         │
│ • Write Amplification: High       │ • Read Amplification: Higher (Compaction)│
│ • Storage fragmentation over time │ • Space Amplification: Transient bloat  │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

### 1. B+ Trees vs. Log-Structured Merge (LSM) Trees

#### B+ Tree Physics (Postgres, MySQL InnoDB, SQLite)
*   **The Structure:** Balanced search tree stored on disk in fixed-size blocks/pages (typically 8KB in Postgres, 16KB in InnoDB). Leaves form a doubly linked list, enabling fast range scans.
*   **Write Path:** Updating a single 50-byte record requires rewriting the entire 8KB or 16KB disk page (**in-place update**). If the page is full, it causes a **Page Split** (allocating a new page, moving half the keys, updating parent node pointers). To ensure crash recovery, the database must write to a Write-Ahead Log (WAL / Redo log) *first* before modifying dirty pages in the buffer cache.
*   **Trade-off:** Fast, predictable point lookups ($O(\log N)$ with minimal page reads) at the expense of **heavy write amplification** and random I/O during dirty page flushes.

#### LSM Tree Physics (Cassandra, ScyllaDB, RocksDB, Bigtable)
*   **The Structure:** Decouples memory from disk. Writes are appended sequentially to a **Commit Log** on disk for durability, then inserted into an in-memory sorted data structure called the **Memtable** (SkipList or Red-Black Tree).
*   **Flush & Compaction:** When the Memtable fills up (e.g., 64MB–256MB), it is flushed to disk as an immutable, sorted file called an **SSTable (Sorted String Table)**. Because older SSTables accumulate duplicate keys and deletes (tombstones), a background **Compaction** process reads multiple SSTables, merges them (merge-sort), discards superseded versions and expired tombstones, and writes a new compacted SSTable.
*   **Trade-off:** Sub-millisecond sequential writes with almost zero write stalls, at the expense of **read amplification** (a point read may need to check the Memtable, Row Cache, and multiple SSTables via Bloom Filters) and periodic CPU/IO spikes during major compactions.

---

### 2. Multi-Version Concurrency Control (MVCC): In-Heap vs. Rollback Undo Log

One of the most lethal questions interviewers ask is: *"How does MVCC actually store old versions of a row?"*

```
POSTGRESQL (In-Heap Versioning):
Table File (Heap):
[Tuple v1: xmin=100, xmax=105]  ← DEAD (Requires VACUUM cleanup)
[Tuple v2: xmin=105, xmax=NULL] ← LIVE
* Every UPDATE creates a new physical tuple on the heap.
* Dead tuples cause table bloat until autovacuum reclaims space.

MYSQL / INNODB (Rollback Undo Log):
Clustered Index Page:
[Tuple v2 (Current in-place)] ──points to──> Undo Log Tablespace:
                                            [v1 Delta (xmin=100)] ──> [v0 Delta]
* UPDATE modifies the row in-place inside the clustered index page.
* Old versions stored as reverse deltas in Undo Segments.
* No table file bloat; undo log purged automatically when transactions finish.
```

*   **Postgres (In-Heap):**
    *   Row updates insert a new tuple into the data block and mark the old tuple dead (`xmax = updating_txn_id`).
    *   **Pro:** Rolling back a transaction is instantaneous (simply mark transaction aborted in `pg_xact`).
    *   **Con:** High table and index bloat. Secondary indexes must update pointers to the new heap tuple unless **HOT (Heap-Only Tuple)** optimization applies. Requires continuous background **`autovacuum`** to sweep pages and reclaim dead space.
*   **MySQL InnoDB (Undo Log):**
    *   Row updates modify the clustered index in-place; the previous column values are pushed into an **Undo Log** segment.
    *   **Pro:** The primary table file never bloats from dead rows. Secondary indexes remain untouched if indexed columns are not changed.
    *   **Con:** Long-running read transactions prevent undo log purging, creating a massive undo log history that degrades query performance across the entire database.

---

### 3. Distributed Consistency & Consensus (CAP vs. PACELC)

In distributed databases, the classic CAP theorem is too coarse. Use **PACELC**:
$$\text{If } \mathbf{P} \text{ (Partition): } \mathbf{A} \text{ vs } \mathbf{C} \quad \Big| \quad \text{EL} \text{ (Else / Normal Operations): } \mathbf{L} \text{ vs } \mathbf{C}$$

| Database | PACELC Classification | Under-the-Hood Behavior |
| :--- | :--- | :--- |
| **CockroachDB / Spanner** | **CP / PC** (Consistent during partitions; prioritizes Consistency over Latency normally) | Uses Raft/Paxos quorums. If network partitions isolate nodes, the minority partition halts writes. Every write requires network round-trip consensus. |
| **Cassandra / ScyllaDB** | **PA / EL** (Available during partitions; prioritizes Latency over Consistency normally) | Masterless peer-to-peer. Reads and writes succeed even during partitions. Consistency is tunable per query ($R + W > N$). Anti-entropy repair runs asynchronously via Merkle Trees. |
| **DynamoDB** | **PA / EL** (Default) or **PA / EC** (Strong Consistency flag) | By default, reads use eventually consistent replication ($R=1$). Setting `ConsistentRead = true` directs read to the Paxos leader ($R=2$). |

---

## 3. Head-to-Head Architectural Shootouts

### Shootout 1: PostgreSQL vs. MySQL (InnoDB)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            POSTGRESQL vs. MYSQL                             │
├───────────────────────────────────┬─────────────────────────────────────────┤
│            POSTGRESQL             │              MYSQL (INNODB)             │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Heap Table + Secondary Index TID  │ Clustered Index (Primary Key B+Tree)    │
│ In-Heap MVCC (Tuple versioning)   │ In-Place MVCC + Undo Log segments       │
│ Process-per-connection (~10MB/conn)│ Thread-per-connection (~256KB/conn)     │
│ JSONB + GIN / PostGIS / pgvector  │ JSON (Generated cols) / Basic GIS       │
│ Physical WAL Streaming Replica    │ Logical Binlog (Row-based / GTID)       │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

#### 1. Data Organization on Disk
*   **Postgres:** Tables are unordered **Heap Files**. The Primary Key is just a regular unique B-tree index whose leaf nodes store a physical Tuple ID (`TID` = Block Number + Item Offset). Secondary indexes also store `TID`.
    *   *Interview Impact:* Reading any row via an index requires an extra random I/O hop from the index leaf to the heap block (unless an *Index-Only Scan* satisfies the query using the visibility map).
*   **MySQL (InnoDB):** Tables are **Index-Organized (Clustered Index)**. The table *is* the Primary Key B+Tree; row data is stored directly in the leaf pages. Secondary indexes do *not* store physical disk offsets; they store the Primary Key value.
    *   *Interview Impact:* If you query by a secondary index (`SELECT * FROM users WHERE email = ?`), MySQL performs a **Secondary Index Lookup** to find the PK, followed by an **Index Bookmark Lookup** traversing the primary B+Tree. However, PK lookups (`SELECT * FROM users WHERE id = ?`) require zero extra hops.

#### 2. Write Amplification & Updates
*   **Postgres:** If you update a non-indexed column on a row, Postgres must create a new tuple in the heap. If the new tuple cannot fit on the same page, **every secondary index on the table must be updated** to point to the new `TID`. Postgres mitigates this with **HOT (Heap-Only Tuple)** updates only when: (1) no indexed columns change, and (2) the current page has enough free space.
*   **MySQL:** Updating a non-indexed column modifies the clustered index leaf in-place and writes an undo record. **Secondary indexes are completely untouched**.

#### 3. Concurrency & Connection Scaling
*   **Postgres:** Uses a **Process-per-connection** model (each connection is a separate forked OS process consuming 5MB–10MB).
    *   *Production Reality:* Postgres degrades rapidly above 300–500 active connections due to OS context switching and IPC overhead. In any high-scale architecture, you **must explicitly place a connection pooler** (such as **PgBouncer** or **pgcat**) in front of Postgres.
*   **MySQL:** Uses a **Thread-per-connection** model. Can handle 2,000–5,000 idle/active connections with substantially lower memory overhead.

#### 4. The Interview Verdict: When to Pick Which
*   **Pick PostgreSQL if:**
    1.  The domain requires complex query patterns: analytical window functions, Common Table Expressions (CTEs), rich full-text search, or specialized data types (`JSONB`, `PostGIS`, arrays, `pgvector`).
    2.  You are building financial or auditing systems requiring strict transaction isolation (Postgres implements true Serializable Snapshot Isolation - SSI).
*   **Pick MySQL (InnoDB) if:**
    1.  The workload is high-concurrency, simple read/write OLTP dominated by Primary Key lookups (e.g., standard consumer web apps).
    2.  The schema has many secondary indexes that undergo heavy updates to non-indexed fields (minimizing write amplification).
    3.  You want simpler horizontal read replication without external connection pooler mandates.

#### 5. Case Study: Why Uber Famously Switched from PostgreSQL to MySQL
In 2016, Uber published their landmark architectural post explaining why their core dispatch and trip database migrated from Postgres to MySQL (InnoDB). In an interview, quoting these exact physical failure modes proves Staff-level maturity:
1.  **Write Amplification on Secondary Indexes:** Uber's `trips` table had ~12 secondary indexes (by driver, rider, city, timestamp, status). In Postgres, updating `status = 'completed'` created a new heap tuple with a new `TID`. Because the update couldn't fit on the same page, Postgres had to write new entries into **all 12 secondary indexes** pointing to the new `TID`. In MySQL InnoDB, secondary indexes store the Primary Key, so updating non-indexed columns modified the clustered index leaf in-place and touched **zero secondary indexes**.
2.  **Replication Bandwidth (Physical WAL vs. Logical Binlog):** Postgres streaming replication transmits physical disk page deltas. When an update triggers page splits, Postgres streams full 8KB dirty pages over the network. Across geographically distributed datacenters, this saturated Uber’s WAN links. MySQL uses logical row-based binlogging (`binlog_format = ROW`), which streams only the tiny row delta (a few dozen bytes), reducing replication bandwidth by over 90%.
3.  **Buffer Pool Efficiency & Table Bloat:** Postgres's in-heap MVCC leaves dead tuples in the table until `autovacuum` sweeps them. Under massive update volume, autovacuum lagged behind, creating severe table bloat and cache pollution. MySQL mutates clustered index pages in-place inside the InnoDB Buffer Pool and writes deltas to Undo Logs, which background purge threads clean up immediately after transactions commit.
4.  **Connection Scaling:** Postgres's process-per-connection model caused heavy context-switching overhead under thousands of microservice connections, while MySQL's thread-per-connection handled high connection counts with significantly lower memory footprint.

---

### Shootout 2: Sub-Millisecond Key-Value & Profile Lookups: Aerospike vs. Redis vs. AWS DynamoDB

In high-QPS user profile lookups, ad-tech bidding engines (DSP/SSP), and fraud feature stores, an interviewer will push: *"How will you serve 500,000 profile lookups per second across 10TB of data with sub-2ms latency at reasonable cost?"*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 AEROSPIKE vs. REDIS / VALKEY vs. DYNAMODB                   │
├───────────────────┬─────────────────────┬───────────────────────────────────┤
│ FEATURE           │ AEROSPIKE           │ REDIS / VALKEY    │ AWS DYNAMODB  │
├───────────────────┼─────────────────────┼───────────────────┼───────────────┤
│ Primary Data Loc. │ Raw NVMe Flash/SSD  │ DRAM (Pure Memory)│ SSD (Managed) │
│ Primary Index Loc.│ DRAM (64 bytes/rec) │ DRAM (Inline)     │ Distributed   │
│ OS Page Cache     │ BYPASSES (O_DIRECT) │ Relies on Kernel  │ Managed Cloud │
│ P99 Read Latency  │ Sub-1.5 ms          │ Sub-0.5 ms        │ 4 – 8 ms      │
│ Cost for 10TB data│ ~$5,000 - $8,000/mo │ ~$40,000 - $60k/mo│ WCU/RCU bound │
│ Multi-Record ACID │ No (Record-level)   │ Multi-exec / Lua  │ TransactWrite │
│ Concurrency Model │ Multi-threaded C/C++│ Single-thread ae  │ Serverless    │
└───────────────────┴─────────────────────┴───────────────────┴───────────────┘
```

#### 1. Aerospike's Hybrid Memory Architecture (HMA)
*   **The Problem with Redis at Scale:** Storing 10TB of user profiles in Redis requires 10TB of raw DRAM. DRAM is roughly $5\times - 10\times$ more expensive than NVMe SSDs, making multi-terabyte Redis clusters cost-prohibitive.
*   **The Aerospike Innovation:** Aerospike invented the **Hybrid Memory Architecture (HMA)**:
    1.  **Primary Index in RAM:** Aerospike keeps *only* the primary index in DRAM. Each index entry is compact (fixed at 64 bytes per record), holding a RIPEMD-160 hash of the key, generation counter, and a direct physical byte pointer to raw flash storage.
    2.  **Data on Raw NVMe Flash:** The actual record data is written directly to raw NVMe SSD block devices using direct I/O (`O_DIRECT`), **completely bypassing the Linux filesystem and the OS page cache**.
    3.  **Predictable Latency:** A point lookup reads the 64-byte index in RAM ($O(1)$, ~100ns), issues a single direct asynchronous block read to NVMe SSD (~500µs–1ms), and returns the record in **under 1.5ms P99**.
*   **Cost Advantage:** 1 billion records (each 1KB = 1TB data) requires only $1\text{B} \times 64\text{ bytes} \approx 64\text{GB of RAM}$ for the index, while the 1TB of data sits on inexpensive NVMe SSDs.

#### 2. The Interview Verdict: Presenting the Triad
When an interviewer asks for a low-latency profile store or feature cache:
*   **Choose Redis / Valkey if:** The dataset fits comfortably in memory (<100GB–500GB), sub-millisecond latency (<0.5ms) is mandatory, or the application requires complex data structures (Sorted Sets for leaderboards, Bitmaps, Pub/Sub).
*   **Choose Aerospike if:** The dataset is large (2TB to 50TB+), throughput is massive (100k to 1M+ QPS), sub-1.5ms P99 latency is strictly required (e.g., Ad Tech 10ms real-time bidding budget), and RAM cost must be minimized.
*   **Choose AWS DynamoDB if:** The team is AWS-native, prioritizing zero operational management, where 4–8ms P99 over HTTP/TLS is acceptable, and traffic does not exhibit extreme single-key hotspots.

---

### Shootout 3: High-Ingestion Wide-Column NoSQL: Apache Cassandra vs. ScyllaDB vs. Google Cloud Bigtable

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CASSANDRA vs. SCYLLADB vs. GOOGLE BIGTABLE                │
├───────────────────┬─────────────────────┬───────────────────────────────────┤
│ FEATURE           │ APACHE CASSANDRA    │ SCYLLADB          │ GOOGLE BIGTABLE   │
├───────────────────┼─────────────────────┼───────────────────┼───────────────┤
│ Runtime / Engine  │ Java (JVM)          │ C++ (Seastar)     │ C++ (Google Borg) │
│ Concurrency Model │ Thread-pool / Locks │ Thread-per-core   │ Decoupled Compute │
│ Storage Topology  │ Local SSD / LSM     │ Local NVMe / LSM  │ Colossus Shared FS│
│ Rebalancing Cost  │ Heavy data copying  │ Heavy data copying│ Instant (Pointer) │
│ GC Pauses / Jitter│ High (JVM GC tuning)│ ZERO GC Pauses    │ Managed by Google │
│ Cloud Agnostic    │ 100% Open Source    │ Open Source / Ent │ GCP Native Only   │
└───────────────────┴─────────────────────┴───────────────────┴───────────────┘
```

#### 1. Cassandra vs. ScyllaDB: The C++ Thread-per-Core Revolution
*   **Cassandra (The JVM Ceiling):** Written in Java. As write volume climbs into the hundreds of thousands of operations/second, the JVM garbage collector must clean millions of transient Memtable and compaction objects. Even with modern collectors (ZGC or Shenandoah), high memory churn triggers GC pauses, causing latency spikes that break strict P99 SLAs.
*   **ScyllaDB (The Seastar Framework):** A C++ drop-in rewrite of Cassandra. ScyllaDB pins one OS thread to each physical CPU core (**thread-per-core architecture**) with zero shared memory and zero lock contention between cores. It uses Linux AIO directly, bypassing OS page caching. Result: **5x to 10x higher throughput per node and flat, microsecond P99 latencies without GC tuning**.

#### 2. Google Cloud Bigtable: Decoupled Compute and Storage
*   In Cassandra and ScyllaDB, storage is coupled to compute: each node owns its local NVMe SSDs. When a node fills up or a new node joins the hash ring, the cluster must physically stream gigabytes of SSTable data over the network to rebalance partitions.
*   **Google Bigtable decouples compute from storage:**
    1.  **Stateless Tablet Servers:** Run on Google Borg (Kubernetes predecessor) and process queries in memory.
    2.  **Shared Distributed Storage (Colossus):** All SSTables are stored on Google’s Colossus distributed file system.
    3.  **Zero-Copy Rebalancing:** When a tablet splits or a node fails, Bigtable does not copy data; it simply reassigns metadata pointers to a different Tablet Server in milliseconds.

#### 3. The Interview Verdict: Presenting the Triad
*   **Choose ScyllaDB if:** You need an open-source, multi-cloud LSM-Tree database with maximum throughput per hardware dollar, flat P99 latencies, and zero JVM GC tuning headaches.
*   **Choose Apache Cassandra if:** Your organization has mature, established operational tooling for Java/Cassandra or requires an enterprise-supported open-source ecosystem.
*   **Choose Google Cloud Bigtable if:** You are hosted on GCP, requiring petabyte-scale wide-column storage (e.g., IoT telemetry, time-series, Ad click logs) with zero rebalancing overhead and seamless integration with BigQuery and Apache Beam.

---

### Shootout 4: AWS DynamoDB vs. Apache Cassandra / ScyllaDB (Key & Compaction Mechanics)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DYNAMODB vs. CASSANDRA / SCYLLADB                     │
├───────────────────────────────────┬─────────────────────────────────────────┤
│            AWS DYNAMODB           │          CASSANDRA / SCYLLADB           │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Fully Managed Serverless (AWS)    │ Self-Managed Cluster / Multi-Cloud      │
│ Partition Key + Sort Key (B-Tree) │ Partition Key + Clustering Column (LSM) │
│ Hard limit: 1k WCU / 3k RCU/part  │ Hardware-bound per token range          │
│ Cross-partition queries: Scan only│ Token-range ring pagination             │
│ Max item size: 400 KB             │ Max cell size: 2 GB (Practical: <10 MB) │
│ Storage: Managed SSD / B-Tree     │ Storage: Pure LSM-Tree (SSTables)       │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

#### 1. Partitioning and Range Scanning
*   **DynamoDB:** Uses a **Partition Key (PK)** and an optional **Sort Key (SK)**. The PK is hashed to select a physical storage partition. Within that partition, items are indexed using a B-Tree ordered by the SK.
    *   *The Trap:* Range queries (`Query` API using `begins_with`, `BETWEEN`, `>`, `<`) are **strictly supported only within a single Partition Key**. If you need to query across partition keys, you are forced to run a full table `Scan` (which reads every single item in the entire table, destroying performance and cost).
*   **Cassandra:** Uses a **Partition Key** (hashed via Murmur3 to determine the node on the consistent hash ring) and one or more **Clustering Columns** (which determine the physical on-disk sorted order inside the SSTables on that node).
    *   *The Advantage:* While queries should ideally be constrained to a single partition key, Cassandra supports native token-range iteration (`WHERE token(id) > ? AND token(id) <= ?`), allowing distributed parallel batch processing and analytical range extractions across the ring.

#### 2. Hot Partition Bottlenecks & Throttling
*   **DynamoDB:** Imposes a strict hard limit on each individual partition: **1,000 Write Capacity Units (WCU)** and **3,000 Read Capacity Units (RCU)** per second (1 WCU = 1KB write; 1 RCU = 4KB strongly consistent read).
    *   *Interview Gotcha:* Even if your table has 50,000 provisioned WCUs globally, if a celebrity user or viral post routes 1,500 writes/sec to a *single* Partition Key, DynamoDB will reject writes with a `ProvisionedThroughputExceededException` (HTTP 400). You must mitigate this via **Write Sharding** (appending a random suffix `PK#1..10` to scatter writes).
*   **Cassandra:** Has no artificial software throttling caps. A single node accepts writes up to the physical limits of its NVMe SSD sequential write bandwidth and network interface. However, a severe hot spot can lead to excessive memory pressure in the Memtable and high JVM garbage collection pauses.

#### 3. Storage Internals: SSD B-Trees (DynamoDB) vs. Memtables & LSM Compaction (Cassandra)
*   **DynamoDB (SSD B-Tree Storage Engine):**
    *   Within each physical 10GB storage partition, items sharing the same Partition Key are indexed and sorted by their **Sort Key (SK)** using an on-disk **B-Tree index structure** on NVMe SSDs.
    *   *In-Place Updates:* Mutations and deletes update the B-Tree leaf pages directly (after Paxos commit). Deleting an item immediately frees the page entry without generating tombstones.
    *   *The Multi-Tenant Cloud Justification:* AWS designed DynamoDB for multi-tenancy where thousands of customer partitions share physical nodes. An LSM engine would trigger heavy background **Compaction storms**, causing "noisy neighbor" disk I/O saturation and severe P99 latency spikes. The SSD B-Tree guarantees flat, deterministic single-digit millisecond P99s with zero background compaction overhead.
*   **Cassandra (LSM-Tree: Memtable + SSTables):**
    *   Cassandra's node engine is a pure **LSM-Tree** (Log-Structured Merge-Tree). Writes are appended sequentially to an on-disk `CommitLog` and inserted into an in-memory **Memtable** (SkipList sorted by clustering columns).
    *   *Compaction & Tombstones:* Memtables periodically flush to disk as immutable **SSTables**. Updates and deletes never mutate disk in place; deleting a row writes an append-only **Tombstone** marker.
    *   *Production Failure Mode (The Tombstone Storm):* If a query reads a range with thousands of deleted records, Cassandra must scan all tombstones from disk into memory. If the tombstone count exceeds `tombstone_failure_threshold` (default 100,000), **Cassandra aborts the query with a `ReadFailureException` to prevent node OOM crashes**.
*   **ScyllaDB:** A drop-in C++ rewrite of Cassandra. By using the asynchronous **Seastar engine** with a **thread-per-core** architecture and direct Linux AIO, it bypasses JVM garbage collection entirely, offering 5x–10x higher throughput and flat, predictable P99 latencies.

#### 4. The Interview Verdict: When to Pick Which
*   **Pick DynamoDB if:**
    1.  You are designing an AWS-native system prioritizing zero operational management (no cluster provisioning, node replacement, or compaction tuning).
    2.  Workload consists of discrete Key-Value point lookups or 1-to-many lookups bounded strictly by an entity ID (e.g., `UserID` $\to$ `Orders`).
*   **Pick Cassandra / ScyllaDB if:**
    1.  You require cloud-agnostic deployment, on-premise infrastructure, or multi-cloud active-active replication.
    2.  Write volume is enormous (hundreds of thousands of writes/sec, such as IoT sensor telemetry or massive event logs) where DynamoDB's WCU pricing would be cost-prohibitive.

---

### Shootout 5: Distributed SQL (CockroachDB / Spanner) vs. Sharded RDBMS (Vitess / Citus)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 DISTRIBUTED NEWSQL vs. SHARDED RDBMS                        │
├───────────────────────────────────┬─────────────────────────────────────────┤
│  DISTRIBUTED NEWSQL (CockroachDB) │      SHARDED RDBMS (Vitess / Citus)     │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Native Multi-Raft Range Splitting │ Proxy-routed sharding over MySQL/PG     │
│ HLC / TrueTime External Consist.  │ Single-shard ACID; 2PC across shards    │
│ Higher P99 latency (Consensus hop)│ Sub-millisecond single-shard P99 latency│
│ Zero manual re-sharding overhead  │ Operational complexity in resharding    │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

#### 1. Architecture Mechanics
*   **CockroachDB / Spanner (Distributed SQL):**
    *   Table data is divided into contiguous, sorted key-value chunks called **Ranges** (typically 64MB in CockroachDB).
    *   Each range is replicated across multiple nodes using an independent **Raft** (CockroachDB) or **Paxos** (Spanner) consensus group (**Multi-Raft architecture**).
    *   When a range grows beyond its size limit, CockroachDB automatically splits it into two ranges and rebalances them across the cluster. Transactions spanning multiple ranges execute a distributed 2-Phase Commit (2PC) over Raft.
*   **Vitess / Citus (Sharded RDBMS):**
    *   Shards are standard, standalone MySQL (Vitess) or PostgreSQL (Citus) instances.
    *   A stateless proxy layer (`vtgate` in Vitess) inspects SQL queries, extracts the sharding key (keyspace ID), and routes the query directly to the target shard.
    *   Cross-shard queries require the proxy to scatter-gather results and perform joins in memory.

#### 2. The Latency vs. Operational Trade-off
*   *Distributed SQL Trade-off:* You gain fully automated horizontal write scaling, automatic rebalancing, and cross-node ACID. However, **every single write incurs a network consensus round-trip** (minimum 3-node Raft quorum). A single-row insert that takes 0.5ms in local Postgres takes 3ms–10ms in CockroachDB.
*   *Sharded RDBMS Trade-off:* Single-shard operations execute at native bare-metal speed (sub-millisecond). However, cross-shard transactions are slow and fragile, and re-sharding (splitting shards live under traffic) requires complex operational choreography.

#### 3. The Interview Verdict: When to Pick Which
*   **Pick CockroachDB / Spanner if:** The business requires global write-scaling, automatic high availability across data centers, and multi-record ACID transactions where the application cannot tolerate manual sharding logic.
*   **Pick Sharded RDBMS (or vertically scaled Postgres) if:** The workload can be cleanly partitioned by an entity key (e.g., `tenant_id` or `company_id`), cross-tenant queries never happen, and latency budgets demand sub-millisecond single-digit P99s.

---

### Shootout 6: Document Stores: MongoDB vs. PostgreSQL with JSONB vs. Couchbase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 MONGODB vs. POSTGRESQL (JSONB) vs. COUCHBASE                │
├───────────────────┬─────────────────────┬───────────────────┬───────────────┤
│ FEATURE           │ MONGODB             │ POSTGRESQL (JSONB)│ COUCHBASE     │
├───────────────────┼─────────────────────┼───────────────────┼───────────────┤
│ Core Engine       │ WiredTiger (B-Tree) │ In-Heap MVCC Tuple│ Memory-First  │
│ Integrated Cache  │ WiredTiger Cache    │ Shared Buffers    │ Managed RAM   │
│ Partial Updates   │ In-place delta mods │ Full Doc Rewrite  │ Sub-doc API   │
│ Horizontal Shard  │ Native (mongos)     │ Citus / Manual    │ Native vBuckets│
│ ACID Transactions │ Multi-doc (High lag)│ Full Engine Native│ Multi-doc ACID│
└───────────────────┴─────────────────────┴───────────────────┴───────────────┘
```

#### 1. In-Place Updates vs. Full Rewrite
*   **Postgres JSONB:** The `jsonb` data type is stored as a parsed binary hierarchy inside the heap tuple.
    *   *The Trap:* If you store a 50KB JSON document in a Postgres column and update a single nested counter, **Postgres must rewrite the entire 50KB JSON document into a brand new heap tuple**. This generates massive WAL traffic and heap bloat.
*   **MongoDB (WiredTiger):** Supports deep partial document updates (`$set`, `$inc`) directly in its WiredTiger cache pages, avoiding full document write amplification.
*   **Couchbase:** Uses a memory-first architecture where documents live in an integrated managed memory cache layer before asynchronous persistence to disk, providing sub-millisecond reads/writes with native sub-document mutation APIs.

#### 2. Sharding & Horizontal Scale
*   **MongoDB:** Features built-in horizontal sharding out of the box using a cluster architecture: `mongos` (routing routers), Config Servers (cluster metadata via Raft), and Shard Replica Sets.
*   **Postgres:** Core Postgres has no native horizontal write sharding. Partitioning is declarative table inheritance on a single node. Scaling writes horizontally requires external extensions (Citus) or manual application sharding.

#### 3. The Interview Verdict: Presenting the Triad
*   **Pick PostgreSQL with JSONB if:** 80% of your domain is relational (Users, Payments, Orders) with strict integrity, but a few entities require semi-structured flexibility (e.g., third-party webhook payloads, user preference blobs).
*   **Pick MongoDB if:** The entire core domain model is document-centric with high structural polymorphism (e.g., product catalogs with 10,000 distinct attribute schemas), documents are heavily updated, and native horizontal clustering is mandatory.
*   **Pick Couchbase if:** You need a high-throughput, low-latency document store where read/write operations require sub-millisecond memory performance without deploying a separate Redis caching layer.

---

### Shootout 7: Real-Time Event OLAP & Analytics: ClickHouse vs. Apache Pinot vs. Trino (Presto)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLICKHOUSE vs. APACHE PINOT vs. TRINO                    │
├───────────────────┬─────────────────────┬───────────────────┬───────────────┤
│ FEATURE           │ CLICKHOUSE          │ APACHE PINOT      │ TRINO (PRESTO)│
├───────────────────┼─────────────────────┼───────────────────┼───────────────┤
│ Primary Role      │ High-speed raw scan │ User-Facing OLAP  │ Federated SQL │
│ Best Query Shape  │ Massive raw scans,  │ Multi-dimensional │ Complex JOINs │
│                   │ aggregations over   │ filtered counts,  │ across S3, PG,│
│                   │ billions of flat rows p99 < 50ms metrics│ Kafka together│
│ Streaming Ingress │ Kafka Engine / batch│ Native real-time  │ None (Query   │
│                   │ streaming inserts   │ Kafka consumer    │ engine only)  │
│ Specialized Index │ Sparse Primary Key, │ Star-Tree Cubes,  │ None (relies  │
│                   │ MinMax, Skip Index  │ Inverted, Range   │ on underlying)│
│ Production Pedigree Cloudflare, Yandex  │ LinkedIn, Uber,   │ Netflix, Meta │
│                   │ Uber logs           │ Stripe Dashboards │ Data Lake BI  │
└───────────────────┴─────────────────────┴───────────────────┴───────────────┘
```

#### 1. Why Companies Pick Apache Pinot for User-Facing Dashboards (LinkedIn, Uber, Stripe)
*   **The Problem with ClickHouse on User-Facing Dashboards:** ClickHouse is an incredible brute-force vectorized scan engine. However, when 10,000 concurrent mobile users open the Uber app or LinkedIn profile analytics simultaneously, running raw columnar scans across billions of records saturates CPU cores.
*   **The Pinot Superpower (Star-Tree Index):** Apache Pinot pre-aggregates combinations of dimensions into multi-dimensional cubes called **Star-Tree Indexes** during ingestion. When a user queries *"How many impressions for Campaign X in City Y yesterday?"*, Pinot answers from the pre-aggregated Star-Tree in **sub-20 milliseconds**, scaling to tens of thousands of concurrent queries without scanning the raw leaf data.
*   **ClickHouse's Sweet Spot:** Internal analytical dashboards, security telemetry, network traffic logs (Cloudflare), and massive batch scans where data shape varies and pre-aggregation is not feasible.

#### 2. The Interview Verdict: Presenting the Triad
*   **Pick Apache Pinot if:** You are building an **external-facing / user-facing analytics dashboard** (e.g., LinkedIn "Who viewed your profile", Stripe merchant revenue metrics, Uber Eats restaurant analytics) requiring sub-50ms P99 latencies under high concurrent user load directly consuming from Kafka.
*   **Pick ClickHouse if:** You need real-time, high-speed ad-hoc analytics over flat, high-volume event logs (e.g., ad click aggregations, clickstream analytics, observability metrics).
*   **Pick Trino (Presto) if:** You need an interactive **data lake query engine** for internal business intelligence, capable of executing ad-hoc federated SQL queries spanning Apache Iceberg, PostgreSQL, and AWS S3 without data ingestion.

---

### Shootout 8: Specialized Storage Engines

#### 1. Time-Series Databases: TimescaleDB vs. InfluxDB
*   **TimescaleDB:** Packaged as a PostgreSQL extension. Automatically partitions relational tables into time-and-space chunks called **Hypertables**.
    *   *Best for:* Systems where time-stamped metrics must join directly against relational business entities (e.g., joining IoT device telemetry against the `devices` and `customers` SQL tables). Retains full SQL support.
*   **InfluxDB:** Purpose-built engine using a Time-Structured Merge tree (TSM) and Time Series Index (TSI).
    *   *Best for:* Pure DevOps monitoring and high-cardinality metric counters where write volume is millions of metrics/sec and relational joins are unnecessary.

#### 2. Vector Databases: Dedicated (Milvus / Qdrant) vs. pgvector
*   **Dedicated (Milvus / Qdrant / Pinecone):** Built specifically for **Approximate Nearest Neighbor (ANN)** search on high-dimensional vectors (e.g., 1536-dimension OpenAI embeddings). Utilizes graph-based indexes (**HNSW**) and quantization (**IVF-PQ**), with all vectors kept memory-resident and accelerated via CPU SIMD / AVX-512 instructions.
    *   *Best for:* Large-scale RAG, image search, or semantic matching with >5–10 million vectors where sub-15ms search latency is mandatory.
*   **pgvector:** An open-source Postgres extension enabling vector storage and HNSW/IVFFlat indexing inside relational tables.
    *   *Best for:* Standard applications with <1–2 million vectors. Avoids introducing an entire new database into your infrastructure stack.

---

## 4. The Interview Defense Playbook: Scripts & Trap Rebuttals

### The 3-Candidate Justification Formula (The Senior/Staff Standard)

In Staff/Principal interviews, jumping straight to a single database without presenting alternatives signals narrow familiarity. Instead, use the **3-Candidate Triad Framework**:
1.  **State the Candidates:** *"For this layer, our three viable candidate technologies are [Candidate A], [Candidate B], and [Candidate C]."*
2.  **Evaluate Against the Mechanical Bottleneck:** Explain the hardware/operational trade-off of each option.
3.  **Lock in the Selection with a Decisive Trigger:** State the exact threshold (working set size, P99 latency SLA, write pattern) that dictates the final choice.

---

### Production Verbal Scripts

#### Script 1: High-Throughput Profile / Feature Store (Aerospike vs. Redis vs. DynamoDB)
> *"For our user profile and feature store layer, I considered three candidate technologies: **Redis**, **AWS DynamoDB**, and **Aerospike**.*
> * * **Redis:** Delivers sub-0.5ms read latency from pure DRAM, but holding our 10TB working set entirely in memory would cost upwards of $40,000/month in hardware.*
> * * **DynamoDB:** Fully managed and serverless, but its HTTP/TLS request overhead establishes a 4–8ms latency floor, and its 1,000 WCU / 3,000 RCU partition limits make it fragile under viral access hotspots.*
> * * **Aerospike (The Winner):** Uses a Hybrid Memory Architecture where the 64-byte primary index lives in RAM while records stream directly from raw NVMe flash bypassing the Linux page cache. It delivers sub-1.5ms P99 latencies at 1/5th the hardware cost of Redis, making it the superior architectural choice for our 500,000 QPS profile workload.*"

#### Script 2: High-Concurrency Order / Dispatch OLTP (MySQL vs. PostgreSQL vs. CockroachDB)
> *"For the ride dispatch and order tracking table, I evaluated **PostgreSQL**, **MySQL (InnoDB)**, and **CockroachDB**.*
> * * **CockroachDB:** Offers automated horizontal sharding, but every write commit incurs a Multi-Raft network round-trip, degrading our P99 write latency budget.*
> * * **PostgreSQL:** Excellent relational engine, but its in-heap MVCC causes heavy write amplification on our `trips` table because updating the non-indexed `status` column creates a new heap tuple that forces updates across all 12 secondary indexes.*
> * * **MySQL InnoDB (The Winner):** Uses a Clustered Index where secondary indexes store the Primary Key rather than physical disk pointers. Updating non-indexed columns modifies the clustered index leaf in-place without touching any secondary indexes. Furthermore, its logical row-based binlogging minimizes cross-datacenter WAN replication lag.*"

#### Script 3: User-Facing Analytics Dashboard (Apache Pinot vs. ClickHouse vs. Trino)
> *"For the merchant revenue analytics dashboard, I evaluated **Trino**, **ClickHouse**, and **Apache Pinot**.*
> * * **Trino:** Superb for ad-hoc internal BI, but its in-memory scatter-gather engine cannot support sub-50ms latencies under 10,000 concurrent merchant queries.*
> * * **ClickHouse:** A phenomenal vectorized scan engine, but brute-force columnar scans across billions of rows become CPU-bound when thousands of merchants run concurrent filtered aggregations.*
> * * **Apache Pinot (The Winner):** Created specifically for user-facing OLAP (used by LinkedIn, Uber, and Stripe). Its Star-Tree indexes pre-aggregate multidimensional cubes during real-time Kafka ingestion, answering filtered metric queries in sub-20ms under high concurrency without scanning raw event rows.*"

---

### Interviewer Trap Questions & Battle-Tested Rebuttals

#### Trap 1: *"Why did companies like Uber and GitHub choose MySQL over PostgreSQL?"*
*   **The Trap:** Checking if you understand the deep operational realities of secondary index write amplification and replication modes.
*   **The High-Scoring Response:**
    > *"Uber and GitHub chose MySQL over PostgreSQL primarily due to **secondary index write amplification, replication bandwidth, and connection scaling**:
    > 1. In Postgres, tables are heap files. When a row is updated, if it doesn't fit on the same page, all secondary indexes must receive a new entry pointing to the new tuple offset (`TID`). In wide tables with 10+ secondary indexes, this creates massive disk write amplification. In MySQL InnoDB, secondary indexes store the Primary Key; updating non-indexed columns touches zero secondary indexes.
    > 2. Postgres physical WAL replication streams 8KB dirty disk pages, saturating cross-datacenter WAN links during page splits. MySQL logical row-based binlogs stream only tiny row deltas, saving over 90% bandwidth.
    > 3. MySQL's lightweight thread-per-connection handles thousands of client connections natively, whereas Postgres forks an OS process per connection, mandating external connection poolers like PgBouncer."*

#### Trap 2: *"Why not just shard MySQL or PostgreSQL instead of introducing Cassandra or CockroachDB?"*
*   **The Trap:** Interviewers test whether you understand the operational complexity and query limitations of manual application-level sharding.
*   **The High-Scoring Response:**
    > *"Sharding an RDBMS provides excellent single-shard latency, but it pushes enormous complexity into the application layer or proxy. Once sharded, cross-shard joins become impossible without scatter-gather queries, cross-shard distributed transactions require a slow and fragile application 2-Phase Commit (2PC), and live re-sharding (splitting shards when a node fills up) requires dual-writing and complex data backfilling. If our data access naturally requires cross-entity transactions or dynamic range rebalancing, a native distributed database like CockroachDB handles range splitting and consensus under the hood, significantly reducing application failure modes."*

#### Trap 2: *"What happens when your DynamoDB Partition Key encounters a celebrity hot spot?"*
*   **The Trap:** Probing whether you know the internal partition limits of DynamoDB.
*   **The High-Scoring Response:**
    > *"DynamoDB hard-caps each individual physical partition at 1,000 WCUs and 3,000 RCUs. If a celebrity user (like Justin Bieber) posts an update, millions of reads and writes targeting `PK = user_id` will immediately trigger `ProvisionedThroughputExceededException`. To defend against this, we apply two strategies:
    > 1. **Write Sharding (Salting):** We append an integer suffix to the partition key (`user_id#1`, `user_id#2` up to `user_id#N`) generated uniformly at random, scattering the writes across $N$ distinct physical partitions.
    > 2. **Read Ingress Caching:** For read hotspots, we place an in-memory caching layer (**DAX** or **Redis**) in front of DynamoDB to absorb point reads before they hit the storage partition."*

#### Trap 3: *"Why not just use MongoDB for everything? It has flexible schemas and supports ACID transactions now."*
*   **The Trap:** Testing if you fall for marketing claims versus production realities.
*   **The High-Scoring Response:**
    > *"While MongoDB added multi-document ACID transactions in version 4.0, its distributed transactions incur severe latency penalties because they execute via two-phase commits across replica sets and hold locks in the WiredTiger storage engine, creating write stalls. Furthermore, 'flexible schema' in high-scale systems is often an anti-pattern: without schema enforcement at the database layer, data corruption and backward-compatibility bugs are simply pushed into application code. For core relational entities with fixed invariants (like Orders and Payments), PostgreSQL’s strict schemas and battle-tested MVCC engine offer far higher write throughput and deterministic query plans."*

#### Trap 4: *"Can DynamoDB perform range queries across different partition keys?"*
*   **The Trap:** A technical trick question to see if you know DynamoDB's API constraints.
*   **The High-Scoring Response:**
    > *"No. The DynamoDB `Query` API strictly requires an equality condition on a **single** Partition Key; range conditions (such as `BETWEEN` or `begins_with`) can only be applied to the **Sort Key** within that specific partition. Attempting to query ranges across different partition keys forces a full table `Scan`, which reads every single partition sequentially, resulting in massive RCU consumption, high latency, and table throttling. If cross-partition range queries are a primary access pattern, we must either design a **Global Secondary Index (GSI)** with a synthetic coarse-grained partition key (e.g., date bucket `2026-10-21`), or use an LSM-based engine like Cassandra or a distributed SQL engine."*

---

## 5. System Design Mapping: Where These Databases Live in Real Architectures

Below is the definitive cross-reference mapping how these database choices are applied across the systems in this repository:

| Chapter / Architecture | Primary Database Selected | Specific Justification & Pattern |
| :--- | :--- | :--- |
| [**04. Rate Limiter**](file:///Users/abhinnaagarwal/Documents/system-design-notes/04.%20Rate%20Limiter/README.md) | **Redis / Valkey** | In-memory atomic token bucket / sliding window counters using Lua scripts. |
| [**06. Key-Value Store**](file:///Users/abhinnaagarwal/Documents/system-design-notes/06.%20Key-Value%20Store/README.md) | **SSTable / LSM-Tree Engine** | Custom distributed Dynamo-style KV store with consistent hash ring and vector clocks. |
| [**07. Unique-Id Generator**](file:///Users/abhinnaagarwal/Documents/system-design-notes/07.%20Unique-Id%20Generator/README.md) | **No Database (Snowflake) or MySQL Ticket Server** | Snowflake avoids DB locks; Ticket Server uses MySQL `REPLACE INTO` for centralized IDs. |
| [**12. Chat System**](file:///Users/abhinnaagarwal/Documents/system-design-notes/12.%20Chat%20System/README.md) | **Cassandra / HBase** | Massive append-only message history; sequential range scans by timestamp per channel. |
| [**16. Proximity Service**](file:///Users/abhinnaagarwal/Documents/system-design-notes/16.%20Proximity%20Service/README.md) | **PostgreSQL (PostGIS) or Redis Geo / Geospatial Index** | R-Tree / Geohash / S2 Cell spatial lookups for bounding-box coordinates. |
| [**20. Metrics Monitoring**](file:///Users/abhinnaagarwal/Documents/system-design-notes/20.%20Metrics%20Monitoring%20and%20Alerting%20System/README.md) | **OpenTSDB / InfluxDB / TimescaleDB** | Time-series metrics with Gorilla compression, rollup aggregations, and high write ingestion. |
| [**22. Hotel Reservation**](file:///Users/abhinnaagarwal/Documents/system-design-notes/22.%20Hotel%20Reservation%20System/README.md) | **PostgreSQL (with Pessimistic/Optimistic Locking)** | Strict transactional guarantees to prevent overbooking rooms across dates. |
| [**24. S3-like Object Storage**](file:///Users/abhinnaagarwal/Documents/system-design-notes/24.%20S3-like%20Object%20Storage/README.md) | **PostgreSQL / Cassandra (Metadata) + Raw File Store (Data)** | Separates high-frequency metadata queries from multi-part immutable blob chunks. |
| [**25. Real-time Leaderboard**](file:///Users/abhinnaagarwal/Documents/system-design-notes/25.%20Real-time%20Gaming%20Leaderboard/README.md) | **Redis Sorted Sets (ZSET)** | In-memory SkipList maintains $O(\log N)$ real-time rank updates and range extractions. |
| [**26. Payment System**](file:///Users/abhinnaagarwal/Documents/system-design-notes/26.%20Payment%20System/README.md) | **PostgreSQL (Double-Entry Ledger)** | Serializable ACID transactions, immutable append-only ledger rows, idempotency keys. |
| [**27. Digital Wallet**](file:///Users/abhinnaagarwal/Documents/system-design-notes/27.%20%20Digital%20Wallet/README.md) | **PostgreSQL / CockroachDB** | Strict balance invariants: total debits must equal total credits at all times. |

---

### Cross-Repository Deep Dive Links
*   PostgreSQL Internals: [`coding-practice: storage/postgres.md`](file:///Users/abhinnaagarwal/Documents/coding-practice/systems-engineering/storage/postgres.md)
*   Cassandra Architecture: [`coding-practice: storage/cassandra.md`](file:///Users/abhinnaagarwal/Documents/coding-practice/systems-engineering/storage/cassandra.md)
*   LSM-Trees & Compaction: [`coding-practice: data-structures/lsm-trees.md`](file:///Users/abhinnaagarwal/Documents/coding-practice/systems-engineering/data-structures/lsm-trees.md)
*   RocksDB Internals: [`coding-practice: data-structures/rocksdb.md`](file:///Users/abhinnaagarwal/Documents/coding-practice/systems-engineering/data-structures/rocksdb.md)
*   Data Modeling Playbook: [`coding-practice: data-modeling/data-modeling-interview-playbook.md`](file:///Users/abhinnaagarwal/Documents/coding-practice/systems-engineering/data-modeling/data-modeling-interview-playbook.md)
*   Cassandra Core Concept: [`Core Concepts/Cassandra/README.md`](file:///Users/abhinnaagarwal/Documents/system-design-notes/Core%20Concepts/Cassandra/README.md)
*   CockroachDB Core Concept: [`Core Concepts/CockroachDB/README.md`](file:///Users/abhinnaagarwal/Documents/system-design-notes/Core%20Concepts/CockroachDB/README.md)
*   DynamoDB Core Concept: [`Core Concepts/DynamoDB/README.md`](file:///Users/abhinnaagarwal/Documents/system-design-notes/Core%20Concepts/DynamoDB/README.md)
