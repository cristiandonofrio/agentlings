import test from 'node:test';
import assert from 'node:assert/strict';
import { mix, rgb } from './pixel.js';

test('colours read from hex, rgb() and hsl()', () => {
  assert.deepEqual(rgb('#7F77DD'), [127, 119, 221]);
  assert.deepEqual(rgb('#fff'), [255, 255, 255]);
  assert.deepEqual(rgb('rgb(10, 20, 30)'), [10, 20, 30]);
  assert.deepEqual(rgb('hsl(0, 100%, 50%)'), [255, 0, 0]);
  assert.deepEqual(rgb('hsl(288, 55%, 50%)'), [170, 57, 198]);
  assert.deepEqual(rgb('nonsense'), [128, 128, 128]);
});

test('mixing works on an hsl hub colour', () => {
  assert.match(mix('hsl(288, 55%, 50%)', '#ffffff', 0.5), /^#[0-9a-f]{6}$/);
});
