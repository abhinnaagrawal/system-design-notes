# Book Notes: Principal Engineer Reading List

> Original study summaries synthesized from publisher/author materials and established public summaries. These notes paraphrase and organize the core arguments; they are not a substitute for the books. Buy or borrow the originals for the full examples and nuance.

## Contents

1. [What Got You Here Won't Get You There](#1-what-got-you-here-wont-get-you-there)
2. [The Staff Engineer's Path](#2-the-staff-engineers-path)
3. [The Elegant Puzzle](#3-the-elegant-puzzle)
4. [Good Strategy, Bad Strategy](#4-good-strategy-bad-strategy)
   - [Rumelt's Kernel of Strategy (Deep Dive)](#rumelts-kernel-of-strategy-deep-dive)
5. [The 7 Habits of Highly Effective People — Habit 7](#5-the-7-habits-of-highly-effective-people--habit-7-sharpen-the-saw)
6. [Thinking in Systems](#6-thinking-in-systems)
7. [Cross-Book Synthesis](#7-cross-book-synthesis)

**Suggested reading order:** Goldsmith → Covey → Reilly → Rumelt → Larson → Meadows. Start with the personal/behavioral foundation, move to the staff-level operating model, then strategy and systems.

---

## 1. What Got You Here Won't Get You There

**Author:** Marshall Goldsmith with Mark Reiter
**Published:** 2007
**One-line thesis:** The behaviors that made you successful can become the behaviors that block your next level; senior growth is about *stopping* the wrong things, not adding more skills.

### Why it matters for Principal engineers

- At senior levels, technical skill is table stakes. The differentiator is **interpersonal behavior**: how you listen, give credit, handle disagreement, and manage your own ego.
- The book gives a concrete vocabulary for the "blind spots that stall career transitions" — especially **adding too much value** and **the need to win at all costs**.
- It reframes development as subtraction: build a **"to-stop" list**, not another "to-do" list.

### The success delusion

Successful people tend to believe:

1. I have succeeded.
2. I can succeed.
3. I will succeed.
4. I choose to succeed.

That confidence is useful — until it becomes resistance to change. Goldsmith's key observation: **we often succeed in spite of certain behaviors, not because of them.** We credit the behavior anyway and defend it as part of our identity.

**The Natural Law:** People change only when it is demonstrably in their own best interest, as they define it.

### The 20 habits

| # | Habit | What it looks like | Antidote |
|---|-------|--------------------|----------|
| 1 | **Winning too much** | Needing to win every argument, even irrelevant ones | Ask "Is it worth it?" Let others win |
| 2 | **Adding too much value** | "Good idea — but here's how to improve it" | Ask before advising; let the idea stay theirs |
| 3 | **Passing judgment** | Rating others and imposing your standards | Observe and describe; don't rate |
| 4 | **Making destructive comments** | Sarcasm and cutting remarks meant to sound witty | Ask "Is it worth it?"; say nothing |
| 5 | **Starting with "No," "But," or "However"** | Signals "I'm right, you're wrong" | Replace with "Yes, and…" |
| 6 | **Telling the world how smart you are** | Proving you're the smartest person in the room | Let results speak; ask questions |
| 7 | **Speaking when angry** | Using emotional volatility as a management tool | Pause; keep your mouth shut |
| 8 | **Negativity** | "Let me explain why that won't work" | Ask "What would make it work?" |
| 9 | **Withholding information** | Hoarding information to keep an advantage | Overcommunicate; assume good intent |
| 10 | **Failing to give proper recognition** | Never praising or rewarding contribution | Recognize specifically and promptly |
| 11 | **Claiming credit you don't deserve** | Overstating your role in a success | Give credit away |
| 12 | **Making excuses** | Reframing a flaw as a permanent fixture | Own it; apologize |
| 13 | **Clinging to the past** | Blaming history and other people | Focus on the future |
| 14 | **Playing favorites** | Treating some people unfairly without noticing | Apply consistent criteria |
| 15 | **Refusing to express regret** | Never admitting you were wrong | Say "I'm sorry" |
| 16 | **Not listening** | Interrupting; waiting to speak | Listen to understand; don't interrupt |
| 17 | **Failing to express gratitude** | Taking people for granted | Thank people — it costs nothing |
| 18 | **Punishing the messenger** | Attacking the person who brings bad news | Say "thank you" for the information |
| 19 | **Passing the buck** | Blaming everyone but yourself | Shoulder the blame |
| 20 | **An excessive need to be "me"** | "That's just who I am" | Separate identity from behavior |

### The 21st habit: goal obsession

Fixation on a goal so intense that it warps values and judgment. Goldsmith calls it **"not a flaw — it creates flaws."** The Princeton Good Samaritan study is used to show how task focus can make people ignore the bigger picture.

### The change method

1. **Get honest feedback** — 360° input from people who know your work.
2. **Apologize** — "I'm sorry. I'll try to do better." Then *stop talking*; no justification.
3. **Advertise** — tell stakeholders which specific behavior you're changing.
4. **Listen** — accept feedback without defending.
5. **Thank** — gratitude closes the loop.
6. **Follow up** — monthly check-ins for 12–18 months: "How am I doing?"
7. **Practice feedforward** — future-focused suggestions, never past critique.

### Feedforward (the core exercise)

1. Pick one behavior that would make a significant positive difference.
2. Describe the goal to anyone — colleague, friend, even a stranger.
3. Ask for **two suggestions for the future**. No mention of the past is allowed.
4. Listen and take notes. Do not judge, rate, or critique — just say "Thank you."

**Why it works:** feedback is past tense and triggers defensiveness; feedforward is future tense and is easier to hear. Goldsmith also notes that **80% of learning from others depends on how well you listen.**

### Key takeaways

- The higher you go, the more your problems are **behavioral**.
- One small habit — not a personality transplant — is usually enough to unlock the next level.
- Understanding is not the same as doing. **Follow-up converts insight into behavior.**
- Give credit away; recognition is the "ribbon around the gift."
- "That's just me" is the most expensive excuse in leadership.

### Sources

- Author's official book page: <https://marshallgoldsmith.com/book-page-what-got-you-here>
- Official 20-habits list: <https://marshallgoldsmithlibrary.com/blog/2008/01/01/what-got-you-here-wont-get-you-there/>
- getAbstract summary: <https://www.getabstract.com/en/summary/what-got-you-here-wont-get-you-there/6634>
- James Clear's notes: <https://jamesclear.com/book-summaries/what-got-you-here-wont-get-you-there>
- US Army Read2Lead facilitator guide (free PDF, with discussion questions): <https://juniorofficer.army.mil/wp-content/uploads/2020/05/Read2Lead-What-Got-You-Here-Wont-Get-You-There.pdf>

---

## 2. The Staff Engineer's Path

**Author:** Tanya Reilly
**Published:** 2022
**One-line thesis:** Staff engineering is a leadership role without direct reports; impact comes from seeing the big picture, leading cross-team execution, and being a good influence at scale.

### Why it matters for Principal ICs

- It is the clearest blueprint for the **Principal IC career track**: how to scope the role, choose high-leverage work, and avoid becoming a tactical bottleneck.
- It treats "the organization as a system" — you learn to read the org, find leverage, and create direction without authority.
- It covers the unglamorous mechanics: writing, decision records, project recovery, and managing your own time.

### Part I — The Big Picture

#### What do you actually do here?

Staff roles take several shapes. Reilly names four common archetypes:

| Archetype | What they do |
|-----------|--------------|
| **Tech Lead** | Partners with a manager to guide one or more teams |
| **Architect** | Owns technical direction and quality across a critical area |
| **Solver** | Drops into one hard problem at a time |
| **Right Hand** | Adds leadership bandwidth to an organization |

Key ideas:

- **Scope must be deliberate.** Too broad → lack of impact, bottleneck, decision fatigue, missing relationships. Too narrow → lack of impact, opportunity cost, overshadowing others, over-engineering.
- Your role spans four disciplines: **core technical skills, product management, project management, and people management.** Seniority means switching between them fluidly.
- Decide how much you want to code. Coding gives depth of understanding, but it is rarely the highest-leverage use of a staff engineer's time.
- Write a **"What do I do here?"** document and align it with your manager and peers. Cover: overview, goals, sample activities, and what success looks like.
- "Whenever there is a feeling of 'someone should do something here,' there is a reasonable chance that the someone is you."
- Before taking on a problem, ask whether it is **strategically important**. If not, do something else.

#### Three maps

| Map | Question it answers | What it reveals |
|-----|---------------------|-----------------|
| **Locator map** | Where am I? | Your position, scope, and what lies outside your team's bubble |
| **Topographical map** | What is the terrain? | Culture, decision-making, power, chasms, fortresses, unofficial org chart |
| **Treasure map** | Where are we going? | Long-term goals and how today's work connects to them |

- The **locator map** prevents local-maxima thinking. Without it: bad prioritization, loss of empathy, tuning out problems, forgetting what the work is for.
- The **topographical map** helps you navigate culture. Useful axes: open vs. secret, oral vs. written, top-down vs. bottom-up, fast vs. deliberate change, back channels vs. front doors, allocated vs. available people, liquid vs. crystallized careers.
- The **treasure map** prevents short-termism. Without it: competing initiatives, unfinished big projects, accumulating cruft, and engineers who stop growing.
- If the map is unclear, **draw a new one**. A clear narrative makes even small tasks part of a bigger story.

#### Creating the big picture

- Vision and strategy are not always needed, but they are needed when the project is large or when **getting people to agree is the work**.
- Writing is the number-one project tool: "**better wrong than vague**" — a specific wrong statement can be corrected; a vague one lingers.
- "**Not deciding is a decision** — usually not a good one."
- Ask "Can anyone not live with option A?" rather than "Is everyone OK with option A?"
- You do not have to invent the solution yourself. Your job is to ensure there is an **agreed-upon, well-understood solution** that solves the problem.

### Part II — Execution

#### Finite time

- You cannot do everything. Choose work that is important to the company *and* important to you.
- Put concrete work — not just meetings — on the calendar.
- Notice when you are doing busy work because you are tired; rest instead.
- "You have to make peace with walking past things that are broken or suboptimal."

#### Leading big projects

- The usual reason a project is difficult is **ambiguity**. Your job is to reduce it.
- **Write things down.** Three bullet points plus one call to action is often enough.
- As project lead, you will fill any role that has no owner.
- Recruit people who are optimistic, good at conflict resolution, and strong communicators.
- No implementation discussion until everyone agrees on the problem.
- Don't just announce the solution once — keep telling people until it sticks.
- If a project is not in good shape near the end, it will never be.

#### Why have we stopped? (getting unstuck)

Techniques:

1. **Understand and explain** the problem.
2. **Make the work easier** (reduce scope, remove blockers).
3. **Get organizational support** (escalate, align incentives).
4. **Make alternative plans** (change direction deliberately).

Blocked by a decision? Make a guess, document it in an **ADR**, and keep moving. Blocked by a person? Understand their constraints before assuming resistance.

### Part III — Leveling Up

#### You're a role model now (sorry)

- **Values are what you do**, not what you say. Engineering norms are set by the behavior of the most respected engineers.
- If senior engineers don't write tests, nobody else will.
- People assume you know what you're talking about — be careful with what you say.
- The degree to which other people want to work with you is a direct indicator of career success.
- **Radiate intent** rather than seeking permission or asking for forgiveness.

#### Good influence at scale

- Teaching, mentoring, reviewing designs, and writing are all forms of leadership.
- Don't jump to advice. Sometimes a mentee needs empathy or a chance to vent.
- If you can't think of what someone should improve, ask why they aren't one level more senior.
- You cannot be an expert in everything. Build judgment about where to go deep.

#### What's next?

- Keep a weekly record of your job signals: impact, learning, relationships, energy.
- Stay long enough to see the consequences of your actions; that feedback loop is where real learning happens.
- Every job should serve both your immediate needs and your long-term goals.

### Key takeaways

- Staff engineering is **leadership without authority**; influence comes from context, clarity, and credibility.
- **Writing is leverage.** Strategy, decisions, project plans, and alignment all run through written artifacts.
- Avoid both over-broad and over-narrow scope; define your role explicitly.
- Read the organization like a map. Culture and power are part of the terrain.
- Success is measured by the team's success, not by how much code you personally write.

### Sources

- O'Reilly book page and TOC: <https://www.oreilly.com/library/view/the-staff-engineers/9781098118723/>
- Daniel Lebrero's detailed notes: <https://danlebrero.com/2024/01/24/the-staff-engineers-path-summary/>
- Chris Lettieri's summary: <https://bitsofchris.com/p/book-summary-the-staff-engineers-path-by-tanya-reilly>
- Community chapter notes: <https://github.com/tuvopaypal/the-staff-engineers-path>
- Software Philosopher reading notes: <https://softwarephilosopher.com/2024/10/27/the-staff-engineers-path-my-reading-notes/>

---

## 3. The Elegant Puzzle

**Author:** Will Larson
**Published:** 2019
**One-line thesis:** Engineering management is a design discipline; teams and organizations are systems of stocks, flows, and feedback loops, and leaders should shape the system rather than firefight its exceptions.

### Why it matters for Principal ICs

- Though written for managers, it gives Principal ICs the **organizational systems vocabulary** they need to influence without authority.
- Its treatment of **technical debt, organizational velocity, team states, and systems-level complexity** is directly applicable to cross-team technical leadership.
- It explains why "just try harder" fails and why structure, policy, and capacity determine outcomes.

### Core frameworks

#### 1. The four states of a team

| State | Symptoms | What the team needs |
|-------|----------|---------------------|
| **Falling behind** | Backlog grows every week | More people + tactical support; narrow focus |
| **Treading water** | Critical work gets done, but no capacity for debt or new projects | Limit work in progress; finish work; start paying debt |
| **Repaying debt** | Debt is coming down; benefits are visible | Protect the momentum; keep capacity allocated |
| **Innovating** | Low debt, high morale, work focused on user needs | Protect the team; avoid overload; expand scope carefully |

The model matters because **the same intervention helps in one state and hurts in another.** A team that is falling behind does not need another "innovation initiative"; it needs capacity and focus.

#### 2. Stocks and flows

- A **stock** is an accumulation: open roles, technical debt, backlog, team capacity, trust.
- A **flow** is a rate: hiring rate, attrition rate, incoming requests, rate of debt repayment.
- Stock-and-flow thinking exposes why systems feel slow: you cannot instantly change a stock; you can only change flows, and flows have delays.
- The hiring funnel, onboarding funnel, and promotion pipeline are all systems with stocks and flows.

#### 3. Technical debt as a system

- Debt is a **stock** that accumulates when the rate of shortcuts exceeds the rate of repayment.
- Make debt visible; size it; allocate explicit capacity to pay it down.
- Don't trade quality for speed: the repayment comes later with interest, in incidents and slowed delivery.
- "Never trade off quality over speed" — sustainable velocity depends on quality.

#### 4. Organizational growth and team sizing

- Growth is a **catalyst of complexity**: more people create more communication paths, more coordination cost, and more management layers.
- Do not scale human teams like servers. Hiring too fast makes you slower.
- Prefer **four people on two things** over six people on six things.
- Limit work in progress; finish more, start less; tame the backlog by hiding or deferring low-priority work.
- Shut down external request channels when the team is at capacity; protect focus.

#### 5. Product management for engineering leaders

Treat product work as an **iterated elimination tournament** across four stages:

1. **Problem discovery**
2. **Problem selection**
3. **Solution validation**
4. **Solution delivery**

The failure mode is skipping straight to delivery (or straight to code) without validating that the problem is worth solving. Principal engineers should ask which stage a project is actually in.

#### 6. Work the policy, not the exceptions

- If you are constantly handling one-off exceptions, **the system is broken**.
- Treat every escalation as a **bug report for your policy**.
- Fix the constraint so the system handles the load, rather than becoming a human bottleneck.
- This is one of the highest-leverage shifts for senior ICs: design the rule, not the rescue.

### Key takeaways

- Organizations are systems; model stocks, flows, delays, and feedback loops before intervening.
- Diagnose the team's state before prescribing a fix.
- Technical debt is a capacity problem, not a moral failing — make it visible and budget for it.
- Limit work in progress; finish work; protect focus.
- When you see recurring exceptions, change the policy.
- Management is an ethical profession because decisions about promotions, hiring, and layoffs materially affect people's lives.

### Sources

- Will Larson on durable teams (author's site): <https://lethain.com/durably-excellent-teams/>
- LeadDev overview: <https://leaddev.com/career-development/10-essential-books-new-software-engineering-managers>
- Four team states summary: <https://www.sorryengineering.com/p/journey-to-high-performing-team>
- Will Larson interview on systems thinking: <https://egghead.io/podcasts/the-elegant-system-of-management-with-will-larson>
- Detailed reflection on the book's systems lens: <https://crazy-lens.com/2026/01/27/engineering-puzzle/>

---

## 4. Good Strategy, Bad Strategy

**Author:** Richard Rumelt
**Published:** 2011
**One-line thesis:** Strategy is coherent action backed by an argument; most "strategies" are just goals, slogans, and wishful thinking.

### Why it matters for Principal engineers

- It changes how you answer technical strategy questions: instead of listing goals ("we will improve reliability, reduce cost, and increase velocity"), you identify the **kernel** of the problem and build a cohesive action plan.
- It gives you a test for distinguishing real strategy from fluff in RFCs, roadmaps, and org initiatives.
- It teaches you to choose what *not* to do — the core discipline of senior technical leadership.

### Rumelt's Kernel of Strategy (Deep Dive)

**Definition.** The kernel is the irreducible core of a strategy: the smallest set of claims and commitments that still explains *what to do* and *why*. It is not a vision statement, a goal list, or a plan. It is an **argument about a challenge** plus a **design for overcoming it**.

> "Good strategy is coherent action backed up by an argument, an effective mixture of thought and action with a basic underlying structure I call the kernel."

#### The three elements

| Element | Question it answers | What good looks like | Failure mode |
|---------|---------------------|----------------------|--------------|
| **Diagnosis** | What is going on? | A simplified, specific explanation of the critical obstacle — it names the crux | A list of symptoms or a vague complaint ("execution is slow") |
| **Guiding policy** | What is our overall approach? | A stance that creates or exploits advantage and rules out entire categories of action | A goal ("be the best"), a slogan, or a menu of unrelated initiatives |
| **Coherent actions** | What will we actually do? | Coordinated, mutually reinforcing moves with real resource commitments | A laundry list; actions that cancel each other out |

#### 1. Diagnosis — find the crux

- A diagnosis is a **judgment about what matters**. It simplifies overwhelming complexity by identifying the critical aspect of the situation.
- It is usually expressed through a metaphor, analogy, or an accepted framework.
- A good diagnosis explains **why the situation is hard**, not merely *that* it is hard.
- Most deep strategic changes begin with a **change in diagnosis** — a new way of seeing the situation.

**Diagnostic questions:**
- What is the one obstacle that, if removed, makes everything else easier?
- What is the actual constraint: capacity, incentives, information, trust, policy, architecture?
- What would have to be true for the obvious solution to work? Is it true?
- What are we systematically not seeing?
- What would a smart outsider say is really going on?

#### 2. Guiding policy — choose the approach

- The guiding policy is the **overall approach** for overcoming the obstacle. It is like guardrails: it directs and constrains action without specifying every step.
- It is **not** a goal, vision, or desirable end state. It defines a *method* of grappling with the situation.
- A good guiding policy **rules out a vast array of possible actions** and concentrates effort on a pivotal point.
- It creates advantage by anticipating reactions, reducing ambiguity, exploiting leverage, and making actions cohere.

**Tests:**
- Does it tell us what **not** to do?
- Does it concentrate effort rather than spread it?
- Does it follow from the diagnosis, or is it a generic best practice?
- Would two competent leaders reading the diagnosis independently arrive at roughly this approach?

Classic examples: Kennan's **containment** policy and Gerstner's choice to integrate IBM around customer solutions rather than sell disconnected products.

#### 3. Coherent actions — make the argument real

- Actions are the **resource commitments, policies, and maneuvers** that carry out the guiding policy.
- They must be **consistent and coordinated** — each should make the others more effective.
- Coordination itself is a source of advantage: a coherent system is harder to copy than any single move.
- "Strategy is visible as coordinated action imposed on a system." If there is no action, there is no strategy.

**Tests:**
- If you removed one action, would the others be weaker?
- Do all actions serve the same guiding policy?
- Are the trade-offs explicit — what are we *not* funding or doing?
- Does the plan survive contact with reality, or does it assume perfect execution?

#### The logic of the kernel

The kernel is a **causal chain**:

**Diagnosis → Guiding policy → Coherent actions**

Break any link and the strategy fails:

- Diagnosis without a guiding policy = an accurate complaint.
- Guiding policy without action = a slogan.
- Action without diagnosis = busy activity with nowhere to go.
- Actions that contradict each other = incoherence, not strategy.

The kernel is also a **bet**. The diagnosis can be wrong. Good strategists state what would falsify it and revisit the kernel when reality changes. A kernel written once at an offsite and never updated is a fossil, not a strategy.

#### Worked technical example

**Challenge:** Product teams wait weeks for infrastructure changes, and reliability is getting worse.

| Kernel element | Example |
|----------------|---------|
| **Diagnosis** | The bottleneck is not headcount; it is a centralized manual-approval policy that forces every change through one queue. Incidents cluster in the shared deployment pipeline, so reliability work is being spread across teams instead of concentrated where the risk is. |
| **Guiding policy** | Replace centralized approval with a **paved-road self-service platform** backed by automated guardrails, and concentrate reliability investment on the shared pipeline. |
| **Coherent actions** | 1. Build self-service templates for the top five change types.<br>2. Automate policy and compliance checks in CI.<br>3. Fund a dedicated reliability squad for the deployment pipeline.<br>4. Publish SLOs and error budgets.<br>5. Retire the manual approval queue for low-risk changes. |
| **Why coherent** | Every action reinforces the same shift — from *approval* to *guardrails* — and removes a different part of the same bottleneck. None of them is an unrelated "best practice." |

Notice what the kernel **rules out**: hiring more approvers, adding another review board, or launching a broad "quality initiative" across every team. Those may be reasonable in other situations, but they do not follow from this diagnosis.

#### Kernel worksheet

Write your strategy in exactly these sentences:

1. **Diagnosis:** "The critical obstacle is ___ ; it matters because ___."
2. **Guiding policy:** "We will ___ by ___ , and we will explicitly not ___."
3. **Coherent actions:** "We will (1) ___ , (2) ___ , and (3) ___ — each reinforces ___."
4. **Falsification:** "This diagnosis would be wrong if ___."
5. **Trade-off:** "The main thing we are giving up is ___."

If sentence one is vague, everything after it is guesswork.

#### Common mistakes

- **Goal substitution:** "Increase revenue 20%" is an outcome, not a diagnosis.
- **Fluff:** "Synergistic platform transformation" with no causal claim.
- **Laundry list:** ten priorities with no focus and no trade-offs.
- **No action:** a strategy deck with no resource commitments.
- **Solution-first:** jumping to a preferred technology or reorg before naming the obstacle.
- **Incoherence:** cutting platform headcount while demanding faster delivery, or rewarding speed while asking for reliability.
- **Ignoring second-order effects:** not asking how competitors, customers, or internal teams will react.
- **Never revisiting:** defending a diagnosis after the situation has changed.

#### Using the kernel in technical reviews

- Ask for the **diagnosis first**. If the author cannot name the obstacle, stop.
- Ask what the guiding policy **rules out**.
- Ask which actions **reinforce** each other and which are merely adjacent.
- Ask what evidence would **change their mind**.
- If it cannot be stated in three sentences, the strategy is not ready — the document may still be useful, but it is a plan, not a strategy.

#### Key quotes

- "The kernel of a strategy contains three elements: a diagnosis, a guiding policy, and coherent action."
- "A good diagnosis simplifies the often overwhelming complexity of reality by identifying certain aspects of the situation as critical."
- "Good guiding policies are not goals or visions or images of desirable end states. Rather, they define a method of grappling with the situation and ruling out a vast array of possible actions."
- "The actions within the kernel of strategy should be coherent."
- "Strategy is visible as coordinated action imposed on a system."

### Bad strategy

Rumelt identifies four hallmarks:

1. **Fluff** — impressive terminology that disguises the absence of thought.
2. **Failure to face the challenge** — refusing to name the real obstacle.
3. **Mistaking goals for strategy** — "grow 20%," "be the best," "delight customers" are goals, not strategy.
4. **Bad strategic objectives** — a laundry list of unrelated priorities with no coherent focus.

### Sources of power

Good strategy draws on one or more sources of advantage:

- **Leverage** — concentrating effort on a pivotal point.
- **Proximity** — being close to the customer or the problem.
- **Concentration** — focusing resources on the critical objective.
- **Coherence** — actions that fit together and reinforce each other.
- **Anticipation** — anticipating competitors' or stakeholders' reactions.
- **Design** — engineering fit among parts.

### Strategy as choice

- The hard part of strategy is **deciding what truly matters** and accepting that focusing on one thing slights another.
- "The first step toward effective strategy is diagnosing the specific structure of the challenge rather than simply naming performance goals."
- Coordination itself can be a source of advantage — but only when the gains are large enough to justify the cost to local autonomy.
- A strategy is a **bet**, not a plan. It can be wrong; that is why diagnosis must be revisited.

### Key takeaways

- If your "strategy" is a list of goals, it is not a strategy.
- Name the obstacle before proposing action.
- Coherence beats comprehensiveness.
- A good guiding policy rules things out.
- Strategy is about action, not documents. "Without action, the world would still be an idea."

### Sources

- Farnam Street primer on the kernel: <https://fs.blog/a-primer-on-strategy/>
- Emerald / Strategic Direction review: <https://www.emerald.com/sd/article/doi/10.1108/sd.2012.05628haa.002/355149/Good-Strategy-Bad-Strategy-The-Difference-and-Why>
- Sameer Bajaj's detailed notes: <https://sameerbajaj.com/GSBS/>
- To Summarise book summary: <https://www.tosummarise.com/book-summary-good-strategy-bad-strategy-by-richard-rumelt/>

---

## 5. The 7 Habits of Highly Effective People — Habit 7: Sharpen the Saw

**Author:** Stephen R. Covey
**Published:** 1989 (revised 2004)
**One-line thesis:** Effectiveness requires renewing the "production capability" — yourself — across body, heart, mind, and spirit; you cannot sustain output while neglecting the instrument that produces it.

### Why this habit matters for Principal engineers

- Principal-level roles are marathons, not sprints. Burnout destroys judgment, relationships, and long-term impact.
- Habit 7 is the **capstone habit** that makes the other six sustainable. It frames self-renewal as a strategic practice, not a luxury.
- It provides a simple, concrete model for pacing, continuous learning, and modeling healthy behavior for others.

### The sharpen-the-saw metaphor

A person is sawing a tree with a dull blade. Someone suggests taking a break to sharpen the saw. The response: **"I can't — I'm too busy sawing!"**

The lesson: **production capability (PC)** and **production (P)** must be balanced. Neglecting the tool eventually destroys the output.

### The four dimensions of renewal

| Dimension | Focus | Example practices |
|-----------|-------|-------------------|
| **Physical** | Body | Exercise, nutrition, sleep, stress management |
| **Mental** | Mind | Reading, writing, planning, learning, visualization |
| **Social/Emotional** | Heart | Relationships, service, empathy, synergy, intrinsic security |
| **Spiritual** | Spirit | Values clarification, meditation, nature, purpose |

- Covey treats Habit 7 as a **Quadrant II** activity: important but not urgent. It must be scheduled deliberately.
- The **Daily Private Victory** — roughly one hour a day on the physical, mental, and spiritual dimensions — is the foundation for the **Daily Public Victory** in relationships and leadership.
- The four dimensions are interdependent: improvement in one increases capacity in the others.
- Renewal follows an **upward spiral**: learn → commit → do → repeat at a higher level.

### The other six habits (context)

Habit 7 surrounds and sustains the others:

1. Be proactive.
2. Begin with the end in mind.
3. Put first things first.
4. Think win-win.
5. Seek first to understand, then to be understood.
6. Synergize.

Without renewal, the first six become unsustainable. With renewal, they compound.

### Key takeaways

- Don't sacrifice the tool for the output. Rest and renewal are part of the work.
- Schedule renewal as a Quadrant II activity; it will not happen by accident.
- Balance all four dimensions — physical, mental, social/emotional, spiritual.
- Intrinsic security comes from principles and integrity, not external validation.
- Renewal is a continuous upward spiral, not a one-time reset.

### Sources

- FranklinCovey official Habit 7 page: <https://www.franklincovey.com/courses/the-7-habits/habit-7/>
- FranklinCovey UK Habit 7 page: <https://www.franklincovey.co.uk/habit-7/>
- FranklinCovey brief guide (PDF): <https://franklincoveyme.com/web/content/files/20210608/file_6316659334.pdf>
- To Summarise overview: <https://www.tosummarise.com/book-summary-the-7-habits-of-highly-effective-people-by-stephen-covey/>

---

## 6. Thinking in Systems

**Author:** Donella H. Meadows
**Published:** 2008 (posthumous)
**One-line thesis:** System behavior is produced by structure — stocks, flows, feedback loops, and delays — not by isolated events; understand the structure and find the leverage points where small changes create large effects.

### Why it matters for Principal engineers

- Technical architectures and human organizations are both systems. Meadows gives you a shared vocabulary for **leverage points, feedback loops, and systemic bottlenecks**.
- It shifts attention from events ("the outage happened") to structure ("the system was configured to produce that outage").
- It explains why well-intentioned interventions often fail or make things worse, and how to intervene more effectively.

### What is a system?

A system has three components:

1. **Elements** — the visible parts (servers, people, code).
2. **Interconnections** — the relationships and flows between them (APIs, incentives, communication).
3. **Purpose/Function** — what the system is trying to achieve.

Key insight: **the purpose is often revealed by behavior, not by stated goals.** A system may claim to optimize reliability while its incentives reward shipping speed.

### Stocks, flows, and delays

- A **stock** is an accumulation: water in a bathtub, technical debt, trust, backlog, headcount.
- A **flow** is a rate: inflow or outflow that changes the stock.
- **Stocks change slowly**, even when flows change suddenly. They act as buffers, delays, and shock absorbers.
- You can change a stock by changing either its inflow or its outflow — "there is more than one way to fill a bathtub."
- **Delays** are inevitable and are a major source of oscillations and overshoot. A system cannot react instantly to the information it receives.

### Feedback loops

| Loop | Behavior | Example |
|------|----------|---------|
| **Balancing** | Goal-seeking; opposes change; stabilizes | Thermostat, demand forecasting, auto-scaling |
| **Reinforcing** | Self-amplifying; exponential growth or collapse | Compound interest, viral growth, technical debt |

- Real systems contain multiple loops of different strengths. The **dominant loop** determines behavior, and dominance can shift over time.
- A reinforcing loop in a finite environment will eventually hit a **limits-to-growth** balancing loop.
- **Resilience** comes from multiple feedback loops, diversity, and redundancy — not from optimizing for one metric.

### System traps and archetypes

- **Policy resistance** — competing goals cancel out interventions.
- **Tragedy of the commons** — shared resources are overused because costs are externalized.
- **Drift to low performance** — standards erode as performance declines and expectations follow.
- **Success to the successful** — winners get resources that reinforce their advantage.
- **Rule beating** — actors game the letter of the rule while violating its purpose.
- **Seeking the wrong goal** — measuring what is easy instead of what matters.

### Leverage points (in increasing order of effectiveness)

1. Numbers and parameters (subsidies, taxes, thresholds)
2. Buffers (stabilizing stock sizes)
3. Stock-and-flow structures (physical systems)
4. Delays (lengths of time relative to change rates)
5. Balancing feedback loops (strength of self-correction)
6. Reinforcing feedback loops (strength of growth/collapse)
7. Information flows (who has access to what)
8. Rules (incentives, punishments, constraints)
9. Self-organization (ability to evolve structure)
10. Goals (purpose of the system)
11. Paradigms (mindset from which the system arises)
12. Transcending paradigms (holding all paradigms lightly)

Key insight: **most interventions focus on low-leverage parameters**, because they are visible and politically easy. The highest leverage is usually in **goals, paradigms, rules, information flows, and self-organization**.

### Key takeaways

- Stop explaining behavior by events; explain it by structure.
- Watch stocks, flows, and delays — they explain why systems feel slow and why shocks persist.
- Find the dominant feedback loop before intervening.
- Resilience requires redundancy and diversity; efficiency alone makes systems brittle.
- The highest-leverage interventions are often the least intuitive: changing goals, information flows, and paradigms.
- We cannot fully control systems, but we can **dance with them** — observe, adjust, and learn.

### Sources

- Wikipedia overview: <https://en.wikipedia.org/wiki/Thinking_In_Systems:_A_Primer>
- To Summarise detailed summary: <https://www.tosummarise.com/book-summary-thinking-in-systems-by-donella-meadows/>
- Fluidself notes and excerpts: <https://fluidself.org/books/business/thinking-in-systems>
- SuperSummary study guide: <https://www.supersummary.com/thinking-in-systems/summary/>

---

## 7. Cross-Book Synthesis

### How the six books fit together

| Book | Primary question | Core tool | Principal-engineer application |
|------|------------------|-----------|-------------------------------|
| **What Got You Here Won't Get You There** | What should I stop? | 20 habits + feedforward | Remove behavioral blind spots; build a to-stop list |
| **The Staff Engineer's Path** | How do I operate at staff level? | Three maps + project/role frameworks | Scope the role; lead cross-team work; be a role model |
| **The Elegant Puzzle** | How do teams and orgs actually work? | Team states + stocks/flows | Diagnose org constraints; manage technical debt; change policy |
| **Good Strategy, Bad Strategy** | What is real strategy? | Kernel: diagnosis → guiding policy → coherent action | Write technical strategy that addresses a real obstacle |
| **7 Habits — Habit 7** | How do I sustain performance? | Four dimensions of renewal | Avoid burnout; model sustainable pace; keep learning |
| **Thinking in Systems** | Why do systems behave this way? | Stocks, flows, feedback loops, leverage points | See architecture and org as systems; intervene at leverage points |

### The through-line

1. **Subtract before adding.** Goldsmith: stop bad habits. Rumelt: rule out actions. Meadows: find the few high-leverage interventions. Larson: limit work in progress.
2. **Behavior follows structure.** Goldsmith focuses on individual behavior; Larson and Meadows show how organizational structure shapes behavior. Lasting change requires both.
3. **Write and make things explicit.** Reilly: writing is the top project tool. Rumelt: a strategy is an argument. Goldsmith: advertise your commitment.
4. **Renewal is part of the work.** Covey's Habit 7 is the meta-habit that makes sustained senior performance possible.
5. **The higher you go, the less it is about you.** Goldsmith's recognition/credit habits, Reilly's role-model chapter, and Larson's systems view all point the same direction: senior impact is enabling others and shaping the system.

### A practical 90-day plan

| Weeks | Focus | Actions |
|-------|-------|---------|
| 1–2 | Self-assessment | Pick 1–2 Goldsmith habits; run feedforward with 3 people; start a to-stop list |
| 3–4 | Role clarity | Write your "What do I do here?" doc with your manager; map your locator/topographical/treasure maps |
| 5–6 | Systems diagnosis | Map one team or architecture as stocks/flows; identify the dominant feedback loop |
| 7–8 | Strategy | Write a three-sentence kernel for one technical initiative; test it against Rumelt's bad-strategy hallmarks |
| 9–10 | Policy leverage | Identify one recurring exception in your org; propose a policy or structural fix |
| 11–12 | Renewal | Design a sustainable weekly routine across Covey's four dimensions; schedule it |
| Ongoing | Follow-up | Monthly check-ins on your one behavior; review your job signals weekly |

---

*Last updated: 2026-10-23*
