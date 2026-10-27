# Appendix A - Spark Source Code Map

**Priority:** P2
**Versions:** Apache Spark **3.5.0**.
**Sources:** [SOURCES.md](SOURCES.md) - apache/spark repository structure.

**TL;DR:** A navigation guide for reading Spark: the repository's module layout, which directories answer which interview question, the per-chapter class anchors, and a recommended first-pass reading order. Rule of the house: **always pin a release tag**, never read `master` when explaining a released behavior.

---

## 1. The Repository At A Glance

The repository looks large, but the interview-relevant surface is a handful of directories. Use the map below to decide where to look before you start searching, and treat every other module (MLlib, R, examples) as optional context.

| Module | Path | What lives here |
|--------|------|-----------------|
| Core engine | `core/` | Scheduler, executor, shuffle, storage, memory, broadcast, security |
| SQL - Catalyst | `sql/catalyst/` | Logical plans, expressions, analyzer/optimizer, encoders, `UnsafeRow` |
| SQL - execution | `sql/core/` | Physical operators, DSv2, AQE, streaming, columnar cache, UI |
| SQL - Hive | `sql/hive/` | Hive metastore/serde integration |
| Connectors | `connector/` | Kafka, Avro, Parquet/ORC tests, **Connect** server/client |
| Network shuffle | `common/network-shuffle/` | External shuffle service, block push/merge |
| Common | `common/utils/`, `common/unsafe/` | Utilities; memory/page primitives |
| Resource managers | `resource-managers/yarn/`, `resource-managers/kubernetes/` | YARN/K8s backends |
| Deploy | `core/src/main/scala/org/apache/spark/deploy/` | Standalone mode, driver/executor launching |
| Streaming (legacy) | `streaming/` | DStreams (historical; Structured Streaming is in `sql/`) |
| MLlib | `mllib/` | ML algorithms |
| PySpark | `python/` | Python API, workers, Arrow paths |
| Launcher/scripts | `launcher/`, `bin/`, `sbin/` | `spark-submit`, daemons |

---

## 2. Per-Chapter Class Anchors

GitHub links below are pinned to `v3.5.0`; swap the tag for the version you're discussing.

### 01 - Execution Architecture & Scheduling

| Class | Path |
|-------|------|
| `DAGScheduler`, `DAGSchedulerEventProcessLoop` | [core/.../scheduler/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/scheduler) |
| `TaskSchedulerImpl`, `TaskSetManager` | same directory |
| `CoarseGrainedSchedulerBackend`, `Executor` | [core/.../executor/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/executor) |
| `HeartbeatReceiver` | [core/.../](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark) |

### 02 - Memory Management & Disk Spilling

| Class | Path |
|-------|------|
| `MemoryManager`, `UnifiedMemoryManager` | [core/.../memory/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/memory) (protected storage R) |
| `TaskMemoryManager`, `MemoryConsumer` | [core/src/main/java/.../memory/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/java/org/apache/spark/memory) (spill callback may reclaim zero) |
| `ExternalSorter`, `ExternalAppendOnlyMap` | [core/.../util/collection/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/util/collection) |
| `MemoryStore`, `DiskStore` | [core/.../storage/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/storage) |

### 03 - Tungsten, Serialization & Data Representation

| Class | Path |
|-------|------|
| `UnsafeRow`, `UnsafeArrayData`, `UnsafeMapData` | [sql/catalyst/src/main/java/.../expressions/](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/java/org/apache/spark/sql/catalyst/expressions) |
| `UnsafeProjection`, `GenerateUnsafeProjection` | [sql/catalyst/.../codegen/](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/expressions/codegen) |
| `UnsafeExternalSorter` | [core/src/main/java/.../util/collection/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/java/org/apache/spark/util/collection) |
| `WholeStageCodegenExec`, `CodeGenerator` | [sql/core/.../execution/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution) |
| `ExpressionEncoder`, `RowEncoder` | [sql/catalyst/.../encoders/](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/encoders) |

### 04 - Shuffle, Partitioning & Network Transfer

| Class | Path |
|-------|------|
| `SortShuffleManager`, `SortShuffleWriter`, `UnsafeShuffleWriter`, `BypassMergeSortShuffleWriter` | [core/.../shuffle/sort/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/shuffle/sort) (+ [java](https://github.com/apache/spark/tree/v3.5.0/core/src/main/java/org/apache/spark/shuffle/sort) for the Java writers) |
| `ShuffleExternalSorter`, `ShuffleInMemorySorter`, `PackedRecordPointer` | same Java directory |
| `IndexShuffleBlockResolver` | [core/.../shuffle/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/shuffle) |
| `MapOutputTracker` | [core/.../scheduler/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/scheduler) |
| `ShuffleBlockFetcherIterator` | [core/.../storage/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/storage) |
| `RemoteBlockPushResolver`, `ExternalShuffleService` | [common/network-shuffle/.../shuffle/](https://github.com/apache/spark/tree/v3.5.0/common/network-shuffle/src/main/java/org/apache/spark/network/shuffle) |
| `AQEShuffleReadExec`, `LocalShuffleReader` | [sql/core/.../execution/adaptive/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive) |

### 05 - Physical Operators

| Class | Path |
|-------|------|
| Joins: `BroadcastHashJoinExec`, `ShuffledHashJoinExec`, `SortMergeJoinExec`, `BroadcastNestedLoopJoinExec` | [sql/core/.../execution/joins/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/joins) |
| Aggregates: `HashAggregateExec`, `ObjectHashAggregateExec`, `SortAggregateExec` | [sql/core/.../execution/aggregate/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/aggregate) |
| `SortExec`, `BlockingOperatorWithCodegen`, `TakeOrderedAndProjectExec` | sql/core/.../execution/ (blocking is distinct from codegen exclusion) |
| `WindowExec` | [sql/core/.../execution/window/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/window) |

### 06 - Query Planning (Catalyst & AQE)

| Class | Path |
|-------|------|
| `Analyzer`, `Optimizer`, `SparkOptimizer`, `CostBasedJoinReorder` | [sql/catalyst/.../analysis/](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/analysis), [optimizer](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/optimizer) |
| `RuleExecutor`, `Rule`, `Batch` | [sql/catalyst/.../rules/](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/rules) |
| `SparkPlanner`, `SparkStrategies` | [sql/core/.../execution/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution) |
| `AdaptiveSparkPlanExec`, `QueryStageExec`, AQE rules | [sql/core/.../execution/adaptive/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/adaptive) |
| `DynamicPartitionPruning` | [sql/catalyst/.../optimizer/](https://github.com/apache/spark/tree/v3.5.0/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/optimizer) |

### 07 - Storage, Caching & File Formats

| Class | Path |
|-------|------|
| `BlockManager`, `MemoryStore`, `DiskStore` | [core/.../storage/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/storage) |
| `InMemoryRelation`, `InMemoryTableScanExec` | [sql/core/.../execution/columnar/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/columnar) |
| `ParquetFileFormat`, `VectorizedParquetRecordReader`, `OrcFileFormat` | [sql/core/.../execution/datasources/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources) |

### 08 - Fault Tolerance & Resource Scheduling

| Class | Path |
|-------|------|
| `ExecutorAllocationManager` | [core/.../executor/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/executor) |
| `ExecutorDecommissionInfo` | same directory |
| FAIR scheduler (`FairSchedulableBuilder`, `Pool`) | [core/.../scheduler/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/scheduler) |

### 09 - JVM, GC & Diagnostics

| Class | Path |
|-------|------|
| `TaskMetrics`, `ExecutorMetrics` | [core/.../executor/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/executor) |
| `MetricsSystem`, `SparkUI`, `AppStatusStore` | [core/.../metrics/](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/metrics), [ui](https://github.com/apache/spark/tree/v3.5.0/core/src/main/scala/org/apache/spark/ui) |

### 10 - Structured Streaming

| Class | Path |
|-------|------|
| `MicroBatchExecution`, `IncrementalExecution` | [sql/core/.../execution/streaming/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/streaming) |
| `StateStore`, `HDFSBackedStateStoreProvider`, `RocksDBStateStoreProvider` | [sql/core/.../execution/streaming/state/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/streaming/state) |
| `KafkaSource` | [connector/kafka-0-10-sql/](https://github.com/apache/spark/tree/v3.5.0/connector/kafka-0-10-sql) |

### 11 - Delta Lake & Connectors

| Class | Path |
|-------|------|
| DSv2 contract classes | [sql/core/.../connector/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/connector) |
| V2 planning/execution | [sql/core/.../execution/datasources/v2/](https://github.com/apache/spark/tree/v3.5.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/v2) |
| Spark Connect | [connector/connect/](https://github.com/apache/spark/tree/v3.5.0/connector/connect) |
| Delta Lake (`DeltaLog`, `OptimisticTransaction`) | [delta-io/delta](https://github.com/delta-io/delta) (pin a Delta release tag) |

---

## 3. Recommended Reading Order (First Pass)

A first pass should follow work through the system rather than read modules alphabetically. The order below mirrors chapters 01-10, so the code reinforces the narrative you already know:

1. **`DAGScheduler` -> `TaskSchedulerImpl` -> `Executor`** - how work is cut and placed (chapter 01).
2. **`UnifiedMemoryManager` + `TaskMemoryManager`** - how work fits in memory (chapter 02).
3. **`UnsafeRow` + `WholeStageCodegenExec`** - how data is represented and computed (chapter 03).
4. **`SortShuffleManager` writer selection** - why shuffle behaves as it does (chapter 04).
5. **`AdaptiveSparkPlanExec` + AQE rules** - how plans change mid-flight (chapter 06).
6. **`MicroBatchExecution` + state store** - how streams make progress (chapter 10).

Reading technique:

- Start at the **entry method** of the "manager" class (`submitStage`, `submitTasks`, `registerShuffle`, `createQueryExecution`, `runBatch`) and follow the calls; ignore private helpers until needed.
- Search by symbol (`git grep ClassName`) rather than reading directories linearly.
- Match every claim to a **tag**, and note the version when behavior changed (release notes + code diff together).
- For Java/Scala mix (shuffle writers, memory), expect the hot path in Java and orchestration in Scala.

---

## 4. Pin-Your-Tag Cheat Sheet

Tags are the anchor for every claim you make about released behavior. When a question starts with "when did Spark...", the answer is a diff between two tags - and the table below tells you which tags are worth defaulting to.

| Version tag | Why you'd pin it |
|-------------|------------------|
| `v1.2.0` | Sort shuffle default era |
| `v1.5.0` | Tungsten default on |
| `v1.6.0` | Unified memory + columnar cache |
| `v2.0.0` | Whole-stage codegen |
| `v2.4.0` | Barrier scheduling |
| `v3.0.0` | AQE introduced |
| `v3.2.0` | AQE default + push-based shuffle |
| `v3.4.0` | Decommission shuffle migration; Connect client |
| `v3.5.0` | Connect GA; recommended modern reading tag |
| `v4.0.0` | JDK 17 baseline; VARIANT |

Links in this appendix use `v3.5.0` as the canonical reading tag; re-pin to the exact version in question when answering version-specific questions.

---

## 5. Sources Used

- [apache/spark](https://github.com/apache/spark) repository layout and version tags
- Per-chapter source lists in this module; [SOURCES.md](SOURCES.md) for citation conventions
