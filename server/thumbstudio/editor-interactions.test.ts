import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSource } from '../../scripts/test-source.ts';
import type { Json } from '../types.ts';
import { History } from '../../ui/thumbstudio/history.ts';
import * as layers from '../../ui/thumbstudio/layers.ts';
import * as light from '../../ui/thumbstudio/light.ts';

// Exercise the actual editor and its real geometry/history helpers without
// starting app.ts's browser router, SSE connection.
const source = readSource(new URL('../../ui/thumbstudio/editor.ts', import.meta.url))
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\r?$/gm, '')
  .replace('export async function renderEditor', 'async function renderEditor');

async function harness(overrides = {}) {
  let document: Json;
  class Element {
    [key: string]: Json; // the fake gets whatever fields the editor sets on a node
    constructor(tag: Json) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.style = {};
      this.dataset = {};
      this.attrs = {};
      this.listeners = new Map();
      this.scrollTop = 0;
      this.scrollLeft = 0;
      this.clientWidth = 960;
      this.clientHeight = 600;
      this.captures = new Set();
      this.className = '';
      this.classList = {
        contains: (name: Json) => this.className.split(/\s+/).includes(name),
        add: (name: Json) => {
          if (!this.classList.contains(name)) this.className += ' ' + name;
        },
        remove: (name: Json) => {
          this.className = this.className
            .split(/\s+/)
            .filter((n: Json) => n !== name)
            .join(' ');
        },
        toggle: (name: Json, on: Json) => {
          (on ?? !this.classList.contains(name)) ? this.classList.add(name) : this.classList.remove(name);
        }
      };
    }
    append(...children: Json[]) {
      for (const child of children.flat(Infinity)) {
        if (child == null || child === false) continue;
        const node = child instanceof Element ? child : Object.assign(new Element('#text'), { text: String(child) });
        node.parentElement = this;
        this.children.push(node);
      }
    }
    set innerHTML(_: Json) {
      this.children.forEach((c: Json) => {
        c.parentElement = null;
      });
      this.children = [];
    }
    set textContent(text) {
      this.innerHTML = '';
      this.text = String(text);
    }
    get textContent() {
      return (this.text || '') + this.children.map((c: Json) => c.textContent).join('');
    }
    setAttribute(key: Json, value: Json) {
      this.attrs[key] = String(value);
      if (key === 'class') this.className = String(value);
      else if (key.startsWith('data-')) this.dataset[key.slice(5)] = String(value);
      else if (key === 'disabled' || key === 'hidden' || key === 'checked') this[key] = true;
      else this[key] = value;
    }
    matches(selector: Json) {
      return selector.split(',').some((part: Json) => {
        const s = part.trim();
        const tag = /^([a-z]+)/i.exec(s)?.[1];
        if (tag && this.tagName !== tag.toUpperCase()) return false;
        for (const type of s.matchAll(/:not\(\[type=([^\]]+)\]\)/g)) if (this.type === type[1]) return false;
        return [...s.matchAll(/\.([\w-]+)/g)].every(([, cls]) => this.classList.contains(cls));
      });
    }
    querySelectorAll(selector: Json) {
      return this.children.flatMap((child: Json) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector: Json) {
      return this.querySelectorAll(selector)[0] || null;
    }
    contains(node: Json) {
      return this === node || this.children.some((child: Json) => child.contains(node));
    }
    addEventListener(name: Json, fn: Json) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(fn);
    }
    removeEventListener(name: Json, fn: Json) {
      this.listeners.get(name)?.delete(fn);
    }
    dispatch(name: Json, props = {}) {
      const event = { target: this, preventDefault() {}, stopPropagation() {}, ...props };
      this['on' + name]?.(event);
      for (const fn of this.listeners.get(name) || []) fn(event);
    }
    click() {
      this.focus();
      this.dispatch('click');
    }
    focus(options?: Json) {
      document.activeElement = this;
      this.focusOptions = options;
    }
    blur() {
      document.activeElement = document.body;
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, width: this.width || 960, height: this.height || 600 };
    }
    getContext() {
      return new Proxy({ canvas: this }, { get: (obj: Json, key: Json) => obj[key] ?? (() => {}) });
    }
    setPointerCapture(id: Json) {
      this.captures.add(id);
    }
    hasPointerCapture(id: Json) {
      return this.captures.has(id);
    }
    releasePointerCapture(id: Json) {
      this.captures.delete(id);
      this.dispatch('lostpointercapture', { pointerId: id });
    }
  }
  document = { body: new Element('body'), createElement: (tag: Json) => new Element(tag) };
  document.activeElement = document.body;
  document.querySelector = (selector: Json) => document.body.querySelector(selector);
  const h = (tag: Json, attrs = {}, ...children: Json[]) => {
    const el = new Element(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (key === 'style') Object.assign(el.style, value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    el.append(...children);
    return el;
  };
  const initial: Json = {
    title: 'Test thumbnail',
    format: '16:9',
    camera: {},
    light: { azimuth: 0 },
    style: {},
    text: {},
    safe: {},
    refs: [],
    variants: [],
    layers: [layers.createObjectLayer([], { id: 'L1', x: 0.2, y: 0.2, w: 0.2, h: 0.3 })],
    ...overrides
  };
  const timers = new Map(),
    observers: Json[] = [],
    requests: Json[] = [];
  let timerSeq = 0,
    brief = initial,
    picker: Json,
    inspectorCallbacks: Json,
    depthDestroyed = false;
  const sandbox: Json = {
    agentName: () => 'OpenCode',
    ...layers,
    ...light,
    History,
    document,
    console,
    h,
    api: async (url: Json, options = {}) => {
      requests.push([url, options]);
      return url === '/api/thumbstudio/gen' ? { queue: [] } : initial;
    },
    window: new Element('window'),
    location: { hash: '' },
    getComputedStyle: () => ({ paddingLeft: '24', paddingRight: '24', paddingTop: '24', paddingBottom: '24' }),
    ResizeObserver: class {
      declare fn: Json;
      declare target: Json;
      declare disconnected: boolean;
      constructor(fn: Json) {
        this.fn = fn;
        observers.push(this);
      }
      observe(target: Json) {
        this.target = target;
      }
      disconnect() {
        this.disconnected = true;
      }
    },
    setTimeout: (fn: Json) => {
      timers.set(++timerSeq, fn);
      return timerSeq;
    },
    clearTimeout: (id: Json) => timers.delete(id),
    localStorage: { getItem: () => null, setItem() {} },
    toast() {},
    pill: (_: Json, text: Json) => h('span', {}, text),
    onHubEvent: () => () => {},
    drawScene: (_ctx: Json, current: Json) => {
      brief = current;
    },
    setImageLoadHandler() {},
    generatePrompt: () => ({ prompt: 'test prompt' }),
    createVariantStrip: () => ({ el: h('div'), draw() {}, dispose() {} }),
    createDepthPanel: () => ({
      el: h('div'),
      update() {},
      destroy() {
        depthDestroyed = true;
      }
    }),
    renderInspector: (container: Json, currentBrief: Json, selectedId: Json, callbacks: Json) => {
      inspectorCallbacks = callbacks;
      container.innerHTML = '';
      // Replacing a long form can clamp its scrolling parent before it grows.
      container.parentElement.scrollTop = 0;
      container.parentElement.scrollLeft = 0;
      container.append(h('input', { type: 'text' }), h('input', { type: 'checkbox' }), h('select'));
      const selected = currentBrief.layers.find((layer: Json) => layer.id === selectedId);
      if (selected?.bg) container.append(h('input', { type: 'color', class: 'background-color-control' }));
      if (selected?.shape === 'ellipse') container.append(h('span', { class: 'ellipse-control' }));
    },
    isOverlayLayer: (layer: Json) => layer.type === 'text' || layer.type === 'effect',
    openTemplatePickerModal: (options: Json) => {
      picker = options;
    },
    applyClientTemplateSlots: (tpl: Json) => JSON.parse(JSON.stringify(tpl))
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const main = h('main'),
    page = h('div', { class: 'page' });
  main.append(page);
  document.body.append(main);
  const dispose = await sandbox.renderEditor(page, '_', 'test');
  const canvas = page.querySelector('canvas');
  const pointer = (type: Json, x: Json, y: Json, props = {}) =>
    canvas.dispatch(type, {
      clientX: x,
      clientY: y,
      pointerId: 1,
      button: 0,
      ...props
    });
  const button = (title: Json) => page.querySelectorAll('button').find((el: Json) => el.title === title);
  const key = (name: Json, props = {}) => sandbox.window.dispatch('keydown', { key: name, ...props });
  return {
    page,
    main,
    canvas,
    pointer,
    button,
    key,
    timers,
    requests,
    observers,
    document,
    dispose,
    get brief() {
      return brief;
    },
    get picker() {
      return picker;
    },
    get inspector() {
      return inspectorCallbacks;
    },
    get depthDestroyed() {
      return depthDestroyed;
    }
  };
}

test('pen release ends the stroke and later pointer movement cannot append or crash', async () => {
  const h = await harness();
  h.button('Freehand drawing pen').click();
  h.pointer('pointerdown', 400, 200);
  h.pointer('pointermove', 450, 220);
  h.pointer('pointerup', 450, 220);
  const sketch = h.brief.layers.find((layer: Json) => layer.type === 'sketch');
  assert.equal(sketch.strokes.length, 1);
  assert.equal(sketch.strokes[0].pts.length, 2);
  const snapshot = JSON.stringify(h.brief);
  assert.doesNotThrow(() => h.pointer('pointermove', 500, 300));
  assert.equal(JSON.stringify(h.brief), snapshot);
  assert.equal(h.canvas.captures.size, 0);
  h.dispose();
});

test('light release stops edits, ignores other pointers and records one undoable gesture', async () => {
  const h = await harness();
  const sun = light.getSunGizmoPos(0, 1280, 720);
  h.pointer('pointerdown', sun.x, sun.y);
  h.pointer('pointermove', 1250, 360, { pointerId: 2 });
  assert.equal(h.brief.light.azimuth, 0);
  h.pointer('pointermove', 1250, 360);
  assert.equal(h.brief.light.azimuth, 90);
  h.pointer('pointerup', 1250, 360);
  h.pointer('pointermove', 640, 690);
  assert.equal(h.brief.light.azimuth, 90);
  h.key('z', { ctrlKey: true });
  assert.equal(h.brief.light.azimuth, 0);
  h.key('y', { ctrlKey: true });
  assert.equal(h.brief.light.azimuth, 90);
  h.dispose();
});

test('selecting or deselecting without a drag creates no save or undo entry', async () => {
  const h = await harness();
  h.pointer('pointerdown', 384, 252);
  h.pointer('pointerup', 384, 252);
  h.pointer('pointerdown', 1000, 600);
  h.pointer('pointerup', 1000, 600);
  assert.equal(h.timers.size, 0);
  assert.equal(h.button('Undo (Ctrl+Z)').disabled, true);
  assert.equal(
    h.requests.some(([, options]) => options.method === 'PUT'),
    false
  );
  h.dispose();
});

test('locked layer handles cannot resize or move the layer', async () => {
  const locked = layers.createObjectLayer([], { id: 'L1', x: 0.2, y: 0.2, w: 0.2, h: 0.3, locked: true });
  const h = await harness({ layers: [locked] });
  const snapshot = JSON.stringify(locked);
  h.pointer('pointerdown', 512, 360);
  h.pointer('pointermove', 600, 420);
  h.pointer('pointerup', 600, 420);
  assert.equal(JSON.stringify(h.brief.layers[0]), snapshot);
  assert.equal(h.timers.size, 0);
  h.dispose();
});

test('layer selection and edits preserve layer-list and inspector scroll offsets', async () => {
  const h = await harness();
  const list = h.page.querySelector('.layers-list'),
    inspector = h.page.querySelector('.editor-inspector');
  list.scrollTop = 245;
  inspector.scrollTop = 380;
  inspector.scrollLeft = 12;
  list.querySelector('.layer-row').click();
  assert.notEqual(h.page.querySelector('.layers-list'), list);
  assert.equal(h.page.querySelector('.layers-list').scrollTop, 245);
  assert.equal(inspector.scrollTop, 380);
  assert.equal(inspector.scrollLeft, 12);
  h.inspector.onLayerChange({ color: '#ff0000' });
  assert.equal(h.page.querySelector('.layers-list').scrollTop, 245);
  assert.equal(inspector.scrollTop, 380);
  h.dispose();
});

test('template format changes resize the canvas and survive undo/redo', async () => {
  const h = await harness();
  const originalLayers = JSON.stringify(h.brief.layers);
  h.button('Choose and apply a template from the gallery').click();
  h.picker.onApplyTemplate(
    {
      name: 'Portrait',
      format: '9:16',
      camera: {},
      light: { azimuth: 45 },
      style: {},
      text: {},
      layers: [layers.createTextLayer([], { id: 'portrait-title', content: 'PORTRAIT' })]
    },
    {}
  );
  assert.equal(h.brief.format, '9:16');
  assert.equal(h.canvas.width, 1080);
  assert.equal(h.canvas.height, 1920);
  h.document.activeElement = h.document.body;
  h.key('z', { ctrlKey: true });
  assert.equal(h.brief.format, '16:9');
  assert.equal(h.canvas.width, 1280);
  assert.equal(h.canvas.height, 720);
  assert.equal(JSON.stringify(h.brief.layers), originalLayers);
  h.key('y', { ctrlKey: true });
  assert.equal(h.brief.format, '9:16');
  assert.equal(h.canvas.width, 1080);
  assert.equal(h.canvas.height, 1920);
  h.dispose();
  assert.equal(h.depthDestroyed, true);
  assert.ok(h.observers.every(observer => observer.disconnected));
});

test('landscape and portrait canvases fit the actual free space as the workspace resizes', async () => {
  for (const format of ['16:9', '9:16']) {
    const h = await harness({ format });
    const viewport = h.page.querySelector('.editor-canvas-viewport');
    const container = h.page.querySelector('.editor-canvas-container');
    const observer = h.observers.find(item => item.target === viewport);
    assert.ok(observer, 'The canvas viewport must be observed for changes in available space');
    assert.equal(container.style.width, format === '16:9' ? '910px' : '309px');
    assert.equal(container.style.height, format === '16:9' ? '511px' : '550px');

    viewport.clientWidth = 1200;
    viewport.clientHeight = 500;
    observer.fn();
    assert.equal(container.style.width, format === '16:9' ? '800px' : '253px');
    assert.equal(container.style.height, '450px');

    // A narrow workspace is width-limited, even for a portrait document.
    viewport.clientWidth = 250;
    viewport.clientHeight = 900;
    observer.fn();
    assert.equal(container.style.width, '200px');
    assert.equal(container.style.height, format === '16:9' ? '112px' : '355px');
    assert.equal(h.canvas.width, format === '16:9' ? 1280 : 1080, 'CSS fitting must retain export resolution');
    assert.equal(h.canvas.height, format === '16:9' ? 720 : 1920);
    h.dispose();
  }
});

test('continuous text editing preserves the input while checkbox and select edits refresh dependent controls', async () => {
  const h = await harness();
  const body = h.page.querySelector('.editor-inspector-body');
  const panel = h.page.querySelector('.editor-inspector');
  const text = body.querySelector('input');
  text.focus();
  panel.scrollTop = 320;
  h.inspector.onLayerChange({ name: 'Typing without losing focus' });
  assert.equal(body.querySelector('input'), text, 'Continuous typing must preserve the DOM input');
  assert.equal(h.document.activeElement, text);
  assert.equal(panel.scrollTop, 320);

  const checkbox = body.querySelectorAll('input')[1];
  checkbox.focus();
  h.inspector.onLayerChange({ bg: '#ffd400' });
  assert.ok(body.querySelector('.background-color-control'), 'Toggling the background must expose its color control');
  assert.notEqual(body.querySelectorAll('input')[1], checkbox, 'Checkbox edits must rebuild dependent fields');
  assert.equal(h.document.activeElement, body.querySelectorAll('input')[1]);
  assert.equal(h.document.activeElement.focusOptions.preventScroll, true);
  assert.equal(panel.scrollTop, 320);

  const select = body.querySelector('select');
  select.focus();
  h.inspector.onLayerChange({ shape: 'ellipse' });
  assert.ok(body.querySelector('.ellipse-control'), 'A select change must refresh dependent fields');
  assert.notEqual(body.querySelector('select'), select);
  assert.equal(h.document.activeElement, body.querySelector('select'));
  assert.equal(panel.scrollTop, 320);
  h.dispose();
});
