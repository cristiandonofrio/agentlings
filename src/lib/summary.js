// The one sentence at the top of the window.
const isQuiet = (s) => s.state === 'working' && s.label === 'Quiet';

export function summarise(hubs) {
  const all = hubs.flatMap((h) => h.sessions);
  const count = (test) => all.filter(test).length;
  const needs = count((s) => s.state === 'needs');
  const failed = count((s) => s.state === 'failed');
  const quiet = count(isQuiet);
  const working = count((s) => s.state === 'working' && !isQuiet(s));
  const unread = count((s) => s.state === 'idle' && s.unread);
  const resting = count((s) => s.state === 'idle' && !s.unread);

  const urgent = [
    needs && `${needs} ${needs === 1 ? 'needs' : 'need'} you`,
    failed && `${failed} failed`,
    quiet && `${quiet} may need you`,
  ].filter(Boolean);
  const calm = [working && `${working} working`, unread && `${unread} finished`, resting && `${resting} resting`].filter(Boolean);

  const first = urgent.length ? urgent.join(', ') : 'Nothing needs you';
  const text = calm.length ? `${first}. ${calm.join(', ')}.` : `${first}.`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export { isQuiet };
