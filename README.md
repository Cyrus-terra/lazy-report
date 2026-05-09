# Lazy Report for Claude Code

Lazy Report is a Claude Code plugin that records Claude-made project changes and generates daily reports, weekly reports, or business summaries from those change logs.

It is designed to activate only inside git-backed software projects, so ordinary folders and casual shell usage are not polluted with generated files.

## Features

- Installs as a Claude Code plugin.
- Automatically loads the included skill.
- Automatically loads plugin hooks from `hooks/hooks.json` after plugin installation.
- Records Claude Code file changes after `Write`, `Edit`, and `NotebookEdit`.
- Writes project change logs to the project root:
  `CLAUDE_CODE_CHANGES_<session-id>.md`
- Records project analysis tasks to separate project-root files:
  `CLAUDE_ANALYSIS_<YYYYMMDD-HHMMSS>_<topic>.md`
- Generates daily reports when you type `日报` in a qualifying project.
- Generates weekly reports when you type `周报` in a qualifying project.
- Generates detailed business/project/work summaries when you type keywords such as `业务总结`, `业务汇总`, `项目总结`, or `工作总结`.
- Writes daily reports, weekly reports, and summaries to your Desktop report folder:
  - `$HOME/Desktop/周报/日报_<YYYYMMDD>-<YYYYMMDD>.md`
  - `$HOME/Desktop/周报/周报_<YYYYMMDD>-<YYYYMMDD>.md`
  - `$HOME/Desktop/周报/总结_<YYYYMMDD>-<YYYYMMDD>.md`

## Project guardrails

Lazy Report only activates when the current path or edited file is inside a git repository whose root contains at least one software project marker, such as:

- `package.json`
- `tsconfig.json`
- `next.config.js` / `next.config.ts`
- `vite.config.js` / `vite.config.ts`
- `pnpm-workspace.yaml`
- `Cargo.toml`
- `go.mod`
- `pyproject.toml`
- `requirements.txt`
- `pom.xml`
- `build.gradle` / `build.gradle.kts`
- `Gemfile`
- `composer.json`
- `Makefile`
- `CLAUDE.md`
- `AGENTS.md`

## Plugin structure

```txt
lazy-report/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   ├── project-change-log.js
│   └── project-prompt-summary-trigger.js
├── skills/
│   └── lazy-report/
│       └── SKILL.md
├── README.md
├── LICENSE
└── .gitignore
```

## Install as a Claude Code plugin

After publishing this repository to GitHub, users can add it as a Claude Code plugin marketplace/source and enable the plugin from Claude Code.

For a local test install, add the local repository as a file/directory marketplace in Claude Code, then enable `lazy-report`.

Once installed and enabled:

- the skill is available as `lazy-report`
- the hooks are loaded automatically from `hooks/hooks.json`
- users do not need to manually copy hook snippets into `~/.claude/settings.json`

If Claude Code is already running, restart Claude Code or open `/hooks` once after enabling the plugin so hooks are loaded.

## How it works

### 1. Change logging

When Claude modifies files using `Write`, `Edit`, or `NotebookEdit`, the plugin hook writes or appends a change log in the project root:

```txt
CLAUDE_CODE_CHANGES_<session-id>.md
```

The change log is not synthesized by the skill. It is created only after Claude actually modifies a file in a qualifying project.

### 2. Daily reports

When you type `日报` inside a qualifying project, Claude summarizes root-level `CLAUDE_CODE_CHANGES_*.md` files.

- If no time range is specified, the current local day is used.
- If a date, date range, or custom period is specified, that period is used.
- The folder is created if missing:
  `$HOME/Desktop/周报`
- The report is written to:
  `$HOME/Desktop/周报/日报_<YYYYMMDD>-<YYYYMMDD>.md`

### 3. Weekly reports

When you type `周报` inside a qualifying project, Claude summarizes root-level `CLAUDE_CODE_CHANGES_*.md` files.

- If no time range is specified, the current natural week is used.
- If a date, week, month, range, or custom period is specified, that period is used.
- The folder is created if missing:
  `$HOME/Desktop/周报`
- The report is written to:
  `$HOME/Desktop/周报/周报_<YYYYMMDD>-<YYYYMMDD>.md`

### 4. Business summaries

When you type `业务总结`, `业务汇总`, `业务摘要`, `项目总结`, `项目汇总`, `工作总结`, `工作汇总`, `阶段总结`, or a similar summary request inside a qualifying project, the `UserPromptSubmit` hook injects context so Claude summarizes the project change logs from a business/product perspective.

- If no time range is specified, the current natural week is used.
- If a date, week, month, range, or custom period is specified, that period is used.
- The folder is created if missing:
  `$HOME/Desktop/周报`
- The summary is written to:
  `$HOME/Desktop/周报/总结_<YYYYMMDD>-<YYYYMMDD>.md`

## If no change log exists

If `CLAUDE_CODE_CHANGES_*.md` does not exist, Claude should not invent report content. Check:

- the plugin is installed and enabled
- hooks are visible in `/hooks`
- Claude Code has been restarted or hooks have been reloaded
- the current directory is a git-backed software project
- Claude has modified at least one file with `Write`, `Edit`, or `NotebookEdit`

## Security notes

- Review generated logs and reports before sharing or committing them.
- The included `.gitignore` ignores generated change logs, analysis files, weekly reports, business summaries, environment files, logs, and dependencies by default.
- Do not commit your personal Claude settings file, environment files, API keys, or tokens.

## License

MIT
