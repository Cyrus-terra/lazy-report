#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

function exec(cmd, cwd) {
  try {
    return cp.execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
    }).trim();
  } catch {
    return '';
  }
}

function sanitize(value) {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
}

function systemTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ].join(' ');
}

function describeFunctionLevel(relPath, diffContent, isZh) {
  const lowerPath = relPath.toLowerCase();
  const diff = diffContent.toLowerCase();
  const text = `${lowerPath}\n${diff}`;

  const zh = {
    docs: '功能层面：更新项目说明或使用文档，帮助使用者理解插件能力和使用方式。',
    tests: '功能层面：调整测试相关内容，用于验证或保障项目行为。',
    config: '功能层面：调整项目配置或插件配置，影响构建、运行或插件加载方式。',
    hook: '功能层面：调整 Claude Code 钩子逻辑，影响项目改动记录的生成方式。',
    skill: '功能层面：调整 Lazy Report 技能说明，影响分析、日报、周报或总结的生成规则。',
    api: '功能层面：调整接口或数据交互相关逻辑。',
    ui: '功能层面：调整页面或交互相关逻辑。',
    default: '功能层面：调整项目实现细节，影响对应模块的运行行为。',
  };
  const en = {
    docs: 'Functional impact: updates project docs or usage guidance so users can understand plugin behavior.',
    tests: 'Functional impact: adjusts test-related content used to verify project behavior.',
    config: 'Functional impact: adjusts project or plugin configuration, affecting build, runtime, or plugin loading.',
    hook: 'Functional impact: adjusts Claude Code hook logic, affecting how project change logs are generated.',
    skill: 'Functional impact: adjusts Lazy Report skill instructions, affecting analysis, daily report, weekly report, or summary generation rules.',
    api: 'Functional impact: adjusts API or data interaction logic.',
    ui: 'Functional impact: adjusts page or interaction logic.',
    default: 'Functional impact: changes project implementation details and affects the related module behavior.',
  };
  const T = isZh ? zh : en;

  if (/readme|\.md$|docs?\//.test(lowerPath)) return T.docs;
  if (/test|spec|__tests__/.test(lowerPath)) return T.tests;
  if (/package\.json|tsconfig|vite\.config|next\.config|hooks\.json|marketplace\.json|plugin\.json|\.ya?ml$|\.toml$/.test(lowerPath)) return T.config;
  if (/hooks?\//.test(lowerPath) || /claude_changes|change log|改动记录/.test(text)) return T.hook;
  if (/skills?\//.test(lowerPath) || /日报|周报|业务总结|analysis|report/.test(text)) return T.skill;
  if (/api|route|controller|service|request|response/.test(text)) return T.api;
  if (/component|page|view|style|css|html|button|form/.test(text)) return T.ui;
  return T.default;
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function nearestGitRoot(startPath) {
  const start = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
    ? startPath
    : path.dirname(startPath);
  const root = exec('git rev-parse --show-toplevel', start);
  return root ? path.resolve(root) : '';
}

function hasProjectMarker(root) {
  const markers = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'next.config.ts',
    'vite.config.js',
    'vite.config.ts',
    'pnpm-workspace.yaml',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'requirements.txt',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'Gemfile',
    'composer.json',
    'Makefile',
    'CLAUDE.md',
    'AGENTS.md',
  ];
  return markers.some((marker) => fs.existsSync(path.join(root, marker)));
}

(async () => {
  try {
    const raw = await readStdin();
    const event = raw ? JSON.parse(raw) : {};
    const inputPath = event.tool_input && (event.tool_input.file_path || event.tool_input.notebook_path);
    if (!inputPath) return;

    const absPath = path.resolve(inputPath);
    const root = nearestGitRoot(absPath);
    if (!root) return;
    if (!isInside(absPath, root)) return;
    if (!hasProjectMarker(root)) return;

    const relPath = path.relative(root, absPath) || path.basename(absPath);
    if (relPath.startsWith('.git/')) return;
    if (/^CLAUDE_(CHANGES|ANALYSIS_)/.test(path.basename(relPath))) return;

    const sessionId = sanitize(event.session_id || process.env.CLAUDE_SESSION_ID || 'session');
    const branch = exec('git branch --show-current', root) || 'no-branch';
    const statusLine = exec(`git status --short -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const diffStat = exec(`git diff --stat -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const diffNameStatus = exec(`git diff --name-status -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const time = systemTime();
    const logFile = path.join(root, 'CLAUDE_CHANGES.md');

    // 检测系统语言
    const sysLang = (process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || 'en_US.UTF-8').toLowerCase();
    const isZh = sysLang.startsWith('zh');
    const T = isZh ? {
      logTitle: 'Claude Code 改动记录',
      session: '会话ID',
      project: '项目',
      created: '创建时间',
      branch: '分支',
      changeType: '改动类型',
      filePath: '文件路径',
      changeLog: '改动记录',
      functionalImpact: '功能层面说明',
      risk: '风险提示',
      suggestion: '优化建议',
      typeModify: '修改文件',
      typeNewUntracked: '新增文件（未跟踪）',
      typeNewStaged: '新增文件（已暂存）',
      typeDelete: '删除文件',
      typeRename: '重命名/移动',
      msgNewUntracked: (p) => `新增文件 \`${p}\`，该文件之前不在版本控制中。`,
      msgNewStaged: (p) => `新增文件 \`${p}\`，已加入暂存区。`,
      msgDelete: (p) => `删除文件 \`${p}\`，请确认是否需要回滚或清理关联引用。`,
      msgRename: (p) => `文件 \`${p}\` 被重命名或移动。`,
      msgModify: (p) => `修改文件 \`${p}\`。`,
      msgLines: (n) => ` 共约 ${n} 行差异。`,
      msgNoContent: '（无实际内容差异，可能仅格式变动或已回滚）。',
      riskNormal: '暂无特别提示，请人工确认。',
      riskDelete: '⚠️ 文件被删除，请确认业务逻辑中无其他模块依赖此文件，避免运行时异常。',
      riskRename: '⚠️ 文件被重命名/移动，请确保所有 import/require 引用路径已同步更新。',
      suggestDefault: '建议提交前运行相关测试，确保改动无回归问题。',
      suggestUntracked: ' 新文件未跟踪，如果正式纳入版本控制，请记得 `git add`。',
    } : {
      logTitle: 'Claude Code Change Log',
      session: 'Session',
      project: 'Project',
      created: 'Created',
      branch: 'Branch',
      changeType: 'Change Type',
      filePath: 'File',
      changeLog: 'Change Record',
      functionalImpact: 'Functional Impact',
      risk: 'Risk Alert',
      suggestion: 'Suggestion',
      typeModify: 'Modified',
      typeNewUntracked: 'New file (untracked)',
      typeNewStaged: 'New file (staged)',
      typeDelete: 'Deleted',
      typeRename: 'Renamed/Moved',
      msgNewUntracked: (p) => `New file \`${p}\`, not yet tracked by version control.`,
      msgNewStaged: (p) => `New file \`${p}\`, added to staging area.`,
      msgDelete: (p) => `Deleted file \`${p}\`, verify no other modules depend on this file.`,
      msgRename: (p) => `File \`${p}\` was renamed or moved.`,
      msgModify: (p) => `Modified file \`${p}\`.`,
      msgLines: (n) => ` Approximately ${n} lines changed.`,
      msgNoContent: ' (no content diff, may be format-only or rolled back).',
      riskNormal: 'No specific risk detected. Manual review recommended.',
      riskDelete: '⚠️ File deleted, ensure no dependent references exist to avoid runtime errors.',
      riskRename: '⚠️ File renamed/moved, ensure all import/require paths are updated.',
      suggestDefault: 'Run relevant tests before committing to avoid regressions.',
      suggestUntracked: ' File is untracked; remember to `git add` if adding to version control.',
    };

    // 根据 git status 判断改动类型
    let changeType = T.typeModify;
    let changeSummary = '';
    if (/^\s*\?/.test(statusLine)) {
      changeType = T.typeNewUntracked;
      changeSummary = T.msgNewUntracked(relPath);
    } else if (/^\s*A/.test(statusLine)) {
      changeType = T.typeNewStaged;
      changeSummary = T.msgNewStaged(relPath);
    } else if (/^\s*D/.test(statusLine)) {
      changeType = T.typeDelete;
      changeSummary = T.msgDelete(relPath);
    } else if (/^\s*R/.test(statusLine)) {
      changeType = T.typeRename;
      changeSummary = T.msgRename(relPath);
    } else if (/^\s*M/.test(statusLine)) {
      changeType = T.typeModify;
      changeSummary = T.msgModify(relPath);
    }

    // 读取 diff 行数，用于总结
    const diffContent = exec(`git diff -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const diffLines = diffContent ? diffContent.split('\n').length : 0;
    if (diffLines > 0) {
      changeSummary += T.msgLines(diffLines);
    }
    if (!diffContent && /^\s*M/.test(statusLine)) {
      changeSummary += T.msgNoContent;
    }

    const functionalImpact = describeFunctionLevel(relPath, diffContent, isZh);

    // 风险提示（基于改动特征自动生成）
    let riskNote = T.riskNormal;
    if (/^\s*D/.test(statusLine)) {
      riskNote = T.riskDelete;
    }
    if (/^\s*R/.test(statusLine)) {
      riskNote = T.riskRename;
    }

    // 优化建议
    let suggestion = T.suggestDefault;
    if (/^\s*\?/.test(statusLine)) {
      suggestion += T.suggestUntracked;
    }

    const entry = [
      `\n## ${time}`,
      '',
      `- **${T.project}**: ${path.basename(root)}`,
      `- **${T.branch}**: ${branch}`,
      `- **${T.changeType}**: ${changeType}`,
      `- **${T.filePath}**: \`${relPath}\``,
      '',
      `### ${T.changeLog}`,
      '',
      changeSummary,
      '',
      `### ${T.functionalImpact}`,
      '',
      functionalImpact,
      '',
      `### ${T.risk}`,
      '',
      riskNote,
      '',
      `### ${T.suggestion}`,
      '',
      suggestion,
      '',
    ].filter(Boolean).join('\n');

    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, `# ${T.logTitle}\n\n${T.session}: ${sessionId}\n${T.project}: ${path.basename(root)}\n${T.created}: ${time}\n\n---\n`, 'utf8');
    }
    fs.appendFileSync(logFile, entry, 'utf8');
  } catch (error) {
    // Hooks must never block user work.
  }
})();
