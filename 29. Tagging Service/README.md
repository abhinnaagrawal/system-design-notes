# Chapter 29: Design a Tagging Service (Atlassian / Jira / Twitter)

Based on the system design breakdown from **[System Design Fight Club - Atlassian Interview Question: Tagging Service](https://www.youtube.com/watch?v=WNIR7eiv0Hk)**.

---

## 1. Understand the Problem & Establish Scope

A tagging service allows users to categorize, discover, and organize content via lightweight labels or hashtags. Common interview variants include:
- **Atlassian (Jira / Confluence):** Tagging bug tickets, tasks, or wiki pages.
- **Stack Overflow:** Associating programming questions with language/technology tags.
- **Twitter / Social Platforms:** Adding hashtags to tweets and discovering posts by tag.

### Requirements

#### Functional Requirements
1. **Add / Create Tags:** Associate one or more tags with an item/post (creating the tag if it doesn't already exist).
2. **Search Items by Tag:** Given a tag, retrieve a paginated list of associated items (ordered by timestamp or relevance).
3. **Tag Recommendation Engine (Deep Dive Extension):** As an author writes a ticket/post, suggest relevant tags based on the content.

#### Non-Functional Requirements
- **High Read Availability & Low Latency:** Fetching items for a tag should respond in under $50\text{ ms}$.
- **Eventual Consistency:** A brief delay (100–500 ms) before newly added tags appear in global search results is acceptable.
- **Scalability Across Traffic Tiers:** Must scale from internal enterprise use cases to internet-scale platforms.

#### Out of Scope
- **Autocomplete / Prefix Search:** Kept as a separate problem (trie-based search autocomplete).
- **Trending / Top-K Tag Aggregation:** Kept as a follow-up stream aggregation problem (e.g., sliding-window processing with Apache Flink).

---

## 2. Back-of-the-Envelope Estimation

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
> Storage capacity is **rarely the bottleneck** for enterprise tagging systems (100 years of tag data fits comfortably in RAM). The real architectural drivers are **Read QPS** and **Write TPS** under high fan-out conditions.

---

## 3. High-Level Design: Three Evolutionary Tiers

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

## 4. Deep Dives & Architectural Trade-offs

### The Hot Partition & Celebrity Problem
Choosing `PK = tag_id` enables single-partition queries for tag searches, but introduces hot partitions for viral tags (e.g., `#breakingnews`, `#bug`, or `#systemdesign`).

- **Why Consistent Hashing is NOT a Silver Bullet Here:**
  Consistent hashing on composite keys (e.g., `hash(tag_id + item_id)`) scatters items belonging to the same tag across all physical shards. Querying all posts for a tag then requires a **scatter-gather key-range scan** hitting every node in the cluster, multiplying load by $N\times$.
- **Hybrid Ingestion & Dedicated Hot Tag Cache (Twitter Model):**
  Extremely popular tags can bypass standard fan-out paths and have their timelines maintained in dedicated Redis caching clusters.
- **Managed Capacity Units (RCUs / WCUs):**
  In managed systems like DynamoDB, partition hotspots can be mitigated by adaptive capacity allocation, partition splitting, or over-provisioning Read/Write Capacity Units.

### B-Tree vs. Search Engine (Elasticsearch)
- If the system only supports querying by an **exact tag enum or tag ID**, a standard **B-Tree index** on the partition key is fully sufficient and faster.
- **Elasticsearch / Lucene** is only required if users need full-text search across arbitrary text tokens inside the post title or body.

---

## 5. Extension: Tag Recommendation Engine

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
   - Text cleaning: Tokenization, Stemming, and TF-IDF (Term Frequency–Inverse Document Frequency).
   - Trains a multi-label classification model (Neural Network or Random Forest) outputting a score between $[0, 1]$ for each candidate tag.
3. **Low-Latency Online Inference:**
   - The compiled model artifact is deployed **directly in-memory** inside the recommendation service processes (e.g., embedded runtime/Java Bean).
   - No runtime database lookups are needed: client sends text $\rightarrow$ service stems words $\rightarrow$ in-memory inference $\rightarrow$ top scoring tags returned in milliseconds.

---

## 6. Hardware & Production Considerations

- **Server Virtual Core Realities:**
  Standard cloud instances (e.g., AWS `m5.2xlarge`) supply 8–16 vCPUs, not hundreds of physical cores. A single database node typically saturates between **5,000 and 10,000 operations/second**.
- **Kafka Architecture:**
  Keep Kafka topics scoped to their specific data domains. Avoid turning a single cluster into an "Enterprise Service Bus" with dozens of tangled producer/consumer arrows.

---

## Summary Comparison Matrix

| Aspect | Approach 1: Internal SQL | Approach 2: Read Replicas | Approach 3: Distributed NoSQL |
| :--- | :--- | :--- | :--- |
| **Target Scale** | $<5,000\text{ QPS}$ | Up to $30,000\text{ Read QPS}$ | $>100,000\text{ Read/Write QPS}$ |
| **Storage Engine** | PostgreSQL / MySQL | PostgreSQL (Leader + Replicas) | DynamoDB / Cassandra |
| **Ingestion Path** | Synchronous SQL `INSERT` | Synchronous to Leader | Async via Kafka + Task Runners |
| **Data Schema** | Normalized (`tag_items` join) | Normalized with Read Replicas | Denormalized Tag Index + Item Store |
| **Hotspots** | Single machine limits | Replicas absorb read surges | Dedicated Redis cache / RCU scaling |
| **Complexity** | Minimal | Low | Medium / High |
