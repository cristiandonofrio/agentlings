import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countViews, filterView, loadView, viewOf } from './views.js';

const s = (id, state, extra = {}) => ({ id, state, label: state === 'working' ? 'Working' : 'Idle', ...extra });
const hubs = [
  { id: 'a', sessions: [s('1', 'working'), s('2', 'needs'), s('3', 'idle')] },
  { id: 'b', sessions: [s('4', 'idle', { unread: true }), s('5', 'working', { label: 'Quiet' }), s('6', 'failed')] },
  { id: 'c', sessions: [s('7', 'idle')] },
];

test('each session lands in one view', () => {
  assert.equal(viewOf(s('x', 'working')), 'working');
  assert.equal(viewOf(s('x', 'needs')), 'attention');
  assert.equal(viewOf(s('x', 'failed')), 'attention');
  assert.equal(viewOf(s('x', 'working', { label: 'Quiet' })), 'attention');
  assert.equal(viewOf(s('x', 'idle', { unread: true })), 'attention');
  assert.equal(viewOf(s('x', 'idle')), 'resting');
});

test('counts every view', () => {
  assert.deepEqual(countViews(hubs), { all: 7, attention: 4, working: 1, resting: 2 });
});

test('filtering drops hubs left empty', () => {
  assert.equal(filterView(hubs, 'all'), hubs);
  const working = filterView(hubs, 'working');
  assert.deepEqual(working.map((h) => h.id), ['a']);
  assert.deepEqual(working[0].sessions.map((x) => x.id), ['1']);
  assert.deepEqual(filterView(hubs, 'resting').map((h) => h.id), ['a', 'c']);
});

test('remembers the view, falling back to All', () => {
  assert.equal(loadView({ getItem: () => 'working' }), 'working');
  assert.equal(loadView({ getItem: () => 'nonsense' }), 'all');
  assert.equal(loadView({ getItem: () => { throw new Error('no storage'); } }), 'all');
});
