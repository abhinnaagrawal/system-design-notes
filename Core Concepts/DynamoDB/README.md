# Amazon DynamoDB Deep Dive

**Source:** [DynamoDB Deep Dive w/ Ex-Meta Staff Engineer (Hello Interview)](https://www.youtube.com/watch?v=2X2SO3Y-af8) | [Hello Interview Written Guide](https://www.hellointerview.com/learn/system-design/deep-dives/dynamodb)

**TL;DR:** Amazon DynamoDB is a fully managed, serverless NoSQL key-value and document database engineered for single-digit millisecond latency at any scale. It abstracts away server provisioning, sharding, and cluster management through automatic horizontal partition splitting (triggered at 10 GB storage or 1,000 WCU / 3,000 RCU per partition) and multi-AZ Paxos-based replication. In system design interviews, alongside PostgreSQL, DynamoDB is the premier choice for scalable persistence layers with predictable, query-driven access patterns.

---

## 1. Core Data Model & Hierarchy

DynamoDB organizes data into a 3-level hierarchy:

```mermaid
graph TD
    T["<b>Table</b><br/>(Collection of items, Primary Key definition, Secondary Indexes)"]
    I["<b>Item</b><br/>(Single record, max 400 KB, uniquely identified by Primary Key)"]
    A["<b>Attributes</b><br/>(Key-Value pairs: String, Number, Boolean, Binary, List, Map, Set)"]

    T --> I
    I --> A
```

1.  **Table:** A collection of items. Unlike relational tables, DynamoDB tables are **schema-less** (except for the primary key). Items in the same table can have completely different attributes.
2.  **Item:** A single record (equivalent to a row in SQL). Each item has a mandatory Primary Key and a hard size limit of **400 KB** (including attribute names and values).
3.  **Attributes:** Named data fields (equivalent to columns). Supports:
    *   *Scalar types:* String, Number, Binary, Boolean, Null.
    *   *Document types:* List (ordered arrays), Map (nested JSON objects).
    *   *Set types:* String Set, Number Set, Binary Set.

### Schema-less Flexibility vs. Trade-offs
*   **Pros:** Fast iterations, zero database migrations, no downtime for schema changes, and zero storage overhead for absent fields (no empty `NULL` cells taking space).
*   **Cons / Trade-offs:** The application layer must strictly enforce data integrity, schema validation, and handle missing attributes.

---

## 2. Primary Key Anatomy: Partition Key vs. Sort Key

Every DynamoDB table must have a Primary Key that uniquely identifies each item. There are two types of primary keys:

```mermaid
classDiagram
    class PrimaryKey {
        <<Interface>>
    }
    class SimplePrimaryKey {
        +Partition Key (Hash Key)
        Determines physical partition via Consistent Hashing
        1-to-1 item lookup (O(1))
    }
    class CompositePrimaryKey {
        +Partition Key (Hash Key): Physical partition
        +Sort Key (Range Key): Sorted B-Tree order inside partition
        1-to-Many hierarchical relationship
    }
    PrimaryKey <|-- SimplePrimaryKey
    PrimaryKey <|-- CompositePrimaryKey
```

### A. Simple Primary Key (Partition Key Only)
*   Consists of a single attribute: the **Partition Key (PK)** (also called the *Hash Key*).
*   DynamoDB hashes the PK using an internal hash function to determine the physical storage partition.
*   **Uniqueness:** No two items can have the same Partition Key.
*   *Example:* `users` table with `PK = user_id`.

### B. Composite Primary Key (Partition Key + Sort Key)
*   Consists of two attributes: a **Partition Key (PK)** and a **Sort Key (SK)** (also called the *Range Key*).
*   **Physical Collocation:** All items with the same PK are stored together on the same physical partition.
*   **Logical Ordering:** Within that physical partition, items are ordered in a **B-Tree index** sorted by the Sort Key.
*   **Uniqueness:** The combination of `(PK, SK)` must be globally unique. Multiple items can share the same PK as long as their SKs differ.
*   *Example:* `chat_messages` table with `PK = chat_id` and `SK = message_id`.

```mermaid
flowchart TD
    subgraph Partition_Chat101["Physical Storage Partition (chat_id = 101)"]
        direction TB
        BTree["<b>In-Memory B-Tree Index (Sorted by Sort Key)</b>"]
        Item1["SK: msg_001 | Text: 'Hello!' | Sender: user_A"]
        Item2["SK: msg_002 | Text: 'Hey there' | Sender: user_B"]
        Item3["SK: msg_003 | Text: 'Meeting at 3?' | Sender: user_A"]
        
        BTree --> Item1
        BTree --> Item2
        BTree --> Item3
    end
```

### 💡 Pro Tip: Monotonically Increasing IDs vs. Timestamps
In a chat or order history table, you want items ordered chronologically. A naive instinct is to use `created_at` (a millisecond timestamp) as the Sort Key.
*   **The Trap:** Timestamps are **not guaranteed to be unique**. If two users post in the same chat within the same millisecond, the second write will overwrite the first, causing silent data loss!
*   **The Solution:** Use **Monotonically Increasing IDs** (such as Twitter Snowflake IDs, ULIDs, or KSUIDs). These 64-bit IDs embed a timestamp at the front (guaranteeing chronological sort order) combined with machine/sequence bits at the back (guaranteeing 100% collision-free uniqueness).

---

### C. The Range Query Dilemma: Can DynamoDB do Range Queries like CockroachDB?

A frequent senior/staff interview question is: *"Can DynamoDB perform range queries across the table like CockroachDB, PostgreSQL, or Spanner?"*

The short answer is **no, not globally across the entire table**. 

```mermaid
flowchart TD
    subgraph Cockroach["CockroachDB: Range-Based Partitioning (Globally Ordered)"]
        direction LR
        CR1["<b>Range 1 [000 - 100)</b><br/>Node A"] --> CR2["<b>Range 2 [100 - 200)</b><br/>Node B"] --> CR3["<b>Range 3 [200 - 300)</b><br/>Node C"]
        CQuery["Query: BETWEEN 50 AND 250<br/>⚡ Sequential seek & multi-range scan"] -.-> CR1 & CR2 & CR3
    end

    subgraph Dynamo["DynamoDB: Hash-Based Partitioning (Consistent Hashing)"]
        direction LR
        DP1["<b>Partition 1</b><br/>Hash: 0x00... - 0x55...<br/>user_102, user_891"] 
        DP2["<b>Partition 2</b><br/>Hash: 0x55... - 0xAA...<br/>user_100, user_304"]
        DP3["<b>Partition 3</b><br/>Hash: 0xAA... - 0xFF...<br/>user_101, user_502"]
        DQuery["Query: user_id BETWEEN 100 AND 102<br/>❌ Impossible via Query! Must Scan ALL partitions"]
    end
```

#### 1. The Architectural Root Cause: Hash vs. Range Partitioning
* **CockroachDB (Range Partitioning):** Organizes the entire database into a monolithic, lexicographically ordered key-value keyspace, split into contiguous **64MB Ranges**. A query like `WHERE user_id BETWEEN 100 AND 200` maps to an indexed seek in the Range descriptor tree and a sequential forward iterator scan across ranges in Pebble (its LSM engine).
* **DynamoDB (Hash Partitioning):** Calculates an internal hash (MD5) of the **Partition Key (PK)** to assign items to physical storage partitions. **Hashing deliberately destroys global ordering** to evenly disperse writes. Consequently, `user_100`, `user_101`, and `user_102` are scattered across completely different physical storage nodes. DynamoDB physically cannot seek across multiple partition keys in a range.

#### 2. How DynamoDB DOES Support Range Queries: Scoped to a Single Partition
DynamoDB supports range queries **strictly when scoped to an exact Partition Key** via the **Sort Key (SK)**:
* **The Equality Rule:** The `Query` API requires an exact equality condition on the Partition Key (`PK = 'chat_101'`).
* **The Local Range:** All items sharing that `PK` reside on the exact same physical storage partition, indexed in a local **B-Tree ordered by the Sort Key**.
* **Supported Range Operators on the Sort Key:**
  `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `begins_with()`

```python
# ✅ VALID DynamoDB Query: Scoped to a single partition
response = table.query(
    KeyConditionExpression=Key('chat_id').eq('room_99') & Key('timestamp').between('2026-10-17T10:00:00', '2026-10-17T10:05:00')
)

# ❌ INVALID DynamoDB Query: Attempting a range scan on the Partition Key
# DynamoDB will reject this call; .between() is NOT supported on Partition Keys!
response = table.query(
    KeyConditionExpression=Key('chat_id').between('room_01', 'room_50')
)
```

#### 3. What Happens If You Force a Global Range Query? (`Query` vs. `Scan`)
If an application requires querying across multiple partition keys without knowing their exact values (e.g., *"Find all orders created between 2 PM and 4 PM across all users"*), DynamoDB forces you to use the **`Scan` API**:

| Metric | `Query` API | `Scan` API |
| :--- | :--- | :--- |
| **Partition Target** | Targets **exactly 1 physical partition** via `PK = X` | Reads **every single partition** across the entire cluster |
| **Data Evaluated** | Only inspects matching items within the Sort Key range | Inspects **100% of all items** in the table, then filters in memory |
| **RCU Cost** | Consumes Read Units only for the matched items | **Consumes Read Units for the entire table volume** |
| **Latency** | 2–5 ms (Single-digit ms) | Seconds to minutes (scales linearly with total table size $O(N)$) |
| **Production Risk** | Safe at any scale | **Severe:** Can throttle production writes/reads by saturating partition read quotas |

#### 4. The Cassandra Connection: Clustering Key vs. Sort Key
Cassandra’s **Clustering Key** is the direct architectural equivalent of DynamoDB’s **Sort Key**:

$$\text{PRIMARY KEY} = (\underbrace{\text{Partition Key}}_{\text{Hash on Token Ring: Murmur3}}) + [\underbrace{\text{Clustering Key(s)}}_{\text{Sorted on-disk in SSTables}}]$$

Both systems make the identical architectural trade-off: **Hash at the cluster level (zero write hotspots), but Sort at the local partition level.**

However, Cassandra's Clustering Key offers distinct capabilities compared to DynamoDB:
1. **Multi-Column Clustering Keys:** Cassandra allows compound clustering keys (e.g., `PRIMARY KEY (tenant_id, year, month, day, event_id)`), giving multi-level hierarchical range queries. DynamoDB allows only **one single Sort Key attribute** (requiring application developers to manually concatenate strings like `2026#10#17#event_01`).
2. **Explicit Storage Order:** Cassandra allows specifying on-disk physical sort direction:
   `WITH CLUSTERING ORDER BY (created_at DESC)`
   This optimizes reverse-chronological feeds so newest items are read forward sequentially off disk. DynamoDB physically stores items ascending, requiring `ScanIndexForward=False` for reverse traversal.
3. **The Global Range Penalty in Cassandra (`ALLOW FILTERING`):**
   Attempting a cross-partition range scan in Cassandra (`SELECT * FROM users WHERE user_id >= 100 AND user_id <= 200`) is prohibited unless you append `ALLOW FILTERING`. Doing so triggers a cluster-wide scatter-gather across all nodes, frequently causing Java GC pauses and JVM Out-Of-Memory (`OOMKilled`) crashes.
4. **Why Cassandra Dropped `ByteOrderedPartitioner` (BOP):**
   Early Cassandra offered a range-partitioner (`ByteOrderedPartitioner`) that preserved lexicographical order across the cluster. It was abandoned because of **catastrophic write hotspotting**: sequential timestamps or IDs caused 100% of writes to hammer the single node holding the active range, leaving the rest of the cluster idle.

#### 5. Architectural 3-Way Comparison Matrix

| Architectural Dimension | Amazon DynamoDB | Apache Cassandra | CockroachDB (Distributed SQL) |
| :--- | :--- | :--- | :--- |
| **Cluster Partitioning** | **Hash-Based** (Consistent Hashing) | **Hash-Based** (Murmur3 Token Ring) | **Range-Based** (64MB Contiguous Ranges) |
| **Global Table Range Scans** | ❌ **No** (Dangerous `Scan` API) | ❌ **No** (Dangerous `ALLOW FILTERING`) | ✅ **Yes** (Native SQL multi-range scan) |
| **Single-Partition Range Scans** | ✅ **Yes** (via Sort Key) | ✅ **Yes** (via Clustering Key) | ✅ **Yes** (Standard indexed seek) |
| **Multi-Column Range Keys** | ❌ **No** (Only 1 Sort Key allowed) | ✅ **Yes** (Compound clustering keys) | ✅ **Yes** (Any composite B-Tree index) |
| **On-Disk Sort Direction** | Fixed (ASC only) | Configurable (`ASC` or `DESC`) | Configurable per index column |
| **Write Hotspot on Timestamps** | 🟢 **Low** (Hashing spreads writes evenly) | 🟢 **Low** (Murmur3 scatters writes) | 🔴 **High** (Sequential writes hammer rightmost range) |
| **Cross-Entity Joins & ACID** | ❌ No joins; Partition-level ACID | ❌ No joins; Row-level LWW | ✅ Full relational joins; Serializable ACID |

#### 6. Production Workarounds in DynamoDB for Cross-Entity Range Queries
If an interview requires range queries across multiple entities in DynamoDB, propose these production patterns:
1. **Synthetic Time-Bucketing:** Suffix the Partition Key with a coarse time window (e.g., `PK = "ORDERS#2026-10-17-10"`, `SK = timestamp#order_id`). The application queries that single bucket, or issues parallel scatter-gather queries across adjacent hour buckets.
2. **GSI with Sharded Buckets:** Create a Global Secondary Index where `GSI_PK = "ORDERS_BUCKET_" + (order_id % 10)` and `GSI_SK = timestamp`. Querying a time range executes 10 parallel queries across the 10 buckets.
3. **Dual-Engine Pattern (CQRS):** Write to DynamoDB for fast OLTP key-value mutations, and stream events via **DynamoDB Streams** to **OpenSearch / Elasticsearch**, which builds inverted B-tree/BKD indexes designed for multi-attribute range filtering.

---

## 3. Secondary Indexes: GSI vs. LSI (Deep Dive)

When you need to query attributes outside your primary key, DynamoDB provides two types of secondary indexes. Understanding the deep mechanical differences between them is a classic senior/staff interview requirement.

```mermaid
flowchart TD
    subgraph GSI_Flow["Global Secondary Index (GSI)"]
        direction TB
        GSI_Base["Base Table<br/>PK: chat_id | SK: message_id"]
        GSI_Async["Asynchronous Replication (CDC)"]
        GSI_Index["GSI Storage (Separate Partitions)<br/>PK: sender_id | SK: message_id"]
        GSI_Base --> GSI_Async --> GSI_Index
    end

    subgraph LSI_Flow["Local Secondary Index (LSI)"]
        direction TB
        LSI_Base["Base Table<br/>PK: chat_id | SK: message_id"]
        LSI_Local["Synchronous Local Write"]
        LSI_Index["LSI Storage (Same Partition)<br/>PK: chat_id | SK: attachment_count"]
        LSI_Base --> LSI_Local --> LSI_Index
    end
```

### Detailed Mechanical Comparison Matrix

| Feature | Global Secondary Index (GSI) | Local Secondary Index (LSI) |
| :--- | :--- | :--- |
| **Partition Key** | Can be **different** from the base table | **Must be identical** to base table PK |
| **Sort Key** | Can be different or omitted | **Must be different** from base table SK |
| **Physical Storage** | Stored on **completely separate physical partitions** | Stored on the **same physical partition** as base item |
| **Creation Time** | Can be created or deleted **at any time** | **Must be created at table creation time** (never after) |
| **Consistency Mode** | **Eventually Consistent only** (asynchronously updated) | Supports **Strongly Consistent** or Eventually Consistent |
| **Partition Size Limit**| **Unlimited** (auto-scales across partitions) | **Strict 10 GB limit** on all items with the same PK |
| **Capacity Units** | Has its **own dedicated RCU / WCU** pool | Consumes **base table's RCU / WCU** pool |
| **Throttling Impact** | If GSI write capacity is throttled, it **backpressures and stalls base table writes**! | Throttles base table directly |

### Attribute Projections (Storage vs. Compute Trade-off)
When defining an index, you choose which attributes to copy ("project") into the index:
1.  `KEYS_ONLY`: Only copies PK and SK. Minimal storage cost, but reading other attributes requires an expensive follow-up `GetItem` fetch on the base table.
2.  `INCLUDE`: Copies PK, SK, and a specific whitelist of attributes needed by the query. **(Recommended sweet spot for interviews)**.
3.  `ALL`: Copies all attributes from the base table. Highest storage cost, but completely eliminates secondary fetches.

---

## 4. Querying & Access Patterns: Query vs. Scan

DynamoDB does not use arbitrary SQL. It provides two core read operations:

```mermaid
flowchart LR
    subgraph QueryOp["Query Operation (Fast & Targeted)"]
        direction TB
        Q_In["Partition Key = 'chat_101'<br/>Sort Key BETWEEN 'msg_10' AND 'msg_20'"]
        Q_Target["Direct Hash to Single Partition"]
        Q_Seek["Sequential B-Tree Range Seek"]
        Q_Out["Returns Target Slice (Low RCU Cost)"]
        Q_In --> Q_Target --> Q_Seek --> Q_Out
    end

    subgraph ScanOp["Scan Operation (Dangerous Anti-Pattern)"]
        direction TB
        S_In["Filter: sender_id = 'user_A'"]
        S_All["Full Scan of EVERY Partition in Table"]
        S_Filter["In-Memory Post-Filter"]
        S_Out["Returns Matches (Massive RCU Burn)"]
        S_In --> S_All --> S_Filter --> S_Out
    end
```

### A. The Query Operation (Single Partition, $O(\log N)$)
*   **Mandatory:** Must specify an exact match on the **Partition Key** (`PK = :val`).
*   **Optional:** Can apply comparison operators on the **Sort Key** (`=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `begins_with`).
*   **Sorting Control:** Uses the boolean parameter `ScanIndexForward`:
    *   `ScanIndexForward = true` (default): Ascending sort order.
    *   `ScanIndexForward = false`: Descending sort order (critical for fetching most recent feeds or chats).
*   **Efficiency:** Highly optimized; reads only contiguous items within a single physical partition.

### B. The Scan Operation (Table-Wide, $O(N)$)
*   Examines **every single item across every single partition** in the entire table, and then applies a filter expression to discard non-matching rows.
*   **RCU Impact:** You are billed for reading the entire dataset *before* the filter is applied!
*   **Interview Verdict:** **Never propose a Scan in a system design interview** for user-facing API paths. Scans are reserved strictly for background ETL batch exports.

### C. PartiQL (SQL-Compatible Interface)
DynamoDB supports **PartiQL**, a declarative SQL dialect:
```sql
SELECT * FROM users WHERE user_id = 101;
SELECT * FROM orders WHERE user_id = 101 AND order_date >= '2024-01-01';
```
*Under the hood, PartiQL maps directly to the underlying DynamoDB `Query` or `Scan` API calls. It provides syntactic familiarity, not relational joins.*

---

## 5. Architecture & Scalability (Under the Hood)

```mermaid
flowchart TD
    Client[Client Request] --> RR[Stateless Request Routers]
    
    subgraph HashRing["Consistent Hashing Ring"]
        RR -->|MD5 Hash of PK| P1["Partition 1 (Tokens: 0 - 33M)"]
        RR -->|MD5 Hash of PK| P2["Partition 2 (Tokens: 33M - 66M)"]
        RR -->|MD5 Hash of PK| P3["Partition 3 (Tokens: 66M - 100M)"]
    end

    subgraph ReplicationGroup["Partition 1 Paxos Group (Multi-AZ)"]
        direction LR
        Leader["<b>Leader (AZ-1)</b><br/>Accepts Writes<br/>Replicates via Paxos"]
        Follower1["<b>Follower (AZ-2)</b><br/>Serves Eventual Reads"]
        Follower2["<b>Follower (AZ-3)</b><br/>Serves Eventual Reads"]
        
        Leader <-->|Multi-Paxos Sync| Follower1
        Leader <-->|Multi-Paxos Sync| Follower2
    end

    P1 --- ReplicationGroup
```

### A. The Request Router Layer
*   Stateless fleet of front-end machines.
*   Maintains a cached routing table (partition map). When a query arrives, the router hashes the Partition Key (using MD5), looks up the owning physical storage partition, and forwards the request directly to the storage node.

### B. Storage Partition Hard Limits
Each physical storage partition in DynamoDB is governed by strict physical hardware boundaries:
*   **Storage Capacity:** Max **10 GB** of data per partition.
*   **Write Throughput:** Max **1,000 WCUs** (1 MB/sec) per partition.
*   **Read Throughput:** Max **3,000 RCUs** (12 MB/sec) per partition.

### C. Auto-Partition Splitting
DynamoDB scales horizontally by automatically splitting partitions without downtime when either of two triggers occurs:
1.  **Size-based Split:** The total data stored on a partition approaches 10 GB.
2.  **Throughput-based Split:** Read or write traffic on a partition exceeds 1,000 WCU or 3,000 RCU.

When a split occurs, DynamoDB allocates two new physical partitions, divides the token range in half, and balances items across them.

```mermaid
flowchart TD
    OldP["Partition A<br/>Tokens: 0 - 100M<br/>Size: 10 GB (FULL)"]
    Split["<b>Automatic Partition Split</b><br/>Allocates 2 New Partitions"]
    NewP1["Child Partition A1<br/>Tokens: 0 - 50M<br/>Size: 5 GB | 1,000 WCU / 3,000 RCU"]
    NewP2["Child Partition A2<br/>Tokens: 50M - 100M<br/>Size: 5 GB | 1,000 WCU / 3,000 RCU"]

    OldP --> Split --> NewP1
    Split --> NewP2
```

### D. Multi-AZ Replication & Paxos Consensus
*   Every partition maintains **3 replicas** distributed across **three distinct Availability Zones (AZs)** within an AWS Region.
*   **Multi-Paxos Leader:** A single replica acts as the Paxos **Leader**; the other two act as **Followers**.
*   **Write Flow:**
    1. Writes always route to the Paxos Leader.
    2. The Leader writes to its local Write-Ahead Log (WAL) and synchronously sends the log entry to its followers.
    3. As soon as a **Paxos Quorum (2 out of 3 replicas)** confirms the write, the Leader responds with success to the client.
*   **Read Flow (Consistency Modes):**
    *   **Eventually Consistent Read (Default):** Can be served by *any* of the 3 replicas. Extremely fast and costs half the capacity (0.5 RCU per 4KB), but may return slightly stale data if read from a follower still catching up.
    *   **Strongly Consistent Read:** Always routed to the **Paxos Leader**. Guarantees reading the most up-to-date state. Costs 1 full RCU per 4KB.

### E. Storage Engine Mechanics: Why DynamoDB Uses SSD B-Trees Instead of Memtables/LSM-Trees

A common misconception is assuming DynamoDB uses a Log-Structured Merge-Tree (LSM-Tree) like Apache Cassandra or Google Bigtable. Under the hood, **DynamoDB storage nodes maintain an SSD-optimized B-Tree (or B+ Tree variant) engine for each storage partition**.

```mermaid
flowchart TD
    subgraph DynamoDB_Engine ["DynamoDB Storage Node (SSD B-Tree)"]
        direction TB
        subgraph Partition_BTree ["B-Tree Index per Partition (Ordered by Sort Key)"]
            Root["B-Tree Root Node"] --> Branch1["Internal Branch Page"]
            Root --> Branch2["Internal Branch Page"]
            Branch1 --> Leaf1["Leaf Page [SK: 001 - 100]"]
            Branch1 --> Leaf2["Leaf Page [SK: 101 - 200]"]
            Branch2 --> Leaf3["Leaf Page [SK: 201 - 300]"]
        end
        
        WriteOp["Incoming Item Mutation"] --> WAL["1. Paxos Consensus WAL Log"]
        WAL --> InPlace["2. In-Place Leaf Page Mutation on NVMe SSD"]
    end
```

#### 1. How the B-Tree Powers Sort Key Range Queries
* Inside each physical storage partition (up to 10GB), items that share the same Partition Key (PK) are indexed and ordered by their **Sort Key (SK)** in an on-disk B-Tree structure.
* **Point Reads (`GetItem`):** Follows standard B-Tree root-to-leaf traversal ($O(\log N)$) requiring at most 1 to 3 page reads on NVMe SSD.
* **Range Queries (`Query` with `BETWEEN` / `begins_with`):** Traverses down the B-Tree to find the leaf page holding the starting Sort Key, then sequentially scans adjacent linked leaf pages until the range condition terminates.

#### 2. The Architectural Rationale: Why AWS Avoided LSM-Trees for DynamoDB
Why did AWS choose an in-place mutating B-Tree over an append-only LSM-Tree (Memtable + SSTables)?
1. **The Multi-Tenant Cloud Guarantee:** DynamoDB is a shared, multi-tenant cloud service where thousands of different customer partitions reside on the same physical storage machine.
2. **Eliminating the "Compaction Storm" (Noisy Neighbors):**
   * In an LSM-Tree (like Cassandra), writes and deletes are appended to memory (Memtable) and flushed as immutable SSTables. To clean up old versions and tombstones, the database runs continuous background **Compaction**.
   * Compaction is heavily CPU- and disk-I/O intensive. If Tenant A ran a massive delete job on an LSM engine, the resulting compaction storm would saturate the server's SSD I/O, **causing severe P99 latency spikes for Tenant B on the same physical host**.
3. **Flat, Deterministic P99 Latency:** B-Trees mutate pages in-place. Because there are no background compactions merging multiple SSTables, DynamoDB can guarantee flat, predictable single-digit millisecond P99 response times for every tenant.
4. **Instant Space Reclamation (No Tombstones):** When an item is deleted in DynamoDB, it is directly unlinked and freed from the B-Tree leaf page. In contrast to Cassandra's "tombstone accumulation," DynamoDB deletes do not degrade future read performance.

---

## 6. Capacity Planning & Cost Mechanics (RCUs & WCUs)

In system design interviews, demonstrating that you can calculate capacity units for back-of-the-envelope estimations separates mid-level from senior/staff candidates.

### Capacity Unit Definitions
*   **1 Read Capacity Unit (RCU):**
    *   **1 Strongly Consistent Read** per second for an item up to **4 KB**.
    *   **2 Eventually Consistent Reads** per second for an item up to **4 KB** (0.5 RCU each).
    *   **0.5 Transactional Reads** per second (2 RCUs per 4 KB).
*   **1 Write Capacity Unit (WCU):**
    *   **1 Write** per second for an item up to **1 KB**.
    *   **0.5 Transactional Writes** per second (2 WCUs per 1 KB).

### Estimation Formulas

$$\text{WCU} = \text{Writes/sec} \times \lceil \text{Item Size in KB} \rceil$$

$$\text{RCU (Strongly Consistent)} = \text{Reads/sec} \times \left\lceil \frac{\text{Item Size in KB}}{4} \right\rceil$$

$$\text{RCU (Eventually Consistent)} = \frac{\text{Reads/sec}}{2} \times \left\lceil \frac{\text{Item Size in KB}}{4} \right\rceil$$

> [!IMPORTANT]
> **Ceiling Rounding Rule:** DynamoDB always rounds item size **up** to the nearest unit boundary:
> * Writing a 200-byte item consumes **1 full WCU**.
> * Writing a 1.2 KB item rounds up to 2 KB $\to$ consumes **2 WCUs**.
> * Reading a 5 KB item with Strong Consistency rounds up to 8 KB $\to$ consumes **2 RCUs**.

---

## 7. Advanced Features

### A. DAX (DynamoDB Accelerator)
*   A purpose-built, fully managed, **in-memory write-through/read-through cache** sitting directly in front of DynamoDB.
*   **Performance:** Drops read latency from single-digit milliseconds ($\sim 3\text{--}8\text{ ms}$) down to **sub-millisecond microseconds ($\sim 200\text{--}400\text{ }\mu\text{s}$)**.
*   **Dual Caches:**
    1.  *Item Cache:* Caches individual items for `GetItem` / `BatchGetItem`.
    2.  *Query Cache:* Caches collections of items and query parameters for `Query` / `Scan`.
*   **Write-Through Invalidation:** Writes made through the DAX client update both the cache and DynamoDB simultaneously.
*   **Interview Nuances:**
    *   *Do NOT propose Redis/Memcached if already using DynamoDB.* Propose DAX instead to avoid introducing a separate external database cluster to manage.
    *   *Strong Consistency Caveat:* DAX **only caches eventually consistent reads**. Strongly consistent read requests pass straight through to DynamoDB without being cached.

```mermaid
flowchart LR
    App["Application"] -->|DAX Client SDK| DAX["DAX Cluster (In-Memory)"]
    DAX -->|Cache Hit (Microseconds)| App
    DAX -->|Cache Miss / Write-Through| DDB[(DynamoDB Storage)]
```

### B. DynamoDB Streams (Change Data Capture - CDC)
*   Maintains a time-ordered, guaranteed 24-hour log of item-level modifications (inserts, updates, deletes).
*   **Stream Record Views:** Can emit `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, or `NEW_AND_OLD_IMAGES`.
*   **Canonical Interview Pattern:** Pair DynamoDB Streams with **AWS Lambda** for event-driven asynchronous processing:
    1.  *Full-Text Search Sync:* Replicating DynamoDB updates to **Elasticsearch / OpenSearch**.
    2.  *Cache Invalidation:* Purging edge caches on row mutation.
    3.  *Cross-Store Consistency:* Emitting domain events into Kafka or EventBridge.

```mermaid
flowchart LR
    DDB[(DynamoDB Table)] -->|Streams CDC| Stream[DynamoDB Stream]
    Stream -->|Triggers| Lambda[AWS Lambda Consumer]
    Lambda -->|Sync Update| ES[(Elasticsearch / OpenSearch)]
    Lambda -->|Publish Event| Kafka[Kafka / EventBridge]
```

### C. ACID Transactions (`TransactWriteItems`, `TransactGetItems`)
*   Provides all-or-nothing atomicity across **up to 100 items or 4 MB of data** spanning multiple tables within the same AWS account and region.
*   Uses a **Two-Phase Commit (2PC)** protocol under the hood.
*   **Capacity Cost:** Consumes **$2\times$ the WCUs and RCUs** (1 write prep phase + 1 commit phase).
*   *Interview Script:* *"Historically, NoSQL meant giving up transactions. However, DynamoDB supports atomic multi-item transactions via `TransactWriteItems`, making it viable for ledger or financial transfers if item volume is under 100 items."*

### D. Time to Live (TTL)
*   Automatically marks items with an expiration timestamp (`epoch_seconds`) and deletes them in the background.
*   **Zero Cost:** Deletions performed by TTL do **not consume WCUs**.
*   *Use Cases:* Session stores, temporary rate limiter windows, audit log auto-purging.

---

## 8. Single-Table Design: Theory vs. Interview Reality

**Single-Table Design** (popularized by Rick Houlihan) is an advanced DynamoDB pattern where an application stores *all* entity types (Users, Orders, Products, Reviews) in a **single table**, using generic attribute names (`PK`, `SK`).

```mermaid
classDiagram
    class SingleTable {
        +PK : String
        +SK : String
        +Data Attributes...
    }
    note for SingleTable "Row 1: PK=USER#101 | SK=METADATA | Name='Evan'<br/>Row 2: PK=USER#101 | SK=ORDER#901 | Total=\$50<br/>Row 3: PK=USER#101 | SK=ORDER#902 | Total=\$120"
```

### Why it exists:
By prepending entity prefixes (`USER#<id>`, `ORDER#<id>`), an application can fetch a user *and* their last 10 orders in a **single round-trip `Query` request**:
```text
PK = "USER#101" AND SK begins_with("ORDER#")
```

### ⚠️ Staff Engineer Interview Advice:
> [!CAUTION]
> **Do not force Single-Table Design into an interview whiteboard unless explicitly requested!**
> While single-table design is efficient in production, whiteboard schemas with generic `PK/SK` columns and overloaded GSI keys (`GSI1_PK`, `GSI1_SK`) are notoriously difficult to communicate verbally, consume excessive whiteboard space, and distract from high-level architecture.
> **Interview Strategy:** Propose clean, distinct tables (e.g., `Users`, `Orders`) with explicit primary keys and GSIs. Mention to the interviewer: *"In production, we could optimize round-trip latency using Single-Table Design, but for clarity today, I'll model them as clean, dedicated tables."* Interviewers will appreciate the pragmatism.

---

## 9. The Hot Partition Problem & Key Salting

If an application's access pattern directs traffic disproportionately to a single Partition Key (e.g., a viral celebrity account, a global counter, or a flash sale item), that partition will hit the **1,000 WCU or 3,000 RCU limit**, resulting in a `ProvisionedThroughputExceededException` (throttling).

```mermaid
flowchart TD
    Traffic[10,000 Writes/sec to 'item_999'] --> S1["Partition 2 (item_999)<br/>🔥 THROTTLED! (>1,000 WCU) 🔥"]:::hot
    
    subgraph Salted["The Fix: Key Salting (Write Sharding)"]
        direction TB
        AppWrite[App Random Salt 0-9] --> W0[item_999_0]
        AppWrite --> W1[item_999_1]
        AppWrite --> W9[item_999_9]
        W0 --> PartA[Partition A: 1,000 WCU]
        W1 --> PartB[Partition B: 1,000 WCU]
        W9 --> PartC[Partition C: 1,000 WCU]
    end

    classDef hot stroke:#ff0000,stroke-width:3px;
```

### Solutions for Hot Partitions
1.  **Write Sharding / Key Salting:** Append a random suffix (salt) to the partition key on write:
    $$\text{PK} = \text{item\_id} + \text{"\_"} + \text{random}(0, N)$$
    Writes are spread across $N$ distinct partitions, multiplying write throughput by $N$. On read, the application queries all $N$ partitions in parallel and aggregates the results.
2.  **Read Hot Spots:** Enable **DAX** in front of the table to absorb viral read spikes directly in RAM.
3.  **Write Buffering / Coalescing:** Place an **Amazon SQS** queue or Kafka topic in front of DynamoDB to smooth out sudden traffic spikes and batch writes.

---

## 10. System Design Interview Playbook: PostgreSQL vs. DynamoDB

```mermaid
flowchart TD
    Decision{Which Database Should I Choose?}
    
    Decision -->|Need arbitrary JOINs or ad-hoc analytics?| RDBMS[<b>PostgreSQL</b><br/>Relational, Normalized, ACID, SQL]
    Decision -->|Massive scale, simple key-value/range queries?| DDB[<b>DynamoDB</b><br/>NoSQL, Serverless, Single-Digit ms]
    
    DDB --> CheckGSI{More than 3-4 GSIs required?}
    CheckGSI -->|Yes: Over-indexing| RDBMS
    CheckGSI -->|No: Clean access patterns| ConfirmDDB[<b>USE DYNAMODB</b>]
```

### When to Choose DynamoDB in an Interview
1.  **High-Scale Key-Value or Range Queries:** User sessions, shopping carts, chat history, social feeds, gaming player states, notification logs.
2.  **Predictable Access Patterns:** Systems where query access paths are known upfront during design and do not require ad-hoc analytical slicing.
3.  **Massive Scale without Operational Overhead:** Serverless automatic scaling with zero EC2/RDS patching or manual shard rebalancing.
4.  **Global Active-Active Requirements:** Using **DynamoDB Global Tables** for multi-region replication.

### When NOT to Choose DynamoDB (Interview Traps)
1.  **Heavy Relational Joins & Reporting:** If you need to join 5 tables to generate a business report, choosing DynamoDB is an automatic fail. Use PostgreSQL, Snowflake, or ClickHouse.
2.  **More than 4–5 GSIs:** If a table requires 5+ global secondary indexes to answer its queries, your data model is relational. Use an RDBMS.
3.  **Massive Multi-Row ACID Batches:** If transactions routinely update hundreds or thousands of rows atomically, DynamoDB's 100-item transaction limit will break.
4.  **Full Table Text Search:** Proposing DynamoDB for regex or fuzzy substring queries is an anti-pattern. Use DynamoDB Streams $\to$ Elasticsearch/OpenSearch.
