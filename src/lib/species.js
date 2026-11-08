// Which creature lives in which hub. Your list is species.json (made from
// species.example.json on first build, and ignored by git). Keys are Claude sidebar group
// names in lower case. The app reads the same file to pick each creature's alert sound.
// Anything not listed gets a fluff in the hub's own colour.
import SPECIES from './species.json' with { type: 'json' };

export function speciesFor(hub, table = SPECIES) {
  if (hub.look) return hub.look; // demo hubs bring their own
  const found = table[hub.name.trim().toLowerCase()];
  return found ?? { species: 'fluff', colour: hub.colour, scene: 'meadow' };
}
