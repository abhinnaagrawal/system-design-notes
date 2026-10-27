# 03 - Tungsten, Serialization & Data Representation

**Priority:** P0
**Versions:** Apache Spark **3.5.0**.
**Sources:** [SOURCES.md](SOURCES.md) - full list at the end of this chapter.
**See also:** [02 - Memory Management & Disk Spilling](02%20-%20Memory%20Management%20&%20Disk%20Spilling.md), [04 - Shuffle, Partitioning & Network Transfer](04%20-%20Shuffle,%20Partitioning%20&%20Network%20Transfer.md), [06 - Query Planning (Catalyst & AQE)](06%20-%20Query%20Planning%20%28Catalyst%20&%20AQE%29.md), [Appendix C - The Spark Acceleration Landscape](Appendix%20C%20-%20The%20Spark%20Acceleration%20Landscape.md) (what replaces Tungsten's hot loops in native engines).

**TL;DR:** Spark's CPU bottleneck was never the algorithm - it was the **JVM object model**: one object per field, boxed primitives, pointer chasing, and GC. Tungsten attacked it in three pillars: (1) a **binary row format** (`UnsafeRow`) where a row is one contiguous byte buffer, so serialization is `memcpy`; (2) **cache-aware, pointer-based algorithms** (sort/shuffle bytes, not objects); (3) **whole-stage code generation**, collapsing an operator pipeline into one generated Java function. Numbers to remember [S11, Databricks 2016]: generated code took a filter from ~15 ns to ~1.1 ns per row, a hash join from ~115 ns to ~4 ns per row, and sort from ~620 ns to ~5.3 ns per row [benchmark context: single-threaded microbenchmarks in the blog].

---

## 1. Why It Exists (The One Idea)

Write a Spark aggregation the naive way and each row becomes a `Row` object holding boxed `Integer`s and `String`s. For a billion rows you allocate a billion objects plus their fields, chase pointers across the heap, and hand the GC an enormous live set. The CPU is mostly doing **allocation, indirection, and cache misses** - not aggregation.

Tungsten's thesis [S10, Databricks 2015]:

> Stop representing data as JVM objects. Represent it as **bytes in explicit memory**, operate on those bytes with cache-conscious algorithms, and generate specialized code that walks the bytes with no virtual dispatch.

Three consequences:

1. **Serialization becomes cheap**: `UnsafeRow` is already the shuffle/network format, so "serialize" is often a `memcpy` or even just handing over a pointer.
2. **Memory becomes predictable**: fixed-size slots + offsets, no per-object headers, no GC per field.
3. **Code becomes specialized**: whole-stage codegen emits one function per pipeline, keeping hot values in registers.

**Memory hook:** *"Tungsten = bytes not objects, pointers not keys, one generated function not an iterator chain."*

---

## 2. The Evolution Story (So You Can Place Any Question In Time)

Place any question on this timeline and you will automatically give a structured answer. Each era exists because the previous representation hit a wall, and the walls are the story: objects hit GC, interpreted operators hit dispatch overhead, and boundaries hit serialization.

| Era | Representation | The problem it solved | The problem it left |
|-----|----------------|----------------------|---------------------|
| Pre-1.4 | JVM objects (`Row`, boxed primitives), Java serialization | - | Allocation + GC + pointer chasing dominate CPU |
| 1.4 - Tungsten phase 1 | Explicit memory (`Unsafe`), `UnsafeRow`, cache-aware sort/shuffle operators | Object overhead gone; sort/shuffle on bytes | Operators still wired as a Volcano iterator pipeline with virtual calls per row |
| 1.5 | Tungsten **on by default**; codegen on by default for DataFrame/SQL functions and aggregations [RN 1.5] | Users get it without flags | Codegen coverage partial |
| 2.0 - second-gen Tungsten | **Whole-stage codegen**; vectorized Parquet reader [S15] | Collapses a whole operator pipeline into one generated function | Not all operators can be fused; UDFs/Python break the pipeline |
| 2.3+ | Vectorized ORC (2-5x) [RN 2.3], more operators codegen'd | Columnar readers feed the binary pipeline | Same structural limits |
| 3.x-4.x | `UnsafeRow`/`VARIANT` binary formats; whole-stage codegen matures | Stable representation for SQL + Connect (4.0 VARIANT) [RN 4.0] | UDF/Python boundaries still cost; ANSI adds checks |

Interview move: if asked "what is Tungsten?", give the three pillars, then place the version: **phase 1 = binary + algorithms (1.4/1.5), phase 2 = whole-stage codegen (2.0)**.

---

## 3. Pillar 1: `UnsafeRow` - A Row Is One Buffer

```text
UnsafeRow layout (one contiguous byte buffer, 8-byte aligned):

+----------------+----------------------+-------------------------+
| null bitmap    | fixed-length region  | variable-length region  |
| 1 bit/field    | 8 bytes per slot     | actual bytes            |
| (rounded to 8) | (or offset+size for  | (strings, arrays, maps, |
|                |  variable/nested)    |  nested structs)        |
+----------------+----------------------+-------------------------+
                  ^                      ^
                  |                      |
       fixed slot for "name":     bytes of "alice"
       offset (32 bits) + length (32 bits), packed into one 8-byte slot
```

Key properties:

- **No object per field.** A row with 10 fields is one allocation (the buffer), not 11 objects. Nulls are a bitmap.
- **Fixed-width fields** (int, long, double, boolean...) live inline, 8-byte slots; access is pointer arithmetic + cast.
- **Variable-width fields** (strings, arrays, maps, nested structs) store `offset` and `length` as two 32-bit ints packed into one 8-byte fixed slot; the payload lives in the variable region.
- **Serialization/deserialization = copy**: the buffer *is* the wire format, so shuffle, cache, and network transfer do not need a per-field encoder. `UnsafeRowSerializer` passes bytes through.
- **One wrapper, many rows**: an `UnsafeRow` object can point into a larger memory page; advancing to the next row moves the offset. No per-row allocation at all.
- **Hashing/equality/comparison work on bytes** - which is what sorters and join hash maps need.

**Worked example: two rows, same schema.** Take `(id INT, name STRING, score DOUBLE, active BOOLEAN)` and two rows:

```text
A = (1, "alice", 9.5,  true)
B = (2, NULL,    7.25, false)
```

Four fields need four null bits, but Spark rounds the bitmap to a 64-bit word, so the null bitmap is **8 bytes**. The fixed region is `4 x 8 = 32` bytes, so variable-length data starts at byte **40**:

```text
byte offset   0-7        8-15      16-23       24-31     32-39    40-47
Row A       [null    ][id = 1  ][name slot][score   ][active  ][alice + pad]
Row B       [null    ][id = 2  ][name slot][score   ][active  ]  (ends at 39)
```

| Field (fixed slot) | Row A bytes | Row A decode | Row B bytes | Row B decode |
|--------------------|-------------|--------------|-------------|--------------|
| null bitmap `0-7` | `00 00 00 00 00 00 00 00` | no nulls | `02 00 00 00 00 00 00 00` | bit 1 set: `name` is null |
| `id` `INT` at 8 | `01 00 00 00 00 00 00 00` | 1 | `02 00 00 00 00 00 00 00` | 2 |
| `name` `STRING` at 16 | `05 00 00 00 28 00 00 00` | size 5, offset 40 | `00 00 00 00 00 00 00 00` | null; slot ignored |
| `score` `DOUBLE` at 24 | `00 00 00 00 00 00 23 40` | 9.5 | `00 00 00 00 00 00 1d 40` | 7.25 |
| `active` `BOOLEAN` at 32 | `01 00 00 00 00 00 00 00` | true | `00 00 00 00 00 00 00 00` | false |
| variable region at 40 | `61 6c 69 63 65 00 00 00` | `"alice"` + 3 pad bytes | - | no payload |

Two details trip people up. First, the 8-byte variable slot packs `(offset << 32) | size`; because x86 is little-endian, the bytes show the **size first**. So `05 00 00 00 28 00 00 00` means **size = 5, offset = 0x28 = 40** - not offset 5. Second, the offset is measured from the **start of the row**, not from the start of the variable region, which is why it is 40 and not 0. The payload is rounded up to an 8-byte boundary: `"alice"` uses 5 bytes plus 3 zero bytes, so a second string would begin at offset 48. Row A is therefore 48 bytes; Row B is 40 bytes because the null `name` has no payload. The null bit is authoritative - the all-zero slot in Row B is not a zero-length string.

Consequences that show up in interviews:

| Question | Answer |
|----------|--------|
| Why not mutate an `UnsafeRow` you plan to keep? | The buffer is reused by the operator/page; keep it = copy it (`copy()`), or you'll observe corrupted data. This is a real correctness trap for custom code. |
| Why do strings cost less? | UTF-8 bytes + two 32-bit ints packed into one 8-byte slot; no Java `String` header/char array overhead. |
| Why is GC suddenly quiet? | Rows are few big buffers; GC sees pages and pointers, not billions of small objects. |
| Does this mean Java objects are gone? | No: the RDD API still uses objects (`Row`/your types); the binary path is the SQL/Tungsten path (DataFrames, Datasets with encoders). |

Related binary containers: `UnsafeArrayData`, `UnsafeMapData` (nested variable-length payloads), and `VARIANT` (4.0) for semi-structured values [RN 4.0].

---

## 4. Pillar 2: Cache-Aware, Pointer-Based Algorithms

With data as bytes, algorithms change shape:

- **Sorting**: build an array of 8-byte pointers to records; sort pointers by a **prefix** of the record bytes (e.g., first 8 bytes) and only fall back to full comparison on ties (`PrefixComparator` / `UnsafeInMemorySorter`). Records never move during sorting; only pointers do.
- **Shuffle write**: the tungsten writer sorts pointers by *partition id* with a radix sort - no key comparison, no deserialization (chapter 04).
- **Aggregation**: hash maps over byte keys with open addressing, sized by record count; spill as bytes to disk.
- **Spill/merge**: sorted runs are byte runs; merge compares byte prefixes.

**Concrete example: `GROUP BY product_id`.** Take six rows whose IDs are `A, B, A, C, B, A`. `BytesToBytesMap` hashes each 4-byte key into a flat power-of-two table (imagine 16 slots) and keeps page/offset pointers to the key and aggregate value; it never creates a boxed `Integer` per key. `A` lands in slot 3; if `C` hashes to the same slot, the map probes slot+1, slot+3, slot+6 (triangular steps) until it finds a free slot. The three groups hold `A=3, B=2, C=1`. The table grows/rehashes once its 0.5 load factor is crossed, keeping probe chains short. If the page fills under pressure, the map spills its key/aggregate bytes as a sorted run; the final merge combines partial counts, so spilling changes speed, not the answer.

Why cache-aware matters: sequential pointer/byte scans prefetch well, avoid per-record object graphs, and keep working sets dense. The 3x sort win reported in the Tungsten announcement [S10] came from this style (`UnsafeExternalSorter`), not from a better sort algorithm.

**Memory hook:** *"Sort the pointers, scan the bytes, spill the bytes."*

---

## 5. Pillar 3: Whole-Stage Codegen - One Function Per Pipeline

The classic Volcano model: each operator is an iterator; each row calls `next()` through several virtual dispatch layers and passes objects. Whole-stage codegen (2.0, "Spark as a compiler" [S11]) instead generates Java source that fuses a pipeline (`scan -> filter -> project -> aggregate`) into a **single loop**:

```text
Volcano:  row -> Filter.next() -> Project.next() -> Aggregate.next()   (virtual calls, objects)
Codegen:  for each input row: { decode fields; if (!pred) continue; update agg state; }  (one function)
```

Measured effect of generated code vs interpreted operators [S11, single-threaded microbenchmarks, Databricks 2016]:

| Operation | Interpreted | Generated | Speedup |
|-----------|-------------|-----------|---------|
| Filter | ~15 ns/row | ~1.1 ns/row | ~14x |
| Sum (int) | ~14 ns/row | ~0.9 ns/row | ~15x |
| Sum (string -> int cast) | ~79 ns/row | ~10.7 ns/row | ~7x |
| Hash join | ~115 ns/row | ~4.0 ns/row | ~29x |
| Sort | ~620 ns/row | ~5.3 ns/row | ~117x |

(Cite these as the blog's microbenchmarks, not universal speedups.)

Mechanics:

- `WholeStageCodegenExec` wraps a codegen-able subtree; `CodeGenerator` emits Java; Janino compiles it at runtime.
- Generated code keeps primitive values in locals/registers, avoids boxing, and inlines predicate checks.
- **Codegen boundaries:** Exchanges, unsupported operators/expressions, Python evaluation and RDD interop can divide generated stages. `SortExec` implements `BlockingOperatorWithCodegen` in 3.5.0 and can fuse while consuming input before producing sorted output.
- Fallback: if a subtree can't be generated, it runs interpreted (`spark.sql.codegen.wholeStage=false` disables the whole thing for debugging). Long generated methods are split to stay under JVM method-size limits.

**Inspecting codegen.** In a Spark 3.5.0 SQL session, disable AQE temporarily to inspect pre-execution codegen; restore it afterward:

```sql
SET spark.sql.adaptive.enabled=false;
EXPLAIN CODEGEN SELECT id + 1 AS x FROM range(0, 100, 1, 2) WHERE id > 10;
EXPLAIN CODEGEN SELECT id FROM range(0, 100, 1, 2) ORDER BY id DESC;
SET spark.sql.adaptive.enabled=true;
```

The first can fuse Range/Filter/Project. The second requires global ordering through a range exchange and sort; its generated subtree can include `SortExec`. The subtree listing and generated sorter calls show the fusion boundaries. Exchanges materialize data; `SortExec` can participate in codegen while blocking for input.

Codegen reduces per-row CPU overhead. I/O, spilling, shuffle and Python evaluation have separate execution paths and costs.

---

## 6. The Serialization Stack (And The Traps)

Serialization is where the abstraction of "rows" becomes bytes on the wire, and it is a frequent source of accidental slowness. The table below maps which path your data is on and what that path costs; the rules after it are the practical defaults.

| Path | Format | When used | Gotcha |
|------|--------|-----------|--------|
| SQL/DataFrame internal | `UnsafeRow` bytes | Operators, shuffle (SQL), cache | Pointer reuse: copy to retain |
| Dataset typed API | `ExpressionEncoder` <-> `UnsafeRow` | Converting case classes to binary | Encoder cost at boundaries; not all types supported |
| RDD API default | Java serialization | `sc.parallelize`, RDD closures, `groupByKey` | Slow, bloated; almost always the wrong choice |
| RDD API tuned | Kryo | Set `spark.serializer=KryoSerializer` | Register classes (`spark.kryo.registrationRequired` for strictness); **registration is required for tungsten-sort eligibility** (chapter 04) |
| Shuffle | Serializer output (SQL: `UnsafeRowSerializer`) | Map output files | Serializer must support **relocation** - copying an already-serialized record to a new buffer/page without deserializing it - for the tungsten writer (`UnsafeRow` and registered Kryo do) |
| Python boundary | Arrow columnar batches | PySpark UDFs, `toPandas` | Row-at-a-time Python UDFs are the slow path; Arrow/Pandas UDFs batch (chapter on PySpark) |

Rules of thumb:

1. Stay in DataFrames/SQL for the binary path; drop to RDDs only for unstructured logic.
2. If you must use RDDs, use Kryo + registration.
3. Never assume a closure is free: it is serialized per task launch (with the driver and executor classpaths aligned).

**Memory hook:** *"SQL rides bytes; RDDs ride objects. Cross the border knowingly."*

---

## 7. Where Tungsten Stops (And Why That's The Rest Of This Module)

| Boundary | Why Tungsten can't reach through | Where it's handled |
|----------|----------------------------------|--------------------|
| Python UDF (row-at-a-time) | Data leaves the JVM per row | Arrow batching / Pandas UDFs |
| Unsupported expression/operator | No codegen template | Interpreted fallback; still `UnsafeRow` |
| RDD dependency mapSideCombine=true | Key combining uses the classic sort writer | SQL partial HashAggregate runs upstream of the exchange with independent writer selection (chapter 04) |
| Sort under `RepartitionByExpression` | Planner-specific | Removed in 3.4 [RN 3.4] |
| I/O (Parquet/ORC scans) | Bytes still must be decoded | Vectorized readers (chapter 07) |
| Shuffle network | Bytes still travel | Contiguous fetch / push-based shuffle (chapter 04) |
| Planning | Codegen happens after planning | Catalyst/AQE (chapter 06) |

That table is the module's map: **Tungsten made the CPU cheap; the remaining cost centers are I/O, shuffles, and planning.**

---

## 8. Failure Modes & Limitations

Tungsten is not magic; it has a small set of failure modes that are easy to recognize once you know them. The cases below are the ones most likely to appear in production and in interviews - notice that none of them require understanding the generated code line by line.

| Symptom | Cause | What to do |
|---------|-------|------------|
| "Whole stage codegen" absent in SQL tab | Codegen disabled/unsupported subtree or adaptive display | Inspect the final plan's generated subtrees and supported operators |
| Codegen compile error at runtime | Unsupported expression/code size | Falls back to interpreted (slower but correct); check driver logs |
| Wrong data after custom `UnsafeRow` handling | Retained a pointer into a reused buffer | `copy()` before storing past the operator call |
| Kryo `ClassNotFoundException` / registration error | Classes not registered / version mismatch | Register classes; keep driver/executor jars identical |
| Off-heap OOM | `Unsafe` memory not accounted for by your sizing | Size the pool explicitly (chapter 02); check `memoryOverhead` |
| Slower after forcing codegen | Codegen benefits are workload-dependent | Measure; small/simple queries may not justify compile cost |

---

## 9. Observability

Most of this chapter can be verified directly in the UI without reading any code. Each signal below tells you which pillar of Tungsten is or is not doing its job.

| Signal | Where | Meaning |
|--------|-------|---------|
| `WholeStageCodegen (n)` boxes in the plan | SQL tab -> plan visualization | Generated stages; distinguish Exchange/unsupported-codegen boundaries from blocking SortExec |
| Codegen compile time in driver logs | Driver log | One-time per query shape (Janino); repeated shapes add up |
| GC time drop after 1.5/2.0 | Executors tab | The object->bytes shift visible in production |
| Spill bytes drop with Tungsten sort | Stage page | Fewer/leaner allocations, better packing - but not zero (spills still happen) |
| `UnsafeRow` size vs object size | Spark UI cache size / Storage tab | Binary representation can be smaller (and is more predictable) |
| Task CPU time per row | Stage metrics | The variable whole-stage codegen actually moves |

---

## 10. Version Notes

The three-pillar model only gets stronger over time; the version history is mostly about how far the binary path reached. Use this table to answer "when did that start working?" questions crisply.

| Version | Change | Why it mattered |
|---------|--------|-----------------|
| 1.4 | Tungsten phase 1: explicit memory management, binary row format, cache-aware binary sort shuffle, serialized shuffle outputs [RN 1.4] | Removed object overhead and GC pressure; 3x sort win [S10] |
| 1.5 | Tungsten on by default; codegen on by default for DataFrame/SQL functions and aggregations [RN 1.5] | Everyone gets the binary path |
| 1.6 | Columnar cache (up to 14x complex-type queries, Databricks 1.6) + off-heap execution [S14] | Cache stores bytes too |
| 2.0 | Whole-stage codegen ("Spark as a compiler") + vectorized Parquet [S15, S11] | Collapses operator pipelines into generated code |
| 2.3 | Vectorized ORC reader (2-5x) [RN 2.3] | Columnar readers extend the byte path |
| 3.4 | Removed `Sort` under `RepartitionByExpression` [RN 3.4] | Fewer pipeline-breaking operators |
| 4.0 | `VARIANT` binary format for semi-structured data [RN 4.0] | Binary representation beyond flat schemas |

---

## 11. The One-Page Recap (memorize this)

1. Tungsten's enemy: per-field objects, boxing, pointer chasing, GC. Its tools: bytes, pointers, generated code.
2. `UnsafeRow` = null bitmap + fixed slots + variable region; copy-to-serialize; reuse forces `copy()` if retained.
3. Sort pointers by prefix; shuffle sorts on partition id only; spill raw bytes.
4. Whole-stage codegen fuses pipelines into one loop; Janino compiles; unsupported ops split the pipeline.
5. Blog numbers (microbenchmarks): filter ~14x, hash join ~29x, sort ~117x per-row vs interpreted [S11].
6. Serialization stack: UnsafeRow (SQL) > Kryo+registration (RDD) > Java serialization (avoid).
7. Codegen helps CPU-bound expression work, not I/O, shuffles, or Python boundaries - know where it stops.

---

## 12. Drills (Cover The Answer Column)

| # | Question | Answer |
|---|----------|--------|
| 1 | Name Tungsten's three pillars. | Binary format (`UnsafeRow`), cache-aware pointer algorithms, whole-stage codegen |
| 2 | What makes `UnsafeRow` serialization cheap? | The in-memory layout is the wire format - serialization is a copy, not per-field encoding |
| 3 | How are variable-length fields stored? | Offset and length (two 32-bit ints) in one 8-byte fixed slot; payload in the variable-length region |
| 4 | Why does sort move pointers, not records? | Avoids copying large byte buffers; pointer array fits cache better |
| 5 | What does whole-stage codegen generate? | One Java function per fusable pipeline; removes virtual `next()` calls and boxing |
| 6 | Does blocking Sort imply no codegen? | No; SortExec supports blocking codegen. Exchange materialization and unsupported codegen are different boundary reasons |
| 7 | When does codegen *not* help? | I/O-bound scans, shuffles/network, Python boundaries, small queries where compile cost dominates |
| 8 | Why does the tungsten shuffle writer need relocation-capable serializers? | It moves raw bytes between pages and spills without deserializing (chapter 04) |
| 9 | Kryo vs Java serialization? | Kryo is faster/smaller; registration recommended, and required for tungsten-sort eligibility |
| 10 | What's the pointer-reuse trap? | `UnsafeRow` buffers are reused; retaining one without copying gives corrupted data |
| 11 | Was whole-stage codegen part of 1.4? | No - phase 1 (binary/algorithms) in 1.4/1.5; whole-stage codegen in 2.0 |
| 12 | Why did Tungsten reduce GC pauses? | Far fewer objects/buffers per row; data lives in pages, not heap object graphs |
| 13 | Does Tungsten apply to the RDD API? | Only indirectly (serialized shuffle machinery); RDD computations still use JVM objects |
| 14 | How would you prove codegen is active for a query? | SQL tab plan shows `WholeStageCodegen`; toggling `spark.sql.codegen.wholeStage` changes task time |
| 15 | A string slot reads `05 00 00 00 28 00 00 00`. What is its offset and size? | Size 5, offset 40: offset is in the high 32 bits and size in the low 32 bits; little-endian bytes put size first |

---

## 13. Key Source Classes (pin refs to a tag, e.g. `apache/spark@v3.5.0`)

| Class | Module | Role |
|-------|--------|------|
| `UnsafeRow`, `UnsafeArrayData`, `UnsafeMapData` | `core/.../unsafe/` | Binary row containers |
| `UnsafeRowSerializer` | `sql/core/.../execution/` / `core/.../sql/` | Byte passthrough for shuffle |
| `UnsafeProjection`, `GenerateUnsafeProjection` | `sql/catalyst/.../expressions/codegen/` | Project rows without objects |
| `UnsafeExternalSorter`, `UnsafeInMemorySorter`, `PrefixComparator` | `core/.../memory/`, `core/.../util/collection/` | Pointer/prefix sorting, byte spills |
| `ShuffleExternalSorter` | `core/.../shuffle/sort/` | Tungsten shuffle writer's sorter (chapter 04) |
| `WholeStageCodegenExec`, `CodeGenerator` | `sql/core/.../execution/`, `sql/catalyst/.../codegen/` | Pipeline fusion and Java emission |
| `ExpressionEncoder`, `RowEncoder` | `sql/catalyst/.../encoders/` | Typed <-> `UnsafeRow` |
| `UnsafeShuffleWriter` | `core/.../shuffle/sort/` | Pointer-sorted serialized shuffle |

---

## 14. Sources Used

- [S10](SOURCES.md) "Project Tungsten: Bringing Spark Closer to Bare Metal" (Databricks, 2015) - binary memory, cache-aware sort (3x), serialization/algorithm direction
- [S11](SOURCES.md) "Spark as a Compiler: Joining a Billion Rows per Second on a Laptop" (Databricks, 2016) - whole-stage codegen and per-row ns microbenchmark table
- [S12](SOURCES.md) "What Is Tungsten?" (Databricks) - three-pillar summary
- [V3](SOURCES.md) "Project Tungsten Deep Dive" (Josh Rosen) - memory/representation internals
- [S14](SOURCES.md), [S15](SOURCES.md) - 1.6 columnar cache/off-heap; 2.0 whole-stage codegen and vectorized Parquet
- [RN 1.4 / 1.5 / 2.3 / 3.4 / 4.0](SOURCES.md) - defaults, ORC vectorization, sort removal, VARIANT
- Official configuration documentation (apache.org) - `spark.serializer`, `spark.kryo.registrationRequired`, `spark.sql.codegen.wholeStage`
