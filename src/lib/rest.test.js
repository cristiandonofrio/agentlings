import test from 'node:test';
import assert from 'node:assert/strict';
import { ageOf, restFor } from './rest.js';

const DAY = 1440;

test('busy creatures are wide awake whatever their age', () => {
  for (const state of ['working', 'needs', 'failed']) assert.deepEqual(restFor(state, 30 * DAY), { lids: 0, follow: 1, fade: 0 });
});

test('idle creatures stay awake for hours, get sleepy over a day, shut by a day and a half', () => {
  const HOUR = 60;
  assert.equal(restFor('idle', 2).lids < 0.1, true);
  assert.equal(restFor('idle', 2 * HOUR).lids < 0.1, true);
  const twelve = restFor('idle', 12 * HOUR).lids;
  assert.equal(twelve > 0.2 && twelve < 0.5, true);
  assert.equal(restFor('idle', DAY).lids, 0.8);
  assert.equal(restFor('idle', 1.5 * DAY).lids, 1);
  assert.equal(restFor('idle', 1.5 * DAY).follow, 0);
  assert.equal(restFor('idle', 1.5 * DAY).fade, 0);
  const fiveDays = restFor('idle', 5 * DAY).fade;
  assert.equal(fiveDays > 0 && fiveDays < 0.5, true);
  assert.equal(restFor('idle', 21 * DAY).fade, 1);
  assert.equal(restFor('idle', 90 * DAY).fade, 1);
});

test('age comes from last activity, then last use', () => {
  const now = Date.UTC(2026, 10, 8, 12);
  assert.equal(ageOf({ lastActivity: now - 5 * 60_000, lastUsed: now - 60 * 60_000 }, now), 5);
  assert.equal(ageOf({ lastUsed: now - 10 * 60_000 }, now), 10);
  assert.equal(ageOf({}, now), DAY);
});
