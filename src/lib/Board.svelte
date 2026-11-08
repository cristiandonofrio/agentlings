<!-- The whole window: views, hubs, right-click menu and the hidden sessions dropdown. -->
<script>
  import { invoke } from '@tauri-apps/api/core';
  import PixelSprite from './PixelSprite.svelte';
  import Hub from './Hub.svelte';
  import { loadHidden, saveHidden, splitHidden } from './hidden.js';
  import { speciesFor } from './species.js';
  import { VIEWS, countViews, filterView, loadView, saveView } from './views.js';

  let { hubs } = $props();

  let hiddenIds = $state(loadHidden());
  let view = $state(loadView());
  let muted = $state(false);
  let hubsWidth = $state(0);
  invoke('get_muted').then((m) => (muted = m)).catch(() => {});

  function toggleSound() {
    muted = !muted;
    invoke('set_muted', { muted }).catch(() => {});
  }
  let sidebarOpen = $state(false);
  let menu = $state(null);

  const split = $derived(splitHidden(hubs, hiddenIds));
  const counts = $derived(countViews(split.visible));
  const shown = $derived(filterView(split.visible, view));
  const hiddenNeedsYou = $derived(split.hidden.some(({ session }) => ['needs', 'failed'].includes(session.state)));

  function pick(id) {
    view = id;
    saveView(id);
  }

  function setHidden(ids) {
    hiddenIds = ids;
    saveHidden(ids);
    if (ids.length === 0) sidebarOpen = false;
  }

  function openMenu(event, session) {
    const x = Math.min(event.clientX, window.innerWidth - 150);
    const y = Math.min(event.clientY, window.innerHeight - 90);
    menu = { x, y, session };
  }
</script>

<svelte:window
  onclick={(e) => {
    menu = null;
    if (!e.target.closest?.('.hidden-menu')) sidebarOpen = false;
  }}
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    menu = null;
    sidebarOpen = false;
  }}
/>

<div class="board" class:menu-open={menu}>
  <div class="main">
    <header>
      <nav aria-label="Views">
        {#each VIEWS as v (v.id)}
          <button
            class="view"
            class:on={view === v.id}
            class:alert={v.id === 'attention' && counts.attention > 0}
            aria-pressed={view === v.id}
            onclick={() => pick(v.id)}
          >
            {v.name} <span class="count">{counts[v.id]}</span>
          </button>
        {/each}
      </nav>
      <button
        class="sound"
        class:off={muted}
        aria-label={muted ? 'Sound off. Turn on alert sounds' : 'Sound on. Mute alert sounds'}
        title={muted ? 'Alert sounds are off' : 'Alert sounds are on'}
        onclick={toggleSound}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path class="cone" d="M3 7.5 H6 L10.5 4 V16 L6 12.5 H3 Z" />
          {#if muted}
            <path class="wave" d="M13.5 7.5 L18 12 M18 7.5 L13.5 12" />
          {:else}
            <path class="wave" d="M13.2 7.2 Q15 10 13.2 12.8 M15.6 5.2 Q19 10 15.6 14.8" />
          {/if}
        </svg>
      </button>
      {#if hiddenIds.length > 0 && split.hidden.length > 0}
        <div class="hidden-menu">
          <button
            class="toggle"
            class:alert={hiddenNeedsYou}
            class:on={sidebarOpen}
            aria-expanded={sidebarOpen}
            onclick={() => (sidebarOpen = !sidebarOpen)}
          >
            Hidden {split.hidden.length}
          </button>
      {#if sidebarOpen}
        <aside aria-label="Hidden sessions">
          <div class="aside-head">
            <h2>Hidden sessions</h2>
            <button
              class="archive"
              title="Opens a new Claude session that archives these for you"
              onclick={() => invoke('archive_in_claude', { ids: split.hidden.map(({ session }) => session.id) })}
            >
              Archive in Claude
            </button>
          </div>
          {#each split.hidden as { hub, session } (session.id)}
            {@const look = speciesFor(hub)}
            <div class="row">
              <span class="mini"><PixelSprite species={look.species} colour={look.colour} mood={session.state === 'idle' ? 'asleep' : session.state} /></span>
              <button class="name" onclick={() => invoke('open_session', { id: session.id })}>
                <span class="title">{session.title}</span>
                <span class="detail" class:urgent={['needs', 'failed'].includes(session.state)}>{hub.name}: {session.label}</span>
              </button>
              <button class="unhide" onclick={() => setHidden(hiddenIds.filter((id) => id !== session.id))}>Show</button>
            </div>
          {/each}
        </aside>
      {/if}
        </div>
      {/if}
    </header>
    <div class="hubs" bind:clientWidth={hubsWidth}>
      {#each shown as hub (hub.id)}
        <Hub {hub} onmenu={openMenu} maxWidth={hubsWidth} />
      {:else}
        <p class="empty">{view === 'all' ? 'No sessions to show.' : 'Nothing here right now.'}</p>
      {/each}
    </div>
  </div>

</div>

{#if menu}
  <div class="menu" role="menu" style="left: {menu.x}px; top: {menu.y}px">
    <button role="menuitem" onclick={() => invoke('open_session', { id: menu.session.id })}>Open session</button>
    {#if ['needs', 'failed'].includes(menu.session.state)}
      <button role="menuitem" title="Rests until it says something new" onclick={() => invoke('dismiss', { id: menu.session.id })}>Dismiss</button>
    {/if}
    <button role="menuitem" onclick={() => setHidden([...hiddenIds, menu.session.id])}>Hide</button>
  </div>
{/if}

<style>
  .board {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .menu-open :global(.tip) {
    display: none;
  }
  .main {
    flex: 1;
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 2px 2px 14px;
  }
  nav {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .view {
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 13px;
    background: #2b2539;
  }
  .view:hover {
    background: #352e45;
  }
  .view.on {
    background: #4d4563;
  }
  .count {
    margin-left: 3px;
    color: #b9b0c9;
  }
  .view.alert .count {
    color: #ef9f27;
    font-weight: 600;
  }
  .empty {
    color: #b9b0c9;
  }
  .hubs {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  }
  button {
    border: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .sound {
    flex: none;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 10px;
    background: #352e45;
  }
  .sound:hover {
    background: #413a53;
  }
  .sound svg {
    width: 18px;
    height: 18px;
  }
  .cone {
    fill: #efeaf5;
  }
  .wave {
    fill: none;
    stroke: #efeaf5;
    stroke-width: 1.7;
    stroke-linecap: round;
  }
  .sound.off .cone,
  .sound.off .wave {
    fill: #8c849e;
    stroke: #8c849e;
  }
  .sound.off .cone {
    stroke: none;
  }
  .toggle {
    flex: none;
    padding: 6px 12px;
    border-radius: 10px;
    background: #352e45;
  }
  .toggle.alert {
    color: #412402;
    background: #ef9f27;
  }
  .hidden-menu {
    position: relative;
    flex: none;
  }
  .toggle.on {
    background: #4d4563;
  }
  .toggle.alert.on {
    background: #f5b552;
  }
  aside {
    position: absolute;
    z-index: 5;
    top: calc(100% + 6px);
    right: 0;
    width: 290px;
    max-height: calc(100vh - 70px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 12px;
    border-radius: 16px;
    background: #2b2539;
  }
  .aside-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 10px;
  }
  .archive {
    flex: none;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    background: #413a53;
  }
  .archive:hover {
    background: #4d4563;
  }
  aside h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
  }
  .mini {
    flex: none;
    width: 48px;
    height: 48px;
  }
  .name {
    flex: 1;
    min-width: 0;
    width: 0; /* Safari won't shrink a button below its text without this */
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0;
    text-align: left;
    background: none;
  }
  .title,
  .detail {
    display: block;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .detail {
    font-size: 11px;
    color: #b9b0c9;
  }
  .detail.urgent {
    color: #ef9f27;
  }
  .unhide {
    flex: none;
    padding: 4px 8px;
    border-radius: 8px;
    background: #413a53;
  }
  .menu {
    position: fixed;
    z-index: 10;
    min-width: 130px;
    display: flex;
    flex-direction: column;
    padding: 4px;
    border-radius: 10px;
    background: #120d1e;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .menu button {
    padding: 6px 10px;
    border-radius: 7px;
    text-align: left;
    background: none;
  }
  .menu button:hover {
    background: #352e45;
  }
</style>
