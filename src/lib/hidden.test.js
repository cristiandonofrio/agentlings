import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHidden, saveHidden, splitHidden } from './hidden.js';

const fakeStorage = (value = null) => ({
  value,
  getItem() { return this.value; },
  setItem(_, v) { this.value = v; },
});

test('hidden ids survive a save and load', () => {
  const storage = fakeStorage();
  saveHidden(['a', 'b'], storage);
  assert.deepEqual(loadHidden(storage), ['a', 'b']);
});

test('nothing saved, or junk saved, loads as empty', () => {
  assert.deepEqual(loadHidden(fakeStorage()), []);
  assert.deepEqual(loadHidden(fakeStorage('not json')), []);
  assert.deepEqual(loadHidden(fakeStorage('{"a":1}')), []);
});

test('a hidden session leaves its hub, and an emptied hub goes', () => {
  const hubs = [
    { id: 'h1', sessions: [{ id: 'a' }, { id: 'b' }] },
    { id: 'h2', sessions: [{ id: 'c' }] },
    { id: 'h3', sessions: [] },
  ];
  const { visible, hidden } = splitHidden(hubs, ['a', 'c', 'gone']);
  assert.deepEqual(visible.map((h) => [h.id, h.sessions.map((s) => s.id)]), [['h1', ['b']]]);
  assert.deepEqual(hidden.map((x) => x.session.id), ['a', 'c']);
});
