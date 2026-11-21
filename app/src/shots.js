// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, full-bleed. The query
// picks the sample (`photo`, and `photo2` for the second panel), the title
// (`caption`), the cover style (`layout`, `grade`) and the export size
// (`size`, one of 1080x1080, 1280x720, 1080x1350, 1920x1080 — the canvas
// is resized to it before painting). window.__shotReady is set once the
// scene has painted.
const SHOT_SIZES = {
  '1080x1080': [1080, 1080],
  '1280x720': [1280, 720],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout');
  const grade = query.get('grade');
  const sizeKey = query.get('size');

  // Resize the canvas for a non-square cover before anything paints.
  const canvas = document.getElementById('cover');
  if (sizeKey && SHOT_SIZES[sizeKey] && canvas) {
    canvas.width = SHOT_SIZES[sizeKey][0];
    canvas.height = SHOT_SIZES[sizeKey][1];
  }

  if (layout) {
    const btn = document.querySelector(`#layouts .choice[data-value="${layout}"]`);
    if (btn) btn.click();
  }
  if (grade) {
    const btn = document.querySelector(`#grades .choice[data-value="${grade}"]`);
    if (btn) btn.click();
  }
  if (sizeKey) {
    const btn = document.querySelector(`#sizes .choice[data-value="${sizeKey}"]`);
    if (btn) btn.click();
  }

  await load(`samples/${photo}.jpg`, caption, 0);

  const second = query.get('photo2');
  if (second) await load(`samples/${second}.jpg`, caption, 1);

  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
