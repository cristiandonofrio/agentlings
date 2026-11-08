import test from 'node:test';
import assert from 'node:assert/strict';
import { ago, whenLine } from './ago.js';

const NOW = Date.UTC(2026, 10, 8, 12, 0);
const MIN = 60_000;

test('ago reads in plain steps', () => {
  assert.equal(ago(0, NOW), '');
  assert.equal(ago(NOW - 20_000, NOW), 'just now');
  assert.equal(ago(NOW - 5 * MIN, NOW), '5 min ago');
  assert.equal(ago(NOW - 3 * 60 * MIN, NOW), '3 h ago');
  assert.equal(ago(NOW - 30 * 60 * MIN, NOW), 'yesterday');
  assert.equal(ago(NOW - 4 * 24 * 60 * MIN, NOW), '4 days ago');
  assert.equal(ago(Date.UTC(2026, 9, 20, 12), NOW), '20 Oct');
});

test('the time line only adds activity when it came later', () => {
  assert.equal(whenLine({ lastUsed: NOW - 5 * MIN, lastActivity: NOW - 5 * MIN + 20_000 }, NOW), 'You last used it 5 min ago');
  assert.equal(
    whenLine({ lastUsed: NOW - 3 * 60 * MIN, lastActivity: NOW - 2 * MIN }, NOW),
    'You last used it 3 h ago, last active 2 min ago',
  );
  assert.equal(whenLine({ lastUsed: 0, lastActivity: NOW - 2 * MIN }, NOW), 'Last active 2 min ago');
  assert.equal(whenLine({ lastUsed: 0, lastActivity: 0 }, NOW), '');
});
