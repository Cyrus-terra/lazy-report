---
name: lazy-report
description: Use this skill only for software project analysis while Claude is working inside a git-backed project/repository, such as code analysis, architecture analysis, bug analysis, implementation analysis, PR/code review analysis, MCP/API capability analysis, daily report generation (日报), weekly report generation (周报), or business/project/work summary generation (业务总结/业务汇总/项目总结/工作总结) from Claude change logs for the current project. Do not use for casual chat, ordinary shell commands, non-code directories, home-directory notes, or non-project file edits.
allowed-tools: Read, Glob, Write, Bash
---

# Lazy Report

## Purpose

Record and summarize project activity only when working inside a software project/repository.

1. Code changes are automatically appended by the Lazy Report PostToolUse hook for `Write|Edit|NotebookEdit` to:
   `CLAUDE_CODE_CHANGES_<session-id>.md`
   The skill itself does not synthesize this file; it is created only when the Lazy Report plugin is installed/enabled, its hooks are loaded, and Claude modifies files inside a qualifying project.

2. Each qualifying project analysis task must be written to a separate file in the current project root:
   `CLAUDE_ANALYSIS_<YYYYMMDD-HHMMSS>_<short-topic>.md`

3. Daily report requests (`日报`) summarize the project change logs into:
   `$HOME/Desktop/周报/日报_<YYYYMMDD>-<YYYYMMDD>.md`

4. Weekly report requests (`周报`) summarize the project change logs into:
   `$HOME/Desktop/周报/周报_<YYYYMMDD>-<YYYYMMDD>.md`

5. Business/project/work summary requests (`业务总结`, `业务汇总`, `业务摘要`, `项目总结`, `项目汇总`, `工作总结`, `工作汇总`, `阶段总结`) summarize the project change logs into:
   `$HOME/Desktop/周报/总结_<YYYYMMDD>-<YYYYMMDD>.md`

## Project-only guardrails

Use this skill only when all conditions are true:

- The current work is inside a git repository.
- The repository root looks like a software project, for example it has one of:
  `package.json`, `tsconfig.json`, `next.config.*`, `vite.config.*`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle*`, `Gemfile`, `composer.json`, `Makefile`, `CLAUDE.md`, or `AGENTS.md`.
- The user is asking for analysis, weekly report generation, or code/product architecture work for that project.

Do not use this skill for:

- casual conversation
- ordinary shell commands
- filesystem housekeeping
- edits in non-git directories
- edits in general notes/downloads/desktop folders that are not software projects
- analysis unrelated to the current project

## When to use

Use this skill before answering or performing qualifying project analysis, including:

- code analysis
- architecture analysis
- bug/root-cause analysis
- implementation plan analysis
- refactor analysis
- code review analysis
- MCP/API capability analysis for the current project
- “帮我分析…” requests about the current project
- “日报” / “生成日报” / “今日日报” / “今天日报” requests in a qualifying project
- “周报” / “生成周报” / “本周周报” requests in a qualifying project
- “业务总结” / “业务汇总” / “业务摘要” / “项目总结” / “项目汇总” / “工作总结” / “工作汇总” / “阶段总结” requests in a qualifying project

## Daily report behavior

When the user inputs `日报` or asks to generate a daily report:

1. Confirm the current directory is a qualifying software project.
2. Determine the report period:
   - If the user does not specify time, use the current local day (00:00 through 23:59:59).
   - If the user specifies a date, date range, or custom period, use that period.
3. Read all matching project-root change log files:
   `CLAUDE_CODE_CHANGES_*.md`
4. Include only entries whose timestamps fall within the report period.
5. Generate a concise daily report with:
   - report period
   - project name
   - completed work today
   - key changes by module/file area
   - key technical points
   - difficulties/blockers/risks
   - rollbacks or reversions, if any
   - suggested next steps
6. Ensure the desktop report directory exists:
   `$HOME/Desktop/周报`
7. Write the report to:
   `$HOME/Desktop/周报/日报_<YYYYMMDD>-<YYYYMMDD>.md`
8. Also return the report content to the user.

If no matching change log exists or no entries match the period, say so clearly and do not invent work. If no `CLAUDE_CODE_CHANGES_*.md` file exists, explain that change logs are generated only after the Lazy Report plugin is installed/enabled, its hooks are loaded, and Claude modifies files in the project. Suggest checking that Lazy Report is enabled, `/hooks` shows the Lazy Report hooks, Claude Code has been restarted or hooks have been reloaded, and the current directory is a qualifying git software project.

## Weekly report behavior

When the user inputs `周报` or asks to generate a weekly report:

1. Confirm the current directory is a qualifying software project.
2. Determine the report period:
   - If the user does not specify time, use the current natural week (Monday 00:00 through Sunday 23:59:59, local time).
   - If the user specifies a date, week, date range, month, or custom period, use that period.
3. Read all matching project-root change log files:
   `CLAUDE_CODE_CHANGES_*.md`
4. Include only entries whose timestamps fall within the report period.
5. Generate a concise weekly report with:
   - report period
   - project name
   - core completed work
   - key changes by module/file area
   - key technical points
   - difficulties/blockers/risks
   - rollbacks or reversions, if any
   - suggested next steps
6. Ensure the desktop report directory exists:
   `$HOME/Desktop/周报`
7. Write the report to:
   `$HOME/Desktop/周报/周报_<YYYYMMDD>-<YYYYMMDD>.md`
8. Also return the report content to the user.

If no matching change log exists or no entries match the period, say so clearly and do not invent work. If no `CLAUDE_CODE_CHANGES_*.md` file exists, explain that change logs are generated only after the Lazy Report plugin is installed/enabled, its hooks are loaded, and Claude modifies files in the project. Suggest checking that Lazy Report is enabled, `/hooks` shows the Lazy Report hooks, Claude Code has been restarted or hooks have been reloaded, and the current directory is a qualifying git software project.

## Business summary behavior

When the user inputs `业务总结`, `业务汇总`, `业务摘要`, `项目总结`, `项目汇总`, `工作总结`, `工作汇总`, `阶段总结`, or asks for a similar business-oriented summary:

1. Confirm the current directory is a qualifying software project.
2. Determine the report period:
   - If the user does not specify time, use the current natural week (Monday 00:00 through Sunday 23:59:59, local time).
   - If the user specifies a date, week, date range, month, or custom period, use that period.
3. Read all matching project-root change log files:
   `CLAUDE_CODE_CHANGES_*.md`
4. Include only entries whose timestamps fall within the report period.
5. Generate a detailed business-facing summary with:
   - summary period
   - project name
   - business background or objective inferred from available records
   - completed work, grouped by business capability/module
   - business value and user/product impact
   - key product/function changes
   - technical support points that matter to delivery
   - difficulties, blockers, and risks
   - rollbacks, reversions, or scope adjustments, if any
   - suggested next steps
6. Ensure the desktop report directory exists:
   `$HOME/Desktop/周报`
7. Write the summary to:
   `$HOME/Desktop/周报/总结_<YYYYMMDD>-<YYYYMMDD>.md`
8. Also return the summary content to the user.

If no matching change log exists or no entries match the period, say so clearly and do not invent work. If no `CLAUDE_CODE_CHANGES_*.md` file exists, explain that change logs are generated only after the Lazy Report plugin is installed/enabled, its hooks are loaded, and Claude modifies files in the project. Suggest checking that Lazy Report is enabled, `/hooks` shows the Lazy Report hooks, Claude Code has been restarted or hooks have been reloaded, and the current directory is a qualifying git software project.


Default behavior is current-project only.

Generating one weekly report across multiple projects is feasible, but only when the user explicitly asks for it and provides enough scope, such as:

- project paths
- a parent workspace directory to scan
- a list of repositories

For multi-project weekly reports:

1. Do not scan the whole home directory by default.
2. Only read qualifying git-backed software project roots.
3. Read each project's `CLAUDE_CODE_CHANGES_*.md` files.
4. Group the output by project, then add a cross-project summary.
5. Ensure the desktop report directory exists:
   `$HOME/Desktop/周报`
6. Write the combined report to:
   `$HOME/Desktop/周报/周报_<YYYYMMDD>-<YYYYMMDD>.md`

If the user only types `周报`, generate the current project's weekly report, not a multi-project report.

## Analysis record requirements

For every qualifying project analysis task, create one new markdown file in the project root.

The file must include:

```md
# Claude Analysis Record

- Time: <ISO timestamp or local timestamp>
- Project: <project directory name>
- Question: <the user's analysis question>

## Analysis Result

<the analysis result given to the user>
```

## Naming

Use:

```txt
CLAUDE_ANALYSIS_<YYYYMMDD-HHMMSS>_<short-topic>.md
```

Examples:

```txt
CLAUDE_ANALYSIS_20260509-132501_mcp-agent-integration.md
CLAUDE_ANALYSIS_20260509-133012_bug-root-cause.md
```

## Code change logging

The Lazy Report hook records actual file writes/edits only when the edited file belongs to a git-backed software project root. If code is reverted through Claude tools inside such a project, that edit is also logged automatically.

If code is reverted outside Claude Code, the hook cannot see it. In that case, when the user mentions or asks about the rollback, manually append a rollback record to the current session's `CLAUDE_CODE_CHANGES_<session-id>.md` file only if the current directory is a qualifying software project and the session file can be identified.

## Important

- Do not store secrets in analysis files, weekly reports, or business summaries.
- Keep analysis records concise but complete enough to understand the question and result.
- Do not create analysis files for casual chat or non-project analysis.
- Do not invent report or summary content that is not present in the change logs.
