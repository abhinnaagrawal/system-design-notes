# Tagging Service: Reference Solution (Staff Level)

## 1. Requirements

**Functional**
- Add and remove a tag on an object.
- List the objects carrying a tag (the hot path).
- List the tags on an object.
- Level 2: autocomplete tags by prefix, ranked by popularity.
- Level 3: return only objects the requesting user is allowed to see.

**Non-functional**
- Reads outnumber writes about 100:1.
- Tag lookups and autocomplete need interactive latency; autocomplete under about 100 ms.
- Popularity counts can be eventually consistent.
- Permission checks cannot be eventually consistent in the unsafe direction. Section 9 explains why.

**Out of scope:** tag ownership, moderation, and tag hierarchies.

## 2. Back-of-envelope estimates

The interview set the object count, tags per object, and read:write ratio. The write rate and row size below are hypothetical numbers I've added, so swap in your own.

| Quantity | Calculation | Result |
|---|---|---|
| Mapping rows | 10B objects × 10 tags | 100B rows |
| Row size | tag_id 8 B + object_id 8 B + created_at 8 B + ~40 B storage overhead | ~64 B |
| Primary mapping table | 100B × 64 B | ~6.4 TB |
| With replication | × 3 replicas | ~19 TB |
| With the second index (§5) | × 2 | ~38 TB |
| Writes (hypothetical) | — | 10k tag ops/s |
| Reads | 10k × 100 | 1M reads/s |

What the numbers tell you:
- **It must be sharded.** 38 TB won't fit on one node.
- **Reads need a cache.** 1M reads/s across a few hundred shards is manageable only when most reads are absorbed before they reach storage.

## 3. Entities and data model

Normalize tag text on write by lowercasing it, trimming it, and applying Unicode NFC normalization. Without this, "Sunset" and "sunset " become two different tags.

```sql
objects (
  object_id   BIGINT PRIMARY KEY,   -- monotonic (Snowflake-style)
  owner_id    BIGINT,
  acl_id      BIGINT,               -- Level 3, see §9
  ...properties
)

tags (
  tag_id      BIGINT PRIMARY KEY,
  name        TEXT UNIQUE,          -- normalized form
  object_count BIGINT,              -- derived, eventually consistent
  created_at  TIMESTAMP
)

tag_objects (                       -- PRIMARY index, serves the hot read
  tag_id      BIGINT,
  bucket      SMALLINT,             -- 0 for normal tags; see §6
  object_id   BIGINT,
  acl_id      BIGINT,               -- Level 3, denormalized
  created_at  TIMESTAMP,
  PRIMARY KEY ((tag_id, bucket), object_id)   -- partition key, then clustering key
)

object_tags (                       -- SECONDARY index, serves "tags of object"
  object_id   BIGINT,
  tag_id      BIGINT,
  created_at  TIMESTAMP,
  PRIMARY KEY ((object_id), tag_id)
)
```

**Why two mapping tables, not one.** You partitioned by `tag_id`, which is correct for the hot read. That choice makes "tags of an object" a scatter-gather across every shard. The fix is a second copy partitioned by `object_id`.

- `tag_objects` is the source of truth.
- `object_tags` is derived from it through CDC (§8).
- A cross-shard transaction is the wrong way to keep them in sync, because the two rows live on different shards.
- The accepted cost: "tags of object" can lag by seconds. That's acceptable for the secondary path.

**Storage choice: a wide-column store or sharded Postgres; a single relational instance won't do.**
- **Wide-column (Cassandra, ScyllaDB):** The access pattern maps directly onto it. The partition key is `(tag_id, bucket)` and the clustering key `object_id` gives sorted range scans within a partition.
- **Sharded Postgres (Citus or app-level sharding):** Works equally well. It keeps the Debezium WAL path you described. Use a composite index on `(tag_id, bucket, object_id)` with the shard key `tag_id`.
- **Either way, the key design is the same.** It matters more than the product you pick.

## 4. API design

```http
PUT    /v1/objects/{object_id}/tags/{tag}        # add tag   (idempotent)
DELETE /v1/objects/{object_id}/tags/{tag}        # remove tag (idempotent)
GET    /v1/objects/{object_id}/tags              # tags on object

GET    /v1/tags/{tag}/objects?limit=50&cursor=<opaque>
       → { "objects": [...], "next_cursor": "<opaque>" | null }

GET    /v1/tags/suggest?prefix=sun&limit=10
       → { "suggestions": [ {"tag":"sunset","count":48211093}, ... ] }
```

**Design points**
- **Use `PUT`/`DELETE` on the tag resource, not `POST /tags`.** Adding a tag twice gives the same result, so client retries are naturally idempotent. You don't need idempotency keys.
- **The user identity comes from the auth token, never from a query parameter.** Level 3 filtering depends on it, and a caller-supplied user ID would let anyone impersonate anyone.
- **Make the cursor opaque**, for example a base64 encoding of `{tag_id, bucket, last_object_id}`. Clients then can't build cursors themselves, and you can change the format later.
- **Enforce a hard limit** (for example, at most 100) so no client can request a billion rows.

## 5. Write flow: add a tag

1. Normalize the tag text, then resolve it to a `tag_id` with a get-or-create on `tags.name`.
   - Cache the mapping from name to `tag_id`. Tags are created rarely and read constantly.
   - Use `INSERT … ON CONFLICT DO NOTHING`, then read back the row, to avoid a race when two writers create the same tag at once.
2. Upsert `(tag_id, bucket, object_id, acl_id, created_at)` into `tag_objects`. The upsert makes retries harmless.
3. Return success. Everything else happens asynchronously through CDC: updating `object_tags`, updating the popularity count, and updating the autocomplete index.

## 6. Read flow and the hotspot problem

**Normal tag**
1. Check the page cache for the key `(tag_id, cursor)`.
2. On a miss, run a single-shard range scan:
   ```sql
   SELECT object_id FROM tag_objects
   WHERE tag_id = ? AND bucket = 0 AND object_id > :cursor
   ORDER BY object_id LIMIT :n
   ```
   The scan is an index seek plus a sequential read, so its cost is O(log N + page size).

**Hot tag: use bucketing for storage and writes, and the cache for reads.** A cache fixes hot reads only. It does nothing for the other two problems a celebrity tag causes:
- **Partition size.** A billion rows under one partition key is far too big. In Cassandra, very large partitions hurt compaction, repair, and read latency.
- **Write concentration.** Every new tagging of that tag lands on one shard.

The fix is to split hot tags into buckets: `bucket = hash(object_id) % B`, where B is 16–256 for hot tags and 1 (that is, bucket 0) for everything else.
- **Writes** spread across B partitions, and those partitions land on different nodes.
- **Reads** fan out to B buckets in parallel. Each bucket returns its next N rows, then you do a k-way merge on `object_id`, return the top N, and encode a per-bucket cursor. The merge works because each bucket is already sorted by `object_id`.
- **Choosing which tags are hot:** keep a small `hot_tags` config table, set when a tag's count crosses a threshold.
- **Moving a tag to bucketed form** is a background job that copies rows into the bucketed layout and then flips a flag. During the move, read from both layouts and merge.

**Cache.** Cache the first few pages of hot tags only, with a short TTL (seconds).
- **Thundering herd:** if many requests miss the same key at once, they all hit the database. Request coalescing (a single-flight lock per key) lets one fetch go through while the others wait for its result.
- **Invalidation:** don't attempt exact invalidation. A short TTL plus a CDC-driven eviction of page 1 when a tag gets a new object is enough.

**Why a cursor rather than offset pagination.** Offset pagination costs O(offset) per page, and concurrent inserts make it skip or repeat rows. A cursor on monotonic `object_id` is an O(log N) seek, and new inserts land after the cursor, so an in-progress scan stays stable. This is the point you reasoned out in the interview.

## 7. Level 2: autocomplete

**Structure.** Use the Elasticsearch/OpenSearch `completion` field type.
- Suggestions live in an in-memory FST, a structure built for fast lookup and low memory use.
- An FST is built per segment at index time, so the suggester scales out across nodes the same way full-text search does.
- An FST is a compressed, trie-like automaton, so your trie answer was right in principle.
- Because the suggestions are held in memory, you have to watch index size. Index the tag names only, about one document per tag, never the 100B mappings.

Document shape:
```json
{ "tag_id": 123, "name": "sunset",
  "suggest": { "input": ["sunset"], "weight": 48211093 } }
```
`weight` is the popularity count, and the suggester ranks results by it.

**Alternative: an in-house trie service.** Precompute the top-K completions at every trie node, rebuild it periodically (for example every 10 minutes) from the `tags` table, and swap it in atomically using double buffering. This gives lower latency and full control, but you have to operate it yourself.
- Choose Elasticsearch if you already run it, which you do.
- Choose the in-house trie if p99 latency under 10 ms or cost dominates.

**Popularity count: compute it in a stream aggregator and write absolute values, rather than incrementing per event.**
- Per-event `+1` breaks under duplicate events.
- Instead, a stream job (Flink or a Kafka consumer) keeps a running count per `tag_id`, aggregates over a short window (for example 30 s), and *writes* the absolute count to `tags.object_count` and the Elasticsearch `weight`.
- Writing the same absolute value twice gives the same result, so this write is idempotent.
- **Hot-tag counters:** the aggregation happens in the stream, so no single database row takes 10k increments per second.

## 8. CDC pipeline and its delivery semantics

```
tag_objects (WAL/binlog) → Debezium → Kafka (key = tag_id) →
   ├─ object_tags materializer   (upsert by object_id, tag_id)
   ├─ count aggregator           (Flink → tags.object_count, ES weight)
   └─ cache evictor              (evict page 1 of hot tags)
```

**Delivery guarantee.**
- Debezium guarantees at-least-once delivery and has no built-in deduplication layer.
- In normal operation each event usually arrives once, but after a failover Debezium can send duplicate change events to Kafka.
- So every consumer must be idempotent. Three ways to do that:
  - **Upsert on the natural key.** `object_tags` upserts on `(object_id, tag_id)`, so a duplicate rewrites the same row. When the target supports upserts on the primary key, duplicates become harmless rewrites.
  - **Deduplicate on the log position.** Store the last applied LSN or binlog offset per partition and skip anything at or below it. This is your event-ID answer, made concrete.
  - **Write absolute values** for counts (§7).

**Use CDC here, not the outbox pattern.**
- Outbox is for when the application must publish a *domain* event atomically with its database write.
- Here the consumers only need the row changes themselves, so tailing the log is simpler.
- One property holds either way: CDC only sees committed changes, so a rolled-back insert never turns into an event.

**Ordering.** Keying Kafka on `tag_id` keeps a tag's add and remove events in order within a partition. If they arrived out of order, a remove could be applied before its add.

## 9. Level 3: access control

**Model.** Use an ACL group rather than attaching roles directly to objects.

```sql
acls        (acl_id PK, description)
acl_grants  (acl_id, principal_id, principal_type)   -- principal = role or user
user_roles  (user_id, role_id)
objects.acl_id                                        -- each object points to one ACL
tag_objects.acl_id                                    -- denormalized copy
```

**The key idea: denormalize a pointer to permissions, not the permissions themselves.** `tag_objects` stores `acl_id`, a pointer, rather than a list of roles. At query time:

1. Resolve the caller's set of visible ACLs: `user → roles → acl_ids`. Cache this per user for about 60 s. Most users map to a small set.
2. Scan the tag's range and filter rows where `acl_id ∈ visible_set`. This happens inside the storage scan, so forbidden rows never leave the shard.

**The fan-out problem is smaller than it looked.** In the interview, the cost was framed as one change fanning out to a million rows. With this model it splits into three cases:

| Change | What gets rewritten | Fan-out |
|---|---|---|
| A user gains or loses a role | Only `user_roles`, then evict that user's visible-set cache | **1 row** |
| An ACL's grants change (e.g. a role is added to an ACL) | Only `acl_grants` | **1 row** |
| One object moves to a different ACL | That object's rows in `tag_objects` | **~10 rows** (one per tag on the object) |

So I'm correcting the "million updates" framing from the interview. That size of fan-out only happens if you copy role lists into the mapping. With an `acl_id` pointer, the worst ordinary case is about 10 rows per object.

**Consistency direction: revocation is the danger.**
- Lagging *grants* are harmless: a user just sees an object a few seconds late.
- Lagging *revocations* leak data.
- **Mitigation:** after the scan, re-check each returned page against the authoritative `objects.acl_id` and the user's live roles. That's only N rows, so it's cheap. A stale denormalized row can then cause at most a missing result, never an unauthorized one.

**Sparse permissions and page fill.** A user who can see only 0.1% of a tag's objects forces the scan to read about 1,000 rows per visible row. Mitigations:
- **Bounded scan budget.** Scan at most X rows, then return a partial page with `next_cursor` so the client keeps paging. This is honest and keeps latency bounded.
- **Per-ACL sub-index.** For tags with highly selective ACLs, add `PRIMARY KEY ((tag_id, acl_id), object_id)`. The query then runs one range scan per visible ACL and does a k-way merge, the same merge as hot-tag buckets.

## 10. Operational concerns

- **Observability.**
  - p50 and p99 latency per endpoint.
  - Cache hit rate on hot tags.
  - **CDC lag** (WAL position versus consumer offset). This is your freshness SLO for counts and for `object_tags`.
  - Partition size distribution, to catch new celebrity tags early.
- **Failure modes.**
  - Cache down: fall back to storage with request coalescing, and shed load on hot tags.
  - Elasticsearch down: autocomplete degrades to returning nothing; tagging itself is unaffected.
  - CDC down: counts and `object_tags` go stale, but the source of truth is intact. Replay from the stored offsets.
- **Rebuildability.** Every derived store (`object_tags`, counts, the Elasticsearch index, the cache) can be rebuilt from `tag_objects`. Lean on that property; it makes most incidents recoverable.
- **Deletes.** Delete the mapping row and let CDC propagate the delete.
  - Watch Cassandra tombstones on hot partitions. Heavy deletes there slow down reads.
  - Object deletion cascades through `object_tags`: look up the object's tags there first, then delete each matching `tag_objects` row.

## 11. End-to-end summary

| Path | Mechanism |
|---|---|
| Add a tag | Normalize → resolve `tag_id` → upsert into `tag_objects` (partition key `(tag_id, bucket)`) |
| Look up a tag | Cache → single-shard range scan (or bucketed fan-out + merge) → filter on `acl_id` → re-check revocation → opaque cursor |
| Tags of an object | `object_tags`, partitioned by `object_id`, derived via CDC |
| Autocomplete | ES completion suggester (in-memory FST), weighted by absolute counts from a stream aggregator |
| Sync | Debezium on the WAL → Kafka keyed by `tag_id` → idempotent consumers |
| Access control | Denormalized `acl_id` pointer; user→ACL set cached; revocation checked against the source of truth |

# Tagging Service: Design Decisions and Alternatives

Scenario: about 10B objects with about 10 tags each, so roughly 100B mappings. Reads outnumber writes 100:1, and the hot query is "objects for a tag." Every decision below is judged against that hot query.

## 1. Storage engine

| Option | Strength | Weakness | Verdict |
|---|---|---|---|
| **Wide-column (Cassandra, ScyllaDB)** | Partition key plus sorted clustering key fits "range scan within a tag" exactly; scales writes linearly | No joins; secondary access paths must be modeled by hand; large partitions hurt | **Pick** for a greenfield system at this scale |
| **Sharded Postgres (Citus, Vitess-style)** | Familiar SQL, transactions within a shard, mature CDC from the WAL | Resharding and shard rebalancing are operationally heavy | **Pick** if the team already runs Postgres well |
| **Managed KV (DynamoDB, Bigtable)** | No operations work; same partition and sort model as wide-column | Cost at 1M reads/s; per-partition throughput limits make hot tags worse | Good when operations capacity is the main constraint |
| **Graph DB** | Many-to-many relationships are native | Traversal from a billion-edge node is slow; poor fit for wide fan-out | Avoid. The access pattern is a flat lookup, not a traversal |

The key design (§3) matters more than which engine you pick, and both top options support it.

## 2. Representing the object↔tag relationship

| Option | Verdict |
|---|---|
| **Separate mapping table(s)** | **Pick.** Each mapping is a row, so it can be indexed, partitioned, and streamed via CDC. |
| Tags as an array column on the object (Postgres `text[]` + GIN index) | Fine below about 100M objects. A GIN index over 100B entries is very large and expensive to update, and you can't partition it by tag. |
| Inverted index only (tags stored only in Elasticsearch) | Easy to set up, but Elasticsearch becomes your source of truth, and it isn't built for that: no transactions and weaker durability guarantees. Use it as a derived view instead. |

**One mapping table or two?** Partitioning by tag makes "tags of an object" scatter across every shard. So keep a second copy partitioned by object.
- **Two tables (pick):** each access path gets a single-shard read, at the cost of 2× storage and a few seconds of lag on the copy.
- **One table plus scatter-gather for the secondary path:** acceptable only if "tags of object" is rare and latency there doesn't matter.

## 3. Partition key

| Option | Hot read | Weakness |
|---|---|---|
| `object_id` | Must scatter to every shard and gather results | Wrong for a 100:1 read system |
| `tag_id` | Hits one shard | Celebrity tags create oversized, overloaded partitions |
| **`(tag_id, bucket)`** | One shard for normal tags; parallel fan-out across B buckets for hot tags | Extra complexity for tags flagged hot |

**Pick `(tag_id, bucket)`.** Bucket = 0 for normal tags. Only tags known to be hot get split, so the extra cost applies only where it's needed.

## 4. Tag identity

| Option | Verdict |
|---|---|
| **Surrogate ID (`tag_id`) plus a unique `name`** | **Pick.** Keys stay compact, renaming a tag is cheap, and a name→ID cache absorbs most lookups. |
| Tag text as the key | No lookup step, but keys are larger and a rename rewrites every mapping row. |
| Hash of normalized text as the ID | No get-or-create race when two writers add the same new tag. You can't rename a tag, and you must handle hash collisions. Good if renames are banned. |

Whichever you pick, normalize tag text on write (lowercase, trim, Unicode normalization).

## 5. Pagination

| Option | Verdict |
|---|---|
| Offset/limit | Each page costs O(offset), and concurrent inserts cause skipped or repeated rows. Avoid at this scale. |
| **Cursor on monotonic `object_id`** | **Pick.** Each page is an index seek, and new rows land after the cursor so the scan stays stable. |
| Cursor on `created_at` | Use it if the product wants "newest first." It needs `object_id` as a tie-breaker, because timestamps collide. |

## 6. Handling hot tags

Each mitigation fixes a different part of the problem, so combine them.

| Mitigation | Fixes | Doesn't fix |
|---|---|---|
| **Cache of first pages** | Read load | Partition size, write concentration |
| **Bucketing** | Partition size, write concentration | Read load (reads must fan out to every bucket) |
| Read replicas | Read load | Partition size; also adds replica lag |
| Precomputed "top N" list per hot tag | Read latency for page 1 | Deep pages |

**Pick cache plus bucketing.** Add request coalescing (single-flight) so a cache miss on a hot tag doesn't send a burst of identical requests to the database.

## 7. Keeping derived stores in sync

| Option | Verdict |
|---|---|
| Dual write from the application | Simplest to build, but a crash between the two writes leaves the stores inconsistent. Avoid. |
| Distributed transaction (2PC) | Correct, but slow and fragile across shards. Avoid. |
| Transactional outbox | Atomic with the write. Use it when consumers need *domain events* rather than row changes. |
| **CDC (Debezium on the WAL or binlog)** | **Pick.** No changes to application code, and only committed changes become events. Delivery is at-least-once, so consumers must be idempotent. |
| Periodic batch rebuild (Spark) | Simple and self-healing, but hours stale. Keep it as a **repair path** alongside CDC. |

**Idempotency options for CDC consumers:** upsert on the natural key, deduplicate on the log offset, or write absolute values instead of increments. Use all three where each fits.

## 8. Autocomplete

| Option | Strength | Weakness | Verdict |
|---|---|---|---|
| **ES/OpenSearch completion suggester** | In-memory FST gives fast prefix lookup with ranking by weight; you already run it | Memory-bound; only prefix matching | **Pick** |
| Edge n-gram analyzer in ES | Matches inside words (e.g. "set" finds "sunset") | Index grows large; slower than the FST | Pick if mid-word matching is required |
| Redis sorted sets per prefix | Very fast and simple | Memory multiplies with every prefix stored; rebuilds are manual | Good for a small tag vocabulary |
| In-house trie with top-K stored per node | Lowest latency, full control | You build and operate it | Pick when p99 under 10 ms or cost dominates |
| SQL `LIKE 'sun%'` on a B-tree | Zero new infrastructure | Can't rank by popularity cheaply at scale | Prototype only |

## 9. Popularity counts

| Option | Verdict |
|---|---|
| Per-event `+1` on a database row | Duplicate events over-count, and the row for a hot tag becomes a write hotspot. Avoid. |
| Sharded counters (N sub-rows per tag, summed on read) | Fixes the hotspot but not the duplicates. |
| **Stream aggregation writing absolute values** (Flink or a Kafka consumer) | **Pick.** Rewriting the same value twice is harmless, and hot tags are aggregated in memory rather than in the database. |
| Periodic `COUNT(*)` batch job | Exact but stale. Use it to reconcile drift in the stream counts. |
| HyperLogLog | Approximate, tiny memory. Good if "about 48M" is acceptable for ranking, which it usually is. |

## 10. Access control filtering

| Option | Strength | Weakness |
|---|---|---|
| Post-filter (fetch a page, then check each object) | Simple; always uses current permissions | Unpredictable page fill; users with narrow access scan thousands of rows per page |
| Denormalize role lists into the mapping table | Filtering happens inside the scan | A change to one role rewrites up to millions of rows |
| **Denormalize an `acl_id` pointer + cache each user's visible-ACL set** | Filtering in the scan; a user's role change touches 1 row; moving an object to a new ACL touches about 10 | Sparse permissions still cost scan budget |
| Per-ACL index `((tag_id, acl_id), object_id)` | Bounded page fill even for sparse access | Index size multiplies with the number of distinct ACLs |
| External authorization service (Zanzibar-style: SpiceDB, OpenFGA) | Rich permission models, one central source of truth | A network check per object; at 1M reads/s it needs batching or a pre-filter step |

**Pick the `acl_id` pointer with a re-check of each returned page.** Add the per-ACL index only for tags whose ACLs are highly selective.

**Consistency rule:** a delayed grant is harmless, because the user just sees the object a little late. A delayed revocation leaks data. So the denormalized copy can be stale, but every result is re-checked against the source of truth before it's returned.

## Decision summary

| Decision | Choice | Main alternative | Switch when |
|---|---|---|---|
| Storage | Wide-column or sharded Postgres | Managed KV | Operations capacity is the main constraint |
| Relationship | Two mapping tables | One table + scatter-gather | "Tags of object" is rare |
| Partition key | `(tag_id, bucket)` | `tag_id` | No celebrity tags exist |
| Tag ID | Surrogate | Hash of text | Renames are banned |
| Pagination | Cursor on `object_id` | Cursor on `created_at` | Product needs newest-first |
| Hot tags | Cache + bucketing | Read replicas | Load is read-only and partitions are small |
| Sync | CDC + batch repair | Outbox | Consumers need domain events |
| Autocomplete | ES completion suggester | Edge n-gram / in-house trie | Mid-word matching / p99 under 10 ms needed |
| Counts | Stream aggregation, absolute values | HyperLogLog | Approximate counts are acceptable |
| Access control | `acl_id` pointer + re-check | External authorization service | Permission model is complex |