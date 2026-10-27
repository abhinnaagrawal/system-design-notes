# System Design Building Blocks & Core Technologies

This index links to the concept notes and architectural decision guides. Update each concept in its linked source.

Use the [chapter index](Readme.md#-chapters-index) for worked designs, [patterns](Patterns/README.md) for recurring solutions, and [layer playbooks](Layer-Playbooks/README.md) for technology choices. Apply the [evidence and maintenance rules](Layer-Playbooks/README.md#evidence-and-maintenance) before repeating a guarantee, quota or benchmark.

## Architectural Layer Selection Playbooks

| Layer | Canonical decision guide |
| :--- | :--- |
| 01 | [Storage & Databases](Layer-Playbooks/01-Storage-and-Databases.md) |
| 02 | [Caching & In-Memory Storage](Layer-Playbooks/02-Caching-and-In-Memory.md) |
| 03 | [Messaging & Streaming](Layer-Playbooks/03-Messaging-and-Streaming.md) |
| 04 | [Networking & Protocols](Layer-Playbooks/04-Networking-and-Protocols.md) |
| 05 | [Distributed Coordination](Layer-Playbooks/05-Distributed-Coordination.md) |
| 06 | [Search & OLAP Engines](Layer-Playbooks/06-Search-and-OLAP-Engines.md) |
| 07 | [Compute & Async Execution](Layer-Playbooks/07-Compute-and-Async-Execution.md) |
| 08 | [Multi-Tenant Architecture](Layer-Playbooks/08-Multi-Tenant-Architecture.md) |
| 09 | [Security, AuthN & AuthZ](Layer-Playbooks/09-Security-AuthN-and-AuthZ.md) |
| 10 | [Observability & Reliability](Layer-Playbooks/10-Observability-Telemetry-and-Reliability.md) |
| 11 | [Deployment & CI/CD](Layer-Playbooks/11-Deployment-Strategies-and-CICD.md) |
| 12 | [Failure Modes & Resiliency](Layer-Playbooks/12-Distributed-Failure-Modes-and-Resiliency.md) |

## Core Concept Notes

### Storage, Indexing and Analytics

| Concept | Canonical source and focus |
| :--- | :--- |
| Database indexes | [Index scope, partition keys, access paths and trade-offs](Core%20Concepts/Database%20Indexes/README.md) |
| Sharding | [Partition placement, routing and rebalancing](Core%20Concepts/Sharding/README.md) |
| Consistent hashing | [Ownership distribution and virtual nodes](Core%20Concepts/Consistent%20Hashing/README.md) |
| Cassandra | [Wide-column model, replication and storage](Core%20Concepts/Cassandra/README.md) |
| DynamoDB | [Access patterns, secondary indexes and bounded transactions](Core%20Concepts/DynamoDB/README.md) |
| CockroachDB | [Distributed SQL, ranges and isolation](Core%20Concepts/CockroachDB/README.md) |
| Redis | [Data structures, persistence and operational trade-offs](Core%20Concepts/Redis/README.md) |
| Time-series databases | [Time partitioning, compression and cardinality](Core%20Concepts/Time%20Series%20Databases/README.md) |
| Vector databases | [Similarity search and approximate-index trade-offs](Core%20Concepts/Vector%20Databases/README.md) |
| Geospatial indexes | [Candidate coverage and exact distance filtering](Core%20Concepts/Geospatial%20Indexes/README.md) |
| Advanced data structures | [Merkle, segment and Fenwick trees](Core%20Concepts/Advanced%20Data%20Structures/README.md) |
| Probabilistic structures | [Bloom filters, sketches and accuracy/space contracts](Core%20Concepts/Data%20Structures%20for%20Big%20Data/README.md) |
| Spark internals | [Execution, memory, shuffle, streaming and Delta](Core%20Concepts/Spark%20Internals/README.md); [versioned sources](Core%20Concepts/Spark%20Internals/SOURCES.md) |

### Correctness and Coordination

| Concept | Canonical source and focus |
| :--- | :--- |
| Partial failures | [Durable intent, unknown outcomes and retry-safe external effects](Core%20Concepts/Partial%20Failures/README.md) |
| Distributed transactions | [Atomic commit versus sagas and explicit compensation](Core%20Concepts/Distributed%20Transactions/README.md) |
| Message brokers and consistency | [Accepted versus applied state and read barriers](Core%20Concepts/Message%20Brokers%20and%20Consistency/README.md) |
| CRDTs | [Merge semantics and convergence assumptions](Core%20Concepts/CRDTs/README.md) |
| Distributed timing | [Clocks, timeouts and scheduling](Core%20Concepts/Timing%20Mechanisms%20in%20Distributed%20Systems/README.md) |
| Caching strategies | [Cache ownership, freshness and failure handling](Core%20Concepts/Caching%20Strategies/README.md) |

### Networking and Trust

| Concept | Canonical source and focus |
| :--- | :--- |
| Networking foundations | [Connections, proxies and load balancers](Core%20Concepts/Networking%20Foundations/README.md) |
| DNS and CDN | [Resolution, edge delivery and cache behavior](Core%20Concepts/DNS%20and%20CDN/README.md) |
| WebSockets | [Persistent connection and message delivery boundaries](Core%20Concepts/WebSockets/README.md) |
| gRPC | [Generated contracts and deployed-version compatibility](Core%20Concepts/gRPC/README.md) |
| Encryption and TLS | [Authentication, key agreement and TLS version distinctions](Core%20Concepts/Encryption%20and%20TLS/README.md) |
| Authentication and authorization | [Identity, permissions, sessions and revocation](Core%20Concepts/Authentication%20and%20Authorization/README.md) |

## How to Apply a Building Block

For each design decision, identify the invariant, acknowledgment point, durability/read scope, retry identity and recovery owner, along with the expected workload.

Practice with the [Principal-IC lab](Book-Notes.md#8-principal-ic-practice-lab): produce a strategy kernel, engineering tenets, stakeholder decision and measurable behavior change.
