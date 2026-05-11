const assert = require('node:assert/strict');
const test = require('node:test');

const {
  describeFunctionalChanges,
  formatLocalTimestamp,
} = require('../hooks/project-change-log.js');

test('describes deleted button from diff as a functional UI change', () => {
  const diff = [
    'diff --git a/src/App.jsx b/src/App.jsx',
    '@@ -1,5 +1,4 @@',
    ' export function App() {',
    '-  return <button>Delete report</button>;',
    '+  return <span>Report</span>;',
    ' }',
  ].join('\n');

  const summary = describeFunctionalChanges(diff, true);

  assert.match(summary, /删除.*button/);
  assert.match(summary, /Delete report/);
});

test('formats timestamps with the current local timezone instead of UTC Z suffix', () => {
  const timestamp = formatLocalTimestamp(new Date(2026, 4, 11, 9, 8, 7));

  assert.equal(timestamp, '2026-05-11 09:08:07');
  assert.ok(!timestamp.endsWith('Z'));
});
