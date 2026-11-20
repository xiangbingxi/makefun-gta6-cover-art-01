// Vice Cover Studio — the cover painter.
//
// Every pixel here is drawn on a canvas from scratch: gradient sunset
// skies, a slatted sun, building silhouettes and palm trees for panels
// that have no photo yet, plus halftone dots and film grain. Nothing is
// lifted from the game: no logo, no artwork, no font file — the lettering
// is the platform's heavy sans, outlined and filled by hand. All sizes
// are fractions of the canvas, so one state paints both the live preview
// and a full-resolution export at any of the three post sizes.

export const PLUM = '#1c002e'; // deep plum frame, never pure black

// A grade is a sunset palette: four sky stops, a sun colour, the CSS
// filter laid over photos, two translucent tints, and the accent used
// for small highlights.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    stops: ['#ffd166', '#ff7a59', '#e84393', '#7b2fbe'],
    sun: '#ffe9a8',
    photoFilter: 'saturate(1.45) contrast(1.14) brightness(1.03)',
    tintCool: 'rgba(232, 67, 147, 0.20)',
    tintWarm: 'rgba(255, 122, 89, 0.16)',
    accent: '#ffd166',
  },
  neon: {
    label: 'Neon Nights',
    stops: ['#22e6ff', '#7b5cff', '#ff2e88', '#12003a'],
    sun: '#ff5ce1',
    photoFilter: 'saturate(1.6) contrast(1.2) brightness(0.98)',
    tintCool: 'rgba(34, 230, 255, 0.18)',
    tintWarm: 'rgba(255, 46, 136, 0.20)',
    accent: '#22e6ff',
  },
  gold: {
    label: 'Golden Mile',
    stops: ['#fff3b0', '#ffb703', '#fb8500', '#6d28d9'],
    sun: '#fff8d6',
    photoFilter: 'saturate(1.35) contrast(1.1) brightness(1.06)',
    tintCool: 'rgba(251, 133, 0, 0.20)',
    tintWarm: 'rgba(255, 183, 3, 0.18)',
    accent: '#ffb703',
  },
  noir: {
    label: 'Palm Noir',
    stops: ['#9be8d8', '#2a9d8f', '#1d3557', '#0b1026'],
    sun: '#e0fbfc',
    photoFilter: 'saturate(1.15) contrast(1.22) brightness(0.94)',
    tintCool: 'rgba(29, 53, 87, 0.28)',
    tintWarm: 'rgba(155, 232, 216, 0.12)',
    accent: '#9be8d8',
  },
  candy: {
    label: 'Cotton Candy',
    stops: ['#ffe5ec', '#ffb3c6', '#ff8fab', '#c77dff'],
    sun: '#fff0f3',
    photoFilter: 'saturate(1.5) contrast(1.05) brightness(1.08)',
    tintCool: 'rgba(255, 143, 171, 0.20)',
    tintWarm: 'rgba(255, 179, 198, 0.18)',
    accent: '#ff8fab',
  },
};

export const LAYOUTS = {
  grid: { label: 'Vice Grid', panels: 3 },
  four: { label: 'Leonida Four', panels: 4 },
  hero: { label: 'Sunset Hero', panels: 3 },
};

// Panel boxes as [left, top, right, bottom] fractions of the cover.
// Tall covers (square or portrait) get a slightly different split than
// wide ones, so the grid never looks stretched.
function layoutBoxes(layout, wide) {
  if (layout === 'four') {
    return {
      hero: [0.03, 0.03, 0.49, 0.47],
      mid: [0.51, 0.03, 0.97, 0.47],
      low: [0.03, 0.49, 0.49, 0.93],
      far: [0.51, 0.49, 0.97, 0.93],
    };
  }
  if (layout === 'hero') {
    return wide
      ? {
          hero: [0.03, 0.03, 0.97, 0.65],
          mid: [0.03, 0.67, 0.49, 0.93],
          low: [0.51, 0.67, 0.97, 0.93],
        }
      : {
          hero: [0.03, 0.03, 0.97, 0.61],
          mid: [0.03, 0.63, 0.49, 0.93],
          low: [0.51, 0.63, 0.97, 0.93],
        };
  }
  // Vice Grid: a staggered comic-page grid, rows deliberately uneven.
  return wide
    ? {
        hero: [0.03, 0.03, 0.61, 0.63],
        mid: [0.63, 0.03, 0.97, 0.32],
        low: [0.63, 0.34, 0.97, 0.60],
        far: [0.03, 0.65, 0.97, 0.93],
      }
    : {
        hero: [0.03, 0.03, 0.61, 0.58],
        mid: [0.63, 0.03, 0.97, 0.30],
        low: [0.63, 0.32, 0.97, 0.58],
        far: [0.03, 0.60, 0.97, 0.93],
      };
}

export function panelRects(layout, w, h) {
  const wide = h / w <= 0.9;
  const boxes = layoutBoxes(layout, wide);
  const out = {};
  for (const [key, [l, t, r, b]] of Object.entries(boxes)) {
    out[key] = { x: l * w, y: t * h, w: (r - l) * w, h: (b - t) * h };
  }
  return out;
}

// Deterministic pseudo-random stream (mulberry32) so a panel's drawn
// scene is stable between preview and export.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyFill(ctx, grade, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  grade.stops.forEach((c, i) => g.addColorStop(i / (grade.stops.length - 1), c));
  return g;
}

// A synthwave sun, sliced by horizontal gaps that widen toward the base.
export function drawSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(28, 0, 46, 0.55)';
  let y = cy + r * 0.05;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.16;
    gap *= 1.55;
  }
  ctx.restore();
}

function paintSkyline(ctx, x, y, w, h, seed) {
  const rng = seeded(seed);
  ctx.fillStyle = 'rgba(28, 0, 46, 0.85)';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.05 + rng() * 0.09);
    const bh = h * (0.25 + rng() * 0.65);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    if (rng() > 0.6) {
      // An antenna on some towers.
      ctx.fillRect(bx + bw / 2 - 1, y + h - bh - h * 0.22, 2, h * 0.22);
    }
    bx += bw + w * 0.012;
  }
}

function paintPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = 'rgba(28, 0, 46, 0.9)';
  ctx.fillStyle = 'rgba(28, 0, 46, 0.9)';
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.02, -s * 0.95);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + (i / 6) * 0.84);
    const len = s * (0.42 + (i % 3) * 0.06);
    ctx.beginPath();
    ctx.moveTo(s * 0.02, -s * 0.95);
    ctx.quadraticCurveTo(
      s * 0.02 + Math.cos(a) * len * 0.6,
      -s * 0.95 + Math.sin(a) * len * 0.55 - s * 0.12,
      s * 0.02 + Math.cos(a) * len,
      -s * 0.95 + Math.sin(a) * len,
    );
    ctx.stroke();
  }
  ctx.restore();
}

// A panel with no photo becomes a drawn sunset scene — sky, sun,
// skyline, palms — so the cover always looks finished. The seed moves
// the sun around, so two scene panels never twin.
function paintScenePanel(ctx, r, grade, seed) {
  const rng = seeded(seed);
  const sunX = r.x + r.w * (0.34 + rng() * 0.32);
  const sunY = r.y + r.h * (0.38 + rng() * 0.16);
  const sunR = Math.min(r.w, r.h) * (0.22 + rng() * 0.08);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = skyFill(ctx, grade, r.x, r.y, r.w, r.h);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  drawSun(ctx, sunX, sunY, sunR, grade.sun);
  paintSkyline(ctx, r.x, r.y + r.h * 0.62, r.w, r.h * 0.38, seed);
  paintPalm(ctx, r.x + r.w * 0.1, r.y + r.h, Math.min(r.w, r.h) * 0.42, -0.12);
  paintPalm(ctx, r.x + r.w * 0.92, r.y + r.h, Math.min(r.w, r.h) * 0.36, 0.14);
  ctx.restore();
}

function paintPhotoPanel(ctx, r, shot, grade) {
  const img = shot.img;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  // Cover-fit: scale so the photo fills the panel, then place the focus
  // point (fx, fy) at the panel centre.
  const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
  const scale = base * (shot.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const fx = shot.fx ?? 0.5;
  const fy = shot.fy ?? 0.38;
  const dx = r.x + r.w / 2 - fx * pw;
  const dy = r.y + r.h / 2 - fy * ph;
  ctx.filter = grade.photoFilter;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.filter = 'none';
  // Sunset grade laid over the photo: a warm-to-cool diagonal wash.
  const wash = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  wash.addColorStop(0, grade.tintWarm);
  wash.addColorStop(1, grade.tintCool);
  ctx.fillStyle = wash;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // A low sun glow in one corner.
  const glow = ctx.createRadialGradient(
    r.x + r.w * 0.82, r.y + r.h * 0.88, 0,
    r.x + r.w * 0.82, r.y + r.h * 0.88, Math.max(r.w, r.h) * 0.7,
  );
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.20)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

function paintHalftone(ctx, r, seed, strength) {
  const rng = seeded(seed);
  const step = Math.max(7, r.w * 0.016);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = `rgba(28, 0, 46, ${strength})`;
  for (let y = r.y + step / 2; y < r.y + r.h; y += step) {
    for (let x = r.x + step / 2; x < r.x + r.w; x += step) {
      const d = step * (0.18 + rng() * 0.22) * ((y - r.y) / r.h + 0.4);
      ctx.beginPath();
      ctx.arc(x, y, d / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintGrain(ctx, w, h, seed, amount) {
  const rng = seeded(seed);
  ctx.save();
  ctx.globalAlpha = amount;
  const n = Math.floor((w * h) / 9000);
  for (let i = 0; i < n; i++) {
    const v = rng() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.5)`;
    ctx.fillRect(rng() * w, rng() * h, 1.6, 1.6);
  }
  ctx.restore();
}

function shrinkToFit(ctx, text, maxWidth, start, family) {
  let size = start;
  ctx.font = `900 ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

function paintTitle(ctx, state, w, h) {
  const family = 'Arial, Helvetica, sans-serif';
  const words = (state.title || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const cx = w / 2;
  // The title breaks the grid at dead centre: brightest white, plum outline.
  const zoneW = w * 0.94;
  const lineH = h * (state.layout === 'four' ? 0.085 : 0.105);
  const lines = [];
  if (words.length <= 2) lines.push(words.join(' '));
  else {
    const mid = Math.ceil(words.length / 2);
    lines.push(words.slice(0, mid).join(' '));
    lines.push(words.slice(mid).join(' '));
  }
  let size = lineH;
  lines.forEach((ln) => { size = Math.min(size, shrinkToFit(ctx, ln, zoneW, lineH, family)); });
  const totalH = lines.length * size * 0.94;
  let y = h * 0.47 - totalH / 2 + size * 0.78;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  lines.forEach((ln) => {
    ctx.font = `900 ${size}px ${family}`;
    ctx.strokeStyle = PLUM;
    ctx.lineWidth = size * 0.14;
    ctx.strokeText(ln, cx, y);
    const grad = ctx.createLinearGradient(cx, y - size, cx, y);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ffe9a8');
    ctx.fillStyle = grad;
    ctx.fillText(ln, cx, y);
    y += size * 0.94;
  });
  ctx.restore();
  if (state.subtitle) {
    const sub = state.subtitle.trim().toUpperCase();
    const sy = h * 0.47 + totalH / 2 + h * 0.028;
    ctx.save();
    ctx.textAlign = 'center';
    const ss = shrinkToFit(ctx, sub, zoneW * 0.7, h * 0.032, family);
    ctx.font = `800 ${ss}px ${family}`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = PLUM;
    ctx.lineWidth = ss * 0.16;
    ctx.strokeText(sub, cx, sy);
    ctx.fillText(sub, cx, sy);
    ctx.restore();
  }
}

function paintCallout(ctx, c, w, h) {
  if (!c.text) return;
  const family = 'Arial, Helvetica, sans-serif';
  const px = c.ax * w;
  const py = c.ay * h;
  const lx = c.lx * w;
  const ly = c.ly * h;
  const size = Math.max(13, h * 0.021);
  ctx.save();
  ctx.font = `800 ${size}px ${family}`;
  const tw = ctx.measureText(c.text.toUpperCase()).width;
  const padX = size * 0.7;
  const padY = size * 0.55;
  const bx = lx - tw / 2 - padX;
  const by = ly - size / 2 - padY;
  // Leader line from the anchor dot to the label box.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, h * 0.003);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(lx, ly + size * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, Math.max(3, h * 0.005), 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // Dark rounded label with a white rim.
  ctx.fillStyle = 'rgba(28, 0, 46, 0.92)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, h * 0.0025);
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + padX * 2, size + padY * 2, size * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.text.toUpperCase(), lx, ly + size * 0.08);
  ctx.restore();
}

function paintSeal(ctx, state, w, h) {
  if (!state.seal) return;
  const family = 'Arial, Helvetica, sans-serif';
  const cx = w * 0.86;
  const cy = h * 0.84;
  const r = Math.min(w, h) * 0.085;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  // Ring text, one letter at a time around the circle.
  const label = (state.sealText || 'VICE CITY • LEONIDA • EST. 2026 • ').toUpperCase();
  const fs = r * 0.2;
  ctx.font = `800 ${fs}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / label.length;
  for (let i = 0; i < label.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.89);
    ctx.fillText(label[i], 0, 0);
    ctx.restore();
  }
  // Ten-point star in the middle.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r * 0.42 : r * 0.18;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintBilling(ctx, state, w, h) {
  const text = (state.billing || '').trim();
  if (!text) return;
  const family = 'Arial, Helvetica, sans-serif';
  ctx.save();
  ctx.textAlign = 'center';
  const size = Math.max(9, h * 0.0115);
  ctx.font = `700 ${size}px ${family}`;
  const lines = text.split('\n').slice(0, 3);
  const lh = size * 1.5;
  let y = h - h * 0.012 - (lines.length - 1) * lh;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  lines.forEach((ln) => {
    const upper = ln.toUpperCase();
    const tw = ctx.measureText(upper).width;
    if (tw > w * 0.94) {
      ctx.font = `700 ${Math.max(8, size * (w * 0.94) / tw)}px ${family}`;
    }
    ctx.fillText(upper, w / 2, y);
    ctx.font = `700 ${size}px ${family}`;
    y += lh;
  });
  ctx.restore();
}

// The whole cover. `state.photos` maps panel keys to
// { img, zoom, fx, fy } or null; a panel without a photo becomes a
// drawn sunset scene instead.
export function renderCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PLUM;
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const keys = Object.keys(rects);
  keys.forEach((key, i) => {
    const r = rects[key];
    const shot = state.photos ? state.photos[key] : null;
    if (shot && shot.img) paintPhotoPanel(ctx, r, shot, grade);
    else paintScenePanel(ctx, r, grade, 1000 + i * 77);
    if (state.halftone) paintHalftone(ctx, r, 500 + i * 31, 0.1);
    // Thick plum outline per panel, thin gutter between them.
    ctx.strokeStyle = PLUM;
    ctx.lineWidth = Math.max(3, w * 0.012);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
  // Outer frame, thicker than the gutters.
  ctx.strokeStyle = PLUM;
  ctx.lineWidth = Math.max(4, w * 0.022);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  // Vignette pulling the eye toward the centre title.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(28, 0, 46, 0)');
  vig.addColorStop(1, 'rgba(28, 0, 46, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  paintTitle(ctx, state, w, h);
  (state.callouts || []).forEach((c) => paintCallout(ctx, c, w, h));
  paintSeal(ctx, state, w, h);
  paintBilling(ctx, state, w, h);
  if (state.grain) paintGrain(ctx, w, h, 42, 0.05);
  ctx.restore();
}

export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'Leonida • Vice City',
    billing: 'A LEONIDA STORY  •  STARRING YOU  •  SHOT ON THE BOULEVARD',
    seal: true,
    sealText: 'VICE CITY • LEONIDA • EST. 2026 • ',
    halftone: true,
    grain: true,
    photos: { hero: null, mid: null, low: null, far: null },
    callouts: [
      { text: 'Golden hour', ax: 0.2, ay: 0.3, lx: 0.2, ly: 0.12 },
      { text: 'The getaway', ax: 0.8, ay: 0.2, lx: 0.8, ly: 0.1 },
    ],
  };
}

export const EXPORT_SIZES = [
  { id: '1:1', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: '4:5', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: '16:9', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];
