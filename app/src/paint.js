// Vice Cover Studio — the cover painter.
//
// Paints a GTA VI-style multi-panel cover onto a canvas: the user's photos
// spread across panels (or one photo filling them all), a procedurally
// drawn neon-sunset scene wherever a panel has no photo, a colour grade,
// halftone print dots, film grain, and the genre lettering (stacked title,
// script subtitle, callouts, seal, billing block). Everything is drawn
// with the 2D canvas API. No image besides the user's own photos is ever
// fetched, and nothing here touches the network.

export const PALETTES = {
  sunset: { sky: ['#2b0a4a', '#7a1e6e', '#e8435f', '#ff9a3d'], sun: '#ffe9a8', wash: 'rgba(255, 90, 60, 0.16)' },
  neon: { sky: ['#0b0630', '#3b0f6e', '#c2189b', '#ff2e88'], sun: '#7df9ff', wash: 'rgba(255, 46, 136, 0.20)' },
  gold: { sky: ['#3a1c00', '#8a4a00', '#e07b00', '#ffc233'], sun: '#fff3c4', wash: 'rgba(255, 170, 40, 0.18)' },
  noir: { sky: ['#050510', '#141428', '#2c2c4a', '#56568a'], sun: '#dfe6ff', wash: 'rgba(80, 90, 200, 0.22)' },
  candy: { sky: ['#3d0a3d', '#8a1e6b', '#ff5e8a', '#ffb3d1'], sun: '#fff0f5', wash: 'rgba(255, 94, 138, 0.16)' },
};

export const LAYOUTS = ['grid', 'four', 'hero'];

/** A small seeded random, so a scene looks the same on every redraw. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampNum(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Draws an image so it covers a rect, honouring zoom and a focus point
 * (0..1 along each axis). The image is clipped to the rect.
 */
function drawPhotoCover(ctx, img, x, y, w, h, zoom, fx, fy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * (zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = clampNum(fx ?? 0.5, 0, 1);
  const cy = clampNum(fy ?? 0.5, 0, 1);
  const dx = x + w / 2 - pw * cx;
  const dy = y + h / 2 - ph * cy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/**
 * A hand-drawn neon-sunset scene: striped retrowave sun, a dark skyline
 * with lit windows, a water reflection, palm silhouettes and birds.
 */
function paintSunsetScene(ctx, x, y, w, h, paletteKey, seed) {
  const rnd = seededRandom(seed);
  const pal = PALETTES[paletteKey] || PALETTES.sunset;

  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  pal.sky.forEach((colour, i) => sky.addColorStop(i / (pal.sky.length - 1), colour));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  // Striped sun, sitting high enough that its stripes clear the skyline.
  const sunR = Math.min(w, h) * 0.32;
  const sunX = x + w * (0.30 + rnd() * 0.40);
  const sunY = y + h * 0.40;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, pal.sun);
  sunGrad.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = pal.sky[0];
  let stripeY = sunY + sunR * 0.04;
  let stripeH = sunR * 0.05;
  while (stripeY < sunY + sunR) {
    ctx.fillRect(sunX - sunR, stripeY, sunR * 2, stripeH);
    stripeY += stripeH * 2.4;
    stripeH *= 1.5;
  }
  ctx.restore();

  // Skyline: dark towers, some windows lit warm.
  const ground = y + h * 0.78;
  ctx.fillStyle = '#12041f';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.06 + rnd() * 0.10);
    const bh = h * (0.18 + rnd() * 0.34);
    ctx.fillRect(bx, ground - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    const rows = Math.floor(bh / (h * 0.055));
    for (let floor = 0; floor < rows; floor++) {
      for (let col = 0; col < 3; col++) {
        if (rnd() < 0.45) {
          ctx.fillRect(bx + bw * (0.18 + col * 0.28), ground - bh + floor * h * 0.055, bw * 0.12, h * 0.022);
        }
      }
    }
    ctx.fillStyle = '#12041f';
    bx += bw + w * 0.012;
  }
  ctx.fillRect(x, ground, w, y + h - ground);

  // Warm reflection on the water below the skyline.
  const water = ctx.createLinearGradient(0, ground, 0, y + h);
  water.addColorStop(0, 'rgba(255, 122, 61, 0.28)');
  water.addColorStop(1, 'rgba(18, 4, 31, 0)');
  ctx.fillStyle = water;
  ctx.fillRect(x, ground, w, y + h - ground);
  ctx.strokeStyle = 'rgba(255, 233, 168, 0.35)';
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (let i = 0; i < 5; i++) {
    const ry = ground + (y + h - ground) * (0.2 + i * 0.18);
    const rw = w * (0.10 + rnd() * 0.22);
    ctx.beginPath();
    ctx.moveTo(sunX - rw / 2, ry);
    ctx.lineTo(sunX + rw / 2, ry);
    ctx.stroke();
  }

  // Palm silhouettes at the two edges.
  ctx.strokeStyle = '#0a0212';
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.lineCap = 'round';
  for (const px of [x + w * 0.06, x + w * 0.94]) {
    const lean = px < x + w / 2 ? 1 : -1;
    const top = y + h * (0.55 + rnd() * 0.08);
    ctx.beginPath();
    ctx.moveTo(px, ground);
    ctx.quadraticCurveTo(px + lean * w * 0.02, (ground + top) / 2, px, top);
    ctx.stroke();
    for (let f = 0; f < 6; f++) {
      const a = Math.PI * (0.15 + f * 0.14);
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.quadraticCurveTo(
        px + lean * Math.cos(a) * w * 0.09, top - Math.sin(a) * h * 0.07,
        px + lean * Math.cos(a) * w * 0.13, top - Math.sin(a) * h * 0.02,
      );
      ctx.stroke();
    }
  }

  // Birds, small dark chevrons high in the sky.
  ctx.strokeStyle = 'rgba(10, 2, 18, 0.8)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  for (let i = 0; i < 4; i++) {
    const birdX = x + w * (0.15 + rnd() * 0.7);
    const birdY = y + h * (0.12 + rnd() * 0.22);
    const s = w * 0.02;
    ctx.beginPath();
    ctx.moveTo(birdX - s, birdY);
    ctx.quadraticCurveTo(birdX - s / 2, birdY - s * 0.7, birdX, birdY);
    ctx.quadraticCurveTo(birdX + s / 2, birdY - s * 0.7, birdX + s, birdY);
    ctx.stroke();
  }
}

/** The colour grade: one warm wash over the whole cover. */
function applyWash(ctx, w, h, paletteKey) {
  const pal = PALETTES[paletteKey] || PALETTES.sunset;
  ctx.fillStyle = pal.wash;
  ctx.fillRect(0, 0, w, h);
}

/** Halftone print dots, growing denser toward the foot of the cover. */
function printHalftone(ctx, w, h) {
  ctx.fillStyle = 'rgba(10, 2, 18, 0.10)';
  const step = Math.max(9, w * 0.011);
  for (let yy = h * 0.55; yy < h; yy += step) {
    const t = (yy - h * 0.55) / (h * 0.45);
    const r = step * 0.16 * (0.5 + t);
    const offset = (Math.floor(yy / step) % 2 === 0) ? 0 : step / 2;
    for (let xx = offset; xx < w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Film grain: a scatter of faint light and dark specks. */
function sprinkleGrain(ctx, w, h, seed) {
  const rnd = seededRandom(seed + 77);
  const n = Math.floor((w * h) / 9000);
  for (let i = 0; i < n; i++) {
    const light = rnd() < 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
}

/**
 * Panel rectangles for a layout, in canvas pixels.
 * Each panel names the photo slot it shows (0, 1 or 2), or -1 for a
 * drawn sunset scene.
 */
function panelsFor(w, h, layout) {
  const gap = Math.round(w * 0.012);
  if (layout === 'four') {
    const cw = (w - gap) / 2;
    const ch = (h - gap) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch, photo: 0 },
      { x: cw + gap, y: 0, w: cw, h: ch, photo: 1 },
      { x: 0, y: ch + gap, w: cw, h: ch, photo: 2 },
      { x: cw + gap, y: ch + gap, w: cw, h: ch, photo: -1 },
    ];
  }
  if (layout === 'hero') {
    const strip = Math.round(h * 0.26);
    const cell = (w - gap * 2) / 3;
    return [
      { x: 0, y: 0, w, h: h - strip - gap, photo: 0 },
      { x: 0, y: h - strip, w: cell, h: strip, photo: 1 },
      { x: cell + gap, y: h - strip, w: cell, h: strip, photo: 2 },
      { x: 2 * (cell + gap), y: h - strip, w: cell, h: strip, photo: -1 },
    ];
  }
  // Vice Grid: a big hero top-left, two stacked panels top-right, and a
  // full-width strip along the foot.
  const topH = Math.round(h * 0.62);
  const rightW = Math.round(w * 0.36);
  const leftW = w - rightW - gap;
  const halfTop = Math.round(topH / 2);
  const halfGap = Math.round(gap / 2);
  const stripH = h - topH - gap;
  return [
    { x: 0, y: 0, w: leftW, h: topH, photo: 0 },
    { x: leftW + gap, y: 0, w: rightW, h: halfTop - halfGap, photo: 1 },
    { x: leftW + gap, y: halfTop + halfGap, w: rightW, h: topH - halfTop - halfGap, photo: 2 },
    { x: 0, y: topH + gap, w, h: stripH, photo: -1 },
  ];
}

/** Shrink a font until the text fits a width; returns the size used. */
function fitText(ctx, text, maxW, startPx, family, weight) {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * The genre lettering: a stacked title that breaks across the panel
 * borders, a script subtitle, two callouts with leader lines, a round
 * seal stamp, and the billing block along the foot.
 */
function paintLettering(ctx, w, h, s) {
  const dark = '#14041f';
  const cream = '#fff6d8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Stacked title, one word a line, each nudged sideways in turn.
  const words = (s.title || 'VICE CITY').trim().toUpperCase().split(/\s+/).filter(Boolean);
  const titleSize = fitText(ctx, words.join(' '), w * 0.94, h * 0.115, 'Arial, sans-serif', '900');
  ctx.font = `900 ${titleSize}px Arial, sans-serif`;
  const lineH = titleSize * 0.98;
  const blockH = lineH * words.length;

  // A soft dark scrim behind the title so it reads over any photo.
  const scrimTop = h * 0.56 - blockH / 2 - titleSize * 0.28;
  const scrimH = blockH + titleSize * 0.5;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, scrimTop + scrimH);
  scrim.addColorStop(0, 'rgba(20, 4, 31, 0)');
  scrim.addColorStop(0.25, 'rgba(20, 4, 31, 0.42)');
  scrim.addColorStop(0.75, 'rgba(20, 4, 31, 0.42)');
  scrim.addColorStop(1, 'rgba(20, 4, 31, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, w, scrimH);

  let ty = h * 0.56 - blockH / 2 + titleSize * 0.8;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = titleSize * 0.14;
  ctx.shadowOffsetY = titleSize * 0.03;
  words.forEach((word, i) => {
    const tw = ctx.measureText(word).width;
    const tx = (w - tw) / 2 + (i % 2 === 0 ? -w * 0.015 : w * 0.02);
    // Cream fill with a dark outline: the loading-screen look.
    ctx.lineWidth = Math.max(2, titleSize * 0.06);
    ctx.strokeStyle = dark;
    ctx.strokeText(word, tx, ty);
    ctx.fillStyle = cream;
    ctx.fillText(word, tx, ty);
    ty += lineH;
  });
  ctx.restore();

  // Script subtitle under the title.
  const sub = (s.subtitle || 'A Leonida Story').trim();
  if (sub) {
    const subSize = fitText(ctx, sub, w * 0.6, h * 0.042, 'Georgia, serif', 'italic 700');
    ctx.font = `italic 700 ${subSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd9a0';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = subSize * 0.2;
    ctx.fillText(sub, w / 2, h * 0.56 + blockH / 2 + subSize * 1.1);
    ctx.shadowBlur = 0;
  }

  // Two callouts in pills, with leader lines down to a pointed spot.
  ctx.textAlign = 'left';
  const callouts = [
    { text: s.calloutA || 'GOLDEN HOUR', x: w * 0.07, y: h * 0.10, px: w * 0.16, py: h * 0.30 },
    { text: s.calloutB || 'THE GETAWAY', x: w * 0.66, y: h * 0.08, px: w * 0.78, py: h * 0.26 },
  ];
  for (const c of callouts) {
    if (!c.text.trim()) continue;
    const cs = fitText(ctx, c.text, w * 0.3, h * 0.030, 'Arial, sans-serif', '800');
    ctx.font = `800 ${cs}px Arial, sans-serif`;
    const tw = ctx.measureText(c.text).width;
    const pad = cs * 0.55;
    const bx = c.x;
    const by = c.y;
    const bw = tw + pad * 2;
    const bh = cs * 1.9;
    ctx.fillStyle = 'rgba(20, 4, 31, 0.88)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = cream;
    ctx.lineWidth = Math.max(1.5, h * 0.002);
    ctx.stroke();
    ctx.fillStyle = cream;
    ctx.fillText(c.text, bx + pad, by + bh / 2 + cs * 0.36);
    ctx.strokeStyle = 'rgba(255, 246, 216, 0.9)';
    ctx.beginPath();
    ctx.moveTo(bx + bw / 2, by + bh);
    ctx.lineTo(c.px, c.py);
    ctx.stroke();
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.arc(c.px, c.py, Math.max(3, h * 0.005), 0, Math.PI * 2);
    ctx.fill();
  }

  // Round seal stamp, bottom-right, clear of the callouts.
  const sealR = h * 0.075;
  const sealX = w - sealR - w * 0.045;
  const sealY = h - sealR - h * 0.10;
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.rotate(-0.12);
  ctx.strokeStyle = 'rgba(255, 246, 216, 0.95)';
  ctx.lineWidth = Math.max(2, h * 0.003);
  ctx.beginPath();
  ctx.arc(0, 0, sealR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, sealR * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = cream;
  ctx.textAlign = 'center';
  ctx.font = `800 ${sealR * 0.24}px Arial, sans-serif`;
  ctx.fillText('VICE CITY', 0, -sealR * 0.18);
  ctx.fillText('LEONIDA', 0, sealR * 0.12);
  // A five-point star in the middle of the seal.
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = Math.cos(a) * sealR * 0.30;
    const py = Math.sin(a) * sealR * 0.30 + sealR * 0.42;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 ${sealR * 0.17}px Arial, sans-serif`;
  ctx.fillText('EST 2026', 0, sealR * 0.68);
  ctx.restore();

  // Billing block along the foot.
  const bill = (s.billing || 'A LEONIDA STORY  •  STARRING YOU  •  SHOT ON THE BOULEVARD').trim();
  if (bill) {
    const bs = fitText(ctx, bill, w * 0.9, h * 0.020, 'Arial, sans-serif', '600');
    ctx.font = `600 ${bs}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 246, 216, 0.9)';
    ctx.fillText(bill, w / 2, h - h * 0.018);
  }
}

/**
 * Paints the whole cover onto `canvas` from `state`.
 * state: { photos: [img|null, img|null, img|null],
 *   faces: [{x, y, w, h}|null, ...], layout, grade, title, subtitle,
 *   calloutA, calloutB, billing, zoom, focusX, focusY }
 */
export function paintCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#14041f';
  ctx.fillRect(0, 0, w, h);

  const panels = panelsFor(w, h, state.layout || 'grid');
  panels.forEach((p, i) => {
    const photo = p.photo >= 0 ? state.photos[p.photo] : null;
    if (photo) {
      // Face-aware focus: centre the panel on the detected face when one
      // was found, else on the focus sliders.
      const face = p.photo >= 0 ? state.faces?.[p.photo] : null;
      let fx = state.focusX ?? 0.5;
      let fy = state.focusY ?? 0.5;
      if (face) {
        fx = face.x + face.w / 2;
        fy = face.y + face.h / 2;
      }
      drawPhotoCover(ctx, photo, p.x, p.y, p.w, p.h, state.zoom || 1, fx, fy);
      // A thin dark frame so the panels read as separate shots.
      ctx.strokeStyle = 'rgba(20, 4, 31, 0.9)';
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else {
      paintSunsetScene(ctx, p.x, p.y, p.w, p.h, state.grade || 'sunset', 1000 + i * 137);
    }
  });

  applyWash(ctx, w, h, state.grade || 'sunset');
  printHalftone(ctx, w, h);
  sprinkleGrain(ctx, w, h, 42);
  paintLettering(ctx, w, h, state);
}
