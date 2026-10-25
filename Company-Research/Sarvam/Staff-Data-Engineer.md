# Sarvam AI - Staff Data Engineer (Staff)

| Field | Value |
|---|---|
| Company | Sarvam AI (Axonwise Private Limited) |
| Role | Staff Data Engineer (the JD also calls it Staff Engineer) |
| Level | Staff; 5+ years minimum; technical owner / senior IC |
| Scope | Data & Analytics Platform; Bengaluru, full-time, on-site |
| Role status | Not on Sarvam's current job board as of 2026-10-22; archived official JD used |
| Research date | 2026-10-22 |
| Evidence cutoff | 2026-10-22 |
| Confidence | Role scope: high. Interview loop: low-medium. Compensation: low. |

## Executive summary

- Sarvam builds full-stack sovereign AI for India. Its products include Samvaad, Studio, Akshar, Arya, and Indus, plus ASR, TTS, vision, translation, and LLM APIs. Enterprise customers include Tata Capital, SBI Life, CRED, IDFC, and LIC.
- This is a platform-builder role, not a conventional reporting or ETL role. The hire owns event ingestion, CDC, ClickHouse operations, a tenant-aware query API, a no-code dashboard layer, the billing data feed, SLOs, cost, and the team's engineering standards.
- "Staff" at Sarvam is a scope label, not a standardized band. This role asks for 5+ years; other Sarvam Staff roles ask for 5-10 or 7+ years. People-management scope is not stated for this role, while other Sarvam Staff JDs explicitly describe an IC role with no management.
- No official Sarvam interview loop was found. Recent first-hand engineering reports describe a proof-of-work process: a practical build or take-home, a deep dive on the candidate's own work, and a hiring-manager conversation. No DSA round was reported in three public engineering reports. None of these reports is for this Staff Data Engineer role, so the loop is inferred.
- Sarvam already runs a significant ClickHouse footprint. A September 2026 talk by Head of Engineering Sunny Shah describes five uses: agent observability, infrastructure observability, product analytics, billing via FlexPrice, and a data warehouse using S3/Iceberg plus ClickHouse materialized views and ClickPipes. The JD's custom Go ingestion API and Debezium/Kafka CDC may be a new platform or a consolidation. Ask how the role relates to the existing stack.
- Compensation is unknown. No Sarvam-specific Staff Data Engineer band or levels.fyi company page was found. The often-quoted ₹84 LPA campus ML offer includes ESOPs and is not comparable. Do not use SarvM.ai salary pages; that is a different company.
- Preparation should be system-design-heavy and hands-on: schema evolution at ingest, CDC correctness, ClickHouse physical design and operations, tenant isolation and query budgets, billing reconciliation, and cost/SLO tradeoffs. Be ready to defend 0-to-1 decisions and write code under time.
- The role may reopen or be filled through a referral/backfill pipeline. Confirm status with the recruiter before investing in a full loop.

## 1. Level and compensation

### Level map

| Signal | Evidence | Interpretation |
|---|---|---|
| Staff Data Engineer | [Archived official JD](https://web.archive.org/web/20260730153919/https://www.sarvam.ai/careers/jobs/7ee2ff5d-32a2-4b0a-9ae9-117ba8b626d1) asks for 5+ years and 0-to-1 ownership | Minimum experience, not a calibrated band |
| Staff Engineer, API Platform | [Official JD](https://www.sarvam.ai/careers/jobs/48b2c236-a7e7-475d-b98b-4eb942e85dc7) asks for 7+ years | Staff can require materially more experience |
| Staff Engineer, Product Infrastructure | [Official JD](https://www.sarvam.ai/careers/jobs/10f11bb2-fe15-4743-9b3f-81da6743ea6a) asks for 5-10 years | Staff is used across a broad range |
| IC vs manager | The data JD says "shape the team" and set the hiring bar; other Staff JDs explicitly say IC/no people management | Assume a senior IC with technical leadership; confirm management scope |

Sarvam's Staff title should not be mapped directly to a big-tech Staff band. The data role is a 0-to-1 platform owner with architecture, hands-on delivery, and hiring-bar responsibilities. The interview is more likely to test scope, judgment, and operational depth than years of tenure.

The [current Ashby board](https://api.ashbyhq.com/posting-api/job-board/sarvam) had 42 openings on 2026-10-22, including several Staff roles, but not this Staff Data Engineer role. [AutomateEdge](https://automateedge.cloud/jobs/staff-data-engineer-at-sarvam-8245) lists the role as posted on 2026-05-05 and now closed; the official page was still archived on 2026-07-30. The [official job URL](https://www.sarvam.ai/careers/jobs/7ee2ff5d-32a2-4b0a-9ae9-117ba8b626d1) currently fails to load the role.

### Role context

The platform has three responsibilities per the archived JD:

1. **Ingest** every meaningful product event through an API that handles arbitrary payloads, automatic table creation, column addition, and safe schema evolution.
2. **Replicate** product Postgres/MySQL databases into ClickHouse through CDC without loading transactional systems.
3. **Expose** data through a tenant-aware query API and a no-code dashboard layer for customer analytics, internal BI, and finance billing.

The JD is explicit that databases, Kafka, and internal stores are never exposed directly. Every read and write goes through APIs the hire designs. That makes API design, authorization, isolation, and query governance as important as pipeline construction.

A public [ClickHouse Open House Bangalore 2026 session](https://clickhouse.com/openhouse/bangalore-2026) by Sunny Shah, Sarvam's Head of Engineering, describes the existing analytics footprint. The [talk](https://www.youtube.com/watch?v=bqM_kgUkjn4) says Sarvam uses ClickHouse in five areas:

- Agent observability for tool calls, sandbox startup, and harness quality, with Langfuse.
- Backend, frontend, and infrastructure observability.
- Product analytics for Samvaad and the API platform, including campaigns that can generate 30 million calls in two days.
- Metering and billing through FlexPrice, which uses ClickHouse internally.
- A data warehouse with clickstream/immutable events in S3 and Iceberg, materialized views in ClickHouse, ClickPipes, and Redash/Metabase for BI.

The same talk says ClickHouse Cloud and ClickPipes reduce the need for Debezium, Kafka, Spark, or Flink jobs for the warehouse. The JD instead emphasizes a custom Go ingestion API and Debezium/Kafka CDC. Treat this as an important clarification question: is the hire building a new product-analytics platform, replacing parts of the current pipeline, or standardizing several existing ClickHouse use cases?

### Compensation signal

No reliable Sarvam-specific Staff Data Engineer compensation data was found.

- No Sarvam company page exists on levels.fyi at the URLs checked on 2026-10-22; both `sarvam-ai` and `sarvam` returned 404.
- An [AmbitionBox "SARVAM" salary page](https://www.ambitionbox.com/salaries/sarvam-salaries) lists an ML engineer range of roughly ₹80.6-89.1 LPA, but the page appears to mix Sarvam AI with other entities, has a small sample, and is not level-matched. Do not use it as a Staff Data Engineer band.
- A first-hand campus ML report says ₹84 LPA including ESOPs. That is a fresher ML data point, not a Staff Data Engineer package, and it shows why headline CTC is misleading.
- For market context only, [levels.fyi's India Data Software Engineer page](https://www.levels.fyi/t/software-engineer/focus/data/locations/india.md) reported a median of ₹23.8L and a 90th percentile of ₹58.9L across 1,454 submissions in October 2026. This is all levels and not Sarvam-specific.

Treat compensation as unknown. Ask for the band, fixed base, variable pay, ESOP grant value, vesting/cliff, refresh policy, and liquidity/buyback terms. A high headline CTC at a growth-stage AI company may be mostly equity.

## 2. Interview loop evidence

No official Sarvam interview process or question guide was found. The careers site and job descriptions do not describe rounds or evaluation criteria. The following is candidate-reported evidence, not an official loop.

| Source | Role reported | Reported process | Outcome | Confidence |
|---|---|---|---|---|
| [DevsUnite, 2026-09-01](https://devsunite.com/blog/getting-hired-at-sarvam-ai-my-fresher-interview-story) | Fresher engineering role | 30-minute project deep dive; ~2-hour proctored build; two-engineer code/architecture deep dive; hiring-manager conversation; no DSA | Offer; under three weeks | Medium; first-hand but not level-matched |
| [X article, 2026-09-05](https://x.com/i/article/2096138888251375848) | Backend Engineer Intern, on-device AI | Async system design take-home; technical panel; final backend fundamentals/project deep dive; no DSA | Cleared; declined on timing | Medium; first-hand but not level-matched |
| [X article, 2026-06-15](https://x.com/ranaharshraj7/article/2065801122494001516) | ML Engineer, campus (Dec 2024) | 2.5-hour on-site proctored VAD build; head-of-ASR deep dive; ML fundamentals; no DSA | ₹84 LPA including ESOPs | Medium-low; older, ML-specific |
| [LeetCode, 2026-08-02](https://leetcode.com/discuss/post/8436800) | Backend Engineer (Jan 2026 loop) | Project discussion; system design: multi-tenant scalable notification service | Rejected | Medium-low; one-line report |
| [Blind, 2026-07-08](https://www.teamblind.com/post/sarvams-ai-interviews-have-no-dsa-and-still-offered-84-lpa-instead-l86l5tp0) | MLE | Repost/secondary discussion of the campus ML loop; no DSA | 84 LPA claim | Low; secondary source |

The [HiredVoices SDE entry](https://hiredvoices.com/main/experiences/sarvam/sde) duplicates the LeetCode notification-service report. Count it once. Generic articles claiming a fixed "4-5 rounds over 2-3 weeks" process were not treated as independent evidence.

### Reconstructed pattern for this role

This is inference from the candidate reports and the JD, not a verified Staff Data Engineer loop:

1. **Recruiter or briefing call.** Role scope, motivation, compensation, notice period, and on-site expectations.
2. **Practical exercise.** A take-home or time-boxed build, typically around two hours in the reports. Candidates were allowed to use AI tools and documentation. For this role, expect an ingestion, CDC, query-API, or analytics-platform problem rather than an ML task.
3. **Technical deep dive or panel.** One or two rounds on the submission and past projects, with follow-ups on scale, failure modes, cost, and tradeoffs. System design is likely.
4. **Hiring manager or leadership round.** Ownership, ambiguity, setting standards, working with product/finance/infra, and why Sarvam.
5. **Founder/CTO or HR conversation.** Possible but not verified for this role.

Reported timelines range from about one to three weeks, with at least one case requiring immediate joining. Treat timing as variable. The loop may be compressed for senior candidates or may include additional architecture rounds.

## 3. Round-by-round expectations

### Recruiter or briefing call

Expect a fit and logistics conversation, not a coding screen. Be ready to explain why a data-platform role at an AI company, what kind of 0-to-1 platform you have built, and how you think about build-versus-buy. Clarify whether the role is still open, whether it is a backfill, and who owns the platform today.

### Practical build or take-home

The reported Sarvam build rounds test whether you can ship something working under time, not whether you memorized algorithms. Evaluation included correctness, code quality, and the ability to explain improvements that did not fit in the time box. AI tools were allowed in two reports.

For this role, a plausible exercise is a small event-ingestion service or analytics pipeline: accept events, validate them, persist them, expose a query, handle a schema change, and explain failure handling. You may be asked to defend why you chose a particular table layout, partitioning key, or idempotency strategy. Do not assume the exercise is exactly this; confirm the format with the recruiter.

### Technical deep dive and system design

Expect the interviewer to start from your resume and go deep. Strong candidates should be able to quantify scale, explain tradeoffs, describe incidents, and reason about cost. For this JD, the likely probes are:

- Why ClickHouse, and which MergeTree engine and sort key would you choose?
- How do you handle schema evolution when every product emits different event shapes?
- How do you make CDC correct under duplicates, reordering, replays, and schema drift?
- How do you isolate tenants and stop one customer's query from consuming the cluster?
- How do you make billing data correct when events arrive late or twice?
- What SLOs would you set for freshness, ingestion lag, query latency, and cost?
- What would you build versus buy?

### Hiring manager and leadership

This is likely the most important non-technical round. Sarvam's Staff JDs emphasize technical ownership, design reviews, RFCs, testing standards, and raising the hiring bar. Prepare stories about:

- Taking a platform from zero to production where other teams depended on it.
- Making an architectural decision with incomplete information and revising it later.
- Handling a production incident or data-correctness failure.
- Influencing product, finance, and infrastructure stakeholders without direct authority.
- Setting standards, mentoring senior engineers, and raising the hiring bar.

### Founder/CTO or HR

If included, expect mission and culture questions: why sovereign AI for India, why Sarvam, comfort with ambiguity and on-site intensity, and how you prioritize shipping quickly versus building for the long term. One report describes a founder/CTO-style round with practical problem-solving and LLM use allowed; that is not verified for this role.

## 4. Question bank

This is preparation material, not a leaked question set. The high-confidence section is derived directly from the official JD; the prompts are practice scenarios, not reported interview questions. The medium-confidence section is based on public candidate reports.

### High-confidence scope signals

These are the topics the role explicitly owns. Expect the interview to test several of them deeply.

- **Event ingestion API and schema evolution.** Design a Go service that accepts arbitrary event payloads, validates them, and writes to ClickHouse with automatic table creation and safe column addition. Cover type conflicts, renames, nullability, defaults, event versioning, ALTER batching, and metadata consistency.
- **Idempotency and ordering.** Design at-least-once ingestion with deduplication keys, per-entity ordering, late events, retries, poison messages, and replay. Explain where exactly-once is realistic and where it is not.
- **CDC with Debezium and Kafka.** Design snapshot plus streaming replication from Postgres/MySQL into ClickHouse. Cover replication slots, WAL/binlog retention, transaction boundaries, tombstones, DDL changes, primary-key changes, deduplication, ordering, and backfills.
- **ClickHouse physical design.** Choose MergeTree variants, partition keys, sorting keys, projections, materialized views, TTL, codecs, and skip indexes for event and CDC workloads. Explain when a materialized view is the wrong tool.
- **ClickHouse operations.** Plan sharding, replication, capacity, backups, upgrades, mutations, lightweight deletes, and disaster recovery. Explain how to detect and remediate replication lag and part-merging problems.
- **Multi-tenant query API.** Design RBAC, row-level isolation, tenant-aware query rewriting, query budgets, concurrency limits, rate limits, caching, pagination, and protection against expensive queries.
- **No-code dashboard layer.** Design a semantic model for metrics and dimensions, saved views, filters, permissions, caching, versioning, embedding, and exports without letting users write arbitrary SQL.
- **Billing and metering correctness.** Design an immutable usage ledger, idempotent rating, late-event corrections, credits, reconciliation, audit trails, and finance extracts. Explain how you would prove the numbers are right.
- **Kafka as the streaming backbone.** Cover partitioning strategy, consumer groups, rebalances, retention, compaction, schema registry, exactly-once/idempotency patterns, and consumer lag.
- **Go service engineering.** Cover concurrency, context cancellation, batching, backpressure, worker pools, retries, memory limits, API design (REST/gRPC), and graceful shutdown.
- **Batch enrichment and backfills.** Use Spark and Airflow for enrichment, scheduled aggregations, and backfills. Make jobs idempotent, replayable, observable, and safe to rerun.
- **Observability, SLOs, and cost.** Define freshness, ingestion lag, query latency, error rate, and saturation SLOs. Instrument the pipeline, write on-call playbooks, and reason about cost per query and cost per event.
- **Engineering culture.** Describe design reviews, RFCs, testing standards, and how you would set the bar for future hires.

### Medium-confidence reported signals

- **No DSA round.** Three recent first-hand engineering reports say there was no LeetCode/DSA round. This is a company-style signal, not a guarantee for a Staff Data Engineer loop.
- **Time-boxed proof of work.** A proctored build of roughly two hours, with AI tools and documentation allowed, was reported twice. The evaluation included correctness, code quality, and explanation of tradeoffs.
- **Defend your own code.** A panel walked through the candidate's submission and past projects, pushing on scale, cost, and failure modes. Expect "what breaks at 10x?" follow-ups.
- **System design.** One backend report describes a multi-tenant, scalable notification service. This is not data-platform-specific, but it shows the style: multi-tenancy, scale, and API design.
- **Backend fundamentals.** Another backend report describes idempotency, retries, partial failure, and production failure scenarios in the final round.
- **Fast process.** Reports range from under three weeks to 1-2 weeks. One candidate was asked to join immediately. Confirm your notice period and availability early.

### Low-confidence or role-adjacent

- **VAD, Whisper, transformers, KV cache, on-device inference.** These appear in ML and on-device reports. They are useful evidence of Sarvam's interview style but are not data-platform questions.
- **"4-5 rounds over 2-3 weeks."** Generic articles repeat this without first-hand evidence. Do not plan around a fixed number.
- **Founder/CTO round with LLM use allowed.** Reported in one synthesis of candidate accounts; low confidence for this role.
- **Any "leaked" question list.** Public reports are self-selected and often paraphrased. Treat all prompts as directional.

## 5. Candidate experience patterns

- **Proof of work over algorithmic trivia.** The strongest repeated signal is that Sarvam engineering interviews favor building, debugging, and defending decisions over LeetCode. Three recent engineering reports had no DSA round.
- **AI tools are part of the workflow.** Two reports say AI assistants and documentation were allowed in the build round. One candidate said avoiding AI tools would read as a weakness. Confirm the current policy; it may vary by team and round.
- **Depth over breadth.** Interviewers push on why a decision was made, what else was considered, and what breaks under different constraints. One report describes a follow-up about re-embedding cost rather than index size, which is the kind of second-order thinking Sarvam seems to reward.
- **Speed and directness.** The process can move quickly, and communication may be informal (one report mentions WhatsApp). Be ready for short scheduling windows and immediate-joining requests.
- **Small, senior, on-site team.** The JD emphasizes a small team of senior builders in Bengaluru. Expect high ownership, ambiguity, and cross-functional work with product, finance, and infrastructure.
- **Level contamination is severe.** The public reports are fresher, intern, ML, or backend loops. None is a Staff Data Engineer loop. Use them to understand style, not difficulty or scope.
- **The role may be closed.** The current board does not list it. If you are interviewing, ask whether this is a backfill, a reopening, or a referral pipeline.

## 6. Source and access matrix

| Source | Value | Access | Use |
|---|---|---|---|
| [Archived official JD](https://web.archive.org/web/20260730153919/https://www.sarvam.ai/careers/jobs/7ee2ff5d-32a2-4b0a-9ae9-117ba8b626d1) | High; authoritative role scope | Public Wayback capture, 2026-07-30 | Ground truth for responsibilities and requirements |
| [Official job URL](https://www.sarvam.ai/careers/jobs/7ee2ff5d-32a2-4b0a-9ae9-117ba8b626d1) | Medium; stale/erroring | Public; currently "Unable to load this role" | Link for reference only |
| [Ashby job-board API](https://api.ashbyhq.com/posting-api/job-board/sarvam) | High; current open roles | Public API | Confirms 42 jobs and target role absence |
| [Sarvam careers](https://www.sarvam.ai/careers) and [About](https://www.sarvam.ai/about-us) | High; company context | Public HTML | Products, mission, founders, customers |
| [ClickHouse Open House Bangalore 2026](https://clickhouse.com/openhouse/bangalore-2026) and [Sunny Shah talk](https://www.youtube.com/watch?v=bqM_kgUkjn4) | High-medium; existing architecture | Public agenda/video; auto-transcript | Current ClickHouse use cases and stack |
| [LeetCode backend report](https://leetcode.com/discuss/post/8436800) | Medium; one first-hand report | Public post; direct fetch 403, reader workaround | One backend system-design signal |
| [DevsUnite fresher report](https://devsunite.com/blog/getting-hired-at-sarvam-ai-my-fresher-interview-story) | Medium; first-hand, recent | Public blog | Process style, build round, timeline |
| [X backend intern report](https://x.com/i/article/2096138888251375848) | Medium; first-hand, recent | Public X article | Take-home, panel, backend fundamentals |
| [X ML campus report](https://x.com/ranaharshraj7/article/2065801122494001516) | Medium-low; first-hand but older/ML | Public X article; Blind repost | No-DSA build style, 84 LPA including ESOPs |
| [Blind discussion](https://www.teamblind.com/post/sarvams-ai-interviews-have-no-dsa-and-still-offered-84-lpa-instead-l86l5tp0) | Low; secondary | Public search snippets only; ToS prohibits scraping | Corroboration only; no automation |
| [levels.fyi India Data SWE](https://www.levels.fyi/t/software-engineer/focus/data/locations/india.md) | Medium; market benchmark | Public markdown | All-levels market context, not a Sarvam band |
| [AmbitionBox SARVAM salaries](https://www.ambitionbox.com/salaries/sarvam-salaries) | Low; small, conflated sample | Public HTML | Directional only; do not use for negotiation |
| [Glassdoor SarvM.ai](https://www.glassdoor.co.in/Salary/SarvM-ai-Salaries-E7826863.htm) | Do not use | Wrong company; login/403 | Excluded |
| [HiredVoices SDE entry](https://hiredvoices.com/main/experiences/sarvam/sde) | Low; duplicate | Public HTML | Deduplicated against LeetCode |
| [HireStepX](https://hirestepx.com/blog/sarvam-ai-interview-experience-2026), [knok](https://knok.work/blog/sarvam-data-scientist-interview.html), [GitHub aggregator](https://github.com/ombharatiya/AI-Engineer-Interview-Questions/blob/main/14-company-interview-questions/sarvam-ai.md) | Low; generic or synthesized | Public HTML | Lead generation only; not independent evidence |
| [Reddit ML report](https://www.reddit.com/r/developersIndia/comments/1u4uf70/my_interview_experience_with_sarvamai_for_ml) | Low; original but access blocked | Direct 403; search snippets and X/Blind mirrors | Background only |

## 7. Evidence caveats

- **No official loop.** Sarvam has not published rounds, durations, or evaluation criteria. The reconstructed loop is inference.
- **No role-specific report.** None of the public reports is for Staff Data Engineer. The report is directionally useful but not a difficulty map for this role.
- **No reliable compensation band.** Sarvam-specific Staff Data Engineer compensation is unknown. Headline CTC figures include ESOPs and are not comparable.
- **Role is closed.** The current board does not list the role. Confirm whether it has reopened or whether the interview is for a different team/title.
- **Existing stack may differ from the JD.** Sarvam's public September 2026 talk describes ClickHouse Cloud, ClickPipes, FlexPrice, and a warehouse on S3/Iceberg. The JD emphasizes custom Go ingestion and Debezium/Kafka CDC. This may be a new platform, a migration, or stale wording. Ask.
- **"No DSA" is not a guarantee.** It was reported in three engineering loops, but a Staff role may include coding inside the practical or system-design round. Prepare to write code.
- **AI-tool policy may change.** Two reports say AI tools were allowed. Confirm with the recruiter and be ready to work without them.
- **Compensation pages are contaminated.** AmbitionBox/Glassdoor data for "SarvM.ai" is a different company. Even the "SARVAM" page appears to mix entities. Do not use it as a band.
- **Auto-transcript risk.** The ClickHouse talk details come from an auto-generated transcript. Product names and phrasing may be slightly wrong; treat the architecture summary as directional.
- **Small, self-selected sample.** Public reports overrepresent candidates who had strong or negative experiences. They are not statistically representative.
- **Not a leaked question bank.** The practice prompts in this report are derived from the official JD and public process signals.

## 8. Preparation plan

1. **Confirm the role and loop.** Ask whether the role is open, whether it is a backfill, who owns the platform today, the exact rounds, and whether AI tools are allowed.
2. **Build one reference architecture end to end.** Go ingestion API -> Kafka -> ClickHouse, plus Debezium CDC, a tenant-aware query API, a dashboard layer, and a billing extract. Include schema evolution, idempotency, replay, backfill, SLOs, and a cost model.
3. **Go deep on ClickHouse.** Practice choosing MergeTree engines, partition and sort keys, materialized views, projections, TTL, codecs, and skip indexes. Be able to size a cluster and explain replication, sharding, backups, upgrades, and failure recovery.
4. **Go deep on Kafka and Debezium.** Be able to explain partitioning, consumer groups, rebalances, retention, schema registry, exactly-once/idempotency, snapshot plus streaming, DDL changes, tombstones, and replay.
5. **Design the multi-tenant layer.** Practice RBAC, row-level security, tenant-aware query rewriting, query budgets, concurrency limits, caching, and protection from expensive or malicious queries.
6. **Design billing correctness.** Model usage events, rating, invoicing, late corrections, credits, reconciliation, audit, and finance exports. Be ready to explain how you detect a one-rupee discrepancy.
7. **Practice Go under time.** Build a small ingestion service with batching, retries, backpressure, context cancellation, metrics, tests, and a README. Rehearse with AI tools and without them.
8. **Prepare 0-to-1 stories.** For each, quantify scale, correctness, cost, incident impact, and organizational influence. Include one story about setting standards or raising the hiring bar.
9. **Run system-design mocks.** Use prompts from the high-confidence section. Spend 45-60 minutes per mock on requirements, high-level design, deep dives, failure modes, and cost.
10. **Prepare company and mission answers.** Know Sarvam's products, customers, Indic AI mission, and the public ClickHouse footprint. Be able to explain why this platform matters to Sarvam's products and finance function.
11. **Negotiate with the right numbers.** Ask for fixed base, ESOP grant value, vesting/cliff, refresh, bonus, and liquidity terms. Do not anchor on headline CTC or on SarvM.ai data.

### Questions to ask the recruiter

- Is the Staff Data Engineer role open, a backfill, or a reopening? Which team owns it?
- What are the exact rounds, durations, and formats? Is there a take-home or on-site build?
- Are AI coding tools allowed in the practical round?
- Who are the interviewers, and who is the hiring manager?
- Does the role build a new platform or consolidate the existing ClickHouse/ClickPipes/FlexPrice stack?
- What are the current data volume, event volume, and tenant scale?
- What is the compensation band, and how much is fixed versus ESOP?
- What is the on-call and on-site expectation?
- What does "shape the team" mean in this role: hiring, mentoring, or people management?

## 9. Key links

### Official

- [Archived Staff Data Engineer JD](https://web.archive.org/web/20260730153919/https://www.sarvam.ai/careers/jobs/7ee2ff5d-32a2-4b0a-9ae9-117ba8b626d1)
- [Current official job URL](https://www.sarvam.ai/careers/jobs/7ee2ff5d-32a2-4b0a-9ae9-117ba8b626d1) (currently fails to load the role)
- [Sarvam careers](https://www.sarvam.ai/careers)
- [Sarvam About](https://www.sarvam.ai/about-us)
- [Ashby job-board API](https://api.ashbyhq.com/posting-api/job-board/sarvam)
- [Staff Engineer, API Platform](https://www.sarvam.ai/careers/jobs/48b2c236-a7e7-475d-b98b-4eb942e85dc7)
- [Staff Engineer, Product Infrastructure](https://www.sarvam.ai/careers/jobs/10f11bb2-fe15-4743-9b3f-81da6743ea6a)

### Architecture and company context

- [ClickHouse Open House Bangalore 2026 agenda](https://clickhouse.com/openhouse/bangalore-2026)
- [Sunny Shah: How Sarvam AI runs its analytics infrastructure on ClickHouse Cloud](https://www.youtube.com/watch?v=bqM_kgUkjn4)
- [Sarvam customer stories](https://www.sarvam.ai/stories)

### Candidate reports

- [LeetCode: Sarvam Backend engineer - Jan 2026 - Reject](https://leetcode.com/discuss/post/8436800)
- [DevsUnite: Getting Hired at Sarvam AI](https://devsunite.com/blog/getting-hired-at-sarvam-ai-my-fresher-interview-story)
- [X: Sarvam AI Backend Engineer (On-Device AI) Internship](https://x.com/i/article/2096138888251375848)
- [X: Sarvam AI ML Engineer interview](https://x.com/ranaharshraj7/article/2065801122494001516)
- [Blind: Sarvam's AI interviews have no DSA](https://www.teamblind.com/post/sarvams-ai-interviews-have-no-dsa-and-still-offered-84-lpa-instead-l86l5tp0) (manual browsing only)
- [HiredVoices: Sarvam SDE](https://hiredvoices.com/main/experiences/sarvam/sde) (duplicate of LeetCode)
- [GetPersonalisedCV: Sarvam AI interview](https://getpersonalisedcv.in/blog/sarvam-ai-interview-experience-84-lpa-ml-engineer) (derivative coverage)

### Compensation and market context

- [levels.fyi: Data Software Engineer salary in India](https://www.levels.fyi/t/software-engineer/focus/data/locations/india.md)
- [levels.fyi: Data Engineer salary](https://www.levels.fyi/t/software-engineer/title/data-engineer/locations/india.md)
- [AmbitionBox: SARVAM salaries](https://www.ambitionbox.com/salaries/sarvam-salaries) (low confidence, likely conflated)
- [Glassdoor: SarvM.ai salaries](https://www.glassdoor.co.in/Salary/SarvM-ai-Salaries-E7826863.htm) (wrong company; do not use)

### Low-confidence or generic

- [HireStepX: Sarvam AI interview experience](https://hirestepx.com/blog/sarvam-ai-interview-experience-2026)
- [knok: Sarvam Data Scientist interview](https://knok.work/blog/sarvam-data-scientist-interview.html)
- [GitHub: AI Engineer interview questions - Sarvam](https://github.com/ombharatiya/AI-Engineer-Interview-Questions/blob/main/14-company-interview-questions/sarvam-ai.md)
- [Reddit: Sarvam ML interview experience](https://www.reddit.com/r/developersIndia/comments/1u4uf70/my_interview_experience_with_sarvamai_for_ml)
