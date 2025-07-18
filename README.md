# Claude Code Analyzer

Transform your Claude Code session logs into actionable insights. This tool analyzes JSONL logs from `~/.claude/projects/*` to reveal inefficient loops, prompt quality trends, and tool usage patterns.

## Features

- **Loop Detection**: Identify repetitive queries and save development time
- **Prompt Quality Scoring**: Track and improve your prompt writing skills
- **Activity Timeline**: Visualize your coding session flow
- **Session Scoring**: Get a composite score (0-100) for your sessions
- **Tool Usage Analytics**: Understand your tool usage patterns
- **Developer Strain™**: Measure cognitive load like WHOOP for athletes

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Recharts for data visualization

## Getting Started

```bash
# Install dependencies
yarn install

# Run development server
yarn dev
```

## Project Status

MVP in active development. See [MVP_plan.md](./MVP_plan.md) and [commit_plan.md](./commit_plan.md) for details.
