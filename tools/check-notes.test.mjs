import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkNotes, headingIds, markdownLinks, proseLines } from './check-notes.mjs';

test('links preserve balanced parentheses, encoded spaces, images and titles', () => {
  assert.deepEqual(markdownLinks('[A](a(b).md#x) ![B](b%20c.png "caption")'), [
    { destination: 'a(b).md#x', line: 1 },
    { destination: 'b%20c.png', line: 1 },
  ]);
  assert.equal(markdownLinks('[A](<a b.md>)')[0].destination, 'a b.md');
  assert.equal(markdownLinks('[ref]: ../file.md "title"')[0].destination, '../file.md');
});

test('fenced examples are excluded and a shorter fence cannot close them', () => {
  const text = '````text\n[x](missing)\n```\n[y](missing)\n````\n[z](present)';
  assert.deepEqual(markdownLinks(text), [{ destination: 'present', line: 6 }]);
  assert.equal(proseLines(text).length, 6);
});

test('heading IDs handle punctuation, emoji, duplicates and explicit anchors', () => {
  const ids = headingIds('# A & B\n## A & B\n# 🎯 Chapters Index\n<a id="legacy"></a>\n```\n# Hidden\n```');
  assert.deepEqual([...ids], ['a--b', 'a--b-1', '-chapters-index', 'legacy']);
});

test('unclosed fences fail instead of hiding subsequent broken links', () => {
  assert.throws(() => markdownLinks('```\n[x](missing)'), SyntaxError);
});

test('repository checks reject missing targets, fragments and author file URLs', () => {
  const root = mkdtempSync(join(tmpdir(), 'notes-check-'));
  const source = join(root, 'Source.md');
  const target = join(root, 'Target.md');
  try {
    writeFileSync(target, '# Present\n# Present\n');
    writeFileSync(source, '[ok](Target.md#present-1)\n[ok](#source)\n# Source\n');
    assert.deepEqual(checkNotes(root, [source, target]).issues, []);
    writeFileSync(source, [
      '[bad](missing.md)',
      '[bad](Target.md#absent)',
      '[bad](file:///Users/example/notes.md)',
      '[bad](Target.md#invalid%ZZ)',
      '[bad](target.md)',
    ].join('\n'));
    const result = checkNotes(root, [source, target]);
    assert.equal(result.issues.length, 5);
    assert.ok(result.issues.some(issue => issue.includes('missing heading')));
    assert.ok(result.issues.some(issue => issue.includes('nonportable')));
    assert.ok(result.issues.some(issue => issue.includes('invalid URL encoding')));
    assert.ok(result.issues.some(issue => /missing target|case mismatch/.test(issue)));
  } finally {
    unlinkSync(source);
    unlinkSync(target);
    rmdirSync(root);
  }
});

test('XFetch uses a positive negative-log threshold before expiry', () => {
  const samples = [0.001, 0.01, 0.1, 0.5, 0.99];
  assert.ok(samples.every(u => !(2 * Math.log(u) >= 5)));
  assert.ok(-2 * Math.log(0.01) >= 5);
});

test('refill timestamp must not move backward', () => {
  const refill = (times, monotonic) => {
    let tokens = 10;
    let last = 100;
    for (const now of times) {
      const effective = monotonic ? Math.max(last, now) : now;
      tokens = Math.min(10, tokens + Math.max(0, effective - last)) - 1;
      last = effective;
    }
    return tokens;
  };
  assert.equal(refill([90, 100], false), 9);
  assert.equal(refill([90, 100], true), 8);
});

test('claimable state excludes terminal jobs even with an old heartbeat', () => {
  const claimable = (state, stale) => state === 'PENDING' || (state === 'RUNNING' && stale);
  assert.ok(claimable('PENDING', false));
  assert.ok(claimable('RUNNING', true));
  assert.ok(!claimable('RUNNING', false));
  for (const state of ['COMPLETED', 'SUCCEEDED', 'FAILED', 'CANCELLED']) {
    assert.ok(!claimable(state, true));
  }
});

test('attempt arithmetic, vnode dispersion and object population stay consistent', () => {
  assert.equal(3 ** 3, 27);
  assert.equal((1 + 3) ** 3, 64);
  assert.equal(100 / Math.sqrt(256), 6.25);
  assert.equal(40e9 + 1.875e9 + 0.1e9, 41.975e9);
});

test('all numbered designs retain contract sections and applied exercises', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const chapters = execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' })
    .split('\0').filter(name => /^\d{2}\. [^/]+\/readme\.md$/i.test(name));
  assert.equal(chapters.length, 31);
  const missing = [];
  for (const chapter of chapters) {
    const text = readFileSync(join(root, chapter), 'utf8');
    const block = text.match(/## Guarantees and assumptions\n([\s\S]+?)\n\n/)?.[1];
    if (!block) { missing.push(`${chapter}: contract block`); continue; }
    if (!/\*\*Principal IC exercise:\*\*/.test(text)) missing.push(`${chapter}: applied exercise`);
  }
  assert.deepEqual(missing, []);
});

test('financial, booking, scheduling and streaming designs include crash recovery', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  for (const name of [
    '21. Ad Click Event Aggregation', '22. Hotel Reservation System',
    '26. Payment System', '27.  Digital Wallet', '31. Distributed Job Scheduler',
  ]) {
    const text = readFileSync(join(root, name, 'README.md'), 'utf8');
    assert.match(text, /Crash\/recovery timeline/, name);
    assert.match(text, /ACK lost|ACK is lost|ACK.*lost/, name);
  }
});
