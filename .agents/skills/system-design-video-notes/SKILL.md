---
name: system-design-video-notes
description: >-
  Processes a YouTube video URL on a system design topic or interview question.
  Extracts video transcripts and metadata, synthesizes a detailed, interview-ready system
  design chapter (requirements, back-of-the-envelope estimation, evolutionary multi-tier
  architectures, data models, bottlenecks, and trade-offs), and saves it as a numbered
  chapter in this repository with updated table of contents in Readme.md.
---

# System Design Video Notes Skill

This skill automates extracting, analyzing, and documenting system design interview videos (such as from *System Design Fight Club*, *ByteByteGo*, *Gaurav Sen*, *Jordan has no life*, etc.) into structured, textbook-quality chapters within this repository.

---

## Workflow Steps

### Step 1: Extract Video Metadata & Transcript

1. Given a YouTube video URL or ID (e.g., `https://www.youtube.com/watch?v=...`), run the bundled script:
   ```bash
   python3 .agents/skills/system-design-video-notes/scripts/extract_transcript.py "<YOUTUBE_URL>" /tmp/yt_transcript.json
   ```
2. The script:
   - Resolves the 11-character video ID.
   - Extracts title, channel name, duration, and description (`shortDescription`).
   - Uses an isolated environment to pull official or auto-generated subtitle tracks with timestamps into `/tmp/yt_transcript.json`.
3. **CRITICAL:** Ensure you read the *entire* transcript. If the JSON is too large for a single command output, read it in paginated chunks (e.g., 200 snippets at a time) so you do not miss the second half of the video.
4. **CRITICAL:** Check the extracted `shortDescription` metadata. If the video description contains links to diagrams (like Excalidraw, Lucidchart) or external text notes, you must extract and use those links as well. If it is an Excalidraw link, DO NOT attempt to extract the SVG via playwright or curl. Instead, STOP and PROMPT the USER to upload a screenshot of the Excalidraw canvas so you can translate it into Mermaid diagrams later.
5. Inspect the synthesized transcripts and diagram notes to understand the speaker's arguments, whiteboard diagrams, progression, questions asked by the audience, and specific trade-offs discussed.

---

### Step 2: Synthesize the System Design Chapter

**CRITICAL: INTERVIEW PREP FOCUS**
**CRITICAL: EXHAUSTIVE DETAIL & CONCEPT DISTINCTION**
Do not gloss over mechanical details or summarize too aggressively. If the speaker explains exactly *how* a solution works under the hood (e.g., how Request Coalescing uses locks, or how an LSM tree merges SSTables), you MUST capture that explicit mechanism. Furthermore, if the speaker compares two similar concepts (e.g., Eviction vs Expiration/TTL, or Hash vs Range Partitioning), you must create a dedicated section breaking down the exact differences so no nuance is lost. Your goal is that the user NEVER has to watch the video to get the missing details.
These notes are meant as **prep for system design interviews**. You MUST explicitly capture any interview tips, trade-offs, or preferences mentioned in the transcript (e.g., "In an interview, you should prefer X over Y because..."). Capturing these trade-offs and interview strategies is critical.

Structure the synthesized notes following the 4-step interview methodology established across this repository:

1. **Chapter Header & Context:**
   - Topic name and YouTube video attribution (title, speaker/channel, link).
   - Real-world product analogues (e.g., Jira, Twitter, Google Drive, Uber, Netflix).

2. **Step 1: Understand the Problem & Establish Scope:**
   - **Functional Requirements:** Core user capabilities (e.g., create/attach tags, search by tag, fetch timeline).
   - **Non-Functional Requirements:** Latency budgets, availability SLAs, consistency model (strong vs. eventual).
   - **Explicit Scope Boundaries:** State what is deliberately kept out of scope (e.g., autocomplete, streaming analytics) to maintain realistic interview focus.

3. **Step 2: Back-of-the-Envelope Capacity Estimation:**
   - Base metrics: Active users, write TPS, read QPS.
   - Data sizing: Row size, storage growth per year, multi-year projection.
   - **Key Sizing Insight:** Highlight whether storage, read QPS, or write TPS is the primary scaling bottleneck.

4. **Step 3: High-Level Design & Evolutionary Architecture:**
   Structure the architecture progressively across realistic scale tiers:
   - **Tier 1 (Internal / Low Volume):** Monolithic or single relational database (SQL), schema design, foreign keys, and join tables.
   - **Tier 2 (Enterprise Read-Heavy):** Master-follower read replicas, asynchronous write-ahead log (WAL) replication, eventual consistency, and why distributed joins across sharded SQL tables fail.
   - **Tier 3 (Internet / Distributed Scale):** Horizontally partitioned NoSQL (DynamoDB / Cassandra), message queues (Kafka) for asynchronous ingestion, task runner fan-out on write, and separating index storage from heavy content stores.
   - Include clean ASCII or Mermaid architecture diagrams.

5. **Step 4: Deep Dives, Bottlenecks & Production Nuances:**
   - **Partitioning Strategy:** Choice of partition key (`PK`) vs. sort key (`SK`), and single-partition vs. scatter-gather queries.
   - **Hot Partitions & Celebrity Problem:** Why naive consistent hashing fails on key-range queries, dedicated caching for viral entities (e.g., Twitter celebrity cache), or capacity unit over-provisioning (RCUs/WCUs).
   - **Indexing Trade-offs:** B-Tree vs. Inverted Index (when Elasticsearch/Lucene is actually required vs. when a B-tree on a partition key suffices).
   - **Algorithmic or ML Extensions:** Detailed design of advanced features (e.g., recommendation engines, classification models, batch training vs. online in-memory inference).
   - **Hardware Realities:** Cloud instance limitations (vCPUs on standard VMs, single-node saturation limits ~5k–10k QPS).
   - **Summary Comparison Matrix:** A comparison table contrasting approaches by QPS, storage engine, schema, and trade-offs.

---

### Step 3: Determine Folder Naming & Save the Chapter

1. Check existing numbered directories in the repository:
   ```bash
   ls -d [0-9]*
   ```
2. Determine the next sequential chapter number (e.g., if highest is `29. Tagging Service`, the next is `30. <Topic Name>/`).
3. Create the directory and write `README.md`:
   - Path: `<NN>. <Topic Name>/README.md`
   - Use standard GitHub-flavored markdown with clean code blocks, equations, and tables.

---

### Step 4: Update Index and Table of Contents

1. Edit the root `Readme.md`:
   - Add the new chapter link to the main table of contents:
     ```markdown
      * [Chapter <NN> - <Topic Name>](./<NN>.%20<Topic%20Name>/)
     ```
   - Add relevant links under `# Additonal Resources` at the bottom of `Readme.md`:
     ```markdown
     ### <Topic Name>
     - [<Video Title> (<Channel Name>)](<YOUTUBE_URL>)
     ```
2. Run `git status` to ensure all files are cleanly created and untracked artifacts in `/tmp` are cleaned up:
   ```bash
   rm -f /tmp/yt_transcript.json /tmp/test_extract.json
   git status
   ```
3. Report the completion to the user with direct markdown links to the new chapter and updated `Readme.md`.
