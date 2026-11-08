import test from 'node:test';
import assert from 'node:assert/strict';
import { DONE_MS, pixelLook } from './look.js';

const HOUR = 60;
const NOW = Date.UTC(2026, 10, 8, 12);

test('busy states pass straight through', () => {
  for (const s of ['working', 'needs', 'failed']) assert.deepEqual(pixelLook(s, 30 * 24 * HOUR), { state: s, fade: 0 });
});

test('a creature celebrates for a few seconds after finishing', () => {
  assert.equal(pixelLook('idle', 0, NOW - 1000, NOW).state, 'done');
  assert.equal(pixelLook('idle', 0, NOW - DONE_MS - 1, NOW).state, 'idle');
});

test('idle creatures go from awake to drowsy to asleep, then fade', () => {
  assert.equal(pixelLook('idle', 2 * HOUR).state, 'idle');
  assert.equal(pixelLook('idle', 20 * HOUR).state, 'drowsy');
  assert.equal(pixelLook('idle', 40 * HOUR).state, 'asleep');
  assert.equal(pixelLook('idle', 40 * HOUR).fade, 0);
  assert.equal(pixelLook('idle', 30 * 24 * HOUR).fade, 1);
});

test('an unread finish keeps celebrating, calmly, whatever its age', () => {
  assert.deepEqual(pixelLook('idle', 20 * HOUR, 0, NOW, true), { state: 'done', fade: 0, calm: true });
  assert.equal(pixelLook('working', 0, 0, NOW, true).state, 'working');
});
