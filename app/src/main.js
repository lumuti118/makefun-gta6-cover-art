// Vice Cover Studio — wires the page: upload photos (read locally, never sent
// anywhere), pick a panel layout and colour grade, edit the caption, drag photos
// inside their panels to crop, and export the cover as a PNG in three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelRects, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const tray = document.getElementById('tray');
const panelBox = document.getElementById('panels');

const state = {
  layout: 'hero',
  grade: 'sunset',
  caption: { text: 'Sunset Heist', sub: 'Vice City Nights', size: 1, color: '#ffffff', outline: '#12041c', position: 'bottom' },
  photos: [], // HTMLImageElement list
  photoNames: [],
  panels: [],
};

function freshPanels(layout) {
  const n = (LAYOUTS[layout] || LAYOUTS.hero).length;
  const old = state.panels;
  return Array.from({ length: n }, (_, i) => {
    const prev = old[i];
    return { photo: prev && prev.photo != null && prev.photo < state.photos.length ? prev.photo : null, zoom: prev?.zoom ?? 1, ox: 0, oy: 0 };
  });
}

function autoAssign() {
  // Fill empty panels with the photos in order, so one photo fills every panel
  // and several photos spread across them.
  state.panels.forEach((p, i) => {
    if (p.photo == null && state.photos.length) p.photo = Math.min(i, state.photos.length - 1);
  });
}

function redraw() {
  const dims = SIZES[state.size || 'square'];
  if (document.body.classList.contains('shot-cover')) {
    canvas.width = Math.max(320, window.innerWidth);
    canvas.height = Math.max(320, window.innerHeight);
  } else {
    canvas.width = dims.w;
    canvas.height = dims.h;
  }
  drawCover(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

async function addPhoto(img, name) {
  state.photos.push(img);
  state.photoNames.push(name);
  state.panels = freshPanels(state.layout);
  autoAssign();
  renderTray();
  renderPanels();
  redraw();
}

function renderTray() {
  tray.innerHTML = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = state.photoNames[i];
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = state.photoNames[i];
    b.appendChild(t);
    b.addEventListener('click', () => {
      const sel = state.panels[+panelBox.dataset.selected || 0];
      if (sel) { sel.photo = i; renderPanels(); redraw(); }
    });
    tray.appendChild(b);
  });
  if (!state.photos.length) tray.innerHTML = '<span class="hint">No photos yet — upload one, or try a sample.</span>';
}

function renderPanels() {
  panelBox.innerHTML = '';
  const frames = LAYOUTS[state.layout];
  state.panels.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row';
    row.dataset.index = i;
    const label = document.createElement('span');
    label.textContent = `Panel ${i + 1}`;
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— empty —';
    sel.appendChild(none);
    state.photos.forEach((_, pi) => {
      const o = document.createElement('option');
      o.value = pi;
      o.textContent = state.photoNames[pi];
      sel.appendChild(o);
    });
    sel.value = p.photo == null ? '' : String(p.photo);
    sel.addEventListener('change', () => {
      p.photo = sel.value === '' ? null : Number(sel.value);
      redraw();
    });
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.05';
    zoom.value = p.zoom;
    zoom.setAttribute('aria-label', `Zoom for panel ${i + 1}`);
    zoom.addEventListener('input', () => { p.zoom = Number(zoom.value); redraw(); });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Centre';
    reset.addEventListener('click', () => { p.zoom = 1; p.ox = 0; p.oy = 0; zoom.value = 1; redraw(); });
    row.append(label, sel, zoom, reset);
    row.addEventListener('click', () => {
      panelBox.dataset.selected = i;
      [...panelBox.children].forEach((c) => c.classList.remove('selected'));
      row.classList.add('selected');
    });
    panelBox.appendChild(row);
  });
  panelBox.dataset.selected = panelBox.dataset.selected || '0';
  if (panelBox.children[+panelBox.dataset.selected]) panelBox.children[+panelBox.dataset.selected].classList.add('selected');
}

// --- controls ---------------------------------------------------------------
document.getElementById('photo').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name);
    } catch { status.textContent = `Could not read ${file.name}.`; }
  }
  e.target.value = '';
  status.textContent = state.photos.length ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — drag a photo inside its panel to reposition it.` : '';
});

document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    try {
      const img = await loadImage(`samples/${b.dataset.sample}.jpg`);
      await addPhoto(img, `${b.dataset.sample}.jpg`);
      status.textContent = 'Sample photo loaded.';
    } catch { status.textContent = 'Sample photo failed to load.'; }
  });
});

document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    state.panels = freshPanels(state.layout);
    autoAssign();
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x === b));
    renderPanels();
    redraw();
  });
});

document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});

const captionInput = document.getElementById('caption');
captionInput.addEventListener('input', () => { state.caption.text = captionInput.value; redraw(); });
const subInput = document.getElementById('sub');
subInput.addEventListener('input', () => { state.caption.sub = subInput.value; redraw(); });
document.getElementById('capSize').addEventListener('input', (e) => { state.caption.size = Number(e.target.value); redraw(); });
document.getElementById('capPos').addEventListener('change', (e) => { state.caption.position = e.target.value; redraw(); });
document.querySelectorAll('[data-color]').forEach((b) => {
  b.addEventListener('click', () => {
    state.caption.color = b.dataset.color;
    document.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});

// --- drag to reposition, wheel to zoom --------------------------------------
let drag = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const rects = panelRects(canvas, state.layout);
  const i = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return i === -1 ? null : { index: i, rect: rects[i], x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const p = state.panels[hit.index];
  if (!p || p.photo == null) return;
  drag = { index: hit.index, startX: e.clientX, startY: e.clientY, ox: p.ox, oy: p.oy, rect: hit.rect };
  canvas.setPointerCapture(e.pointerId);
  panelBox.dataset.selected = hit.index;
  [...panelBox.children].forEach((c, i) => c.classList.toggle('selected', i === hit.index));
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = state.panels[drag.index];
  const rect = canvas.getBoundingClientRect();
  p.ox = drag.ox + ((e.clientX - drag.startX) / rect.width) * (canvas.width / drag.rect.w);
  p.oy = drag.oy + ((e.clientY - drag.startY) / rect.height) * (canvas.height / drag.rect.h);
  p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
  p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const p = state.panels[hit.index];
  if (!p || p.photo == null) return;
  e.preventDefault();
  p.zoom = Math.max(1, Math.min(2.5, p.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  renderPanels();
  redraw();
}, { passive: false });

// --- export -----------------------------------------------------------------
async function exportSize(key) {
  const dims = SIZES[key];
  const off = document.createElement('canvas');
  off.width = dims.w;
  off.height = dims.h;
  drawCover(off, state);
  const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-cover-${dims.w}x${dims.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  status.textContent = `Saved vice-cover-${dims.w}x${dims.h}.png (${dims.w} × ${dims.h}).`;
  return blob;
}
document.querySelectorAll('[data-export]').forEach((b) => {
  b.addEventListener('click', () => exportSize(b.dataset.export));
});

// --- shots / boot -----------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  state.size = query.get('size') || 'wide';
  runShot(shot, query, async (scene) => {
    state.layout = scene.layout;
    state.grade = scene.grade;
    state.caption.text = scene.caption;
    state.caption.sub = scene.sub;
    captionInput.value = scene.caption;
    subInput.value = scene.sub;
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x.dataset.layout === scene.layout));
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x.dataset.grade === scene.grade));
    for (const name of scene.photos) {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(`${name}.jpg`);
    }
    state.panels = freshPanels(state.layout);
    autoAssign();
    renderTray();
    renderPanels();
    redraw();
  });
} else {
  state.size = 'square';
  state.panels = freshPanels(state.layout);
  renderTray();
  renderPanels();
  redraw();
}
