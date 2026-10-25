# Chapter 29: Design a Tagging Service (Atlassian / Jira / Twitter)

Based on the system design breakdown from **[System Design Fight Club - Atlassian Interview Question: Tagging Service](https://www.youtube.com/watch?v=WNIR7eiv0Hk)** with additions for Staff/Principal-level evaluation.

---

## 1. Executive Summary & Senior vs. Staff Framing

| Dimension | Mid-Senior Level (L5) | Staff / Principal Level (L6+) |
| :--- | :--- | :--- |
| **Problem Framing** | Thinks of tagging as a relational `tags` and `tag_items` join table or a generic Elasticsearch full-text search wrapper. | Recognizes that while storage capacity is negligible (e.g. 100 years of enterprise tag mappings fits in $<10\text{ GB}$ RAM), read/write patterns split into two architectural extremes: high-write ingestion fanout and combinatorial multi-tag boolean intersections (`#bug AND #p0 AND #frontend`). |
| **Multi-Tag Intersections** | Writes chained SQL `JOIN` statements or multi-clause `IN` queries without addressing Cartesian product explosions. | Identifies query degradation; designs inverted postings lists, Redis Sets (`SINTER`), or Roaring Bitmaps running SIMD-accelerated bitwise intersections. |
| **Celebrity / Hot Tags** | Proposes consistent hashing on `tag_id` without noting that viral hashtags (`#breakingnews`) melt single partitions. | Analyzes partition skew; rejects naive scatter-gather; implements two-tier hybrid caching with write-buffered in-memory queues and edge CDN distribution. |
| **Tag Mutations** | Suggests a raw `UPDATE tag_items SET tag_id = new_id WHERE tag_id = old_id;`, blocking tables and blowing up WAL replication lag. | Designs asynchronous zero-downtime tag alias indirection layers, bulk cursor migrations with throttling, and tombstone compaction. |

---

## 2. 5-Pillar Staff Assessment Rubric

The following rubric outlines the exact behaviors and evidence an interviewer evaluates:

| Pillar | Staff/Principal Level Evidence in Tagging Systems |
| :--- | :--- |
| **Decision Making** | • Clarifies enterprise (Jira/StackOverflow: complex multi-tag boolean filtering, moderate write TPS) vs. internet scale (Twitter: massive write fanout, single-tag searches, sub-second viral surges).<br>• Evaluates 3 distinct architectures: Normalized Relational Joins vs. Inverted Wide-Column NoSQL vs. Roaring Bitmap Indexing; selects based on SLA and accepted operational tax.<br>• Re-evaluates database topology as tag cardinality scales past billions of edges. |
| **Technical Proficiency** | • Explains hardware realities: why relational multi-join queries collapse on 8-core instances when tag count $>3$.<br>• Contrasts Inverted Index Postings lists (Lucene Skip Lists & Block-WAND) with SIMD-accelerated Roaring Bitmaps (`BITOP AND`) for sub-millisecond filtering.<br>• Details partitioning strategies: avoids naive `hash(tag_id + item_id)` scatter-gather scans across 100 shards; uses composite partition keys `(tag_id, timestamp)` with local sort ordering. |
| **Problem Solving & Analytical Thinking** | • Calculates realistic enterprise sizing ($10\text{k}$ employees $\to 12\text{M}$ mappings/year $\approx 96\text{ MB/year}$) proving that memory/disk capacity is never the bottleneck.<br>• Derives write fanout cost: an item with 10 tags generates 10 atomic index inserts; calculates worker fleet capacity needed to sustain 20,000 items/sec ($200,000\text{ writes/sec}$).<br>• Connects APIs, asynchronous Kafka event topologies, and read/write datastores. |
| **Operational Mindset** | • Solves bulk tag rename/merge without global database locks via pointer indirection tables (`tag_aliases`).<br>• Implements circuit breakers, rate limiting on tag creation to curb spam/crawler abuse, and soft-delete tombstone cleanup.<br>• Details observability: P99 latency tracking on multi-tag intersection queries, Kafka consumer lag, and Redis cache hit ratios for hot tags. |
| **Adaptability & Collaboration** | • Responds constructively when the interviewer introduces viral surges (e.g. 100x traffic to `#breakingnews`) or hierarchical taxonomy tags (e.g. `infra/storage/s3`).<br>• Balances immediate MVP implementation (Postgres with GIN/GIST index) with long-term decoupled NoSQL/Search clusters, justifying migration triggers. |

---

## 3. Understand the Problem & Establish Scope

A tagging service allows users to categorize, discover, and organize content via lightweight labels or hashtags. Common interview variants include:
- **Atlassian (Jira / Confluence):** Tagging bug tickets, tasks, or wiki pages.
- **Stack Overflow:** Associating programming questions with language/technology tags.
- **Twitter / Social Platforms:** Adding hashtags to tweets and discovering posts by tag.

### Requirements

#### Functional Requirements
1. **Add / Create Tags:** Associate one or more tags with an item/post (creating the tag if it doesn't already exist).
2. **Search Items by Tag:** Given a tag, retrieve a paginated list of associated items (ordered by timestamp or relevance).
3. **Multi-Tag Boolean Queries:** Filter items matching multiple tags (`tag = A AND tag = B`).
4. **Tag Recommendation Engine (Deep Dive Extension):** As an author writes a ticket/post, suggest relevant tags based on the content.

#### Non-Functional Requirements
- **High Read Availability & Low Latency:** Fetching items for a single tag or multi-tag filter should respond in under $50\text{ ms}$.
- **Eventual Consistency:** A brief delay (100–500 ms) before newly added tags appear in global search results is acceptable.
- **Scalability Across Traffic Tiers:** Must scale from internal enterprise use cases to internet-scale platforms.

#### Out of Scope
- **Autocomplete / Prefix Search:** Kept as a separate problem (trie-based search autocomplete).
- **Trending / Top-K Tag Aggregation:** Kept as a follow-up stream aggregation problem (e.g., sliding-window processing with Apache Flink).

---

## 4. Back-of-the-Envelope Estimation

Understanding realistic scale determines whether the system requires complex sharding or can remain on a simpler relational architecture.

### Enterprise Scale (e.g., Atlassian Jira for a 10,000-person enterprise)
- **Employees:** $10,000$ employees.
- **Ticket Creation Rate:** $10\text{ tickets/employee/week} = 100,000\text{ tickets/week}$.
- **Tags per Ticket:** $3$ tags on average $\rightarrow 300,000\text{ tag mappings/week}$.
- **Daily Tag Additions:** $\approx 40,000\text{ tags/day}$ ($280,000 / 7$).
- **Annual Tag Additions:** $\approx 12,000,000\text{ tags/year}$ ($40,000 \times 300\text{ workdays}$).
- **Row Size in Mapping Table:** $8\text{ bytes}$ (two 4-byte integers: `tag_id` + `item_id`).
- **Annual Storage Growth:** $12,000,000 \times 8\text{ bytes} \approx 96\text{ MB/year}$.
- **100-Year Enterprise Storage:** $\approx 9.6\text{ GB}$ total.

> **Key Sizing Takeaway:**
> Storage capacity is **rarely the bottleneck** for enterprise tagging systems (100 years of tag data fits comfortably in RAM). The real architectural drivers are **Read QPS**, **Multi-tag Intersection Latency**, and **Write TPS** under high fan-out conditions.

---

## 5. High-Level Design: Three Evolutionary Tiers

The system can be framed across three scale levels depending on read and write throughput:

```
+-----------------------------------------------------------------------------------+
| Approach 1: Single SQL Instance (Internal / Low Volume)                           |
|   App Server ---> Postgres DB (Tables: tags, items, tag_items join table)         |
+-----------------------------------------------------------------------------------+
                                         │  (Read volume explodes: >10,000 QPS)
                                         ▼
+-----------------------------------------------------------------------------------+
| Approach 2: Master-Follower Read Replicas (Enterprise Scale)                       |
|   Write Service ---> Leader Node (WAL replication)                                |
|   Read Service  ---> Read Replicas (3 - 6 follower nodes, eventual consistency)   |
+-----------------------------------------------------------------------------------+
                                         │  (Write volume explodes: >10,000 TPS)
                                         ▼
+-----------------------------------------------------------------------------------+
| Approach 3: Sharded NoSQL + Async Fan-Out (Internet / Twitter Scale)              |
|   Tag Service ---> Kafka Broker ---> Worker Fleet (Lambda / Task Runners)        |
|                                             │ (Fan-out writes)                    |
|                                             ▼                                     |
|                              DynamoDB / Cassandra (Partition: tag_id)             |
+-----------------------------------------------------------------------------------+
```

---

### Approach 1: Single Relational DB (PostgreSQL)

Best suited for modest read/write workloads ($<5,000\text{ QPS}$).

```
[ User Post / Edit ]  ───> [ Tag Creation Service ] ───> [ PostgreSQL Database ]
                                                                 │
[ User Search Tag  ]  ───> [ Tag Search Service   ] ─────────────┘
```

#### Relational Data Model (N:M Many-to-Many)
- **`tags` Table:**
  - `tag_id` (INT, PK)
  - `name` (VARCHAR, UNIQUE)
- **`items` Table:**
  - `item_id` (INT, PK)
  - `title` (VARCHAR)
  - `content` (TEXT)
  - `created_at` (TIMESTAMP)
- **`tag_items` (Join Table):**
  - `tag_id` (INT, FK -> tags.tag_id)
  - `item_id` (INT, FK -> items.item_id)
  - `PRIMARY KEY (tag_id, item_id)`
  - `INDEX (item_id)` (for reverse lookups)

#### Query Patterns
- **Add Tag to Item:**
  ```sql
  INSERT INTO tag_items (tag_id, item_id) VALUES (3, 123);
  ```
- **Fetch Items for a Tag:**
  ```sql
  SELECT i.item_id, i.title, i.created_at
  FROM tag_items ti
  JOIN items i ON ti.item_id = i.item_id
  WHERE ti.tag_id = 3
  ORDER BY i.created_at DESC
  LIMIT 20;
  ```

---

### Approach 2: Read Replicas (Leader-Follower Replication)

When read volume increases to tens of thousands of requests per second while writes remain moderate ($<2,000\text{ TPS}$).

```
[ Tag Creation Service ]
          │
          │ Writes
          ▼
   [ Leader Node ] ──(Async WAL Replication)──> [ Follower Node 1 ] <───┐
          │                                     [ Follower Node 2 ] <───┼── [ Tag Search Service ]
          └───────(Async WAL Replication)───> [ Follower Node 3 ] <───┘     (Reads distributed)
```

- **Leader Node:** Handles all write operations (`INSERT`, `UPDATE`, `DELETE`).
- **Follower Fleet:** Replicates state asynchronously via Write-Ahead Logs (WAL). Reads are load-balanced across followers.
- **Sizing Example:**
  - $30,000\text{ Read QPS}$:
    - Distributed across 3 replicas $\rightarrow 10,000\text{ QPS/node}$ (near hardware limits).
    - Distributed across 6 replicas $\rightarrow 5,000\text{ QPS/node}$ (safe operational buffer).
- **Consistency Trade-off:** Eventual consistency is completely acceptable for tagging. A delay of 100–500 ms before a newly attached tag appears in search results has negligible user impact.
- **Why NOT Shard the Join Table in SQL?**
  Sharding a relational join table forces **distributed cross-node joins**, passing intermediate record sets over network cables between shards, severely degrading latency.

---

### Approach 3: Horizontally Partitioned NoSQL + Async Fan-Out (Twitter Scale)

When writes exceed what a single leader node can process ($>10,000\text{ writes/sec}$), SQL join tables are replaced with an asynchronous ingestion pipeline and a partitioned NoSQL datastore (e.g., DynamoDB or Cassandra).

```
[ User adds tags ]
       │
       ▼
[ Tag Service ]
       │
       ▼
[ Kafka Topic: tag-events ]
       │
       ▼
[ Task Runners (Lambda Fleet) ]
       │
       ├─────────────────────────┬─────────────────────────┐  (Fan-out writes)
       ▼                         ▼                         ▼
[ Partition: #system-design ] [ Partition: #programming ] [ Partition: #database ]
```

#### Storage Separation (Data Federation)
To prevent replicating bulky content (10 KB descriptions) across multiple tag partitions:
1. **Item Data Store (Cassandra / Object Storage):**
   - Partition Key: `item_id`.
   - Stores full content, metadata, and body text. Written once when the post is created.
2. **Tag Index Store (DynamoDB / NoSQL Inverted Index):**
   - **Partition Key (`PK`):** `tag_id` (or tag name / hashtag).
   - **Sort Key (`SK`):** `item_id` (or `timestamp + item_id`).
   - Stores lightweight denormalized summary data only (`item_id`, `title`, `created_at`) to render the search result list without immediately fetching large content blobs.

```
PK (tag_id)                  SK (item_id)      Attributes
----------------------------------------------------------------------------------
#systemdesign (ID: 3)   ---> item_101          title: "Tagging Service", ts: 167000
#systemdesign (ID: 3)   ---> item_102          title: "Consistent Hashing", ts: 167005
#programming  (ID: 4)   ---> item_101          title: "Tagging Service", ts: 167000
```

---

---

## 6. Deep Dives & Advanced Engineering

### 1. The Hot Partition & Celebrity Tag Problem
Choosing `PK = tag_id` enables fast single-partition queries for tag lookups, but introduces hot partitions for viral tags (e.g., `#breakingnews`, `#bug`, or `#systemdesign`).

- **Why Consistent Hashing is NOT a Silver Bullet Here:**
  Consistent hashing on composite keys (e.g., `hash(tag_id + item_id)`) scatters items belonging to the same tag across all physical shards. Querying all posts for a tag then requires a **scatter-gather key-range scan** hitting every node in the cluster, multiplying load by $N\times$ and destroying P99 latency.
- **Hybrid Ingestion & Dedicated Hot Tag Cache (Twitter Model):**
  Extremely popular tags bypass standard fanout queues and maintain their timelines in dedicated Redis cluster instances (e.g., capped Sorted Sets `ZADD` with `ZREMRANGEBYRANK`).
- **Write-Buffering (Micro-Batching):**
  During viral spikes, the worker fleet batches writes in memory for 100ms before issuing batch `PutItem` requests to the partition, collapsing 5,000 individual writes into a single multi-row operation.

---

### 2. Multi-Tag Intersections (`AND` / `OR` Queries)
In systems like Jira or Stack Overflow, users frequently query items matching multiple tags:
`tag = 'database' AND tag = 'distributed-systems' AND status = 'open'`

#### The Relational Join Trap
Executing multiple self-joins on a normalized mapping table:
```sql
SELECT ti1.item_id 
FROM tag_items ti1
JOIN tag_items ti2 ON ti1.item_id = ti2.item_id
JOIN tag_items ti3 ON ti1.item_id = ti3.item_id
WHERE ti1.tag_id = 3 AND ti2.tag_id = 14 AND ti3.tag_id = 99;
```
For high-cardinality tags, this forces massive intermediate Hash Joins and Cartesian evaluations in memory, causing severe latency spikes ($>500\text{ ms}$).

#### Three Production Architectures for Boolean Filtering:

| Architecture | Implementation Mechanism | Latency Profile | Best Suited For |
| :--- | :--- | :--- | :--- |
| **A. PostgreSQL GIN Index** | Store `tags` as an array column on the `items` table: `tags int[]` with a Generalized Inverted Index (`GIN`). Query with containment operator: `WHERE tags @> ARRAY[3, 14, 99]`. | Low ($<10\text{ ms}$) up to 20M items. | Enterprise Jira instances with moderate write TPS. |
| **B. Inverted Postings Lists (Elasticsearch / Lucene)** | Each tag maintains an inverted list of sorted document IDs. Lucene intersects sorted arrays using **Skip Lists** or the **Block-WAND** (Weak AND) algorithm to bypass non-matching segments. | Medium ($15\text{--}40\text{ ms}$). | Full-text search combined with tag filtering. |
| **C. Roaring Bitmaps / Redis Bitsets** | Each tag is a compressed bitmap where bit position $K = 1$ indicates that `item_id = K` possesses that tag. Intersecting multiple tags is a single hardware SIMD-accelerated bitwise AND operation (`BITOP AND dest_key tag_3 tag_14 tag_99`). | Ultra-Low ($<2\text{ ms}$). | High-throughput in-memory faceted search (e.g. e-commerce, Stack Overflow). |

---

### 3. Zero-Downtime Bulk Tag Renaming & Merging
Suppose a moderator merges `#js` into `#javascript`, where `#js` is attached to $50,000,000$ posts.

#### The Naive Failure Mode:
```sql
-- DANGEROUS: Locks millions of rows, blows out undo log/WAL, triggers replication lag!
UPDATE tag_items SET tag_id = 1002 WHERE tag_id = 1001;
```

#### Staff Solutions:
1. **Alias Indirection Layer (Immediate $O(1)$ Redirect):**
   - Maintain a `tag_aliases` table:
     ```
     alias_tag_id (1001) ---> canonical_tag_id (1002)
     ```
   - All write and read APIs check the in-memory alias dictionary. A rename or merge takes $<1\text{ ms}$ with zero record updates.
2. **Asynchronous Batched Cursor Migration (Background Reconciliation):**
   - A background job rewrites mappings in small batches of 1,000 using cursor-based pagination:
     ```sql
     UPDATE tag_items 
     SET tag_id = 1002 
     WHERE tag_id = 1001 AND item_id > :last_seen_cursor 
     ORDER BY item_id ASC 
     LIMIT 1000;
     ```
   - Once all rows are migrated, the alias entry can either be permanently archived or retained for legacy search compatibility.

---

## 7. Extension: Tag Recommendation Engine

A supervised machine learning subsystem to suggest the most relevant tags as an author writes a post.

```
[ Author typing post ]
          │
          │ 1. Sends content text
          ▼
[ Tag Recommendation Service ] <────── [ In-Memory Classification Model ]
          │                                          ▲
          │ 2. Returns top tag scores [0..1]         │ 4. Nightly model deployment
          ▼                                          │
[ Browser renders suggestions ]            [ EMR / Spark Nightly Batch ]
                                                     ▲
                                                     │ 3. Ingests raw post content
                                           [ Item Data Store (Cassandra) ]
```

1. **Problem Formulation:**
   - This is a **multi-label classification** problem (supervised learning), *not* an unsupervised clustering problem.
2. **Offline Training Pipeline (EMR / Spark Batch Job):**
   - Ingests historical posts and associated tag labels nightly.
   - Text cleaning: Tokenization, Stemming, and TF-IDF (Term Frequency–Inverse Document Frequency) or transformer sentence embeddings.
   - Trains a multi-label classification model (Neural Network or LightGBM) outputting a confidence score between $[0, 1]$ for each candidate tag.
3. **Low-Latency Online Inference:**
   - The compiled model artifact (e.g. ONNX runtime) is loaded **directly in-memory** inside the recommendation service processes.
   - No runtime database lookups are needed: client sends text $\rightarrow$ service stems words $\rightarrow$ in-memory inference $\rightarrow$ top scoring tags returned in $<15\text{ ms}$.

---

## 8. Staff Curveball Playbook & Production Realities

### Curveball 1: Viral Hashtag Surge (`#breakingnews` explodes to 50k writes/sec)
- **Candidate Defense:**
  - Standard partition-level writes in DynamoDB/Cassandra will throttle due to single-partition throughput caps (e.g., DynamoDB caps 1 partition at 1,000 WCU / 3,000 RCU).
  - **Mitigation:**
    1. **Key Salting on High-Write Tags:** Split `#breakingnews` into $K$ virtual sub-partitions: `#breakingnews_0`, `#breakingnews_1`, ..., `#breakingnews_9`. Writes randomly pick a salt.
    2. **Scatter-Gather Read Mitigation:** For reads, query the 10 sub-partitions in parallel or maintain a decoupled materialized view in Redis via Flink streaming aggregation.

### Curveball 2: Hierarchical / Taxonomy Tags (`infra/storage/s3`)
- **Interviewer Question:** *"What if tags have a folder-like hierarchy, and querying `infra` should automatically include all items under `infra/storage` and `infra/storage/s3`?"*
- **Candidate Defense:**
  - Reject recursive SQL queries (`WITH RECURSIVE`).
  - **Approach A (Materialized Path):** Store the full path string `infra/storage/s3` and index it with a B-tree prefix query (`WHERE path LIKE 'infra/%'`).
  - **Approach B (Ancestor Array Indexing):** When tagging an item with `infra/storage/s3`, automatically explode and attach all ancestor IDs: `[id(infra), id(storage), id(s3)]` into the inverted index. Search for `infra` remains an $O(1)$ single-tag lookup.

### Curveball 3: Abuse & Spam Prevention
- **Candidate Defense:**
  - Enforce max tags per item (e.g., maximum 5–10 tags per post).
  - Implement IP/User level rate limiting via Token Bucket algorithms on tag creation endpoints to prevent bots from polluting the global tag namespace with unique garbage strings.
  - Require minimum reputation score or manual moderation before newly coined tags appear in global autocomplete suggestions.

---

## 9. Summary Comparison Matrix

| Aspect | Approach 1: Internal SQL | Approach 2: Read Replicas | Approach 3: Distributed NoSQL |
| :--- | :--- | :--- | :--- |
| **Target Scale** | $<5,000\text{ QPS}$ | Up to $30,000\text{ Read QPS}$ | $>100,000\text{ Read/Write QPS}$ |
| **Storage Engine** | PostgreSQL / MySQL | PostgreSQL (Leader + Replicas) | DynamoDB / Cassandra |
| **Ingestion Path** | Synchronous SQL `INSERT` | Synchronous to Leader | Async via Kafka + Task Runners |
| **Data Schema** | Normalized (`tag_items` join) | Normalized with Read Replicas | Denormalized Tag Index + Item Store |
| **Boolean Filtering** | Chained SQL Joins | GIN Index on Array Column | Inverted Postings / Roaring Bitmaps |
| **Hotspots** | Single machine limits | Replicas absorb read surges | Key Salting + Dedicated Redis Cluster |
| **Tag Renaming** | Direct `UPDATE` (locks table) | Batched cursor updates | Alias Indirection Layer ($O(1)$) |
| **Complexity** | Minimal | Low | Medium / High |
