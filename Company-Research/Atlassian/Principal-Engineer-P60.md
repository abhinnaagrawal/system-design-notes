# Atlassian - Principal Engineer (P60)

| Field | Value |
|---|---|
| Company | Atlassian |
| Role | Principal Engineer |
| Level | P60 |
| Scope | Principal Backend / Principal Fullstack |
| Research date | 2026-10-22 |
| Evidence cutoff | 2026-10-22 |
| Confidence | Official process: high. Question bank: medium. Compensation: medium-high. |

## Executive summary

- P60 is a Principal IC, roughly L6/E6-level. P70 is Senior Principal. P50 is Senior and is sometimes mislabeled as Principal in public reports.
- The published loop has five interviews across three stages: two coding interviews, one system design interview, one Leadership Craft interview, and one Values interview.
- The technical bar is not just algorithmic correctness. Atlassian explicitly evaluates working code, tests, code quality, extensibility, tradeoffs, communication, and adaptability.
- The strongest reported rejection point is Values or Leadership Craft, even after strong technical rounds.
- Recurring P60 prompts include a rate limiter with extensibility and concurrency, a Snake/mobile game low-level design, a tagging system, an org-hierarchy/LCA problem, feed design, Google Docs collaboration, and notification recovery.

## 1. Level and compensation

| Band | Meaning | Notes |
|---|---|---|
| P60 | Principal IC | Approximately L6/E6-level; hands-on technical leadership |
| P70 | Senior Principal | Organization-wide technical leadership |
| P50 | Senior IC | Not Principal; several public "Principal" reports are actually P50 |

Confirm the band and role scope with the recruiter before preparing. Job titles and public reports use "Principal" inconsistently.

### Compensation signal

From the [levels.fyi P60 US page](https://www.levels.fyi/companies/atlassian/salaries/software-engineer/levels/p60/locations/united-states.md), as of October 2026:

- Average self-reported total compensation: **$541,438**
- Base: **$266,250**
- Stock: **$230,938**
- Bonus: **$44,250**

Treat these figures as directional, self-reported aggregates rather than an offer guarantee.

## 2. Published interview loop

Sources:

- [Atlassian engineering interview hub](https://www.atlassian.com/company/careers/resources/interviewing/engineering)
- [Principal Backend Engineer guide](https://dam-cdn.atl.orangelogic.com/CDNLink/AT12O7ZJ.pdf)
- [Principal Fullstack Engineer guide](https://dam-cdn.atl.orangelogic.com/CDNLink/AT12OJH8.pdf)

The downloaded guides are marked (c) 2024.

| Stage | Interview | Time | Focus |
|---|---|---:|---|
| 1 | Coding 1 | 60 min | Coding fundamentals, working code, code quality, conceptual thinking |
| 2 | Coding 2 | 60 min | Coding; the role-specific guide may use an AI-enabled or browser-based format |
| 2 | System Design | 60 min | Technical depth and breadth, decisions, performance, reliability |
| 3 | Leadership Craft | 60 min | Owning and driving large projects, team direction, organizational impact |
| 3 | Values | 45 min | Structured behavioral questions mapped to Atlassian's values |

Each stage gates progression. The recruiter provides feedback before the candidate advances. The published guide notes that Atlassian may amend the process.

## 3. Round-by-round expectations

### Coding

The backend guide describes two coding formats: Data Structures and AI-Enabled Code Design. The fullstack guide describes Browser Coding and Code Design.

- Data Structures: write and execute code in the language the candidate knows best.
- AI-Enabled Code Design: use a HackerRank IDE with AI assistants and an existing repository. The candidate extends, fixes, or refactors code. Deep expertise in the repository's language is not required.
- Browser Coding: build a simple interactive UI in a browser environment.
- Candidates should have an IDE, testing framework, and debugger ready.
- Atlassian explicitly recommends testing and TDD.
- The evaluation includes problem-solving approach, communication, adaptability, and handling blockers, not only the final answer.

### System design

- Design on a whiteboard, paper, shared editor, or drawing tool.
- Start with fundamentals, clarify requirements, then increase complexity.
- Demonstrate technical depth and breadth, decision-making, performance, reliability, and operational considerations.
- Keep the customer in mind and explain how the solution performs at scale.
- There is no single expected answer.

### Leadership Craft

- Conducted by an engineering manager.
- A structured deep dive into one or more projects where the candidate demonstrated engineering leadership.
- Three primary areas:
  - Owning and driving outcomes across large-scale engineering projects.
  - Providing leadership and direction to project teams.
  - Creating positive organizational impact through knowledge sharing and improved ways of working.
- This is not primarily an architecture interview, but candidates should explain architectural choices and how they involved their teams.

### Values

The published value prompts cover:

- **Play as a team:** collaboration, helping an underperforming teammate, putting team goals above personal ambitions.
- **Be the change:** advocating change, lessons learned, and outcomes.
- **Don't #@!% the customer:** customer-first mentality and the tradeoffs made to protect the customer.
- **Open company, no bullshit:** difficult conversations, conflict resolution, and adapting communication.
- **Build with heart and balance:** prioritization, missed commitments, and recovery.

The Values round is a structured behavioral interview, not a casual culture chat.

## 4. Question bank

Prompts are paraphrased from public candidate reports. Public reports are self-selected and may omit details. This is preparation material, not a leaked question set.

### Strong P60 signals

- **Rate limiter:** implement a rate limiter with fixed-window or token-bucket logic, support extensibility by customer ID, and address thread safety. Reported in a [LeetCode P60 pass report](https://leetcode.com/discuss/post/3413193) and discussed in India-based principal reports.
- **Snake/mobile game low-level design:** implement a playable Snake game, reported as a Python pair-programming exercise in a [JoinTaro Sydney principal interview](https://www.jointaro.com/interviews/companies/atlassian/experiences/principal-engineer-sydney-january-1-2023-no-offer-positive-7a184f4c).
- **Tagging system:** design a tagging service similar to Confluence or social-platform tags. Reported on the [AmbitionBox principal page](https://www.ambitionbox.com/interviews/atlassian-interview-questions/principal-engineer).
- **Leader election:** coding exercise with variations, reported in the [LeetCode principal pass report](https://leetcode.com/discuss/post/3413193).
- **Values/leadership rejection:** a 2025 [Blind P60 report](https://www.teamblind.com/post/atlassian-principal-engineer-experience-koa5vgad) describes strong technical rounds followed by rejection at Values.

### Medium-confidence P60 reports

- **Employee org hierarchy / closest department:** find the closest common department or ancestor in an employee hierarchy, typically an LCA-style problem.
- **Voting system:** design or implement a voting system.
- **Facebook-like feed:** design a feed with friend counts and scale requirements.
- **Google Docs collaboration:** collaborative editing and consistent hashing.
- **E-sign notification recovery:** design recovery for failed or missed notifications.
- **Pipeline throughput:** reason about throughput and bottlenecks in a data pipeline.
- **Office-attendance parser and SQL/REST questions:** reported in Atlassian loops, but level attribution is less certain.

Primary source for several medium-confidence prompts: [LeetCode "Atlassian Principal Engineer Interview Onsite"](https://leetcode.com/discuss/post/6784903).

### P50 or mixed-level prompts - do not over-weight

- Color picker
- Trie
- Scheduler
- Rapid-fire system design rounds
- React tic-tac-toe
- Sprint-board design
- Pagination

These appear in [P50 reports](https://leetcode.com/discuss/post/7114235) and frontend discussions. They are useful practice but are not reliable evidence of the P60 question bank.

## 5. Candidate experience patterns

- **Five rounds over roughly 4-6 weeks.** One accepted 2021 report was closer to one month; other reports describe scheduling delays.
- **Values is a real filter.** Multiple reports describe technically strong candidates failing at the values stage.
- **Interviewer mix:** principal engineers and solution architects; some coding rounds feel like pair programming.
- **Depth over trivia:** interviewers push on interfaces, extensibility, tests, concurrency, failure handling, and operational tradeoffs.
- **Public reports overrepresent negative outcomes.** A [Glassdoor principal SWE page](https://www.glassdoor.com/Interview/Atlassian-Principal-Software-Engineer-Interview-Questions-EI_IE115699.0,9_KO10,37.htm) showed 41 interviews and a mostly negative experience at the time of research.
- **Level contamination:** some "Principal" reports are P50. Filter by band before using a report as P60 evidence.

## 6. Source and access matrix

| Source | Value | Access | Use |
|---|---|---|---|
| Official Atlassian guides and job descriptions | High; authoritative process and expectations | Public HTML/PDF | Ground truth and seed material |
| levels.fyi | Level and compensation signals; structured markdown pages | Public; verify robots and terms | Automated ingestion with attribution |
| LeetCode Discuss | Specific questions and round details | Public posts; direct fetch returned 403; reader workaround available | Search discovery and manual import; no bulk scraping |
| Blind | Detailed P60 experiences | Public pages, but the [ToS prohibits scraping](https://us.teamblind.com/setting/term) | Manual browsing only; never automate |
| JoinTaro | Detailed principal experiences | Public; verify terms | Manual or licensed ingestion |
| AmbitionBox | Question snippets | Public; check robots and terms | Manual |
| Glassdoor | Aggregate interview statistics | Login-gated or 403 | Do not scrape |
| Reddit | Anecdotes and compensation data | Official OAuth API is paid; direct access blocked | API only |
| GitHub | Interview repositories and question lists | Official API | Automated; low yield |
| Hacker News | Occasional discussion | Algolia API | Automated; near-zero principal-specific hits |
| YouTube | General preparation content | Data API | Low yield; no principal-specific videos found |

## 7. Evidence caveats

- There is no official question bank, pass-rate data, or published scoring rubric.
- Public reports are self-selected, often negative, and inconsistently labeled by level.
- Exact prompts and round order vary by role, region, team, and year.
- The official guide is from 2024. Confirm the current loop with the recruiter.
- Some prompts circulating as "Atlassian principal" are P50 or lower-level.
- The question bank should be treated as directional preparation, not as a question leak.

## 8. Preparation plan

1. Confirm band, role, location, loop format, and whether AI-enabled rounds are included.
2. Prepare 3-4 deep project stories with measurable organizational impact, mapped to Atlassian's five values.
3. Practice 60-minute coding with tests, extensibility, and explicit tradeoff discussion.
4. Practice AI-assisted work in an unfamiliar repository; focus on navigation, verification, and communication.
5. Drill low-level design: rate limiter, Snake, voting/booking, parser; cover interfaces, concurrency, and testability.
6. Drill high-level design: tagging, feed, collaborative editing, notification recovery, and throughput; cover consistency, failure, cost, and scale.
7. For fullstack roles, practice browser-based UI coding and React fundamentals.
8. Mock both the Leadership Craft and Values interviews. Quantify scope, outcomes, conflict, and lessons learned.

## 9. Key links

### Official

- [Engineering interview hub](https://www.atlassian.com/company/careers/resources/interviewing/engineering)
- [Principal Backend Engineer guide PDF](https://dam-cdn.atl.orangelogic.com/CDNLink/AT12O7ZJ.pdf)
- [Principal Fullstack Engineer guide PDF](https://dam-cdn.atl.orangelogic.com/CDNLink/AT12OJH8.pdf)
- [Senior Principal Engineer job description](https://www.atlassian.com/company/careers/details/25687)

### Compensation and aggregate data

- [levels.fyi P60 US](https://www.levels.fyi/companies/atlassian/salaries/software-engineer/levels/p60/locations/united-states.md)
- [Glassdoor Principal Software Engineer interviews](https://www.glassdoor.com/Interview/Atlassian-Principal-Software-Engineer-Interview-Questions-EI_IE115699.0,9_KO10,37.htm)

### Candidate reports

- [LeetCode: Atlassian Principal Engineer Interview Onsite](https://leetcode.com/discuss/post/6784903)
- [LeetCode: Atlassian Principal, remote, pass](https://leetcode.com/discuss/post/3413193)
- [LeetCode: Atlassian P50 rapid-fire system design](https://leetcode.com/discuss/post/7114235)
- [Blind: Atlassian Principal Engineer experience](https://www.teamblind.com/post/atlassian-principal-engineer-experience-koa5vgad)
- [JoinTaro: Principal Engineer, Sydney](https://www.jointaro.com/interviews/companies/atlassian/experiences/principal-engineer-sydney-january-1-2023-no-offer-positive-7a184f4c)
- [JoinTaro: Principal Engineer, Bengaluru, accepted](https://www.jointaro.com/interviews/companies/atlassian/experiences/principal-engineer-bengaluru-october-1-2021-accepted-offer-positive-0b47077c)
- [AmbitionBox: Principal Engineer questions](https://www.ambitionbox.com/interviews/atlassian-interview-questions/principal-engineer)
- [Reddit: Atlassian Principal Engineer](https://www.reddit.com/r/developersIndia/comments/166x9pq/atlassian_principal_engineer)
