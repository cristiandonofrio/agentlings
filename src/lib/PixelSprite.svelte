<!-- A still pixel creature, for small places like the hidden sidebar. -->
<script>
  import { drawCreature, stage } from './pixel/pixel.js';

  let { species, colour, mood = 'asleep', scale = 2 } = $props();
  let canvas = $state();

  $effect(() => {
    if (!canvas) return;
    const ctx = stage(canvas, 24, 24, scale);
    ctx.clearRect(0, 0, 24, 24);
    drawCreature(ctx, { species, colour, state: mood, x: 12, ground: 21, phase: 3 }, 0);
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    image-rendering: pixelated;
  }
</style>
