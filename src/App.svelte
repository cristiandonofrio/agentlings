<script>
  import { onMount, tick } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import Board from './lib/Board.svelte';
  import { demoHubs } from './lib/demo.js';

  let snapshot = $state(null);

  async function show(next) {
    if (!next) return;
    snapshot = next;
    await tick();
    invoke('report_rendered', {
      hubs: document.querySelectorAll('.hub').length,
      creatures: document.querySelectorAll('.creature').length,
      states: ['working', 'needs', 'idle', 'failed']
        .map((n) => `${n}=${document.querySelectorAll(`.creature.${n}`).length}`)
        .join(' '),
    });
  }

  onMount(() => {
    let stop;
    // Demo mode shows made-up hubs instead of your sessions, for screenshots.
    invoke('is_demo').then((demo) => {
      if (demo) return show({ hubs: demoHubs(), groupSource: 'groups' });
      stop = listen('snapshot', (e) => show(e.payload));
      invoke('get_snapshot').then(show);
    });
    return () => stop?.then((f) => f());
  });
</script>

<main>
  {#if !snapshot}
    <p>Reading sessions…</p>
  {:else}
    {#if snapshot.groupSource === 'folder'}
      <p class="note">Sidebar groups unavailable, grouped by project folder: {snapshot.groupNote}</p>
    {/if}
    <Board hubs={snapshot.hubs} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font: 13px system-ui, sans-serif;
    color: #efeaf5;
    background: #211c2e;
  }
  main {
    padding: 12px;
  }
  .note {
    color: #f0997b;
  }
</style>
