// Your own creature list lives in src/lib/species.json, which git ignores so your group
// names stay on your machine. On a fresh clone it starts as a copy of the example.
import { copyFileSync, existsSync } from 'node:fs';

const mine = new URL('../src/lib/species.json', import.meta.url);
if (!existsSync(mine)) {
  copyFileSync(new URL('../src/lib/species.example.json', import.meta.url), mine);
  console.log('Made src/lib/species.json from the example. Edit it to match your Claude sidebar groups.');
}
