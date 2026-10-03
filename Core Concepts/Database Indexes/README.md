# Database Indexes & The RUM Conjecture

**Source:** [Absolutely Everything That I Know About Database Indexes (System Design Fight Club)](https://www.youtube.com/watch?v=Qhc8gFF2qS8)  
**Further Reading Mentioned:** *Designing Data-Intensive Applications (Martin Kleppmann)*, *Database Internals (Alex Petrov)*.

**TL;DR:** Adding an index to a database speeds up reads, but fundamentally slows down writes. The foundational concept behind all database tuning is the **RUM Conjecture**, which forces you to trade off between Read speed, Update speed, and Memory overhead. 

---

## 1. The RUM Conjecture

Similar to the CAP theorem for distributed systems, the RUM conjecture governs database indexing. It states that you must balance:
*   **R**ead Overhead (How fast can you retrieve data?)
*   **U**pdate Overhead (How fast can you write/update data?)
*   **M**emory Overhead (How much disk/RAM space does the index consume?)

You cannot optimize all three simultaneously. 
*   *Example:* Systems like Cassandra use LSM Trees, which offer blazing-fast **Updates** (writes are just appended to a file), but suffer from high **Memory** overhead (wasted space from duplicate/stale records at the end of files before compaction) and slightly slower **Reads**.

## 2. A Database is a Write-Ahead Log + A Materialized View

To deeply understand databases, consider this mental model: **A database at its core is just a Write-Ahead Log (WAL).** Everything else (including indexes) is just a materialized view built on top of that log.

*   If you just have a WAL and no indexes, your **writes are instantaneous** ($O(1)$ append), but your **reads are terrible** (full $O(N)$ table scan).
*   Adding a B-Tree index speeds up the read to $O(\log N)$, but ruins the $O(1)$ write, because every time a row is inserted, the CPU must also update the B-Tree data structure.

### When to use "No Index"
Because every index slows down writes, the absolute fastest way to ingest data is to use **no index at all**. 
*   **Message Brokers (Kafka):** Apache Kafka handles millions of writes per second explicitly because it has no secondary indexes. It is purely an append-only log.
*   **Data Warehouses (OLAP):** Analytics databases often forgo traditional secondary indexes. Because OLAP queries require scanning millions of rows anyway, indexing individual rows is useless overhead. Instead, they use **Columnar Storage** to rapidly scan massive amounts of data in a single pass.

---

## 3. Distributed Primary Keys & Partitioning Mechanics

In a standard single-node SQL database, you often use an `AUTO_INCREMENT` integer as your primary key. In a **Distributed Database**, auto-increment fundamentally fails because guaranteeing sequential numbers across multiple machines requires **Total Ordering** (massive coordination/locks between nodes, unless using a linearizable database like Google Spanner which is expensive).

Instead, distributed databases drop auto-increment and use **UUIDs**. A distributed primary key usually consists of:
1.  **Partition Key:** Determines which physical node the record lives on.
2.  **Sort Key (Optional):** Determines how the data is clustered/sorted on disk within that specific node.

### The "Scatter-Gather" Problem (Hash vs Range Partitioning)

Choosing the correct partition key is crucial to avoid the Scatter-Gather problem on key range queries.

```mermaid
flowchart TD
    subgraph Hash Partitioning (Inefficient for Range)
        Q1[Query: Get all posts for User A] --> N1[Node 1]
        Q1 --> N2[Node 2]
        Q1 --> N3[Node 3]
        note1(Requires querying every node and merging results)
    end
    
    subgraph Range Partitioning (Efficient for Range)
        Q2[Query: Get all posts for User A] --> N4[Node 1]
        note2(All posts for User A live on a single node)
    end
```

*   **Hash Partitioning:** If you partition by `PostID`, fetching all posts for a specific user requires a scatter-gather operation across all nodes because the posts are randomly distributed.
*   **Range Partitioning (Composite Key):** If you partition by `UserID` and sort by `PostID`, all posts for a given user land on the same physical node. A key range query (e.g., fetching a user's timeline) can be served entirely from one node.

---

## 4. Hash Indexes (In-Memory KV Stores)

*   **Mechanics:** Hash indices provide $O(1)$ lookups. However, hash tables perform terribly on physical disk hardware. Consequently, they are almost exclusively used in **in-memory caches** (Memcached, Redis). 
*   **Trade-offs:** Caches typically do not support secondary indexes or key range queries—they only support single-record lookups by the full primary key. Because range queries aren't a factor, **Hash Partitioning** is almost always the right strategy for KV caches.

---

## 5. B-Trees vs. LSM Trees (The Default Primary Indexes)

If you don't specify an index type, your database assigns a default based on its storage engine.

| Feature | B-Trees | LSM Trees |
| :--- | :--- | :--- |
| **Optimization** | Read-Optimized | Write-Optimized |
| **Mechanics** | Keeps data sorted in a balanced tree structure. Lookups are fast, but inserts require rebalancing nodes and modifying pages in-place. | Appends writes to an in-memory buffer (MemTable) and flushes them to immutable files on disk (SSTables). Reads may need to scan multiple files. |
| **Common Databases**| PostgreSQL, MySQL, Oracle, DynamoDB | Cassandra, Google Spanner |
| **Advanced Tuning**| BW-Trees (buffers writes, e.g., in some MongoDB configs). | Tuning compaction rates to balance read latency vs memory overhead. |

---

## 6. Secondary Indexes

Secondary indexes do not come for free. If you want to sort a user's posts chronologically, you must explicitly add an index on `timestamp`.

### Local Secondary Indexes (LSI) vs Global Secondary Indexes (GSI)

*   **Local Secondary Index (LSI):** The index only contains data that lives on that specific physical machine. 
*   **Global Secondary Index (GSI):** The index contains data spanning across *all* nodes in the cluster.
    *   **The Trade-off:** While GSIs prevent the scatter-gather problem for read-heavy key range queries, they introduce massive write latency. Updating a single record requires sending index updates to multiple machines across the network.
    *   **Interview Tip / Preference:** Avoid GSIs in practice. Instead of paying the massive write penalty of a GSI, it is often better to create a downstream read-optimized view of the data (partitioned differently) to serve those specific read queries. DynamoDB supports up to 8 GSIs, but use them sparingly.

### Concatenated Indexes
When you index multiple columns (e.g., `UserID`, then `PostID`), the database typically sorts them alphabetically/sequentially using a B-Tree. It narrows down the first attribute, then the second. It does *not* narrow down both simultaneously (unlike Spatial indexes).

---

## 7. Advanced & Specialized Indexes

### 1. Multi-Dimensional / Spatial Indices
*   **Mechanics:** Narrows down searches by multiple attributes simultaneously (e.g., X and Y coordinates) by wrapping them in shapes/bounding boxes. 
*   **Types:** **R-Trees** (supported out-of-the-box by PostgreSQL/PostGIS, can handle higher dimensions), **Quad-Trees** (Elasticsearch, 2D only), **GeoHashes** (Redis).
*   **Interview Tip:** Do *not* try to roll your own Quad-Tree from scratch in an interview (e.g., designing Uber), unless specifically asked. Real-world systems rely on existing databases that natively support them (like OpenSearch/Elasticsearch for high-TPS geography queries).

### 2. Inverted Indexes (Full-Text Search)
*   **Mechanics:** Maps words/content directly to record IDs (e.g., "coffee" -> `[Tweet_4, Tweet_99]`). Tokenizing and indexing every word incurs huge memory and write overhead.
*   **Who uses it:** Elasticsearch is the industry standard. However, **PostgreSQL and Redis** also support inverted indexes. Google Search uses a gigantic, custom-rolled inverted index (they don't use Elasticsearch because they outgrew it).
*   **Design Hack:** Because PostgreSQL supports inverted indices, you can combine an inverted index with manual partitioning and R-trees in a single Postgres instance to solve complex geographical + text search queries.

### 3. Skip Lists
*   **Mechanics:** A layered linked list that allows skipping over chunks of nodes for faster traversal.
*   **Use Case:** Highly niche. Almost exclusively used for **Gaming Leaderboards** (to fetch ranks quickly). Redis supports them; almost no disk-based databases do.

### 4. Vector Indexes
*   **Mechanics:** Stores high-dimensional vector embeddings for similarity search. 
*   **Use Case:** Machine Learning, Personalization, Recommendation Feeds (e.g., YouTube Home Feed). 
*   **Who uses it:** Pinecone, FAISS (Facebook), PlanetScale (MySQL fork), Redis.
*   **Interview Tip:** If you need a vector index, you will know upfront because the core feature is an ML problem. Choose a dedicated vector database early; do not awkwardly tack it onto an existing PostgreSQL architecture later. (Also, avoid using Redis as a vector DB just because it supports it).

---

## 8. Real-Time Analytics & Aggregations

When building features like "YouTube Video View Counts," you need real-time data, but standard OLAP queries are too slow.

*   **Materialized Views:** Precomputes aggregate operations (`COUNT`, `MIN`, `MAX`) that would normally require a full table scan, storing the result on disk for $O(1)$ retrieval.
*   **Count-Min Sketch:** A probabilistic data structure used for real-time analytics. 
    *   **Trade-off:** Trades exact accuracy for extremely fast OLAP-style aggregations and low memory footprint. 
    *   **Who uses it:** Often attached to the end of streaming architectures. (Redis supports it, though its placement in a cache is debatable).
