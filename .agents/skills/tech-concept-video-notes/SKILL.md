---
name: tech-concept-video-notes
description: >-
  Processes a YouTube video URL on a core technology concept (like WebSockets, LSM Trees, TLS, Kafka).
  Extracts transcripts and synthesizes a deep-dive educational chapter covering how it works,
  pros/cons, and comparisons with alternatives, saving it in a 'Core Concepts' directory.
---

# Tech Concept Video Notes Skill

This skill automates extracting, analyzing, and documenting technology deep-dive videos (e.g., from *Hussein Nasser*, *Martin Kleppmann*, *ByteByteGo*) into structured, textbook-quality notes within this repository. 

**Note:** Use this skill for foundational concepts and protocols. For full end-to-end system design interview questions, use `system-design-video-notes` instead.

---

## Workflow Steps

### Step 1: Extract Video Metadata & Transcript

1. Given a YouTube video URL, run the bundled script:
   ```bash
   python3 .agents/skills/tech-concept-video-notes/scripts/extract_transcript.py "<YOUTUBE_URL>" /tmp/concept_transcript.json
   ```
2. The script extracts title, channel name, duration, and the full transcript with timestamps. It also extracts the video description (`shortDescription`).
3. **CRITICAL:** Ensure you read the *entire* transcript. If the JSON is too large for a single command output, read it in paginated chunks (e.g., 200 snippets at a time) so you do not miss the second half of the video.
4. **CRITICAL:** Check the extracted `shortDescription` metadata. If the video description contains links to diagrams (like Excalidraw, Lucidchart) or external text notes, you must extract and use those links as well. If it is an Excalidraw link, DO NOT attempt to extract the SVG via playwright or curl. Instead, STOP and PROMPT the USER to upload a screenshot of the Excalidraw canvas so you can translate it into Mermaid diagrams later.

---

### Step 2: Synthesize the Concept Notes

**CRITICAL: INTERVIEW PREP FOCUS**
**CRITICAL: EXHAUSTIVE DETAIL & CONCEPT DISTINCTION**
Do not gloss over mechanical details or summarize too aggressively. If the speaker explains exactly *how* a solution works under the hood (e.g., how Request Coalescing uses locks, or how an LSM tree merges SSTables), you MUST capture that explicit mechanism. Furthermore, if the speaker compares two similar concepts (e.g., Eviction vs Expiration/TTL, or Hash vs Range Partitioning), you must create a dedicated section breaking down the exact differences so no nuance is lost. Your goal is that the user NEVER has to watch the video to get the missing details.
These notes are meant as **prep for system design interviews**. You MUST explicitly capture any interview tips, trade-offs, or preferences mentioned in the transcript (e.g., "In an interview, you should prefer X over Y because..."). Capturing these trade-offs and interview strategies is critical.

Structure the notes logically to serve as a high-quality study guide:

1. **Header & Context:**
   - Topic name and YouTube video attribution (title, speaker/channel, link).
   - Brief 1-2 sentence TL;DR of what the concept is.

2. **Introduction & Motivation:**
   - What problem does this technology solve? (e.g., why did we need WebSockets when HTTP already existed?)
   - Historical context if applicable.

3. **How It Works (Deep Dive):**
   - Step-by-step breakdown of the protocol, data structure, or mechanism.
   - Use ASCII diagrams or Mermaid flowcharts where helpful.
   - Highlight key terminology (e.g., handshake, multiplexing, compaction, SSTables).

4. **Pros & Cons / Trade-offs:**
   - When should you use it?
   - When should you avoid it?
   - Performance implications (latency, throughput, memory overhead).

5. **Comparison with Alternatives:**
   - A clear comparison section (e.g., WebSockets vs. SSE vs. Long Polling, LSM Trees vs. B-Trees).
   - Use a markdown comparison table if multiple alternatives exist.

---

### Step 3: Save the Notes

1. Create or use a `Core Concepts` directory at the root of the repo (or a similarly named directory if one already exists for concepts).
2. Create a folder for the specific concept (e.g., `Core Concepts/Push Technology/README.md`).
3. Save the synthesized notes using standard GitHub-flavored markdown.

---

### Step 4: Update the Readme

1. Edit the root `Readme.md`:
   - If a `Core Concepts` or `Study Guides` section exists in the Table of Contents, add a link to the new notes file.
   - Add the video link to the `# Additional Resources` section at the bottom.
2. Clean up temporary files:
   ```bash
   rm -f /tmp/concept_transcript.json
   ```
3. Report completion to the user with links to the new file.
