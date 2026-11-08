// How rested a creature looks, from its state and minutes since the session last did anything.
//   lids: 0 open to 1 shut
//   follow: how keenly its eyes track the cursor, 0 to 1
//   fade: 0 fresh to 1 grey and dusty, a hint it's ready to hide or archive
const HOUR = 60;
const DAY = 24 * HOUR;
const FADED = 21 * DAY;

// Lids by age: wide awake for the first few hours, since a session left for a bit is often
// coming back. Sleepy through the day, very sleepy at a day, shut by a day and a half.
const LIDS = [
  [0, 0.06],
  [4 * HOUR, 0.06],
  [DAY, 0.8],
  [1.5 * DAY, 1],
];

function lidsAt(age) {
  for (let i = 1; i < LIDS.length; i++) {
    const [a0, l0] = LIDS[i - 1];
    const [a1, l1] = LIDS[i];
    if (age < a1) return l0 + ((l1 - l0) * (age - a0)) / (a1 - a0);
  }
  return 1;
}

export function restFor(state, age) {
  if (state !== 'idle') return { lids: 0, follow: 1, fade: 0 };
  const lids = lidsAt(Math.max(age, 0));
  // Fading starts once it's been shut a while.
  const fade = age < 2 * DAY ? 0 : Math.min(Math.log(age / (2 * DAY)) / Math.log(FADED / (2 * DAY)), 1);
  return { lids, follow: lids >= 1 ? 0 : Math.max(1 - lids * 1.1, 0.1), fade };
}

// Minutes since a session last did anything. Unknown counts as a day: very sleepy, not faded.
export function ageOf(s, now = Date.now()) {
  const at = s.lastActivity || s.lastUsed;
  return at ? Math.max((now - at) / 60_000, 0) : DAY;
}
