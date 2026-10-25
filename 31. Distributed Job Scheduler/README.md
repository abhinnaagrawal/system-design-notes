# Chapter 31: Design a Distributed Job Scheduler (6+ Approaches)

Based on the system design breakdown from **[System Design Fight Club - Atlassian Interview Question: Job Scheduler (6+ Approaches)](https://www.youtube.com/watch?v=ur3ioZhwG8w)** with additions for Staff/Principal-level evaluation.

---

## 1. Executive Summary & Senior vs. Staff Framing

| Dimension | Mid-Senior Level (L5) | Staff / Principal Level (L6+) |
| :--- | :--- | :--- |
| **Architectural Model** | Suggests a relational database where worker daemons run `SELECT ... FOR UPDATE` polling loops or relies on a basic Celery queue. | Categorizes workloads into Short-Lived Tasks ($<30\text{s}$) vs. Long-Running Distributed Workflows (DAGs / Temporal). Identifies that database polling collapses above 500 TPS and designs event-driven ingestion with Transactional Outbox + CDC. |
| **Delayed Execution** | Polls future timestamps in SQL or maintains long-lived sleep threads inside application memory. | Evaluates memory-efficient time-indexed structures: Hashed Hierarchical Timing Wheels ($O(1)$ tick complexity) or Redis Sorted Sets (`ZSET` with score = epoch timestamp) with Lua atomic extraction. |
| **Worker Failure & Split-Brain** | Relies on simple heartbeat timeouts. When a worker stops responding, immediately marks the job failed and restarts it on another worker. | Identifies the **Zombie Worker** anomaly (GC pause or network partition causes heartbeat loss; worker wakes up late and writes corrupted output). Solves it via **Monotonic Fencing Tokens** and conditional ACID writes. |
| **Scale & Multi-Tenancy** | Puts all jobs into a single global FIFO queue; large tenants starve smaller tenants ("noisy neighbor" disaster). | Implements Multi-Tenant Fair-Share Scheduling (e.g. Deficit Round-Robin or partitioned Kafka topics per tenant tier) and mitigates the Midnight UTC Thundering Herd via schedule jitter. |

---

## 2. 5-Pillar Staff Assessment Rubric

The following rubric outlines the exact behaviors and evidence an interviewer evaluates:

| Pillar | Staff/Principal Level Evidence in Distributed Job Schedulers |
| :--- | :--- |
| **Decision Making** | • Clarifies early: asks whether jobs are stateless micro-tasks ($<5\text{s}$) or multi-stage distributed DAG pipelines (ETL/Spark); clarifies execution SLA ($<1\text{s}$ dispatch vs. best-effort).<br>• Compares 6 credible architectures: DB Polling with `SKIP LOCKED`, Message Queues, Transactional Outbox, Redis ZSET Timers, Distributed Cron + Reaper, and Partitioned Shards.<br>• Justifies accepted tradeoffs: accepts at-least-once execution and requires idempotent task consumers rather than attempting impossible network-level exactly-once execution. |
| **Technical Proficiency** | • Explains concurrency and locking mechanics: explains why `SELECT ... FOR UPDATE SKIP LOCKED` eliminates row lock contention but still saturates database connection pools and table indexes.<br>• Articulates timing data structures: contrasts Hierarchical Timing Wheels ($O(1)$ operations with cascading minute/hour wheels) against Redis Skip Lists ($O(\log N)$ ZSETs).<br>• Solves the dual-write problem: uses PostgreSQL Transactional Outbox + Debezium CDC to guarantee zero lost jobs between the status database and Kafka brokers. |
| **Problem Solving & Analytical Thinking** | • Calculates worker capacity via Little's Law: $10,000\text{ TPS} \times 5\text{s average duration} = 50,000\text{ concurrent execution slots required}$.<br>• Derives metadata storage growth: $10,000\text{ TPS} \times 200\text{ bytes} \approx 2\text{ MB/sec} = 172.8\text{ GB/day}$; defines 14-day cold retention offload to S3/Parquet.<br>• Connects APIs, state machines (`PENDING` $\to$ `SCHEDULED` $\to$ `RUNNING` $\to$ `COMPLETED` / `FAILED`), heartbeat registries, and output storage tiers. |
| **Operational Mindset** | • Solves the Zombie Worker split-brain: issues monotonic fencing tokens upon lease renewal so stale workers cannot overwrite newer worker output.<br>• Protects against Poison Pill jobs: automatically moves jobs failing $>3$ times to a Dead Letter Queue (DLQ) with alert webhooks to avoid killing worker pods in infinite crash loops.<br>• Implements POSIX `SIGTERM` 30-second graceful drain handling, worker container cgroup isolation (CPU/memory limits), and Kafka consumer lag-based autoscaling. |
| **Adaptability & Collaboration** | • Responds constructively to curveballs: resolves the Midnight UTC Cron Thundering Herd (10,000 cron jobs firing at `00:00:00`) by introducing deterministic $\pm 60\text{s}$ schedule jitter.<br>• Balances short-term tactical delivery (e.g., PostgreSQL queue for MVP) with seamless migration path to partitioned Kafka when throughput crosses 5,000 TPS. |

---

## 3. Understand the Problem & Establish Scope

A Job Scheduler is a distributed system responsible for accepting computational tasks, scheduling their execution (either immediately, at a future timestamp, or on a recurring cron interval), dispatching them to available worker nodes, tracking their lifecycle, and persisting output.

### Real-World Analogues
- **Atlassian Ecosystem:** Bamboo CI/CD build agents, Jira asynchronous automation rules, Confluence content indexing pipelines.
- **Dropbox:** Asynchronous file processing and thumbnail generation infrastructure (the famous Dropbox scheduler handling $10,000+\text{ TPS}$).
- **Cloud Task Runners:** AWS Lambda / AWS Batch / Fargate task orchestrators.
- **Open-Source Systems:** Quartz Scheduler, Celery, Temporal, Apache Airflow.

---

### Workload Taxonomy: Two Critical Dimensions

#### 1. Execution Duration
- **Short-Lived Tasks ($< 30\text{ seconds}$):** Webhook dispatch, image thumbnailing, sending emails/SMS, cache warming (similar to AWS Lambda).
- **Long-Running Batch Jobs (Minutes to Hours):** Spark queries, database backups, financial end-of-day reconciliation, machine learning training pipelines.

#### 2. Trigger Scheduling
- **Immediate Execution:** Execute as soon as a worker becomes available (FIFO or priority queue).
- **Delayed Execution:** Run once at a designated future timestamp (e.g., in 2 hours).
- **Recurring Execution (Cron):** Periodically trigger execution based on a cron expression (e.g., `0 0 * * *`).

---

### Requirements

#### Functional Requirements
1. **Submit Job:** Users or upstream microservices submit a job with a command/payload, schedule time, and priority.
2. **Execute Job:** Dispatch the job to an available worker machine and monitor its progress.
3. **Status Inspection:** Query the current lifecycle state of a job (`PENDING`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `FAILED`).
4. **Retrieve Output:** View the stdout/stderr or output artifacts generated by the job.
5. **Heartbeat & Fault Tolerance:** If a worker node crashes mid-execution, detect the failure and reschedule the orphan job.
6. **Support Multiple Schedules:** Support immediate, delayed, and recurring cron jobs.

#### Non-Functional Requirements
- **High Reliability (Never Lose a Job):** Jobs must be durably persisted before acknowledgment (at-least-once execution guarantee).
- **Scalability Across Scale Tiers:**
  - *Tier 1 (Internal):* $< 1,000\text{ TPS}$.
  - *Tier 2 (Enterprise / Dropbox Scale):* $\sim 10,000\text{ TPS}$.
  - *Tier 3 (Internet / Cloud Scale):* $> 100,000\text{ TPS}$ (AWS Lambda scale).
- **Low Dispatch Latency:** Minimal delay ($< 1\text{ second}$) between a job becoming eligible and reaching an available worker.
- **Idempotency & Concurrency Control:** Prevent duplicate job executions even during concurrent scheduling cycles.

---

## 4. Capacity & Back-of-the-Envelope Estimation

Understanding worker pool sizing and storage velocity:

### Sizing Scenario (Dropbox Scale: 10,000 TPS)
- **Job Submission Rate:** $10,000\text{ TPS}$.
- **Average Task Duration:** $5\text{ seconds}$ (short tasks).
- **Active Concurrent Worker Slots Required:**
  $$\text{Concurrent Slots} = \text{Arrival Rate} \times \text{Average Duration} = 10,000 \times 5 = \mathbf{50,000\text{ concurrent workers/cores}}$$
  *(If average duration is 5 minutes instead: $10,000 \times 300 = 3,000,000\text{ worker slots required}$, demonstrating why throttling and backpressure are critical).*

#### Storage Velocity (Job Status Metadata)
- **Metadata Record Size:** `job_id` (16 B), `user_id` (8 B), `status` (8 B), `timestamps` (24 B), `payload_ref` (64 B), `output_ref` (64 B) $\approx 200\text{ bytes}$.
- **Storage Growth per Second:** $10,000 \times 200\text{ B} = \mathbf{2\text{ MB/sec}}$.
- **Storage Growth per Day:** $2\text{ MB/sec} \times 86,400\text{ sec} \approx \mathbf{172.8\text{ GB/day}}$.
- **Storage Strategy:** Relational or NoSQL tables handle daily ingestion easily. Completed job records older than 14–30 days must be archived to cold storage (S3/Parquet).

---

## 5. High-Level Design: 6+ Evolutionary Approaches

```
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 1: Direct Database Polling (Monolithic / Low Scale)                      |
|   Job Submission ---> Relational DB (jobs table) <--- Poller Loop ---> Workers    |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Polling overhead / DB locks saturation)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 2: Message Broker Decoupling (RabbitMQ / SQS / Kafka)                    |
|   Job Submission ---> DB Trigger / CDC ---> Message Queue ---> Workers Pull       |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Eliminating dual-write / partial failure)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 3: Transactional Outbox + CDC Engine                                     |
|   API ---> DB (Jobs + Outbox Table in 1 Tx) ---> Debezium/WAL ---> Kafka Broker   |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (High-precision delayed / future execution)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 4: Redis Sorted Sets (ZSET) Delayed Scheduler                            |
|   Future Jobs ---> Redis ZSET (Score: timestamp) ---> ZRANGEBYSCORE Trigger       |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Recurring cron & worker failure recovery)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 5: Distributed Cron + Reaper Process (Heartbeat Registry)                |
|   Cron Service + Heartbeat Registry (Redis/DB) + Reaper Process                   |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │  (Scaling past 100,000 TPS / Cloud Scale)
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
| Approach 6: Sharded Partitioned Schedulers (AWS Lambda / Large Scale)             |
|   Partitioned Kafka + Dedicated Worker Pools per Partition + Autoscaling          |
+───────────────────────────────────────────────────────────────────────────────────+
```

---

### Approach 1: Direct Database Polling (Baseline Architecture)
- **Use Case:** Small internal company tools ($< 500\text{ TPS}$).

```
[ User ] ──> [ Job Submission Service ] ──> [ Jobs DB (PostgreSQL) ]
                                                   ▲
[ Polling Service (Coordinator) ] ─────────────────┤ (Polls PENDING jobs)
             │                                     ▼
             ├───────────────────────────> [ Machine Status DB ] (Checks available workers)
             │
             ├───────────────────────────┬───────────────────────────┐ (Dispatches job)
             ▼                           ▼                           ▼
      [ Worker Node 1 ]           [ Worker Node 2 ]           [ Worker Node 3 ]
```

#### How it Works:
1. Client submits a job; `Job Submission Service` inserts a record into PostgreSQL with `status = 'PENDING'`.
2. A centralized `Polling Machine` runs an infinite loop querying for work:
   ```sql
   SELECT * FROM jobs 
   WHERE status = 'PENDING' AND scheduled_at <= NOW() 
   ORDER BY scheduled_at ASC 
   LIMIT 100 
   FOR UPDATE SKIP LOCKED;
   ```
3. The poller queries `machine_status` to find idle worker instances.
4. The poller assigns `job_id` to `worker_id`, updates `jobs.status = 'RUNNING'`, and dispatches the task over HTTP/gRPC.
5. Worker finishes, writes output to S3, and updates `jobs.status = 'COMPLETED'` and `machine_status.status = 'AVAILABLE'`.

#### Fatal Bottlenecks:
- **Lock Contention:** Constantly polling tables with `FOR UPDATE` creates severe row-locking contention.
- **Wasted Database Cycles:** When queue is empty, poller hammers the DB with empty queries.
- **Scalability Limit:** Hard ceiling around $500\text{--}1,000\text{ TPS}$.

---

### Approach 2: Message Queue Decoupling (RabbitMQ / SQS / Kafka)
- **Use Case:** Decoupling scheduling decisions from worker availability.

```
[ User ] ──> [ Job Submission Service ] ──> [ Jobs DB ]
                       │
                       │ (Enqueues job)
                       ▼
             [ Message Queue (RabbitMQ / Kafka) ]
                       │
       ┌───────────────┼───────────────┐ (Workers pull when ready)
       ▼               ▼               ▼
 [ Worker 1 ]    [ Worker 2 ]    [ Worker 3 ]
```

#### How it Works:
- Instead of a coordinator checking *which worker is free*, available workers **pull directly from the message queue** whenever they have execution capacity.
- **RabbitMQ:** Ideal for task distribution via prefetch count (`basic.qos prefetch=1`), ensuring a worker only takes a new job when its current one finishes.
- **Kafka:** Ideal for high write throughput ($> 10,000\text{ TPS}$), though workers must manage partition offsets carefully.

---

### Approach 3: Transactional Outbox Pattern + Change Data Capture (CDC)
- **Use Case:** Eliminating dual-write inconsistencies between the Database and the Message Broker.

#### The Dual-Write Problem:
```
           ┌── 1. Write to DB (Succeeds)
[ Service ]
           └── 2. Publish to Kafka (Fails due to network timeout!)
               Result: Job exists in DB as PENDING, but never reaches workers.
```

#### The Transactional Outbox Solution:
```
[ Job Service ] ──> BEGIN TRANSACTION
                      INSERT INTO jobs (id, status) VALUES (101, 'PENDING');
                      INSERT INTO outbox (job_id, payload) VALUES (101, '...');
                    COMMIT TRANSACTION;
                           │
                           ▼ (Tails Postgres WAL)
                    [ Debezium / CDC ] ──> [ Kafka Topic ] ──> [ Workers ]
```
- By writing both the job status and the outbox event in **a single atomic ACID transaction**, the system guarantees that every accepted job is published to the queue with zero data loss.

---

### Approach 4: Redis Sorted Sets (`ZSET`) for Delayed Scheduling
- **Use Case:** High-throughput delayed task execution (e.g., execute at timestamp $T$).

```
Client ──> [ Job Service ] ──> [ Redis Sorted Set: "delayed_jobs" ]
                                   Score = Unix Timestamp (scheduled_at)
                                   Member = job_id
                                       ▲
[ Dispatcher Daemon ] ─────────────────┘
  (Polls ZRANGEBYSCORE 0 now() and atomically moves to execution queue)
```

#### Atomic Extraction via Lua Script:
```lua
-- Fetch eligible delayed jobs
local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1], 'LIMIT', 0, ARGV[2])
if #jobs > 0 then
    -- Atomically remove from delayed set
    redis.call('ZREM', KEYS[1], unpack(jobs))
    -- Push immediately to ready work queue
    redis.call('LPUSH', KEYS[2], unpack(jobs))
end
return jobs
```
- **Why Redis ZSET?**
  $O(\log N)$ insertion and range queries on timestamp indices entirely eliminate expensive relational table scans for future jobs.

---

### Approach 5: Distributed Cron + Heartbeat Registry & Reaper Process
- **Use Case:** Production enterprise setups requiring recurring cron schedules, worker health monitoring, and automatic failure recovery.

```
                     ┌────────────────────────┐
                     │ Distributed Cron Engine│ (Evaluates cron expressions)
                     └──────────┬─────────────┘
                                │
                                ▼ (Generates job when due)
[ Ingestion API ] ───> [ Job Status DB ] ───> [ Message Queue ]
                             ▲                      │
                             │                      ▼
                             │               [ Worker Fleet ]
                             │                      │
                             │ (Status: COMPLETED)  │ (Heartbeat ping every 5s)
                             │                      ▼
                      [ Reaper Process ] <── [ Heartbeat Registry ]
                        (Checks timeouts)       (Redis Key with TTL)
```

#### 1. Worker Heartbeat Mechanism:
- As workers process a job, they emit a lightweight heartbeat every $5\text{ seconds}$ to an in-memory key-value store (Redis):
  ```
  SET worker:101:heartbeat "running:job_42" EX 15
  ```
- If a worker machine crashes, suffers an OOM, or loses network connectivity, the key expires after 15 seconds.

#### 2. The Reaper Process (Failure Recovery):
- A background daemon inspects jobs stuck in `RUNNING` status whose assigned worker key has expired in the heartbeat registry.
- **Recovery Action:**
  1. Marks the dead worker as `OFFLINE`.
  2. Updates `jobs.status = 'PENDING'`.
  3. Increments `retry_count`. If `retry_count > max_retries`, marks `FAILED` and routes to a Dead Letter Queue (DLQ).
  4. Re-enqueues the job into the message broker for another healthy worker to pick up.

---

### Approach 6: Sharded Partitioned Coordination (Cloud / AWS Lambda Scale)
- **Use Case:** Hyper-scale platforms ($> 100,000\text{ TPS}$) where a single queue or centralized scheduler cannot coordinate the worker fleet.

```
[ Incoming High-TPS Stream ]
             │
             ▼
[ Consistent Hashing Router (by customer_id or job_hash) ]
             │
   ┌─────────┼─────────┐
   ▼         ▼         ▼
[ Kafka P0] [Kafka P1] [Kafka P2]
   │         │         │
   ▼         ▼         ▼
[Scheduler 0][Scheduler 1][Scheduler 2] (Assigned dedicated worker groups)
   │         │         │
   ▼         ▼         ▼
[Pool A]   [Pool B]   [Pool C]
```

#### Key Architecture Principles:
1. **Partitioned Ingestion:** Jobs are sharded across Kafka partitions by `hash(account_id) % N`.
2. **Dedicated Partition Schedulers:** Schedulers use Kafka Consumer Groups to exclusively process assigned partitions, preventing cross-coordinator locking races.
3. **Worker Pool Affinity:** Schedulers assign tasks to their local pool of pre-warmed worker containers, avoiding global lock contention over "who gets worker X".
4. **Backpressure & Queue Lag Autoscaling:** Autoscaling groups monitor **Kafka consumer lag** rather than CPU utilization to scale worker pods out before backlogs grow.

---

## 6. Deep Dives & Advanced Engineering

### 1. Zombie Workers, GC Pauses & Split-Brain Fencing Tokens
In distributed scheduling, worker failure detection is probabilistic (heartbeats over an asynchronous network).
- **The Split-Brain Failure Mode:**
  1. Worker A acquires Job 42 and starts running.
  2. Worker A experiences a severe 20-second stop-the-world JVM GC pause or network blip.
  3. The Reaper daemon notes heartbeat expiration (15s TTL), assumes Worker A is dead, resets Job 42 to `PENDING`, and dispatches it to Worker B.
  4. Worker B completes Job 42 and writes its state.
  5. Worker A wakes up from its GC pause, unaware it was preempted, and attempts to write its stale results, corrupting data.

```
Worker A: ──[Runs Job 42]───────(20s GC Pause / Hang)───────> [Wakes up & writes stale result!] ❌
                                         │
Reaper:   ─────────────────────────[Heartbeat Expired]
                                         │
Worker B: ─────────────────────────[Re-assigned Job 42]──> [Completes & Writes result] ✅
```

- **Staff Solution: Monotonic Fencing Tokens:**
  - Whenever a job is assigned or re-assigned, the scheduler generates a monotonically increasing `fencing_token` (e.g., Token = 101, Token = 102).
  - The storage/database layer enforces a condition on write:
    ```sql
    UPDATE jobs 
    SET output = :result, status = 'COMPLETED', fencing_token = :token 
    WHERE id = 42 AND fencing_token < :token;
    ```
  - When Worker A attempts to write with stale `token = 101`, the database rejects the update because `token = 102` has already been committed.

---

### 2. Delayed Task Mechanics: Hierarchical Timing Wheels vs. Redis ZSET
When managing millions of delayed timers (e.g., "remind user in 3 days"):

| Mechanism | Structure & Complexity | Memory / Scalability | Best Fit |
| :--- | :--- | :--- | :--- |
| **Redis ZSET** | Skip List + Hash Table. Insertion and Range extraction are $O(\log N)$. | Stored in Redis RAM. High CPU usage under millions of concurrent timer scans. | Up to 50k active timers with sub-second precision. |
| **Hierarchical Timing Wheel (Kafka/Netty)** | Multi-level circular array buffers (Seconds Wheel $\to$ Minutes Wheel $\to$ Hours Wheel $\to$ Days Wheel). | $O(1)$ amortized insertion and $O(1)$ per-tick bucket processing. Minimal memory footprint. | Millions of concurrent timers with fixed tick granularities (e.g., 100ms or 1s). |

---

### 3. Multi-Tenant Fair-Share Scheduling (Defeating Noisy Neighbors)
If Customer A submits 500,000 batch jobs at 9:00 AM, standard FIFO queues will starve Customer B's urgent single job for hours.

**Staff Solution: Deficit Round-Robin (DRR) or Tiered Partitioning:**
1. Jobs are routed to per-tenant queues or partitioned Kafka topics.
2. The scheduler coordinator does not pull naively from one queue; it iterates across tenant queues in a Round-Robin fashion, dequeuing a capped quantum of jobs per tenant per scheduling cycle.
3. Priority tiers (Enterprise vs. Free) receive weighted token allocations (e.g., Enterprise: 10 jobs/round, Free: 1 job/round).

---

### 4. Job Output Handling: Inline vs. Blob Storage
- **Short CLI Output ($< 2\text{ KB}$):** Stored directly in the `jobs.output` text column in the status database for immediate single-query retrieval.
- **Large Output / Artifacts ($> 2\text{ KB}$ to Terabytes):**
  - Worker streams stdout/stderr directly to an Object Store (Amazon S3 / GCS).
  - Worker commits the metadata URI: `jobs.output_ref = 's3://job-artifacts/2026/09/job-101.tar.gz'`.
  - Client retrieves output via HTTP 302 redirect to an S3 Presigned URL, completely decoupling database I/O from large artifact downloads.

---

### 5. Graceful Shutdown & Preemption
Workers listen for POSIX signals (`SIGTERM`). Upon receiving `SIGTERM`:
1. Stop accepting new tasks from the message queue.
2. Attempt to checkpoint current execution progress to the database within a grace period (e.g., 30 seconds).
3. If uncompleted, release the job back to `PENDING` so another worker can resume immediately.

---

## 7. Staff Curveball Playbook & Production Realities

### Curveball 1: The Midnight UTC Cron Thundering Herd
- **Interviewer Question:** *"Thousands of enterprise customers schedule daily summary reports to run at `00:00:00 UTC`. The cluster gets hammered by 50,000 tasks at the exact same second, causing massive worker exhaustion and cascading timeouts. How do you resolve this?"*
- **Candidate Defense:**
  - **Deterministic Jittering:** For non-realtime batch jobs (e.g. daily reports), introduce a deterministic hash-based delay:
    $$\text{Actual Run Time} = \text{Scheduled Time} + \left(\text{hash}(\text{job\_id}) \pmod{300\text{ seconds}}\right)$$
    This smooths the midnight spike over a 5-minute rolling window without requiring customer intervention.
  - **Pre-Warming & Virtual Queuing:** Pre-enqueue cron jobs 10 minutes prior in a `DORMANT` state and promote them asynchronously based on worker slot availability.

### Curveball 2: Worker Node Memory Leak / Host Hang
- **Interviewer Question:** *"A customer uploads a task containing a native C++ memory leak that consumes all host memory and freezes the Linux kernel. Heartbeats stop, and the machine becomes unresponsive."*
- **Candidate Defense:**
  - **Container Isolation with Cgroups:** Workers must never run user code directly on the host OS. Every task runs inside an isolated container / microVM (Docker / Firecracker) configured with strict hard limits:
    ```bash
    docker run --memory=1g --cpus=1.0 --pids-limit=100 ...
    ```
  - When memory exceeds 1 GB, the Linux OOM killer terminates the container without degrading the host worker agent or neighbouring tasks.
  - The worker agent reports `status = FAILED (OOMKilled)` to the scheduler.

### Curveball 3: Poison Pill Tasks & Dead Letter Queue (DLQ)
- **Interviewer Question:** *"A malformed job payload causes any worker that attempts to execute it to immediately crash with a SIGSEGV. As the reaper reschedules it, it systematically kills every worker node in the fleet."*
- **Candidate Defense:**
  - **Maximum Retry Envelope:** Each job carries an immutable `retry_count`.
  - When a worker picks up a job, it atomically increments `retry_count` in the status database.
  - If `retry_count > 3`, the job is immediately intercepted, marked `STATUS = DEAD_LETTER`, routed to a Dead Letter Queue (DLQ), and bypassed.
  - An automated alert triggers for human inspection while the worker fleet remains healthy.

---

## 8. Summary Comparison Matrix

| Approach | Max Throughput | Latency | Scheduling Types | Failure Recovery | Best Fit Scenario |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Direct DB Polling** | $\sim 500\text{ TPS}$ | High ($1\text{--}5\text{ s}$) | Immediate & Delayed | DB Transaction | Simple internal corporate tools |
| **2. Message Queue (RabbitMQ)** | $\sim 10,000\text{ TPS}$ | Low ($<10\text{ ms}$) | Immediate | ACK / NACK redelivery | Async microservice jobs |
| **3. Transactional Outbox + CDC** | $\sim 25,000\text{ TPS}$ | Medium ($50\text{ ms}$) | Immediate | WAL guarantees zero loss | Mission-critical financial workflows |
| **4. Redis Sorted Sets (ZSET)** | $\sim 50,000\text{ TPS}$ | Ultra-low ($<2\text{ ms}$) | Delayed (Future timestamps) | TTL + Persistence | High-volume delayed task timers |
| **5. Hierarchical Timing Wheels** | $>100,000\text{ TPS}$ | Sub-millisecond ($O(1)$) | High-volume Timers | In-memory with snapshotting | Low-latency timer infrastructure |
| **6. Distributed Cron + Reaper** | $\sim 20,000\text{ TPS}$ | Low | Recurring Cron + Delayed | Heartbeat Registry + Reaper | Production CI/CD & batch systems |
| **7. Sharded Partitioned Pools** | $>100,000\text{ TPS}$ | Low | Immediate & Batched | Partition reassignment | Cloud-scale FaaS (AWS Lambda scale) |
