// Sessions hidden from the board. Kept in the app's own storage, never in Claude's data.
const KEY = 'agentlings.hidden';

export function loadHidden(storage = globalThis.localStorage) {
  try {
    const ids = JSON.parse(storage.getItem(KEY));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function saveHidden(ids, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify(ids));
}

// Split hubs into what to draw and what's hidden. Hubs left with nothing are dropped.
export function splitHidden(hubs, ids) {
  const set = new Set(ids);
  const hidden = hubs.flatMap((hub) => hub.sessions.filter((s) => set.has(s.id)).map((session) => ({ hub, session })));
  const visible = hubs
    .map((hub) => ({ ...hub, sessions: hub.sessions.filter((s) => !set.has(s.id)) }))
    .filter((hub) => hub.sessions.length > 0);
  return { visible, hidden };
}
