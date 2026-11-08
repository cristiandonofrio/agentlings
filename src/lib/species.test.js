import test from 'node:test';
import assert from 'node:assert/strict';
import { speciesFor } from './species.js';
import EXAMPLE from './species.example.json' with { type: 'json' };

const SPECIES = new Set(['noteling', 'octopus', 'snail', 'mug', 'palette', 'bot', 'beaver', 'fluff']);
const SCENES = new Set(['stage', 'sea', 'garden', 'office', 'studio', 'control', 'riverbank', 'meadow']);

test('known groups get their own species and colour, ignoring case and spaces', () => {
  assert.equal(speciesFor({ name: 'Music', colour: 'red' }, EXAMPLE).species, 'noteling');
  assert.equal(speciesFor({ name: 'Music', colour: 'red' }, EXAMPLE).colour, '#7F77DD');
  assert.equal(speciesFor({ name: ' life admin ', colour: 'red' }, EXAMPLE).species, 'snail');
  assert.equal(speciesFor({ name: 'Projects', colour: 'red' }, EXAMPLE).species, 'beaver');
});

test('unknown groups get a fluff in the hub colour', () => {
  assert.deepEqual(speciesFor({ name: 'Ungrouped', colour: 'red' }, EXAMPLE), { species: 'fluff', colour: 'red', scene: 'meadow' });
});

test('a hub that brings its own look keeps it', () => {
  const look = { species: 'mug', colour: '#000000', scene: 'office' };
  assert.equal(speciesFor({ name: 'Music', colour: 'red', look }, EXAMPLE), look);
});

test('the example only uses creatures and scenes that exist', () => {
  for (const look of Object.values(EXAMPLE)) {
    assert.ok(SPECIES.has(look.species), look.species);
    assert.ok(SCENES.has(look.scene), look.scene);
    assert.match(look.colour, /^#[0-9A-Fa-f]{6}$/);
  }
});
