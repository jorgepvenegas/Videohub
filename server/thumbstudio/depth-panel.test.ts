import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSource } from '../../scripts/test-source.ts';
import type { Json } from '../types.ts';

// The app helper starts the browser's router/SSE connection. Run the actual panel
// in a small DOM sandbox so these tests can exercise pointer and resize behavior.
const source = readSource(new URL('../../ui/thumbstudio/depth.ts', import.meta.url))
  .replace(/^import .+;\r?$/gm, '')
  .replace('export function createDepthPanel', 'function createDepthPanel');

function harness(initial: Json, { getter = true } = {}) {
  const listeners = new Map(),
    captures = new Set(),
    rects: Json[] = [],
    timers = new Map();
  const state = { brief: initial },
    changes: Json[] = [],
    selected: Json[] = [];
  const ctx = new Proxy({} as Record<string | symbol, Json>, {
    get: (target, key) => target[key] || (() => {}),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    }
  });
  ctx.fillRect = (...args: Json[]) => rects.push(args);
  const canvas = {
    style: {},
    clientWidth: 456,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 10, width: 456 }),
    addEventListener: (name: Json, fn: Json) => listeners.set(name, fn),
    removeEventListener: (name: Json, fn: Json) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    },
    setPointerCapture: (id: Json) => captures.add(id),
    hasPointerCapture: (id: Json) => captures.has(id),
    releasePointerCapture: (id: Json) => captures.delete(id)
  };
  let observer: Json;
  const sandbox: Json = {
    h: () => ({ append() {} }),
    document: { createElement: () => canvas },
    ResizeObserver: class {
      declare fn: Json;
      declare disconnected: boolean;
      constructor(fn: Json) {
        // oxlint-disable-next-line typescript/no-this-alias -- the test captures the instance the page code creates
        observer = this;
        this.fn = fn;
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
    setTimeout: (fn: Json) => {
      const id = timers.size + 1;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id: Json) => timers.delete(id)
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const panel = sandbox.createDepthPanel(getter ? () => state.brief : initial, {
    onSelectLayer: (id: Json) => selected.push(id),
    onLayerDepthChange: (id: Json, depth: Json) => {
      changes.push([id, depth]);
      state.brief.layers.find((layer: Json) => layer.id === id).depth = depth;
    }
  });
  const pointer = (type: Json, depth: Json, extra = {}) =>
    listeners.get(type)?.({
      clientX: 10 + 40 + depth * 4,
      pointerId: 1,
      button: 0,
      preventDefault() {},
      ...extra
    });
  return { state, panel, canvas, pointer, selected, changes, rects, listeners, captures, timers, observer };
}

const layer = (id: Json, depth: Json, extra = {}) => ({ id, type: 'object', depth, y: 0.2, h: 0.3, ...extra });

test('depth panel follows replaced briefs for drawing, selection and dragging', () => {
  const oldBrief = { layers: [layer('old', 20)] };
  const h = harness(oldBrief);
  h.state.brief = { layers: [layer('new', 80)] };
  h.panel.update();
  assert.ok(h.rects.some(([x, , width]) => x === 356 && width === 8));
  h.pointer('pointerdown', 80);
  h.pointer('pointermove', 85);
  assert.deepEqual(h.selected, ['new']);
  assert.deepEqual(h.changes, [['new', 85]]);
  assert.equal(oldBrief.layers[0].depth, 20);
  h.panel.destroy();
});

test('object briefs remain supported and equal-depth moves do not create edits', () => {
  const h = harness({ layers: [layer('L1', 20)] }, { getter: false });
  h.pointer('pointerdown', 20);
  h.pointer('pointermove', 20);
  h.pointer('pointermove', 30, { pointerId: 2 });
  h.pointer('pointerup', 30, { pointerId: 2 });
  h.pointer('pointercancel', 30, { pointerId: 2 });
  assert.deepEqual(h.changes, []);
  assert.equal(h.captures.has(1), true, 'Another pointer must not end the active gesture');
  h.pointer('pointermove', 30);
  h.pointer('pointermove', 30);
  assert.deepEqual(h.changes, [['L1', 30]]);
  h.pointer('pointerup', 30);
  h.pointer('pointermove', 40);
  assert.equal(h.changes.length, 1);
  assert.equal(h.captures.size, 0);
  h.panel.destroy();
});

test('depth gestures respect locked and hidden layers and stop when locking during a drag', () => {
  const h = harness({
    layers: [
      layer('locked', 20, { locked: true }),
      layer('hidden', 40, { hidden: true }),
      layer('background', 60, { type: 'background' }),
      layer('editable', 80)
    ]
  });
  for (const depth of [20, 40, 60]) {
    h.pointer('pointerdown', depth);
    h.pointer('pointermove', 50);
    h.pointer('pointerup', 50);
  }
  h.pointer('pointerdown', 80, { button: 2 });
  assert.deepEqual(h.selected, []);
  h.pointer('pointerdown', 80);
  h.state.brief.layers[3].locked = true;
  h.pointer('pointermove', 90);
  assert.deepEqual(h.changes, []);
  assert.equal(h.captures.size, 0);
  h.panel.destroy();
});

test('lost capture and destruction release gestures, timers and observers', () => {
  const h = harness({ layers: [layer('L1', 20)] });
  h.pointer('pointerdown', 20);
  h.pointer('lostpointercapture', 20);
  h.pointer('pointermove', 40);
  assert.deepEqual(h.changes, []);
  h.pointer('pointerdown', 20);
  const delayedDraw = [...h.timers.values()][0];
  const staleMove = h.listeners.get('pointermove');
  h.panel.destroy();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.captures.size, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.observer.disconnected, true);
  delayedDraw();
  h.observer.fn();
  h.panel.update();
  staleMove({ pointerId: 1, clientX: 250 });
  assert.deepEqual(h.changes, []);
  assert.equal(h.rects.length, 0);
});
