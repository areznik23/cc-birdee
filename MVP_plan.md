# MVP_Plan.md

Claude Code logs hide gold. This MVP surfaces it. Point the app at ~/.claude/projects, and in under 3 seconds you get a timeline of what you asked, how well you asked it, and where you got stuck. It flags prompt loops, scores clarity, and shows token cost drift—so you cut wasted cycles by 25 %. All local, no cloud, just a Next.js UI and a tiny analytics engine. Users level‑up; Anthropic gains stickier power users and data to steer product.

## 1. Executive Summary

Claude Code users generate extensive session logs but lack visibility into their problem-solving patterns. This MVP transforms raw JSONL logs into actionable insights, revealing inefficient loops, prompt quality trends, and tool usage patterns. A composite session score (0-100) enables global rankings, driving engagement through friendly competition. Individual developers save 20-30% development time by identifying and eliminating repetitive behaviors. For Anthropic, this drives Claude Code adoption through gamification and demonstrable productivity gains, creates viral growth via leaderboards, and provides aggregated insights for product improvements. The lean web app reads local session logs, categorizes interactions, scores sessions holistically, detects loops via LLM analysis, and visualizes session flow—delivering immediate value with minimal infrastructure.

## 2. Value Mapping

| Feature              | Individual Benefit                         | Business Benefit                   |
| -------------------- | ------------------------------------------ | ---------------------------------- |
| Loop Detection       | Save 30min/day avoiding repetitive queries | Reduce support tickets by 40%      |
| Prompt Quality Score | Write 50% better prompts after 1 week      | Increase power-user conversion 25% |
| Activity Timeline    | Identify bottlenecks in 10 seconds         | Data for feature prioritization    |
| Tool Usage Analytics | Optimize workflow efficiency               | Drive advanced feature adoption    |
| Session Comparison   | Learn from successful patterns             | Enable peer learning/community     |
| Global Rankings      | Gamified improvement via leaderboards      | 3x engagement, viral growth        |

## 3. Lean Product Scope

**In-Scope:**

- Local file reading from ~/.claude/projects/\*
- JSONL parsing with thread reconstruction
- 10 activity type categorization
- LLM-based loop detection (single API call)
- Prompt quality scoring (0-100)
- Composite session scoring (0-100)
- Global rankings/leaderboard (opt-in)
- Single session timeline visualization
- Basic metrics dashboard
- Session comparison (2 sessions max)

**Out-of-Scope:**

- Authentication/multi-user
- Cloud storage/sync
- Real-time monitoring
- Custom activity definitions
- Export beyond JSON/CSV
- Mobile interface
- Team collaboration
- Historical trend analysis >30 days

## 4. System Architecture Diagram (ASCII)

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ ~/.claude/      │────▶│ File Reader  │────▶│ JSONL       │
│ projects/*      │     │ (Node fs)    │     │ Parser      │
└─────────────────┘     └──────────────┘     └─────────────┘
                                                     │
                                                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ React Dashboard │◀────│ Analytics    │◀────│ Session     │
│ + Recharts      │     │ Engine       │     │ Processor   │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ LLM API      │
                        │ (Loop detect)│
                        └──────────────┘
```

## 5. Data Model

```typescript
// LogEntry (from raw JSONL)
{
  "type": "user" | "assistant" | "summary",
  "uuid": string,
  "parentUuid": string | null,
  "timestamp": string,
  "sessionId": string,
  "message": {
    "role": "user" | "assistant",
    "content": string | ContentBlock[],
    "usage"?: {
      "input_tokens": number,
      "output_tokens": number
    }
  },
  "toolUseResult"?: any
}

// Session (processed)
{
  "id": string,
  "summary": string,
  "duration": number, // minutes
  "messages": ProcessedMessage[],
  "metrics": MetricsSummary
}

// MetricsSummary
{
  "totalTokens": number,
  "messageCount": { "user": number, "assistant": number },
  "toolUsage": { [toolName: string]: number },
  "avgPromptQuality": number,
  "loopCount": number,
  "activityBreakdown": { [activity: string]: number },
  "sessionScore": number, // 0-100 composite score
  "scoreBreakdown": {
    "efficiency": number,    // time vs complexity
    "quality": number,       // prompt quality avg
    "progression": number,   // forward momentum
    "toolMastery": number   // appropriate tool use
  }
}
```

Here's a section to add after the Value Mapping or as part of the Data Model section:

## Developer Strain™ - Measuring Cognitive Load

Just as WHOOP measures physical strain to optimize athletic performance, this tool introduces "Developer Strain" - a metric that captures the cognitive intensity of your Claude Code sessions.

**Strain Components:**

- **Complexity Load** (0-5): Depth of technical challenge based on tools used, error frequency, and solution pivots
- **Context Switching** (0-3): Frequency of conceptual pivots and topic changes within session
- **Recovery Demand** (0-2): Late session quality degradation and loop frequency indicating mental fatigue

**Strain Score (0-10)**: Weighted combination revealing when you're pushing your cognitive limits productively vs. spinning wheels.

**Key Insights:**

- **Optimal Strain Zone (6-8)**: Challenging enough for growth, not so hard you're just thrashing
- **Low Strain (<4)**: Routine tasks - good for recovery days but not skill building
- **Overreaching (>8)**: High error rates + loops suggest breaking into smaller sessions

**Practical Application:**

```
Monday:   Strain 8.5 ⚠️ (new architecture design)
Tuesday:  Strain 5.0 ✓ (implementing Monday's design)
Wednesday: Strain 9.2 ⚠️ (debugging complex issue → took 3 hours)
Thursday: Strain 4.0 ✓ (recovery day - documentation)
Friday:   Strain 7.0 ✓ (optimal - refactoring with clear wins)
```

**Why This Matters:**
Developers intuitively know some days feel harder than others, but can't quantify why. Strain scores reveal patterns like:

- You handle high-strain work better in mornings
- After strain >8 days, next-day performance drops 30%
- Your optimal weekly strain average is ~6.5
- Complex debugging (strain >9) needs 2x recovery time

This transforms vague feelings of "tough day" into actionable data for workload planning.

## 6. Algorithm Sketches

```javascript
// Activity Categorization
function categorizeActivity(msg, prevMsg, tools) {
  if (!prevMsg) return "initial_question";
  if (tools.includes("TodoWrite")) return "task_management";
  if (tools.includes("MultiEdit", "Write")) return "implementation";
  if (msg.content.match(/error|failed/i)) return "error_handling";
  if (tools.filter((t) => t === "Read").length > 3) return "deep_dive";
  if (hasConceptualShift(msg, prevMsg)) return "conceptual_pivot";
  if (tools.includes("Grep", "Read")) return "code_exploration";
  if (msg.content.match(/test|verify/i)) return "validation";
  if (isSolutionProposal(msg)) return "solution_design";
  return "completion";
}
```

```javascript
// Prompt Quality Scoring
function scorePrompt(prompt) {
  const scores = {
    specificity: hasCodeRefs(prompt) ? 30 : hasTechTerms(prompt) ? 20 : 10,
    clarity: isQuestion(prompt) ? 25 : hasDirective(prompt) ? 20 : 10,
    context: prompt.length > 200 ? 20 : prompt.length > 50 ? 15 : 5,
    actionability: hasNextSteps(prompt) ? 15 : 8,
    scope: hasConstraints(prompt) ? 10 : 5,
  };
  return Object.values(scores).reduce((a, b) => a + b, 0);
}
```

```javascript
// Loop Detection (LLM-based)
async function detectLoops(userPrompts) {
  const prompt = `Analyze these prompts for repetitive patterns:
${userPrompts.map((p, i) => `${i + 1}. ${p.slice(0, 100)}...`).join("\n")}

Return JSON: {
  "hasLoops": boolean,
  "patterns": ["pattern1", "pattern2"],
  "suggestion": "how to break the loop"
}`;

  const response = await callLLM(prompt);
  return JSON.parse(response);
}
```

```javascript
// Session Scoring (0-100)
function scoreSession(metrics, duration, complexity) {
  const weights = {
    efficiency: 0.3, // tokens/minute vs task complexity
    quality: 0.25, // avg prompt quality
    progression: 0.25, // % time in productive activities
    toolMastery: 0.2, // tool diversity & appropriateness
  };

  const scores = {
    efficiency: Math.min(
      100,
      (complexity * 1000) / (metrics.totalTokens * duration)
    ),
    quality: metrics.avgPromptQuality,
    progression: (100 - metrics.loopCount * 10) * (1 - idleTime / duration),
    toolMastery: Math.min(100, toolDiversity * toolAppropriateness * 20),
  };

  return Math.round(
    Object.entries(weights).reduce(
      (total, [key, weight]) => total + scores[key] * weight,
      0
    )
  );
}
```

## 7. UI Wireframes (ASCII boxes)

**Session Dashboard:**

```
┌─────────────────────────────────────────────────────────┐
│ Claude Code Analyzer │ Session: /project-abc            │
├─────────────────────┴───────────────────────────────────┤
│ SESSION SCORE: 85/100 ⭐ (Rank #127 of 5,432)           │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ Duration    │ │ Tokens      │ │ Quality     │        │
│ │ 45 min      │ │ 12.5k       │ │ 72/100      │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
├─────────────────────────────────────────────────────────┤
│ Activity Timeline                    │ Loop Alert: 2    │
│ [====|==|=====|==|===|=======]      │ Similar queries  │
│  init explore deep  impl valid       │ about connection │
├─────────────────────────────────────────────────────────┤
│ Prompt Quality Trend ↗              Tool Usage          │
│ 100│    ╱╲                          Grep    ████ 12    │
│  50│___╱  ╲___                      Read    ███  8     │
│   0└─────────────                   Write   ██   4     │
└─────────────────────────────────────────────────────────┘
```

**Aggregate View:**

```
┌─────────────────────────────────────────────────────────┐
│ Weekly Insights │ 5 Sessions Analyzed                    │
├─────────────────┴───────────────────────────────────────┤
│ Improvement Areas:                  Top Patterns:       │
│ • Reduce exploration loops (-20min) • Start with Grep   │
│ • Add more context to prompts       • Use TodoWrite     │
│ • Break complex tasks earlier       • Test frequently   │
├─────────────────────────────────────────────────────────┤
│ Session Comparison & Scores                              │
│         Mon  Tue  Wed  Thu  Fri                         │
│ Score   72   76   81   84   89  ← climbing ranks!      │
│ Time    45m  32m  28m  30m  25m  ← more efficient!     │
│ Quality  65   70   75   78   82  ← better prompts!     │
│ Loops    3    2    1    1    0   ← fewer loops!        │
├─────────────────────────────────────────────────────────┤
│ 🏆 This Week's Rank: #256 → #127 (Top 5%!)             │
└─────────────────────────────────────────────────────────┘
```

## 8. Milestone Roadmap

| Sprint | Goal                    | Deliverables                                               | Acceptance Metric                                   |
| ------ | ----------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Week 1 | Core Parsing & Analysis | JSONL parser, activity categorizer, basic metrics          | Parse 100% of logs, categorize 80% accurately       |
| Week 2 | Visualization & Scoring | React dashboard, timeline chart, session scoring, rankings | Render <2s, scores ±10% accurate, ranking API ready |
| Week 3 | Loop Detection & Polish | LLM integration, aggregate view, UX polish                 | Detect 90% of loops, <100ms UI response             |

## 9. Risks & Mitigations

**1. Log Format Changes**
Break parser when Claude Code updates log structure.
_Mitigation:_ Version detection + graceful fallbacks for unknown fields.

**2. LLM API Latency**
Loop detection takes 5+ seconds, frustrating users.
_Mitigation:_ Cache results + async loading + mock mode for dev.

**3. Large Session Files**
500MB+ logs crash browser or timeout.
_Mitigation:_ Stream parsing + pagination + 50MB file limit.

## 10. Success KPIs

- **Time Saved:** 30min/day average (measured via self-report survey)
- **Adoption:** 60% of Claude Code users analyze ≥1 session/week
- **Quality Improvement:** 25% increase in prompt scores after 2 weeks
- **Loop Reduction:** 50% fewer repetitive patterns in week 2 vs week 1
- **NPS:** >50 from early adopters
- **Ranking Engagement:** 40% of users check rankings weekly
- **Score Improvement:** Average +15 points after first week

## 11. Next-Step Extensions (post-MVP)

- **Real-time Monitoring:** Live session analysis with intervention suggestions
- **Team Analytics:** Aggregate patterns across organization for best practices
- **IDE Plugin:** VSCode extension showing quality scores inline during sessions
- **Public Leaderboards:** Global/team rankings with anonymized insights
