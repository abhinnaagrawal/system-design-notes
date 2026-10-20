# Apache Spark Internals

**Sources:** [SOURCES.md](SOURCES.md) (registry of all papers, books, blogs, release notes, videos used)

**TL;DR:** Spark is a unified analytics engine whose performance history is six stacked optimization campaigns: shuffle data path (hash -> sort -> tungsten -> push-based), memory management (`UnifiedMemoryManager`), binary data representation (`UnsafeRow`), code generation (whole-stage codegen), adaptive planning (CBO -> AQE -> runtime filters), and the Arrow-based Python/ecosystem boundary. This module documents each from architecture down to class and byte-layout level, with every claim tied to a source ID.

**How to use this module:** Read [Appendix B](Appendix%20B%20-%20Optimization%20Evolution%20Map.md) first for the story spine, then chapters 01-06 (the P0 core) in order - every chapter opens with why a mechanism exists before showing any table. Read [Appendix C](Appendix%20C%20-%20The%20Spark%20Acceleration%20Landscape.md) after chapter 06 to connect the internals to the vendor/native-engine landscape. Each chapter ends with a one-page recap and a drills table for spaced revision; cover the answer column and rebuild it from memory. Tables and diagrams are meant as memory anchors, so read the paragraphs around them for the reasoning, and follow the source links only when you want proof.

**Status:** Complete first draft. Appendix B, Appendix C, chapters 01-11, and Appendix A are written; next step is verification (numbers re-read, code refs re-pinned) before "verified" status.

## Start Here

- [Appendix B - The Story of Spark Performance (1.2 -> 4.2)](./Appendix%20B%20-%20Optimization%20Evolution%20Map.md) - story-style version map built for retention: 6 performance campaigns, timeline cheat sheet, cheat cards, 30-second interview answers, and rapid-fire drills.
- [01 - Execution Architecture & Scheduling](./01%20-%20Execution%20Architecture%20&%20Scheduling.md) - driver/executors, DAG cut, execution trace, locality, speculation, drills.
- [02 - Memory Management & Disk Spilling](./02%20-%20Memory%20Management%20&%20Disk%20Spilling.md) - unified pool, borrowing rules, spill mechanics and on-disk formats, OOM vs spill diagnosis.
- [03 - Tungsten, Serialization & Data Representation](./03%20-%20Tungsten,%20Serialization%20&%20Data%20Representation.md) - UnsafeRow, pointer algorithms, whole-stage codegen bytes-vs-objects story.
- [04 - Shuffle, Partitioning & Network Transfer](./04%20-%20Shuffle,%20Partitioning%20&%20Network%20Transfer.md) - the four shuffle generations, writer selection, fetch paths, skew, drills.
- [05 - Physical Operators](./05%20-%20Physical%20Operators%20%28Joins,%20Aggregations,%20Sorting%20&%20Windows%29.md) - join types and strategies, aggregation phases, sorts, windows, anti-patterns.
- [06 - Query Planning (Catalyst & AQE)](./06%20-%20Query%20Planning%20%28Catalyst%20&%20AQE%29.md) - Catalyst phases, CBO, AQE rules, DPP/runtime filters, plan reading.
- [07 - Storage, Caching & File Formats](./07%20-%20Storage,%20Caching%20&%20File%20Formats.md) - BlockManager, storage levels, columnar formats, partitioning/bucketing, small files.
- [08 - Fault Tolerance, Resource Scheduling & Multi-Tenancy](./08%20-%20Fault%20Tolerance,%20Resource%20Scheduling%20&%20Multi-Tenancy.md) - lineage recovery, checkpoints, dynamic allocation, FAIR pools, output commits.
- [09 - JVM, GC & Performance Diagnostics](./09%20-%20JVM,%20GC%20&%20Performance%20Diagnostics.md) - task metrics, bottleneck decision tree, GC causes/levers, tooling.
- [10 - Structured Streaming Internals](./10%20-%20Structured%20Streaming%20Internals.md) - micro-batches, checkpoints, state stores, watermarks, exactly-once contract.
- [11 - Delta Lake & Connector Internals](./11%20-%20Delta%20Lake%20&%20Connector%20Internals.md) - DataSource V2, transaction log, optimistic concurrency, data skipping, time travel.
- [Appendix A - Spark Source Code Map](./Appendix%20A%20-%20Spark%20Source%20Code%20Map.md) - repo layout, per-chapter class anchors, reading order, tag cheat sheet.
- [Appendix C - The Spark Acceleration Landscape](./Appendix%20C%20-%20The%20Spark%20Acceleration%20Landscape.md) - Photon, Lightning, EMR, Synapse/Fabric, Gluten, Comet, Auron, RAPIDS and Uber's platform layer; fallback, benchmark literacy, decision guide, drills.
- [SOURCES.md](./SOURCES.md) - source registry, citation conventions, and per-chapter status.

## Chapters & Status

| # | Chapter | Priority |
|---|---------|----------|
| 01 | [Execution Architecture & Scheduling](./01%20-%20Execution%20Architecture%20&%20Scheduling.md) | P0 (done - draft) |
| 02 | [Memory Management & Disk Spilling](./02%20-%20Memory%20Management%20&%20Disk%20Spilling.md) | P0 (done - draft) |
| 03 | [Tungsten, Serialization & Data Representation](./03%20-%20Tungsten,%20Serialization%20&%20Data%20Representation.md) | P0 (done - draft) |
| 04 | [Shuffle, Partitioning & Network Transfer](./04%20-%20Shuffle,%20Partitioning%20&%20Network%20Transfer.md) | P0 (done - draft) |
| 05 | [Physical Operators - Joins, Aggregations, Sorting & Windows](./05%20-%20Physical%20Operators%20%28Joins,%20Aggregations,%20Sorting%20&%20Windows%29.md) | P0 (done - draft) |
| 06 | [Query Planning - Catalyst & AQE](./06%20-%20Query%20Planning%20%28Catalyst%20&%20AQE%29.md) | P0 (done - draft) |
| 07 | [Storage, Caching & File Formats](./07%20-%20Storage,%20Caching%20&%20File%20Formats.md) | P1 (done - draft) |
| 08 | [Fault Tolerance, Resource Scheduling & Multi-Tenancy](./08%20-%20Fault%20Tolerance,%20Resource%20Scheduling%20&%20Multi-Tenancy.md) | P1 (done - draft) |
| 09 | [JVM, GC & Performance Diagnostics](./09%20-%20JVM,%20GC%20&%20Performance%20Diagnostics.md) | P1 (done - draft) |
| 10 | [Structured Streaming Internals](./10%20-%20Structured%20Streaming%20Internals.md) | P1 (done - draft) |
| 11 | [Delta Lake & Connector Internals](./11%20-%20Delta%20Lake%20&%20Connector%20Internals.md) | P2 (done - draft) |
| A | [Appendix A - Spark Source Code Map](./Appendix%20A%20-%20Spark%20Source%20Code%20Map.md) | P2 (done - draft) |
| B | Appendix B - Optimization Evolution Map | done (draft) |
| C | [Appendix C - The Spark Acceleration Landscape](./Appendix%20C%20-%20The%20Spark%20Acceleration%20Landscape.md) | P1 (done - draft) |
