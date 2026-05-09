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
    if (/^CLAUDE_(CODE_CHANGES|ANALYSIS)_/.test(path.basename(relPath))) return;

    const sessionId = sanitize(event.session_id || process.env.CLAUDE_SESSION_ID || 'session');
    const branch = exec('git branch --show-current', root) || 'no-branch';
    const statusLine = exec(`git status --short -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const diffStat = exec(`git diff --stat -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const diffNameStatus = exec(`git diff --name-status -- "${relPath.replace(/"/g, '\\"')}"`, root);
    const time = new Date().toISOString();
    const logFile = path.join(root, `CLAUDE_CODE_CHANGES_${sessionId}.md`);

    let action = event.tool_name || 'code-change';
    if (/^\s*[MADRCU?]/.test(statusLine)) action += ' / changed';
    if (/^\s*D/.test(statusLine)) action += ' / deletion-or-rollback';
    if (/^\s*M/.test(statusLine) && !diffStat) action += ' / possible-rollback-or-format-only';

    const entry = [
      `\n## ${time}`,
      `- Project: ${path.basename(root)}`,
      `- Branch: ${branch}`,
      `- Tool: ${event.tool_name || 'unknown'}`,
      `- Action: ${action}`,
      `- File: ${relPath}`,
      statusLine ? `- Git status: \`${statusLine.replace(/`/g, '\\`')}\`` : '- Git status: unavailable or unchanged',
      diffNameStatus ? `- Diff name-status: \`${diffNameStatus.replace(/`/g, '\\`')}\`` : '- Diff name-status: none',
      diffStat ? `\n\`\`\`text\n${diffStat}\n\`\`\`` : '',
      '- Summary: Claude modified this file. Review the git diff for exact details.',
      '',
    ].filter(Boolean).join('\n');

    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, `# Claude Code Change Log\n\nSession: ${sessionId}\nProject: ${path.basename(root)}\nCreated: ${time}\n\n`, 'utf8');
    }
    fs.appendFileSync(logFile, entry, 'utf8');
  } catch (error) {
    // Hooks must never block user work.
  }
})();
