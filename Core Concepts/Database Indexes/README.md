# Database Indexes & The RUM Conjecture

**Source:** [Absolutely Everything That I Know About Database Indexes (System Design Fight Club)](https://www.youtube.com/watch?v=Qhc8gFF2qS8)

**TL;DR:** Adding an index to a database speeds up reads, but fundamentally slows down writes. The foundational concept behind all database tuning is the **RUM Conjecture**, which forces you to trade off between Read speed, Update speed, and Memory overhead. 

---

## 1. The RUM Conjecture

Similar to the CAP theorem for distributed systems, the RUM conjecture governs database indexing. It states that you must trade off between:
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
*   **Data Warehouses (OLAP):** Analytics databases often forgo traditional secondary indexes. Because OLAP queries (like generating a yearly sales report) require scanning millions of rows anyway, indexing individual rows is useless overhead. Instead, they use **Columnar Storage** to rapidly scan massive amounts of data in a single pass.

## 3. The 4 Major Types of Indexes (What DB to use when)

When designing a system, choosing the right index for your primary and secondary keys is critical. Here is a breakdown of the 4 most common indexes and the databases that use them:

### 1. B-Trees (Read-Optimized)
*   **What they do:** Keep data sorted in a balanced tree structure. Excellent for fast lookups and range queries.
*   **The Trade-off:** Optimized for **Reads**. Writes are slower because inserting data requires rebalancing the tree and updating disk pages.
*   **Who uses it:** This is the default index for traditional Relational Databases (**PostgreSQL, MySQL, Oracle**). Use when you have a read-heavy system that needs strong consistency and fast single-record lookups.

### 2. LSM Trees (Write-Optimized)
*   **What they do:** Log-Structured Merge Trees don't modify data in place. Instead, they append writes to an in-memory buffer (MemTable) and periodically flush them to immutable files on disk (SSTables).
*   **The Trade-off:** Optimized for **Updates (Writes)**. Reads are slightly slower because the database might have to search through multiple SSTables on disk to find the most recent version of a record.
*   **Who uses it:** Massive scale distributed databases designed for high-write throughput (**Cassandra, Google Spanner, DynamoDB**). Use when you are ingesting a firehose of data (e.g., IoT sensors, logging, massive social media feeds).

### 3. Inverted Indexes (Full-Text Search)
*   **What they do:** Instead of mapping a record ID to its contents, an inverted index maps the *contents* (words) to the record IDs. (e.g., The word "coffee" maps to `[Tweet_4, Tweet_99, Tweet_102]`).
*   **The Trade-off:** Requires massive memory overhead and expensive write times to tokenize and index every word, but offers unparalleled read speeds for text search.
*   **Who uses it:** Search engines and logging tools (**Elasticsearch, Solr, Lucene**). Use this when building a search bar (like searching Amazon products or Twitter posts by keywords). Note: Postgres *does* support inverted indexes, but Elasticsearch is the industry standard for dedicated search.

### 4. R-Trees (Geospatial / Shape Search)
*   **What they do:** Indexes multi-dimensional data by wrapping shapes in Minimum Bounding Rectangles (MBRs).
*   **The Trade-off:** Complex to update when shapes move or overlap, but incredibly fast at answering "What restaurants are inside this polygon on the map?"
*   **Who uses it:** Spatial databases (**PostGIS / PostgreSQL, Elasticsearch geo-fields**). Use this for location-based services (Uber, Yelp) or querying physical geometries.

## 4. Distributed Primary Keys (UUIDs vs Auto-Increment)
In a standard single-node SQL database, you often use an `AUTO_INCREMENT` integer as your primary key (powered by a B-Tree). 

In a **Distributed Database**, auto-increment fundamentally fails. 
*   To guarantee sequential numbers across 50 different machines, you need **Total Ordering** (requiring massive coordination/locks between nodes). 
*   Because this coordination is too slow, distributed databases dodge the problem entirely by dropping auto-increment and using **UUIDs** (Universally Unique Identifiers) or decentralized ID generators (like Twitter Snowflake).

A Distributed Primary key usually consists of:
1.  **Partition Key:** Determines which physical node the record lives on. (Crucial for query routing. See *Hash vs Range Partitioning*).
2.  **Sort Key (Optional):** Determines how the data is clustered/sorted on disk within that specific node.
