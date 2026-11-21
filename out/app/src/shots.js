// Fixed scenes for screenshots: ?shot=editor shows the studio with sample photos
// loaded; ?shot=cover shows a cover alone, filling the viewport. Query params:
// photo (sample name), photo2 (second sample), caption, sub, layout, grade, size.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    photos: [query.get('photo') ?? 'pier', query.get('photo2') ?? 'boulevard'],
    caption: query.get('caption') ?? 'Sunset Heist',
    sub: query.get('sub') ?? 'Vice City Nights',
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'wide',
  };
  await setup(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
