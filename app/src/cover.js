// Vice Cover Studio — the cover renderer. Draws a multi-panel GTA-style poster
// (own design only: no Rockstar logos, artwork, characters or fonts) onto any
// 2D canvas at any size, from plain state: layout, grade, caption and panels.
//
// A panel is { photo: index into state.photos (or null), zoom, ox, oy } where
// ox/oy pan the photo inside its frame as a fraction of the frame size.
// Grades are pure canvas gradients and silhouettes drawn on top of the photos.

export const LAYOUTS = {
  hero: [
    { x: 0, y: 0, w: 1, h: 0.62 },
    { x: 0, y: 0.62, w: 0.5, h: 0.38 },
    { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
  ],
  trio: [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ],
  quad: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  full: [{ x: 0, y: 0, w: 1, h: 1 }],
};

export const GRADES = ['sunset', 'neon', 'noir', 'palms'];
export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

const GUTTER = 0.008; // white gutter between panels, as a fraction of width

function rectOf(f, w, h) {
  return { x: f.x * w, y: f.y * h, w: f.w * w, h: f.h * h };
}

function drawPhotoCover(ctx, img, r, panel) {
  const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = r.x + r.w / 2 + (panel.ox || 0) * r.w;
  const cy = r.y + r.h / 2 + (panel.oy || 0) * r.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

function drawPalm(ctx, x, y, s, flip) {
  // Simple palm silhouette: curved trunk + drooping fronds, near-black.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.fillStyle = 'rgba(20, 6, 24, 0.92)';
  ctx.strokeStyle = 'rgba(20, 6, 24, 0.92)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -70, 34, -118);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    const a = (-150 + i * 48) * (Math.PI / 180);
    const tx = 34 + Math.cos(a) * 62;
    const ty = -118 + Math.sin(a) * 46 + 26;
    ctx.beginPath();
    ctx.moveTo(34, -118);
    ctx.quadraticCurveTo(34 + Math.cos(a) * 40, -118 + Math.sin(a) * 18, tx, ty);
    ctx.stroke();
  }
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  if (grade === 'noir') {
    ctx.fillStyle = 'rgba(10, 10, 18, 0.42)';
    ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (grade === 'neon') {
    const m = ctx.createRadialGradient(w * 0.15, h * 0.1, 0, w * 0.15, h * 0.1, w * 0.7);
    m.addColorStop(0, 'rgba(255, 0, 150, 0.38)');
    m.addColorStop(1, 'rgba(255, 0, 150, 0)');
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, w, h);
    const c = ctx.createRadialGradient(w * 0.9, h * 0.95, 0, w * 0.9, h * 0.95, w * 0.7);
    c.addColorStop(0, 'rgba(0, 229, 255, 0.34)');
    c.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  // sunset and palms share the warm Vice City grade; palms adds a sun + trees.
  const warm = ctx.createLinearGradient(0, h * 0.25, 0, h);
  warm.addColorStop(0, 'rgba(255, 176, 66, 0.10)');
  warm.addColorStop(0.55, 'rgba(255, 94, 98, 0.16)');
  warm.addColorStop(1, 'rgba(190, 30, 120, 0.42)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);
  if (grade === 'palms') {
    const sunR = Math.min(w, h) * 0.16;
    const sx = w * 0.78;
    const sy = h * 0.26;
    const glow = ctx.createRadialGradient(sx, sy, sunR * 0.2, sx, sy, sunR * 2.4);
    glow.addColorStop(0, 'rgba(255, 214, 90, 0.85)');
    glow.addColorStop(0.4, 'rgba(255, 120, 60, 0.35)');
    glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - sunR * 2.4, sy - sunR * 2.4, sunR * 4.8, sunR * 4.8);
    const sun = ctx.createLinearGradient(0, sy - sunR, 0, sy + sunR);
    sun.addColorStop(0, '#ffe98a');
    sun.addColorStop(1, '#ff7a3c');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sx, sy, sunR, 0, Math.PI * 2);
    ctx.fill();
    const ps = Math.min(w, h) / 900;
    drawPalm(ctx, w * 0.06, h * 0.99, ps * 1.15, false);
    drawPalm(ctx, w * 0.97, h * 0.99, ps * 0.95, true);
  }
}

function drawCaption(ctx, w, h, caption) {
  const text = (caption.text || '').trim().toUpperCase();
  const sub = (caption.sub || '').trim();
  if (!text && !sub) return;
  const pos = caption.position || 'bottom';
  const baseY = pos === 'top' ? h * 0.06 : h * 0.9;
  // Scrim so lettering reads over any photo.
  const scrimH = h * (sub ? 0.22 : 0.17);
  const scrimY = pos === 'top' ? 0 : h - scrimH;
  const scrim = ctx.createLinearGradient(0, scrimY, 0, scrimY + scrimH);
  if (pos === 'top') {
    scrim.addColorStop(0, 'rgba(10, 4, 18, 0.72)');
    scrim.addColorStop(1, 'rgba(10, 4, 18, 0)');
  } else {
    scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 18, 0.78)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimY, w, scrimH);

  ctx.save();
  ctx.translate(w / 2, baseY);
  ctx.rotate(-0.035); // slight poster tilt
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    let size = h * 0.11 * (caption.size || 1);
    ctx.font = `900 ${size}px 'Arial Black', Arial, sans-serif`;
    while (ctx.measureText(text).width > w * 0.92 && size > 14) {
      size -= 3;
      ctx.font = `900 ${size}px 'Arial Black', Arial, sans-serif`;
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = caption.outline || '#12041c';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = caption.color || '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (sub) {
    const subSize = Math.max(h * 0.032, 16);
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.lineWidth = subSize * 0.14;
    ctx.strokeStyle = 'rgba(18,4,28,0.9)';
    const sy = text ? h * 0.075 : 0;
    ctx.strokeText(sub.toUpperCase(), 0, sy);
    ctx.fillText(sub.toUpperCase(), 0, sy);
  }
  ctx.restore();
}

/** Draws the whole cover onto `canvas` at its own pixel size, from `state`. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1c0b26';
  ctx.fillRect(0, 0, w, h);

  const frames = LAYOUTS[state.layout] || LAYOUTS.hero;
  const gap = Math.max(3, w * GUTTER);
  frames.forEach((f, i) => {
    const r = rectOf(f, w, h);
    const panel = (state.panels && state.panels[i]) || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const img = panel.photo != null ? state.photos[panel.photo] : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x + gap / 2, r.y + gap / 2, r.w - gap, r.h - gap);
    ctx.clip();
    if (img && img.complete && img.naturalWidth) {
      drawPhotoCover(ctx, img, { x: r.x + gap / 2, y: r.y + gap / 2, w: r.w - gap, h: r.h - gap }, panel);
    } else {
      // Empty panel: warm placeholder gradient so the poster never looks broken.
      const ph = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      ph.addColorStop(0, '#3d1a4d');
      ph.addColorStop(1, '#12041c');
      ctx.fillStyle = ph;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `700 ${Math.max(14, h * 0.025)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.restore();
  });

  applyGrade(ctx, w, h, state.grade || 'sunset');
  drawCaption(ctx, w, h, state.caption || {});

  // Poster frame: thick white border, thin inner keyline.
  const bw = Math.max(6, w * 0.008);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(1.5, w * 0.0015);
  ctx.strokeRect(bw * 2.2, bw * 2.2, w - bw * 4.4, h - bw * 4.4);
}

/** Panel rects in canvas pixels, for hit-testing drags. */
export function panelRects(canvas, layout) {
  const frames = LAYOUTS[layout] || LAYOUTS.hero;
  return frames.map((f) => rectOf(f, canvas.width, canvas.height));
}
