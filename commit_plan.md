# Claude Code Analyzer - Commit Plan

## Overview
This document outlines the iterative, lean, and modular commit strategy for implementing the Claude Code Analyzer MVP. Each commit is self-contained and builds incrementally on previous work.

## Commit Structure

### Phase 1: Foundation (High Priority)

#### Commit 1: Project Initialization
- Initialize Next.js project with TypeScript
- Install essential dependencies: React, Recharts, Tailwind CSS
- Set up basic project structure and configuration

#### Commit 2: Data Models
- Create TypeScript types for LogEntry, Session, and MetricsSummary
- Define interfaces for processed data structures
- Add type definitions for tool usage, activity types, and scoring

#### Commit 3: JSONL Parser
- Implement JSONL parser to read Claude Code session logs
- Add file reading functionality from ~/.claude/projects/*
- Handle different log entry types (user, assistant, summary)

#### Commit 4: Session Processor
- Build session processor to reconstruct threads from parsed entries
- Implement parent-child relationship reconstruction
- Calculate session duration and basic metrics

#### Commit 5: Activity Categorization
- Implement activity categorization algorithm
- Support 10 activity types: initial_question, task_management, implementation, error_handling, deep_dive, conceptual_pivot, code_exploration, validation, solution_design, completion
- Add pattern matching for tool usage analysis

#### Commit 6: Metrics Engine
- Create metrics calculation engine
- Calculate total tokens, message counts, tool usage statistics
- Generate initial MetricsSummary objects

### Phase 2: Core Features (Medium Priority)

#### Commit 7: Prompt Quality Scoring
- Implement prompt quality scoring algorithm (0-100)
- Score based on specificity, clarity, context, actionability, and scope
- Add helper functions for analyzing prompt characteristics

#### Commit 8: Session Scoring
- Build composite session scoring algorithm (0-100)
- Calculate efficiency, quality, progression, and tool mastery scores
- Implement weighted scoring system

#### Commit 9: Dashboard Layout
- Create basic dashboard layout with Next.js
- Add file selector component for choosing session logs
- Implement responsive design with Tailwind CSS

#### Commit 10: Timeline Visualization
- Implement activity timeline using Recharts
- Create visual representation of session flow
- Add color coding for different activity types

#### Commit 11: Metrics Display
- Add metric card components for duration, tokens, quality score
- Create reusable components for data display
- Implement loading states and animations

#### Commit 12: Tool Usage Analytics
- Create tool usage visualization with bar charts
- Show frequency and distribution of tool calls
- Add interactive tooltips and details

### Phase 3: Advanced Features (Low Priority)

#### Commit 13: Prompt Quality Trends
- Implement prompt quality trend chart
- Show improvement over session duration
- Add moving average calculations

#### Commit 14: Loop Detection
- Add LLM integration for loop detection
- Implement caching mechanism for API responses
- Create loop pattern analysis and suggestions

#### Commit 15: Session Comparison
- Build session comparison view (max 2 sessions)
- Add side-by-side metrics display
- Implement diff visualization for key metrics

#### Commit 16: Developer Strain™
- Implement Developer Strain™ calculation
- Add complexity load, context switching, and recovery demand metrics
- Create strain visualization component

#### Commit 17: Global Rankings
- Create opt-in global rankings/leaderboard
- Implement anonymous score submission
- Add rank display and percentile calculations

#### Commit 18: Weekly Insights
- Add weekly insights aggregate view
- Track improvement patterns across sessions
- Generate actionable recommendations

#### Commit 19: Performance Optimizations
- Implement streaming parser for large files
- Add pagination for session lists
- Optimize rendering with React memoization

#### Commit 20: Error Handling
- Add comprehensive error handling
- Implement graceful fallbacks for missing data
- Add user-friendly error messages

## Implementation Notes

### Testing Strategy
- Unit tests for each algorithm (activity categorization, scoring)
- Integration tests for file parsing and session processing
- E2E tests for critical user flows

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration for consistency
- Prettier for code formatting

### Performance Targets
- Parse and display session < 3 seconds
- UI interactions < 100ms response time
- Support files up to 50MB

### Dependencies
- Next.js 14+
- React 18+
- TypeScript 5+
- Recharts for visualizations
- Tailwind CSS for styling
- Node.js fs module for file reading

## Progress Tracking
- [ ] Commit 1: Project Initialization
- [ ] Commit 2: Data Models
- [ ] Commit 3: JSONL Parser
- [ ] Commit 4: Session Processor
- [ ] Commit 5: Activity Categorization
- [ ] Commit 6: Metrics Engine
- [ ] Commit 7: Prompt Quality Scoring
- [ ] Commit 8: Session Scoring
- [ ] Commit 9: Dashboard Layout
- [ ] Commit 10: Timeline Visualization
- [ ] Commit 11: Metrics Display
- [ ] Commit 12: Tool Usage Analytics
- [ ] Commit 13: Prompt Quality Trends
- [ ] Commit 14: Loop Detection
- [ ] Commit 15: Session Comparison
- [ ] Commit 16: Developer Strain™
- [ ] Commit 17: Global Rankings
- [ ] Commit 18: Weekly Insights
- [ ] Commit 19: Performance Optimizations
- [ ] Commit 20: Error Handling