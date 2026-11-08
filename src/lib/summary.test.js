import test from 'node:test';
import assert from 'node:assert/strict';
import { summarise } from './summary.js';

const hub = (...sessions) => [{ sessions: sessions.map(([state, label = '']) => ({ state, label })) }];

test('calm window', () => {
  assert.equal(summarise(hub(['working'], ['working'], ['idle'])), 'Nothing needs you. 2 working, 1 resting.');
});

test('urgent things come first', () => {
  assert.equal(summarise(hub(['needs'], ['failed'], ['idle'])), '1 needs you, 1 failed. 1 resting.');
  assert.equal(summarise(hub(['needs'], ['needs'])), '2 need you.');
});

test('quiet is a maybe, and is not counted as working', () => {
  assert.equal(summarise(hub(['working', 'Quiet'], ['working'])), '1 may need you. 1 working.');
});

test('unread finishes are counted apart from resting', () => {
  const hubs = [{ sessions: [{ state: 'idle', unread: true }, { state: 'idle' }, { state: 'working' }] }];
  assert.equal(summarise(hubs), 'Nothing needs you. 1 working, 1 finished, 1 resting.');
});

test('nothing at all', () => {
  assert.equal(summarise([]), 'Nothing needs you.');
});
