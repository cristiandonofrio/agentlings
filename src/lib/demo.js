// Made-up hubs and sessions, for the gallery page and the app's demo mode
// (AGENTLINGS_DEMO=1), so screenshots never show real session names.
import EXAMPLE from './species.example.json' with { type: 'json' };

const MIN = 60_000;

function session(id, state, title, doing = '', { label, helpers = 0, usedMins = 90, activeMins = 2, unread = false } = {}) {
  const now = Date.now();
  return {
    id,
    state,
    title,
    doing,
    helpers,
    unread,
    label: label ?? { working: 'Working', needs: 'Needs you', failed: 'Stopped', idle: 'Idle' }[state],
    lastUsed: now - usedMins * MIN,
    lastActivity: now - activeMins * MIN,
  };
}

// Demo hubs always use the example creatures, whatever your own species.json says.
export function demoHubs() {
  return hubs().map((hub) => ({ ...hub, look: EXAMPLE[hub.name.toLowerCase()] }));
}

function hubs() {
  return [
    { id: 'music', name: 'Music', colour: '#7F77DD', folder: '/made/up/band-site', sessions: [
      session('m1', 'working', 'Tour dates page', 'Editing TourDates.svelte', { helpers: 2 }),
      session('m2', 'working', 'Audio upload', 'Running a long command', { label: 'Quiet' }),
      session('m3', 'idle', 'Lyrics search', '', { activeMins: 40 * 60 }),
    ] },
    { id: 'claude', name: 'Claude', colour: '#E0793F', sessions: [
      session('c1', 'needs', 'Rename the API', 'Which naming style?'),
      session('c2', 'idle', 'Prompt ideas', '', { activeMins: 3 * 24 * 60 }),
    ] },
    { id: 'projects', name: 'Projects', colour: '#A0683F', folder: '/made/up/projects', sessions: [
      session('p1', 'working', 'Weather widget', 'Building the forecast card'),
      session('p2', 'idle', 'Recipe app', 'Added a shopping list', { unread: true }),
      session('p3', 'idle', 'Habit tracker', '', { activeMins: 20 }),
    ] },
    { id: 'life', name: 'Life Admin', colour: '#D85A30', sessions: [
      session('l1', 'failed', 'Sort bank exports', ''),
      session('l2', 'idle', 'Holiday checklist', '', { activeMins: 26 * 60 }),
    ] },
    { id: 'work', name: 'Work', colour: '#4F9BD9', sessions: [
      session('w1', 'working', 'Quarterly report', 'Reading the sales figures'),
      session('w2', 'idle', 'Meeting notes', 'Summary written', { unread: true }),
    ] },
    { id: 'design', name: 'Design', colour: '#D9A066', sessions: [
      session('d1', 'working', 'Landing page mockup', 'Drawing the hero section'),
      session('d2', 'idle', 'Icon set', '', { activeMins: 30 * 60 }),
    ] },
    { id: 'workspace', name: 'Workspace', colour: '#56B4A0', sessions: [
      session('s1', 'working', 'Tidy downloads', 'Sorting files by type'),
      session('s2', 'idle', 'Backup check', '', { activeMins: 10 }),
    ] },
    { id: 'ungrouped', name: 'Ungrouped', colour: 'hsl(250, 12%, 62%)', sessions: [
      session('u1', 'working', 'Quick question', 'Answering a question'),
      session('u2', 'idle', 'Old experiment', '', { activeMins: 6 * 24 * 60 }),
    ] },
  ];
}
