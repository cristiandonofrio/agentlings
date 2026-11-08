// The views along the top of the window. Each session belongs to exactly one,
// apart from All, which shows everything.
import { isQuiet } from './summary.js';

const KEY = 'agentlings.view';

export const VIEWS = [
  { id: 'all', name: 'All' },
  { id: 'attention', name: 'Needs you / Finished' },
  { id: 'working', name: 'Working' },
  { id: 'resting', name: 'Resting' },
];

// Needs you, failed, a tool that may be waiting on approval, and finishes you haven't opened
// all want a look from you.
export function viewOf(s) {
  if (s.state === 'needs' || s.state === 'failed' || isQuiet(s)) return 'attention';
  if (s.state === 'idle') return s.unread ? 'attention' : 'resting';
  return 'working';
}

export function inView(s, view) {
  return view === 'all' || viewOf(s) === view;
}

// Hubs with only the sessions in the view. Hubs left with nothing are dropped.
export function filterView(hubs, view) {
  if (view === 'all') return hubs;
  return hubs
    .map((hub) => ({ ...hub, sessions: hub.sessions.filter((s) => inView(s, view)) }))
    .filter((hub) => hub.sessions.length > 0);
}

export function countViews(hubs) {
  const counts = { all: 0, attention: 0, working: 0, resting: 0 };
  for (const s of hubs.flatMap((h) => h.sessions)) {
    counts.all++;
    counts[viewOf(s)]++;
  }
  return counts;
}

export function loadView(storage = globalThis.localStorage) {
  try {
    const id = storage.getItem(KEY);
    return VIEWS.some((v) => v.id === id) ? id : 'all';
  } catch {
    return 'all';
  }
}

export function saveView(id, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, id);
  } catch {}
}
