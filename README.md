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

### OpenAI Integration (Optional)

The analyzer can use OpenAI's API to generate intelligent summaries of what was accomplished in each session. To enable this feature:

1. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your OpenAI API key to `.env.local`:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

The app will automatically fall back to pattern-based analysis if the API key is not configured or if the API call fails.

## Project Status

MVP in active development. See [MVP_plan.md](./MVP_plan.md) and [commit_plan.md](./commit_plan.md) for details.
