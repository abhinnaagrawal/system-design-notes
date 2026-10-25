# Company Interview Research - Methodology

A repeatable method for producing evidence-backed interview research for a company, role, and level. The Atlassian P60 report is the first implementation; this document is the runbook for the next company.

## 1. Purpose and non-goals

**Purpose:** Produce a cited, level-aware report covering the official interview process, recurring technical and behavioral questions, candidate experience patterns, compensation signals, and preparation implications.

**Non-goals:**

- Publishing or reselling leaked interview questions.
- Scraping login-gated, paywalled, or explicitly prohibited sources.
- Claiming pass rates or scoring rubrics that are not public.
- Treating self-reported anecdotes as statistically representative.

## 2. Output contract

Store each company's research in a named company folder:

```text
Company-Research/
  METHODOLOGY.md
  <Company>/
    <Role>-<Level>.md
```

Examples:

```text
Company-Research/Atlassian/Principal-Engineer-P60.md
Company-Research/Google/Staff-Software-Engineer.md
Company-Research/Meta/E6-Product-Engineer.md
```

Each report must include:

1. Metadata and research date.
2. Executive summary.
3. Level and compensation context.
4. Official process, if published.
5. Round-by-round expectations.
6. Question bank split by confidence.
7. Candidate experience patterns.
8. Source and access matrix.
9. Evidence caveats.
10. Preparation plan.
11. Key links.

## 3. Required inputs

Capture these before research starts:

| Input | Example |
|---|---|
| Company | Atlassian |
| Role family | Backend, fullstack, frontend, ML, SRE |
| Level or band | P60, L6, E6, Staff |
| Locations | US, India, remote |
| Recency window | Last 24 months preferred; older sources labeled |
| Output path | `Company-Research/Atlassian/Principal-Engineer-P60.md` |
| Access constraints | No Blind automation, no Glassdoor scraping |

If the company uses ambiguous bands, build a level map before collecting question data. A mislabeled "Principal" report can contaminate the entire question bank.

## 4. Source hierarchy

Use the strongest available evidence first. Separate official facts from candidate-reported signals.

### Tier 1: official or primary

- Company careers site and job descriptions.
- Official interview guides, handbooks, PDFs, and recruiter emails.
- Company engineering blog posts about hiring or leveling.
- Official compensation or leveling disclosures where available.

### Tier 2: structured public data and APIs

- levels.fyi level and compensation pages.
- Reddit official API, if credentials and terms allow.
- GitHub API for interview repositories and question lists.
- Hacker News Algolia API.
- YouTube Data API.
- Company-specific review APIs with explicit permission.

### Tier 3: public but manually curated

- LeetCode Discuss.
- Blind public posts.
- JoinTaro.
- AmbitionBox.
- Glassdoor aggregate pages.
- Personal blogs and Medium posts.

Use search-engine discovery and manual capture. Do not automate sources whose terms prohibit crawling, and never bypass authentication, paywalls, CAPTCHAs, or rate limits.

### Do not use

- Login-gated content obtained through automation.
- Scraped LinkedIn profiles or posts.
- Blind content obtained by scraping.
- Glassdoor full reviews behind authentication.
- Reposted question lists with no provenance.

## 5. End-to-end workflow

### Step 0: Define scope

- Confirm company, role, level, location, and recency window.
- Find the company's level mapping from official job descriptions, levels.fyi, and credible employee reports.
- Write down open questions to verify with a recruiter.
- Check whether the role has multiple tracks, such as IC, manager, or solutions architect.

### Step 1: Capture official process

- Find the company's interview guide or careers page.
- Download PDFs and preserve the source URL and date.
- Record the number of rounds, order, duration, format, and stated evaluation criteria.
- Note whether stages gate progression.
- Note whether the company uses coding, system design, low-level design, behavioral, values, or AI-assisted rounds.
- If no official guide exists, mark the process as "candidate-reported" rather than official.

### Step 2: Capture level and compensation

- Use levels.fyi or an equivalent structured source.
- Record level, location, base, stock, bonus, and total compensation.
- Record the date of the data.
- Mark all compensation as self-reported and directional.
- Look for band-specific job descriptions and base-salary ranges.

### Step 3: Collect candidate reports

Search for first-hand reports, prioritizing recency and level match.

Use queries such as:

```text
"<company>" "<role>" interview site:leetcode.com/discuss
"<company>" "<level>" interview site:teamblind.com
"<company>" "<role>" interview site:reddit.com
"<company>" "<role>" interview questions
"<company>" "<role>" interview guide filetype:pdf
"<company>" "<band>" compensation
```

For each report, capture:

- URL and publication date.
- Role, level, location, and team if stated.
- Interview year.
- Rounds and formats.
- Specific questions, paraphrased.
- Outcome, if disclosed.
- Whether the report is first-hand.
- Whether the level is verified or inferred.

Do not copy full posts into the report. Store short excerpts or paraphrases with links.

### Step 4: Extract technical signal

Normalize each question into a category:

- Data structures and algorithms.
- Low-level design or machine coding.
- High-level system design.
- Frontend or browser coding.
- AI-assisted codebase work.
- Leadership or project deep dive.
- Values or behavioral.
- Domain-specific knowledge.
- SQL, API, or language fundamentals.

Record the constraints that made the question notable, not just the prompt. For example:

- "Rate limiter" is weak signal.
- "Rate limiter with extensibility by customer ID and thread safety" is useful signal.

### Step 5: Normalize and deduplicate

- Normalize company, role, and level names.
- Map aliases such as "Principal" to the company's actual band where possible.
- Deduplicate repeated prompts across sources.
- Count independent sources, not reposts or copies.
- Separate official questions from candidate-reported questions.
- Separate questions by level; P50 data must not be presented as P60 evidence.

### Step 6: Weight the evidence

Use this rubric:

| Confidence | Criteria |
|---|---|
| High | Official source, or at least two independent first-hand reports with the same level and recent experience |
| Medium | One detailed first-hand report with the correct level, or multiple reports with minor level ambiguity |
| Low | Old report, unclear level, second-hand summary, or mixed-level data |

Additional weighting:

- Recent reports outrank older reports.
- Level-matched reports outrank generic company reports.
- Detailed reports outrank one-line posts.
- Official process outranks candidate guesses about the process.
- Compensation aggregates are not evidence of interview difficulty.
- Negative reports are not automatically more credible; self-selection matters.

### Step 7: Synthesize the report

Structure the report so readers can distinguish facts from inference:

1. State the official process.
2. State what each round evaluates.
3. Present the question bank with confidence labels.
4. Describe candidate experience patterns.
5. Add compensation context.
6. Add a source and access matrix.
7. State evidence gaps and caveats.
8. Convert findings into preparation actions.

Avoid presenting a single anecdote as a pattern. Use phrases such as "one report describes" or "recurring across two P60 reports" instead of "the interview always asks."

### Step 8: QA before publishing

- Verify every non-obvious claim has a link or is marked as inference.
- Check level matches; remove P50 data from P60 conclusions.
- Check dates and distinguish old from current process.
- Confirm compensation date and source.
- Confirm no PII, scraped private content, or copied full posts.
- Check that prohibited sources were not automated.
- Check that the report separates official process from crowd-reported questions.
- Check that the question bank is labeled directional, not leaked.
- Check links return the intended page, or note access limitations.

### Step 9: Publish and schedule refresh

- Save the report in the company folder with the role and level in the filename.
- Add a research date and evidence cutoff.
- Review official guides and job descriptions quarterly.
- Refresh candidate reports every 6-12 months, depending on volume.
- Add a changelog when a process change is confirmed.

## 6. Extraction record template

Use a consistent record for each evidence item:

```yaml
company: "<company>"
role: "<role>"
level_reported: "<level>"
level_normalized: "<band>"
location: "<location>"
source_type: "official | api | public_post | manual"
source_url: "<url>"
published_at: "<date>"
first_hand: true
round: "<coding | system_design | leadership | values | other>"
question: "<paraphrased prompt>"
category: "<category>"
constraints:
  - "<important constraint>"
outcome: "<offer | reject | unknown>"
compensation: "<optional>"
evidence_excerpt: "<short excerpt or paraphrase>"
confidence: "high | medium | low"
notes: "<ambiguities>"
```

## 7. Report template

```markdown
# <Company> - <Role> (<Level>)

| Field | Value |
|---|---|
| Company | |
| Role | |
| Level | |
| Scope | |
| Research date | |
| Evidence cutoff | |
| Confidence | |

## Executive summary

## 1. Level and compensation

## 2. Published interview loop

## 3. Round-by-round expectations

## 4. Question bank

### High-confidence signals

### Medium-confidence reports

### Lower-confidence or mixed-level prompts

## 5. Candidate experience patterns

## 6. Source and access matrix

## 7. Evidence caveats

## 8. Preparation plan

## 9. Key links
```

## 8. Compliance rules

- Read and follow the terms of every source.
- Do not automate Blind, Glassdoor, LinkedIn, or any login-gated source.
- Do not bypass authentication, paywalls, CAPTCHAs, or anti-bot controls.
- Respect robots.txt and rate limits.
- Prefer official APIs and licensed data.
- Store URLs and short excerpts, not full copies of posts.
- Remove personal identifying information.
- Attribute compensation and question data to the source.
- Treat candidate reports as protected user content, not a public-domain question bank.

## 9. Known pitfalls

- **Mislabeled levels:** "Principal" can mean different bands. Verify before using data.
- **Negative-report bias:** people who had bad experiences are more likely to post.
- **Survivorship bias:** accepted candidates rarely write detailed reports.
- **Stale process:** guides and loops change; mark the date.
- **Question mutation:** public prompts get paraphrased and drift across reposts.
- **False patterns:** one viral post can create the illusion of a recurring question.
- **Compensation confusion:** total compensation aggregates are not level-specific offers.
- **Scraping shortcuts:** they create legal and ethical risk and produce low-quality data.
- **LLM hallucination:** never let synthesis invent a question, round, or outcome that is not in the evidence.
- **Overfitting to one company:** preserve raw records so the next company uses the same schema, not the same conclusions.

## 10. Next-company runbook

Use this checklist when starting a different company:

- [ ] Create `Company-Research/<Company>/`.
- [ ] Define the role, level, location, and recency window.
- [ ] Build a level map from official job descriptions and compensation data.
- [ ] Find the official interview guide, careers page, and role-specific PDFs.
- [ ] Record the official loop and evaluation criteria.
- [ ] Capture compensation and band data with dates.
- [ ] Search for recent, level-matched candidate reports.
- [ ] Extract each question into the standard record.
- [ ] Deduplicate and split by confidence and level.
- [ ] Write the report using the standard template.
- [ ] Run the QA checklist and compliance check.
- [ ] Save the report with a research date and evidence cutoff.
- [ ] Record unresolved questions for recruiter verification.
- [ ] Schedule the next refresh.

## 11. Lessons from the Atlassian iteration

- Official PDFs are unusually valuable. Search for role-specific interview guides before relying on forums.
- Bands matter more than titles. Separating P60 from P50 changed the question bank materially.
- The values/leadership round was the most important non-technical signal and deserved its own section.
- The most useful question records included constraints and evaluation criteria, not just the prompt.
- Blind's terms prohibit scraping even for logged-in users, so manual curation is the only compliant path.
- LeetCode and Reddit direct access can be blocked; preserve source URLs and use search snippets rather than assuming content is unavailable.
- The final report should be useful for preparation, but honest about confidence and missing data.
