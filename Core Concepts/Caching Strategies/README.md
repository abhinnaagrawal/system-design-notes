# Caching Strategies & Interview Patterns

**Source:** [Caching in System Design Interviews w/ Meta Staff Engineer (Hello Interview)](https://www.youtube.com/watch?v=1NngTUYPdpI)

**TL;DR:** Caching is the ultimate tool for scaling read-heavy systems and reducing latency. In a system design interview, caching should be brought up during the deep dive (non-functional requirements) to address scale and performance. You must be able to discuss **Architectures** (how data gets in), **Eviction Policies** (how data gets out), and **Common Pitfalls** (what breaks when you use it).

---

## 1. Caching Architectures (How data is updated)

### Cache-Aside (Lazy Loading)
*   **How it works:** The application logic handles everything. On a read, the app checks the cache. If it's a miss, it fetches from the DB, writes it to the cache, and returns it. On a write, the app writes to the DB and either updates or deletes the cache key.
*   **Pros:** Resilient (if the cache goes down, the app just hits the DB directly, though it might be slow). Only requested data gets cached (no wasted memory).
*   **Cons:** Cache misses have a higher latency (3 trips: check cache, query DB, write to cache). 

### Write-Through
*   **How it works:** The application only writes to the cache. The caching library/framework then synchronously writes to the database *before* returning success to the user. 
*   **Pros:** Strong consistency between Cache and DB. No stale data.
*   **Cons:** Slower writes (must wait for both Cache and DB to acknowledge). Suffer from the **Dual Write Problem** (if the DB write fails but the cache write succeeds, or vice versa, you have a split-brain scenario). Requires specialized frameworks (e.g., Spring Cache, Hazelcast).

### Write-Behind (Write-Back)
*   **How it works:** The application writes to the cache and instantly gets a `200 OK`. The cache flushes these updates to the database asynchronously in batches later.
*   **Pros:** Blazing fast write throughput. Perfect for metric pipelines, analytics, or heavily updated counters (e.g., YouTube video views).
*   **Cons:** **Data Loss!** If the cache node crashes before the batch is flushed to the database, the data is gone forever. 

### Read-Through
*   **How it works:** Similar to Cache-Aside, but the application doesn't orchestrate the fallback. The application simply asks the Cache for data. If the cache doesn't have it, the *cache itself* fetches it from the database transparently.

---

## 2. Eviction Policies (How data is removed)
Because memory is expensive and limited, caches must delete old data to make room for new data.

*   **LRU (Least Recently Used):** Evicts the item that hasn't been read or written in the longest time. (The most common default, usually implemented with a Hash Map + Doubly Linked List).
*   **LFU (Least Frequently Used):** Evicts the item with the lowest total access count. Great if some items are consistently popular, but can suffer from "historical baggage" where an item was popular a month ago and never gets evicted.
*   **FIFO (First In, First Out):** Evicts the oldest item based strictly on insertion time, regardless of how often it's accessed.

---

## 3. The 3 Major Caching Pitfalls (Interview Traps)

When you introduce a cache, you introduce state and complexity. Interviewers will drill into these three edge cases:

### Pitfall 1: Cache Consistency (Stale Data)
If a user updates their profile picture in the database, but the old picture is still in the cache, other users will see stale data.
*   **Solution (Invalidate on Write):** Whenever you write to the DB, explicitly send a `DELETE` command to the cache for that key. The next read will be a miss, forcing a fresh pull from the DB.
*   **Solution (Eventual Consistency):** If it's just a social media feed, you can just set a short TTL (Time To Live, e.g., 5 minutes) and accept that some users will see stale data for 5 minutes.

### Pitfall 2: Cache Stampede (Thundering Herd)
Imagine you have a massively popular key (like the live score of the Super Bowl) with a TTL of 10 minutes. When that 10 minutes expires, the key is evicted. In the exact millisecond before the cache is repopulated, 50,000 concurrent user requests check the cache, get a miss, and *all 50,000 requests* hit the database simultaneously to fetch the score. The database instantly melts down.
*   **Solution:** **Background Refresh**. Instead of letting the key expire via TTL, have a background worker routinely fetch the latest score from the DB and update the cache proactively, ensuring the cache *never* expires.
*   **Solution:** **Mutex Locks / Debouncing**. When a cache miss happens, the first request acquires a distributed lock to query the DB. The other 49,999 requests wait for the cache to be filled by the first request.

### Pitfall 3: Hot Keys (The Celebrity Problem)
Even if you have 100 cache nodes perfectly balanced, if one piece of data (e.g., Taylor Swift's profile) gets 99% of the traffic, the single cache node holding that specific key will be overwhelmed and crash, while the other 99 nodes sit idle.
*   **Solution (Replication):** Instead of hashing Taylor Swift to a single node, replicate her profile across *all* cache nodes. The request router can pick any random cache node to serve her profile.
*   **Solution (Local In-Memory Cache):** Add a tiny cache directly inside the application servers (e.g., Guava cache in Java) for the top 10 most popular items. This prevents the requests from even reaching the Redis cluster.
