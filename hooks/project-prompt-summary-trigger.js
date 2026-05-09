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

function extractPrompt(event, raw) {
  const candidates = [
    event.prompt,
    event.user_prompt,
    event.message,
    event.input,
    event.text,
    event.tool_input && event.tool_input.prompt,
    event.tool_input && event.tool_input.message,
  ];
  const prompt = candidates.find((value) => typeof value === 'string' && value.trim());
  if (prompt) return prompt;
  return raw || '';
}

function extractCwd(event) {
  const candidates = [event.cwd, event.working_directory, process.env.PWD, process.cwd()];
  const cwd = candidates.find((value) => typeof value === 'string' && value.trim());
  return path.resolve(cwd || process.cwd());
}

(async () => {
  try {
    const raw = await readStdin();
    const event = raw ? JSON.parse(raw) : {};
    const prompt = extractPrompt(event, raw);
    if (!/(业务总结|业务汇总|业务摘要|项目总结|项目汇总|工作总结|工作汇总|阶段总结|日报)/.test(prompt)) return;

    const cwd = extractCwd(event);
    const root = nearestGitRoot(cwd);
    if (!root) return;
    if (!isInside(cwd, root)) return;
    if (!hasProjectMarker(root)) return;

    const isDailyReport = /日报/.test(prompt);
    const project = path.basename(root);
    const additionalContext = isDailyReport ? [
      '检测到用户在符合条件的软件项目中请求日报。',
      '',
      '请使用 Lazy Report 的日报行为处理本次请求：',
      `- 当前项目根目录：${root}`,
      `- 项目名称：${project}`,
      '- 读取当前项目根目录下的 CLAUDE_CHANGES.md 作为事实来源。',
      '- 时间区间规则：如果用户未指定时间，使用当前本地自然日（00:00 到 23:59:59）；如果用户指定日期、日期范围或自定义周期，按用户指定时间区间。',
      '- 生成简洁日报，包含：日报范围、项目名称、今日完成事项、关键功能或模块变化、技术要点、难点/阻塞/风险、回退或调整、建议下一步。',
      '- 确保桌面存在“周报”文件夹：$HOME/Desktop/周报；如果不存在就创建。',
      '- 将结果写入：$HOME/Desktop/周报/日报_<YYYYMMDD>-<YYYYMMDD>.md。',
      '- 同时把日报内容返回给用户。',
      '- 如果没有匹配的改动记录或时间区间内没有记录，必须明确说明，不要编造工作内容。',
      '- 如果项目根目录不存在 CLAUDE_CHANGES.md，说明改动记录只会在 Lazy Report 插件已安装启用、hooks 已加载，并且 Claude 在该项目执行过 Write/Edit/NotebookEdit 后生成。请提示用户检查插件是否启用、/hooks 中是否能看到 Lazy Report hooks，并打开 /hooks 或重启 Claude Code。',
    ].join('\n') : [
      '检测到用户在符合条件的软件项目中请求业务/项目/工作总结。',
      '',
      '请使用 Lazy Report 的业务摘要行为处理本次请求：',
      `- 当前项目根目录：${root}`,
      `- 项目名称：${project}`,
      '- 读取当前项目根目录下的 CLAUDE_CHANGES.md 作为事实来源。',
      '- 时间区间规则：如果用户未指定时间，使用当前自然周（本地时间周一 00:00 到周日 23:59:59）；如果用户指定日期、周、月份、日期范围或自定义周期，按用户指定时间区间。',
      '- 生成比周报更详细、偏业务视角的摘要，包含：摘要范围、业务背景/目标、本期完成事项、业务价值/影响、关键功能或模块变化、技术支撑点、难点/阻塞/风险、回退或调整、建议下一步。',
      '- 确保桌面存在“周报”文件夹：$HOME/Desktop/周报；如果不存在就创建。',
      '- 将结果写入：$HOME/Desktop/周报/总结_<YYYYMMDD>-<YYYYMMDD>.md。',
      '- 同时把摘要内容返回给用户。',
      '- 如果没有匹配的改动记录或时间区间内没有记录，必须明确说明，不要编造工作内容。',
      '- 如果项目根目录不存在 CLAUDE_CHANGES.md，说明改动记录只会在 Lazy Report 插件已安装启用、hooks 已加载，并且 Claude 在该项目执行过 Write/Edit/NotebookEdit 后生成。请提示用户检查插件是否启用、/hooks 中是否能看到 Lazy Report hooks，并打开 /hooks 或重启 Claude Code。',
    ].join('\n');

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext,
      },
    }));
  } catch {
  }
})();
