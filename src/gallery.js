// Dev-only page with made-up sessions, for checking the art in a browser.
import { mount } from 'svelte';
import Board from './lib/Board.svelte';
import { demoHubs } from './lib/demo.js';
import { freezeAt } from './lib/pixel/pixel.js';

// gallery.html?frame=12 holds the animation on one frame (tools/record-demo.sh uses it).
const frame = new URLSearchParams(location.search).get('frame');
if (frame !== null) freezeAt(Number(frame));

document.body.style.cssText = 'margin:0;padding:12px;font:13px system-ui;color:#efeaf5;background:#211c2e';
mount(Board, { target: document.getElementById('app'), props: { hubs: demoHubs() } });
