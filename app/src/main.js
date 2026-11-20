// Vice Cover Studio — editor wiring.
//
// Connects the controls in index.html to the renderer: photo uploads,
// per-panel crops with face-aware centring, layout / grade / lettering
// controls, and PNG export in three post sizes.
import { renderCover, defaultState, GRADES, LAYOUTS, EXPORT_SIZES } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();
let currentSize = EXPORT_SIZES[0];
let activePanel = 'hero';
let autoFace = true;

const $ = (id) => document.getElementById(id);

function imageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

function previewDims() {
  const scale = 880 / currentSize.w;
  return { w: Math.round(currentSize.w * scale), h: Math.round(currentSize.h * scale) };
}

function repaint() {
  const p = previewDims();
  canvas.width = p.w;
  canvas.height = p.h;
  renderCover(canvas.getContext('2d'), p.w, p.h, state);
}

// Face-aware crop: Chrome's built-in FaceDetector when present, otherwise
// the upper-third focus the renderer already defaults to.
async function findFace(img) {
  if (!('FaceDetector' in window)) return null;
  try {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(img);
    if (!faces.length) return null;
    const box = faces[0].boundingBox;
    return {
      fx: (box.x + box.width / 2) / img.naturalWidth,
      fy: (box.y + box.height * 0.42) / img.naturalHeight,
    };
  } catch {
    return null;
  }
}

async function placePhoto(key, img, sourceName) {
  const shot = { img, zoom: 1.15, fx: 0.5, fy: 0.38, face: null };
  state.photos[key] = shot;
  if (autoFace) {
    const face = await findFace(img);
    if (face) {
      shot.face = face;
      shot.fx = face.fx;
      shot.fy = face.fy;
      shot.zoom = 1.45;
    }
  }
  syncCropUI();
  repaint();
  statusEl.textContent = `${key} photo set${sourceName ? ` — ${sourceName}` : ''}${shot.face ? ' (face found, centred)' : ''}.`;
}

function shotFor(key) {
  return state.photos[key];
}

function syncCropUI() {
  const shot = shotFor(activePanel);
  $('zoom').value = shot ? shot.zoom : 1;
  $('zoomVal').textContent = shot ? `${shot.zoom.toFixed(2)}×` : '—';
  $('focusX').value = shot ? Math.round(shot.fx * 100) : 50;
  $('focusY').value = shot ? Math.round(shot.fy * 100) : 38;
  $('focusVal').textContent = shot ? `${Math.round(shot.fx * 100)}, ${Math.round(shot.fy * 100)}` : '—';
  const names = { hero: 'Hero', mid: 'Panel 2', low: 'Panel 3', far: 'Panel 4' };
  document.querySelectorAll('[data-panel-tab]').forEach((b) => {
    b.classList.toggle('on', b.dataset.panelTab === activePanel);
    b.textContent = `${names[b.dataset.panelTab]}${shotFor(b.dataset.panelTab) ? ' ✓' : ''}`;
  });
}

function readCropUI() {
  const shot = shotFor(activePanel);
  if (!shot) return;
  shot.zoom = Number($('zoom').value);
  shot.fx = Number($('focusX').value) / 100;
  shot.fy = Number($('focusY').value) / 100;
  syncCropUI();
  repaint();
}

function savePNG(target) {
  const off = document.createElement('canvas');
  off.width = target.w;
  off.height = target.h;
  renderCover(off.getContext('2d'), target.w, target.h, state);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${target.w}x${target.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved vice-cover-${target.w}x${target.h}.png (${target.w} × ${target.h}).`;
  }, 'image/png');
}

// ---- photo uploads ----
['hero', 'mid', 'low', 'far'].forEach((key) => {
  const input = $(`photo-${key}`);
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await imageFromUrl(URL.createObjectURL(file));
      await placePhoto(key, img, file.name);
    } catch {
      statusEl.textContent = 'That file could not be read as a photo.';
    }
  });
});

$('use-one').addEventListener('change', (e) => {
  const hero = state.photos.hero;
  if (e.target.checked && hero) {
    ['mid', 'low', 'far'].forEach((k) => { state.photos[k] = { ...hero }; });
    statusEl.textContent = 'One photo now fills every panel — uncheck to give panels their own photos.';
  }
  repaint();
});

document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    try {
      const img = await imageFromUrl(`samples/${b.dataset.sample}.jpg`);
      await placePhoto('hero', img, `${b.dataset.sample}.jpg (sample)`);
      if ($('use-one').checked) {
        ['mid', 'low', 'far'].forEach((k) => { state.photos[k] = { ...state.photos.hero }; });
      }
      repaint();
    } catch {
      statusEl.textContent = 'Sample photo failed to load.';
    }
  });
});

// ---- crop controls ----
document.querySelectorAll('[data-panel-tab]').forEach((b) => {
  b.addEventListener('click', () => {
    activePanel = b.dataset.panelTab;
    syncCropUI();
  });
});
['zoom', 'focusX', 'focusY'].forEach((id) => $(id).addEventListener('input', readCropUI));
$('face-btn').addEventListener('click', async () => {
  const shot = shotFor(activePanel);
  if (!shot) {
    statusEl.textContent = 'Load a photo into this panel first.';
    return;
  }
  statusEl.textContent = 'Looking for a face…';
  const face = await findFace(shot.img);
  if (face) {
    shot.face = face;
    shot.fx = face.fx;
    shot.fy = face.fy;
    shot.zoom = Math.max(shot.zoom, 1.45);
    syncCropUI();
    repaint();
    statusEl.textContent = 'Face found — crop centred on it.';
  } else {
    statusEl.textContent = 'No face detected in this browser — use the focus sliders to frame it by hand.';
  }
});
$('auto-face').addEventListener('change', (e) => { autoFace = e.target.checked; });

// ---- layout + grade chips ----
const layoutBox = $('layouts');
Object.entries(LAYOUTS).forEach(([key, def]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = def.label;
  b.addEventListener('click', () => {
    state.layout = key;
    layoutBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    b.classList.add('on');
    repaint();
  });
  if (key === state.layout) b.classList.add('on');
  layoutBox.appendChild(b);
});

const gradeBox = $('grades');
Object.entries(GRADES).forEach(([key, def]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip grade-chip';
  b.style.setProperty('--sw', `linear-gradient(135deg, ${def.stops[0]}, ${def.stops[2]}, ${def.stops[3]})`);
  b.textContent = def.label;
  b.addEventListener('click', () => {
    state.grade = key;
    gradeBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    b.classList.add('on');
    repaint();
  });
  if (key === state.grade) b.classList.add('on');
  gradeBox.appendChild(b);
});

// ---- lettering ----
$('title').addEventListener('input', (e) => { state.title = e.target.value; repaint(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; repaint(); });
$('billing').addEventListener('input', (e) => { state.billing = e.target.value; repaint(); });
$('callout1').addEventListener('input', (e) => { state.callouts[0].text = e.target.value; repaint(); });
$('callout2').addEventListener('input', (e) => { state.callouts[1].text = e.target.value; repaint(); });
$('seal-toggle').addEventListener('change', (e) => { state.seal = e.target.checked; repaint(); });
$('seal-text').addEventListener('input', (e) => { state.sealText = e.target.value; repaint(); });
$('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; repaint(); });
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; repaint(); });

// ---- export ----
const sizeSel = $('size');
EXPORT_SIZES.forEach((s) => {
  const o = document.createElement('option');
  o.value = s.id;
  o.textContent = s.label;
  sizeSel.appendChild(o);
});
sizeSel.addEventListener('change', () => {
  currentSize = EXPORT_SIZES.find((s) => s.id === sizeSel.value) || EXPORT_SIZES[0];
  repaint();
});
$('export').addEventListener('click', () => savePNG(currentSize));
$('export-all').addEventListener('click', () => {
  EXPORT_SIZES.forEach((s, i) => setTimeout(() => savePNG(s), i * 350));
  statusEl.textContent = 'Exporting all three sizes…';
});

// Screenshot scenes (?shot=cover / ?shot=editor) and test hooks.
window.__vice = { state, redraw: repaint, setPhoto: placePhoto, loadImage: imageFromUrl, exportPNG: savePNG, get size() { return currentSize; } };
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, { loadImage: imageFromUrl, setPhoto: placePhoto, redraw: repaint, sizeSel });
} else {
  syncCropUI();
  repaint();
}
