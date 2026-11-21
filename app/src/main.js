// Vice Cover Studio — wires the editor page: the photo slots, layout and
// grade rows, lettering fields, zoom and focus sliders, and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead
// (see ./shots.js).
import { paintCover, PALETTES, LAYOUTS } from './paint.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');

const state = {
  photos: [null, null, null],
  faces: [null, null, null],
  layout: 'grid',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'A Leonida Story',
  calloutA: 'Golden Hour',
  calloutB: 'The Getaway',
  billing: 'A LEONIDA STORY  •  STARRING YOU  •  SHOT ON THE BOULEVARD',
  zoom: 1,
  focusX: 0.5,
  focusY: 0.5,
  size: '1080x1080',
};

const SIZES = {
  '1080x1080': [1080, 1080],
  '1280x720': [1280, 720],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const LAYOUT_NAMES = { grid: 'Vice Grid', four: 'Leonida Four', hero: 'Sunset Hero' };
const GRADE_NAMES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Nights',
  gold: 'Golden Mile',
  noir: 'Palm Noir',
  candy: 'Cotton Candy',
};

function repaint() {
  paintCover(canvas, state);
}

function say(msg) {
  if (statusEl) statusEl.textContent = msg;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

/** Where the browser offers FaceDetector, find the biggest face to frame. */
async function findFace(img) {
  try {
    if (!('FaceDetector' in window)) return null;
    const detector = new FaceDetector({ fastMode: true });
    const found = await detector.detect(img);
    if (!found || !found.length) return null;
    let best = found[0];
    for (const f of found) {
      const a = f.boundingBox.width * f.boundingBox.height;
      const b = best.boundingBox.width * best.boundingBox.height;
      if (a > b) best = f;
    }
    const box = best.boundingBox;
    return {
      x: box.x / img.naturalWidth,
      y: box.y / img.naturalHeight,
      w: box.width / img.naturalWidth,
      h: box.height / img.naturalHeight,
    };
  } catch {
    return null;
  }
}

/** Sets photo slot i from a File, then re-detects the face and repaints. */
async function setPhoto(i, file) {
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  state.photos[i] = img;
  state.faces[i] = await findFace(img);
  repaint();
  say(`Photo ${i + 1} loaded${state.faces[i] ? ' — face found, framed on it' : ''}.`);
}

/** Builds a row of toggle buttons into an element, one per option. */
function buildChoiceRow(el, options, current, onPick) {
  el.innerHTML = '';
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    btn.className = 'choice' + (opt.value === current ? ' active' : '');
    btn.addEventListener('click', () => {
      onPick(opt.value);
      markChoices();
      repaint();
    });
    el.appendChild(btn);
  }
}

/** Makes the layout/grade/size buttons show the state the URL applied. */
function markChoices() {
  const mark = (selector, value) => {
    document.querySelectorAll(selector).forEach((b) => b.classList.toggle('active', b.dataset.value === value));
  };
  mark('#layouts .choice', state.layout);
  mark('#grades .choice', state.grade);
  mark('#sizes .choice', state.size);
}

/** Renders the cover at full size and downloads it as a PNG. */
function exportSize(sizeKey) {
  const dims = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = dims[0];
  off.height = dims[1];
  paintCover(off, state);
  off.toBlob((blob) => {
    if (!blob) {
      say('Export failed — the canvas was empty.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${sizeKey}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    say(`Saved vice-cover-${sizeKey}.png`);
  }, 'image/png');
}

/** Exports every size, one download after another. */
function exportAllSizes() {
  const keys = Object.keys(SIZES);
  let i = 0;
  const step = () => {
    if (i >= keys.length) {
      say(`Saved all ${keys.length} sizes.`);
      return;
    }
    exportSize(keys[i]);
    i += 1;
    setTimeout(step, 350);
  };
  step();
}

// Photo slots.
for (let i = 0; i < 3; i++) {
  const input = document.getElementById(`photo${i + 1}`);
  if (input) input.addEventListener('change', (e) => setPhoto(i, e.target.files[0]));
}

// Text fields: typing repaints live.
function bindTextField(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[key] = el.value;
    repaint();
  });
}
bindTextField('title', 'title');
bindTextField('subtitle', 'subtitle');
bindTextField('calloutA', 'calloutA');
bindTextField('calloutB', 'calloutB');
bindTextField('billing', 'billing');

// Zoom and focus sliders.
function bindSlider(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[key] = Number(el.value);
    repaint();
  });
}
bindSlider('zoom', 'zoom');
bindSlider('focusX', 'focusX');
bindSlider('focusY', 'focusY');

// Layout, grade and size rows.
buildChoiceRow(
  document.getElementById('layouts'),
  LAYOUTS.map((v) => ({ value: v, label: LAYOUT_NAMES[v] })),
  state.layout,
  (v) => { state.layout = v; },
);
buildChoiceRow(
  document.getElementById('grades'),
  Object.keys(PALETTES).map((v) => ({ value: v, label: GRADE_NAMES[v] })),
  state.grade,
  (v) => { state.grade = v; },
);
buildChoiceRow(
  document.getElementById('sizes'),
  Object.keys(SIZES).map((v) => ({ value: v, label: v.replace('x', ' × ') })),
  state.size,
  (v) => { state.size = v; },
);

// Export buttons.
const exportBtn = document.getElementById('export');
if (exportBtn) exportBtn.addEventListener('click', () => exportSize(state.size));
const exportAllBtn = document.getElementById('exportAll');
if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllSizes);

// Screenshot scenes, or the live editor.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (sample, text, slot) => {
    const img = await loadImage(sample);
    const at = slot ?? 0;
    state.photos[at] = img;
    state.faces[at] = await findFace(img);
    state.title = text;
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.value = text;
    markChoices();
    repaint();
  });
} else {
  // A sample photo so the first paint is never blank.
  loadImage('samples/pier.jpg')
    .then(async (img) => {
      state.photos[0] = img;
      state.faces[0] = await findFace(img);
      repaint();
    })
    .catch(() => repaint());
  markChoices();
  repaint();
}
