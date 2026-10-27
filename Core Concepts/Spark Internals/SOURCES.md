# Spark Internals - Source Registry

This file is the single source of truth for everything cited in the Spark Internals chapters. Every claim in the docs should carry an ID from this file (e.g. `[S10]`), and every ID should be verifiable.

## Conventions

**Baseline: Spark 3.5.0 / Delta protocol 3.0.0.** See [module version scope](README.md#guarantees-assumptions--version-scope).

- Every claim in the docs should be traceable to a source in this file: papers, books, official docs/release notes, or engineering blogs. No claim without a provable source.
- **IDs** (`S*` = primary sources, `RN *` = release notes, `V*` = videos, `W*` = wiki) are stable once assigned; chapters may also cite a source by name/URL directly for readability.
- **Numbers** must state who measured them (e.g. "Databricks, 2020") and the benchmark context (TPC-DS scale, stats collected) at the point of use.
- **Code references** are pinned to a release tag, never `master`, e.g. `apache/spark@v3.5.0:sql/core/.../AdaptiveSparkPlanExec.scala`.
- **Status legend:** `sources mapped` -> `drafted` -> `verified` (numbers re-read against the source, code refs pinned).

## Papers & Books

| ID | Source | Type | Used For | Status |
|----|--------|------|----------|--------|
| S1 | [Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing (NSDI '12)](https://people.csail.mit.edu/matei/papers/2012/nsdi_spark.pdf) | Paper | RDD lineage, execution model, scheduler foundations | sources mapped |
| S2 | [Spark: Cluster Computing with Working Sets (HotCloud '10)](https://www.usenix.org/legacy/event/hotcloud10/tech/full_papers/Zaharia.pdf) | Paper | Original design intent, in-memory working sets | sources mapped |
| S3 | [Spark SQL: Relational Data Processing in Spark (SIGMOD '15)](https://people.csail.mit.edu/matei/papers/2015/sigmod_spark_sql.pdf) | Paper | Catalyst design, codegen motivation | sources mapped |
| S4 | [Apache Spark: A Unified Engine for Big Data Processing (CACM '16)](https://cacm.acm.org/research/apache-spark) | Paper | Unified engine thesis, evolution narrative | sources mapped |
| S5 | [Discretized Streams (HotCloud '12)](https://www.usenix.org/conference/hotcloud12/workshop-program/presentation/zaharia) + [SOSP '13 PDF](https://www.cl.cam.ac.uk/~ey204/teaching/ACS/R212_2015_2016/papers/zaharia_sosp_2013.pdf) | Paper | Structured Streaming lineage | sources mapped |
| S6 | [The Internals of Apache Spark - Jacek Laskowski](https://books.japila.pl/apache-spark-internals) | Book | Scheduler, memory, shuffle, storage internals | sources mapped |
| S7 | [The Internals of Spark SQL - Jacek Laskowski](https://books.japila.pl/spark-sql-internals) | Book | Catalyst, physical operators, AQE | sources mapped |
| S8 | [The Internals of PySpark - Jacek Laskowski](https://books.japila.pl/pyspark-internals) | Book | PySpark execution path, Arrow | sources mapped |
| S22 | [Delta Lake: High-Performance ACID Table Storage over Cloud Object Stores (VLDB 2020)](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf) | Paper | Transaction log, ACID, optimistic concurrency, time travel | sources mapped |

## Engineering Blogs & Talks (written)

| ID | Source | Used For | Status |
|----|--------|----------|--------|
| S9 | [Deep Dive into Spark SQL's Catalyst Optimizer (Databricks, 2015)](https://www.databricks.com/blog/2015/04/13/deep-dive-into-spark-sqls-catalyst-optimizer.html) | Catalyst phases, tree transformations | sources mapped |
| S10 | [Project Tungsten: Bringing Spark Closer to Bare Metal (Databricks, 2015)](https://www.databricks.com/blog/2015/04/28/project-tungsten-bringing-spark-closer-to-bare-metal.html) | Binary memory, cache-aware sort (3x), serializers | sources mapped |
| S11 | [Spark as a Compiler: Joining a Billion Rows per Second on a Laptop (Databricks, 2016)](https://www.databricks.com/blog/2016/05/23/apache-spark-as-a-compiler-joining-a-billion-rows-per-second-on-a-laptop.html) | Whole-stage codegen, per-row ns timings | sources mapped |
| S12 | [What Is Tungsten? (Databricks)](https://www.databricks.com/blog/what-is-tungsten) | Tungsten summary | sources mapped |
| S13 | [Announcing Apache Spark 1.5 (Databricks, 2015)](https://www.databricks.com/blog/2015/09/09/announcing-apache-spark-1-5.html) | 1.5 operator improvements, Tungsten defaults | sources mapped |
| S14 | [Announcing Apache Spark 1.6 (Databricks, 2016)](https://www.databricks.com/blog/2016/01/04/announcing-apache-spark-1-6.html) | Parquet reader numbers, unified memory, mapWithState 10x | sources mapped |
| S15 | [Introducing Apache Spark 2.0 (Databricks, 2016)](https://www.databricks.com/blog/2016/07/26/introducing-apache-spark-2-0.html) | 2.0 feature set, second-gen Tungsten | sources mapped |
| S16 | [Adaptive Query Execution: Speeding Up Spark SQL at Runtime (Databricks, 2020)](https://www.databricks.com/blog/2020/05/29/adaptive-query-execution-speeding-up-spark-sql-at-runtime.html) | AQE mechanics, up to 8x TPC-DS | sources mapped |
| S17 | [Introducing Apache Spark 3.0 (Databricks, 2020)](https://www.databricks.com/blog/2020/06/18/introducing-apache-spark-3-0-now-available-in-databricks-runtime-7-0.html) | 2x TPC-DS vs 2.4, DPP 2-18x | sources mapped |
| S18 | [Introducing Apache Spark 3.3 (Databricks, 2022)](https://www.databricks.com/blog/2022/06/15/introducing-apache-spark-3-3-for-databricks-runtime-11-0.html) | Bloom filter joins (10x), Parquet complex-type vectorization (15x) | sources mapped |
| S19 | [Adaptive and Robust Query Execution for Lakehouses at Scale (VLDB 2024)](https://www.vldb.org/pvldb/vol17/p3947-bu.pdf) | AQE production numbers (up to 25x/query, 1.7x total) | sources mapped |
| S20 | [Introducing Apache Spark 4.1 (Databricks, 2025)](https://www.databricks.com/blog/introducing-apache-sparkr-41) | VARIANT shredding numbers, SDP, Real-Time Mode | sources mapped (URL verified; slug is unconventional) |
| S21 | [Introducing Apache Spark 4.2 (Databricks, 2026)](https://www.databricks.com/blog/introducing-apache-spark-42) | 4.2 features, Arrow defaults, NEAREST BY | sources mapped |

## Specs, Docs & Repositories

| ID | Source | Used For | Status |
|----|--------|----------|--------|
| S23 | [Delta Lake Protocol v3.0.0](https://github.com/delta-io/delta/blob/v3.0.0/PROTOCOL.md) | Log actions, txn appId/version, checkpoint pointer, protocol versions, isolation | pinned reference |
| S24 | [Delta Lake Documentation](https://docs.delta.io/latest/index.html) | Time travel, VACUUM/OPTIMIZE behavior, retention defaults, conflict exceptions | sources mapped |

## Native Engines & Accelerators

### Pinned mechanism references for corrections

- [UnifiedMemoryManager v3.5.0](https://github.com/apache/spark/blob/v3.5.0/core/src/main/scala/org/apache/spark/memory/UnifiedMemoryManager.scala): protected occupied storage R and execution/storage borrowing.
- [MemoryConsumer v3.5.0](https://github.com/apache/spark/blob/v3.5.0/core/src/main/java/org/apache/spark/memory/MemoryConsumer.java): spill callback can reclaim zero.
- [ShuffleExchangeExec v3.5.0](https://github.com/apache/spark/blob/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/exchange/ShuffleExchangeExec.scala) and [Dependency](https://github.com/apache/spark/blob/v3.5.0/core/src/main/scala/org/apache/spark/Dependency.scala): SQL partial aggregation differs from dependency mapSideCombine.
- [SQL tuning v3.5.0](https://github.com/apache/spark/blob/v3.5.0/docs/sql-performance-tuning.md): AQE local reading, parallelismFirst/advisory size and adaptive broadcast threshold; [OptimizeSkewedJoin](https://github.com/apache/spark/blob/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive/OptimizeSkewedJoin.scala) implements skew-join splitting.
- [SortExec v3.5.0](https://github.com/apache/spark/blob/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/SortExec.scala): BlockingOperatorWithCodegen.
- [TaskSetManager v3.5.0](https://github.com/apache/spark/blob/v3.5.0/core/src/main/scala/org/apache/spark/scheduler/TaskSetManager.scala) and [job scheduling](https://github.com/apache/spark/blob/v3.5.0/docs/job-scheduling.md): counted failure abort and FIFO priority.
- [StorageLevel v3.5.0](https://github.com/apache/spark/blob/v3.5.0/common/utils/src/main/scala/org/apache/spark/storage/StorageLevel.scala): OFF_HEAP includes disk.
- [Streaming guide v3.5.0](https://github.com/apache/spark/blob/v3.5.0/docs/structured-streaming-programming-guide.md), [Kafka integration](https://github.com/apache/spark/blob/v3.5.0/docs/structured-streaming-kafka-integration.md), [MicroBatchExecution](https://github.com/apache/spark/blob/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/streaming/MicroBatchExecution.scala): operator-dependent watermark/state, native sessions, Kafka at-least-once, offsets-before/completion-after ordering.
- [Delta storage documentation](https://docs.delta.io/latest/delta-storage/): LogStore writer publication and storage requirements. `_last_checkpoint` supports reader snapshot discovery (S23).

Vendor claims are vendor-reported unless marked as an independent paper; the appendix labels each number with its baseline and date.

| ID | Source | Type | Used For | Status |
|----|--------|------|----------|--------|
| S25 | [Photon: A Fast Query Engine for Lakehouse Systems (SIGMOD '22)](https://people.eecs.berkeley.edu/~matei/papers/2022/sigmod_photon.pdf) | Paper | Photon architecture, JNI plan handoff, vectorized interpretation, 3x average / >10x max | sources mapped |
| S26 | [Announcing Photon Engine General Availability (Databricks, 2022)](https://www.databricks.com/blog/2022/08/03/announcing-photon-engine-general-availability-on-the-databricks-lakehouse-platform.html) | Blog | Photon GA, DBR 11.1, interactive SQL and TCO claims | sources mapped |
| S27 | [Photon documentation (Databricks)](https://docs.databricks.com/aws/en/compute/photon) | Docs | Default enablement, hash-join preference, stateful streaming limitation | sources mapped |
| S28 | [Photon product page (Databricks)](https://www.databricks.com/product/photon) | Product page | 2x TPC-DS 1TB, 3-8x interactive, 12x price/performance marketing claims | sources mapped |
| S29 | [Introducing Lightning Engine for Apache Spark (Google Cloud)](https://cloud.google.com/blog/products/data-analytics/introducing-lightning-engine-for-apache-spark) | Blog | Lightning layers and preview | sources mapped |
| S30 | [Lightning Engine performance deep dive (Google Cloud)](https://cloud.google.com/blog/products/data-analytics/lighting-engine-for-apache-spark-performance-deep-dive) | Blog | GA, 4.9x, 2x price-performance, architecture | sources mapped |
| S31 | [Lightning Engine documentation (Google Cloud)](https://docs.cloud.google.com/managed-spark/docs/guides/lightning-engine) | Docs | NQE on Gluten/Velox, 10TB TPC-H-like benchmark, premium tier | sources mapped |
| S32 | [Apache Spark on Amazon EMR](https://aws.amazon.com/emr/features/spark/) | Product page | Default runtime, 100% API compatibility, 4.5x and 2.7x claims | sources mapped |
| S33 | [Run Apache Spark and Iceberg 4.5x faster with Amazon EMR (AWS, 2025)](https://aws.amazon.com/blogs/big-data/run-apache-spark-and-iceberg-4-5x-faster-than-open-source-spark-with-amazon-emr) | Blog | Benchmark setup, 1,349.62s vs 6,113.92s, cost comparison | sources mapped |
| S34 | [New Query Optimization Techniques in the Spark Engine of Azure Synapse (VLDB 2022)](https://vldb.org/pvldb/vol15/p936-rajan.pdf) | Paper | Exchange placement, partial push-down, peephole rules, 1.8x | sources mapped |
| S35 | [Under the hood: Fabric Native Execution Engine (Microsoft)](https://blog.fabric.microsoft.com/en-us/blog/under-the-hood-an-introduction-to-the-native-execution-engine-for-microsoft-fabric) | Blog | Gluten/Velox architecture, single config, up to 6x | sources mapped |
| S36 | [Native execution engine for Fabric Data Engineering (Microsoft Learn)](https://learn.microsoft.com/en-us/fabric/data-engineering/native-execution-engine-overview) | Docs | Runtime 1.3/2.0, preserved AQE/CBO, formats, limitations | sources mapped |
| S37 | [Fabric NEE now generally available (Microsoft, 2025)](https://community.fabric.microsoft.com/blog/fbc_fabricupdatesblogs/microsoft-fabric-data-engineering-native-execution-engine-now-generally-availabl/5172751) | Blog | GA date, preview 4x, GA up to 6x, native Delta writes, deletion vectors | sources mapped |
| S38 | [Apache Gluten project site](https://gluten.apache.org/) | Project site | Architecture, fallback, 3.34x TPC-H / 3.02x TPC-DS, TLP status | sources mapped |
| S39 | [Apache Gluten Velox documentation](https://github.com/apache/gluten/blob/main/docs/get-started/Velox.md) | Docs | Supported Spark versions and build requirements | sources mapped |
| S40 | [Apache DataFusion Comet documentation](https://datafusion.apache.org/comet) | Docs | 1.0/1.1 releases, DataFusion/Rust architecture, ~2x TPC-DS 1TB | sources mapped |
| S41 | [Apache Auron project site](https://auron.apache.org/) + [repository](https://github.com/apache/auron) | Project site / repo | Rust/DataFusion, expression-level fallback, ~2x vs Spark 3.5, former Blaze | sources mapped |
| S42 | [RAPIDS Accelerator for Apache Spark documentation](https://docs.nvidia.com/spark-rapids/user-guide/24.06/additional-functionality/rapids-shuffle.html) | Docs | Plugin architecture, fallback, shuffle manager, RDD limitation | sources mapped |
| S43 | [RAPIDS Accelerator solution overview (NVIDIA)](https://images.nvidia.com/aem-dam/Solutions/documents/public-sector-solution-overview-spark.pdf) | Solution brief | Up to 5x, 4x lower infrastructure cost, NDS/GH200 results, licensing note | sources mapped |
| S44 | [Uber's Strategy to Upgrading 2M+ Spark Jobs (Uber)](https://www.uber.com/us/en/blog/ubers-strategy-to-upgrading-2m-spark-jobs) | Engineering blog | Scale, Spark 2.4->3.3 migration, AQE/DPP gains, Zeus, Gluten/Velox | sources mapped |
| S45 | [Making Apache Spark Effortless for All of Uber (uSCS)](https://www.uber.com/us/en/blog/uscs-apache-spark) | Engineering blog | uSCS control plane over Livy | sources mapped |
| S46 | [Sparkle: Standardizing Modular ETL at Uber](https://www.uber.com/us/en/blog/sparkle-modular-etl) | Engineering blog | ETL framework, Hive-to-Spark gains | sources mapped |

## Release Notes (apache.org)

| ID | Source | Used For | Status |
|----|--------|----------|--------|
| RN 1.2 | [Spark Release 1.2.0](https://spark.apache.org/releases/spark-release-1-2-0.html) | Sort-based shuffle default, Netty, elastic scaling | sources mapped |
| RN 1.4 | [Spark Release 1.4.0](https://spark.apache.org/releases/spark-release-1-4-0.html) | Tungsten phase 1: serialized shuffle outputs, cache-aware binary sort shuffle, Python spill | sources mapped |
| RN 1.5 | [Spark Release 1.5.0](https://spark.apache.org/releases/spark-release-1-5-0.html) | Tungsten default on, cache-friendly layouts | sources mapped |
| RN 1.6 | [Spark Release 1.6.0](https://spark.apache.org/releases/spark-release-1-6-0.html) | Unified memory management, Parquet reader, columnar cache 14x, off-heap execution | sources mapped |
| RN 2.2 | [Spark Release 2.2.0](https://spark.apache.org/releases/spark-release-2-2-0.html) | CBO: cardinality estimation, join reordering, star-schema heuristics, object-based aggregate | sources mapped |
| RN 2.3 | [Spark Release 2.3.0](https://spark.apache.org/releases/spark-release-2-3-0.html) | Vectorized ORC 2-5x, Zstd, spill read-ahead, CBO histograms | sources mapped |
| RN 3.0 | [Spark Release 3.0.0](https://spark.apache.org/releases/spark-release-3-0-0.html) | AQE, DPP, local shuffle reader, skew join | sources mapped |
| RN 3.1 | [Spark Release 3.1.1](https://spark.apache.org/releases/spark-release-3-1-1.html) | Host-local shuffle read, shuffle-elimination rules, ESD | sources mapped (3.1.0 page not yet fetched - verify parity) |
| RN 3.2 | [Spark Release 3.2.0](https://spark.apache.org/releases/spark-release-3-2-0.html) | Push-based shuffle, AQE default, RocksDB state store, ANSI GA | sources mapped |
| RN 3.3 | [Spark Release 3.3.0](https://spark.apache.org/releases/spark-release-3-3-0.html) | Runtime filters, Parquet complex types, AQE joins | sources mapped |
| RN 3.4 | [Spark Release 3.4.0](https://spark.apache.org/releases/spark-release-3-4-0.html) | Spark Connect, AQE cache, stage stats reuse | sources mapped |
| RN 3.5 | [Spark Release 3.5.0](https://spark.apache.org/releases/spark-release-3-5-0.html) | Spark Connect GA, Arrow Python UDFs | sources mapped |
| RN 4.0 | [Spark Release 4.0.0](https://spark.apache.org/releases/spark-release-4-0-0.html) | ANSI default, VARIANT, collation, Spark Connect client | sources mapped |
| RN 4.1 | [Spark Release 4.1.0](https://spark.apache.org/releases/spark-release-4.1.0.html) | SDP, Real-Time Mode, VARIANT GA, checksum stage retry | sources mapped |
| RN 4.2 | [Spark Release 4.2.0](https://spark.apache.org/releases/spark-release-4-2-0.html) | Geospatial, CDC, NEAREST BY, Arrow UDF default | sources mapped |

## Videos

| ID | Source | Used For | Status |
|----|--------|----------|--------|
| V1 | [Shuffle Deep Dive - Aaron Davidson](https://www.youtube.com/watch?v=dmL0N3qfSc8) | Shuffle internals | sources mapped |
| V2 | [Adaptive Query Execution Deep Dive - Maryann Xue](https://www.youtube.com/watch?v=ywPuZ_WrHT0) | AQE internals | sources mapped |
| V3 | [Project Tungsten Deep Dive - Josh Rosen](https://www.youtube.com/watch?v=5ajs8EIPWGI) | Tungsten internals | sources mapped |
| V4 | [Spark Internals - Jacek Laskowski](https://www.youtube.com/watch?v=8D4k-hDqo-c) | Architecture overview | sources mapped |
| V5 | [AQE Talk](https://www.youtube.com/watch?v=jzrEc4r90N8) | AQE | sources mapped |
| V6 | [Matei Zaharia talks](https://www.youtube.com/watch?v=49Hr5xZyTEA) | Design history | sources mapped |
| V7 | [Daniel Tomes - Spark performance](https://www.youtube.com/watch?v=daXEp4HmS-E) | Performance tuning | sources mapped |

## Wiki (historical, largely obsolete after 2016)

| ID | Source | Used For | Status |
|----|--------|----------|--------|
| W1 | [Spark Internals (cwiki)](https://cwiki.apache.org/confluence/spaces/SPARK/pages/34837371/Spark+Internals) | Historical context | ⚠️ Obsolete - do not cite as current |
| W2 | [Shuffle Internals (cwiki)](https://cwiki.apache.org/confluence/spaces/SPARK/pages/57906230/Shuffle+Internals) | Historical shuffle design | ⚠️ Obsolete - do not cite as current |

## Per-Chapter Status Tracker

| Deliverable | Sources | Status |
|-------------|---------|--------|
| Appendix B - Optimization Evolution Map | S10-S21, RN 1.2-4.2 | drafted (story form) |
| 01 - Execution Architecture & Scheduling | S1, S2, S6, V4 | drafted |
| 02 - Memory Management & Disk Spilling | S6, S13, S14 | drafted |
| 03 - Tungsten, Serialization & Data Representation | S10, S11, S12, V3 | drafted |
| 04 - Shuffle, Partitioning & Network Transfer | S10, S6, V1, RN 1.2-4.2 | drafted |
| 05 - Physical Operators | S7, S13, S18 | drafted |
| 06 - Query Planning (Catalyst & AQE) | S3, S9, S16, S19, V2, V5 | drafted |
| 07 - Storage, Caching & File Formats | S14, S18, RN 1.6-4.2 | drafted |
| 08 - Fault Tolerance, Resource Scheduling & Multi-Tenancy | S1, S6, RN 3.4-4.1 | drafted |
| 09 - JVM, GC & Performance Diagnostics | S6, S7 | drafted |
| 10 - Structured Streaming Internals | S5, RN 2.3-4.1 | drafted |
| 11 - Delta Lake & Connector Internals | S22, S23, S24, S7, RN 3.4-4.2 | drafted |
| Appendix A - Spark Source Code Map | github.com/apache/spark | drafted |
| Appendix C - The Spark Acceleration Landscape | S25-S46 | drafted (vendor claims dated and labeled) |
