<!--
  One hub: its pixel scene with a creature per session, and nameplates under the busy ones.
  The scene and creatures are drawn on one small canvas, scaled up with no smoothing.
  Each creature has an invisible button over it for clicking, right-clicking and the hover label.
-->
<script>
  import { invoke } from '@tauri-apps/api/core';
  import { whenLine } from './ago.js';
  import { ageOf } from './rest.js';
  import { speciesFor } from './species.js';
  import { isQuiet } from './summary.js';
  import { drawCreature, mix, onFrame, stage } from './pixel/pixel.js';
  import { scene } from './pixel/scenes.js';
  import { pixelLook } from './pixel/look.js';

  let { hub, onmenu, maxWidth = 0 } = $props();
  const look = $derived(speciesFor(hub));

  const SCALE = 3;
  const H = 58;
  const PAD = 12;

  // Keeps "5 min ago" and how sleepy each creature looks honest while the window sits open.
  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(timer);
  });

  // When each session last finished a turn, for its little celebration.
  const doneAt = {};
  const seen = {};
  $effect(() => {
    for (const s of hub.sessions) {
      const before = seen[s.id];
      if (before && (before === 'working' || before === 'needs') && s.state === 'idle') doneAt[s.id] = Date.now();
      seen[s.id] = s.state;
    }
  });

  // Creatures stand evenly spaced. Squeeze to fit the window.
  const layout = $derived.by(() => {
    const busy = hub.sessions.map((s) => s.state !== 'idle' || s.unread);
    const fit = (b, r) => PAD * 2 + busy.reduce((sum, isBusy) => sum + (isBusy ? b : r), 0);
    let b = 50;
    let r = 50;
    const limit = maxWidth ? Math.floor(maxWidth / SCALE) : Infinity;
    while (fit(b, r) > limit && r > 28) r--;
    while (fit(b, r) > limit && b > 40) b--;
    let x = PAD;
    const spots = hub.sessions.map((s, i) => {
      const w = busy[i] ? b : r;
      const spot = { s, x: x + w / 2, w, busy: busy[i] };
      x += w;
      return spot;
    });
    return { spots, width: Math.max(96, x + PAD) };
  });

  function phaseOf(id) {
    let n = 0;
    for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 997;
    return n % 40;
  }

  let canvas = $state();
  let hovered = $state(null);

  $effect(() => {
    if (!canvas) return;
    const { spots, width } = layout;
    const ctx = stage(canvas, width, H, SCALE);
    const paint = scene(look.scene);
    return onFrame((f) => {
      const floor = paint(ctx, 0, 0, width, H, f);
      const t = Date.now();
      for (const { s, x } of spots) {
        const { state, fade, calm } = pixelLook(s.state, ageOf(s, now), doneAt[s.id], t, s.unread);
        drawCreature(ctx, { species: look.species, colour: look.colour, state, fade, calm, x, ground: floor + 2, phase: phaseOf(s.id), hover: hovered === s.id, quiet: isQuiet(s) }, f);
      }
    });
  });

  // Slide the hover label sideways if it would run off the window.
  function keepOnScreen(e) {
    const tip = e.currentTarget.querySelector('.tip');
    tip.style.setProperty('--shift', '0px');
    const box = tip.getBoundingClientRect();
    const shift = Math.max(8 - box.left, 0) - Math.max(box.right - (window.innerWidth - 8), 0);
    tip.style.setProperty('--shift', `${shift}px`);
  }

  // Second line of a nameplate: what it's doing, or why it stopped.
  function detail(s) {
    if (s.state === 'idle' && s.unread) return s.doing ? `Finished: ${s.doing}` : 'Finished';
    if (isQuiet(s)) return 'May need you';
    if (s.state === 'needs') return s.doing || 'Needs you';
    if (s.state === 'failed') return s.label;
    return s.doing;
  }
</script>

<section class="hub" style="--hub: {look.colour}; width: {layout.width * SCALE}px">
  <header>
    <h2 style="color: {mix(look.colour, '#ffffff', 0.45)}">{hub.name}</h2>
    {#if hub.folder}
      <button class="new" onclick={() => invoke('new_session', { folder: hub.folder })}>
        + New in {hub.folder.split('/').pop()}
      </button>
    {/if}
  </header>
  <div class="scene">
    <canvas bind:this={canvas}></canvas>
    {#each layout.spots as { s, x, w } (s.id)}
      <button
        class="creature {s.state}"
        style="left: {(x - w / 2) * SCALE}px; width: {w * SCALE}px"
        aria-label="{s.title}: {s.doing || s.label}"
        onclick={() => invoke('open_session', { id: s.id })}
        oncontextmenu={(e) => {
          e.preventDefault();
          onmenu?.(e, s);
        }}
        onpointerenter={(e) => {
          hovered = s.id;
          keepOnScreen(e);
        }}
        onpointerleave={() => hovered === s.id && (hovered = null)}
        onfocus={keepOnScreen}
      >
        <span class="tip">
          {s.title}{s.doing ? `: ${s.doing}` : ''}
          {#if whenLine(s, now)}<span class="when">{whenLine(s, now)}</span>{/if}
        </span>
      </button>
    {/each}
  </div>
  <div class="plates">
    {#each layout.spots as { s, x, busy } (s.id)}
      {#if busy}
        <span
          class="plate"
          class:urgent={s.state === 'needs' || s.state === 'failed' || isQuiet(s)}
          class:finished={s.state === 'idle' && s.unread}
          style="left: {x * SCALE}px"
        >
          <b>{s.title}</b>
          <span>{s.helpers ? `${s.helpers} helping: ` : ''}{detail(s)}</span>
        </span>
      {/if}
    {/each}
  </div>
</section>

<style>
  .hub {
    max-width: 100%;
    border-radius: 14px;
    background: #2b2539;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--hub) 30%, #3a3350);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 10px;
  }
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .scene {
    position: relative;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
  }
  button {
    border: 0;
    font: inherit;
    cursor: pointer;
  }
  .creature {
    position: absolute;
    top: 0;
    bottom: 0;
    padding: 0;
    background: none;
  }
  .creature:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--hub) 60%, white);
    outline-offset: -4px;
    border-radius: 8px;
  }
  button.new {
    flex: none;
    max-width: 200px;
    overflow: hidden;
    padding: 3px 8px;
    border-radius: 8px;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #efeaf5;
    background: rgba(12, 8, 22, 0.35);
  }
  button.new:hover {
    background: rgba(12, 8, 22, 0.6);
  }
  .plates {
    position: relative;
    height: 46px;
  }
  /* Nameplates under the busy creatures. */
  .plate {
    position: absolute;
    top: 6px;
    max-width: 142px;
    padding: 3px 8px;
    border-radius: 8px;
    background: rgba(12, 8, 22, 0.75);
    font-size: 11px;
    line-height: 1.3;
    text-align: center;
    white-space: nowrap;
    transform: translateX(-50%);
  }
  .plate b,
  .plate span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .plate b {
    font-size: 12px;
    color: #efeaf5;
  }
  .plate span {
    color: #b9b0c9;
  }
  .plate.urgent span {
    color: #ef9f27;
  }
  .plate.finished span {
    color: #8fd6a4;
  }
  .tip {
    position: absolute;
    z-index: 2;
    top: 100%;
    left: 50%;
    width: max-content;
    max-width: 240px;
    padding: 4px 8px;
    border-radius: 8px;
    color: #efeaf5;
    background: #120d1e;
    opacity: 0;
    pointer-events: none;
    transform: translateX(calc(-50% + var(--shift, 0px)));
  }
  .when {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: #b9b0c9;
  }
  .creature:hover .tip,
  .creature:focus-visible .tip {
    opacity: 1;
  }
</style>
