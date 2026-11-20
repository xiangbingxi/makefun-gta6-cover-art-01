// Fixed scenes for screenshots: ?shot=cover shows the exported cover
// alone (full-bleed), ?shot=editor shows the editor with a sample photo
// loaded. Query params: photo, photo2, caption, layout, grade, size.
// window.__shotReady is set once the scene has painted.
import { EXPORT_SIZES } from './render.js';

export async function runShot(shot, query, state, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout');
  const grade = query.get('grade');
  const sizeId = query.get('size');
  if (layout) state.layout = layout;
  if (grade) state.grade = grade;
  if (sizeId) {
    const s = EXPORT_SIZES.find((x) => x.id === sizeId);
    if (s && api.sizeSel) {
      api.sizeSel.value = s.id;
      api.sizeSel.dispatchEvent(new Event('change'));
    }
  }
  state.title = caption;
  const img = await api.loadImage(`samples/${photo}.jpg`);
  await api.setPhoto('hero', img, `${photo}.jpg (sample)`);
  const second = query.get('photo2');
  if (second) {
    const img2 = await api.loadImage(`samples/${second}.jpg`);
    await api.setPhoto('mid', img2, `${second}.jpg (sample)`);
  }
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = caption;
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
