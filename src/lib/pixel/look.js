// Turns a session into what its pixel creature does.
import { restFor } from '../rest.js';

// How long a creature celebrates after finishing a turn.
export const DONE_MS = 5000;

// state: the session's state from the app. age: minutes since it last did anything.
// doneAt: when it last went from busy to idle, if it did. unread: it finished a turn you
// haven't opened yet, so it keeps celebrating, more calmly, until you do.
export function pixelLook(state, age, doneAt = 0, now = Date.now(), unread = false) {
  if (state !== 'idle') return { state, fade: 0 };
  if (doneAt && now - doneAt < DONE_MS) return { state: 'done', fade: 0 };
  if (unread) return { state: 'done', fade: 0, calm: true };
  const rest = restFor('idle', age);
  const look = rest.lids >= 1 ? 'asleep' : rest.lids >= 0.5 ? 'drowsy' : 'idle';
  return { state: look, fade: rest.fade };
}
