/* DesaKu — cozy kampung builder
   Prinsip jimat bateri:
   - Lukis skrin HANYA bila ada perubahan (render on demand), takde gelung 60fps.
   - Animasi kecil (penduduk berjalan) 12fps je, mati bila Mod Jimat / app tersembunyi.
   - Ekonomi dikira ikut cap masa (timestamp), bukan timer laju.
   - Semua berhenti bila app ditutup (visibilitychange). */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const N = 12;                 // saiz peta
const TW = 64, TH = 32;       // saiz petak isometrik (unit dunia)
const SAVE = 'desaku_v1';

/* ---------- Bangunan ---------- */
// fx = kesan kebahagiaan pada rumah dalam radius r; jobs = kerja; pop = kapasiti asas rumah
const B = {
  jalan:   { name: 'Jalan', ic: '🛣️', cost: 5,   lv: 0, h: 0,  col: ['#c9b79c', '#b8a586', '#a89474'], desc: 'Rumah & tempat kerja kena sambung jalan.' },
  rumah:   { name: 'Rumah', ic: '🏠', cost: 50,  lv: 0, h: 18, col: ['#f6c58f', '#e8a96a', '#d9534f'], pop: 4, desc: 'Penduduk tinggal sini. Makin gembira, makin ramai & makin cantik rumah.' },
  sawah:   { name: 'Sawah', ic: '🌾', cost: 60,  lv: 0, h: 2,  col: ['#c5e384', '#a9cf5c', '#8fbf3a'], jobs: 2, desc: 'Kerja untuk 2 orang. Pemandangan cantik (+1 😊 dekat).', fx: 1, r: 1 },
  warung:  { name: 'Warung', ic: '🍜', cost: 80,  lv: 0, h: 14, col: ['#ffe8cc', '#ffc078', '#f08c00'], jobs: 2, fx: 1, r: 2, desc: 'Kerja 2 orang. Penduduk dekat gembira (+1 😊).' },
  taman:   { name: 'Taman', ic: '🌳', cost: 40,  lv: 0, h: 3,  col: ['#8ce99a', '#69db7c', '#40c057'], fx: 1, r: 2, desc: 'Tempat riadah (+1 😊 radius 2).' },
  kedai:   { name: 'Kedai Runcit', ic: '🏪', cost: 120, lv: 0, h: 20, col: ['#d0ebff', '#74c0fc', '#1c7ed6'], jobs: 4, fx: 1, r: 2, desc: 'Kerja 4 orang. Senang beli barang (+1 😊).' },
  surau:   { name: 'Surau', ic: '🕌', cost: 200, lv: 0, h: 22, col: ['#f8f9fa', '#e9ecef', '#2f9e44'], jobs: 1, fx: 2, r: 3, desc: 'Komuniti erat (+2 😊 radius 3).' },
  sekolah: { name: 'Sekolah', ic: '🏫', cost: 300, lv: 0, h: 22, col: ['#fff3bf', '#ffd43b', '#c92a2a'], jobs: 4, fx: 2, r: 3, desc: 'Kerja 4 orang. Anak-anak belajar (+2 😊 radius 3).' },
  pasar:   { name: 'Pasar', ic: '🧺', cost: 350, lv: 1, h: 16, col: ['#ffdeeb', '#faa2c1', '#d6336c'], jobs: 8, fx: 1, r: 3, desc: 'Kerja 8 orang. Meriah (+1 😊 radius 3).' },
  klinik:  { name: 'Klinik', ic: '🏥', cost: 450, lv: 1, h: 24, col: ['#ffffff', '#e7f5ff', '#e03131'], jobs: 5, fx: 2, r: 4, desc: 'Kerja 5 orang. Rasa selamat (+2 😊 radius 4).' },
  kilang:  { name: 'Kilang', ic: '🏭', cost: 600, lv: 2, h: 26, col: ['#dee2e6', '#adb5bd', '#495057'], jobs: 16, fx: -2, r: 2, desc: 'Banyak kerja (16)! Tapi bising & asap (−2 😊 radius 2).' },
  flat:    { name: 'Flat', ic: '🏢', cost: 500, lv: 2, h: 40, col: ['#e5dbff', '#b197fc', '#7048e8'], pop: 14, desc: 'Rumah ramai orang (14+). Perlukan suasana gembira juga.' },
};
const TOOLS = ['jalan', 'rumah', 'sawah', 'warung', 'taman', 'kedai', 'surau', 'sekolah', 'pasar', 'klinik', 'kilang', 'flat'];
const LEVELS = [
  { name: 'Kampung', ic: '🛖', need: 0 },
  { name: 'Pekan', ic: '🏘️', need: 60 },
  { name: 'Bandar', ic: '🏙️', need: 180 },
  { name: 'Bandaraya', ic: '🌆', need: 400 },
];

/* ---------- State ---------- */
let S;
function freshState() {
  const g = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let t = null;
    if (x === N - 1 || (x === N - 2 && y > 6)) t = 'air';           // sungai
    else if (Math.random() < .12) t = 'pokok';                       // pokok semula jadi
    g.push({ t, res: 0 });
  }
  // jalan permulaan & 2 rumah
  for (let x = 2; x < 8; x++) g[5 * N + x] = { t: 'jalan', res: 0 };
  g[4 * N + 3] = { t: 'rumah', res: 2 }; g[4 * N + 5] = { t: 'rumah', res: 2 };
  g[6 * N + 4] = { t: 'sawah', res: 0 };
  return { g, money: 400, pop: 4, best: 0, t: Date.now(), anim: true, sound: true, tut: 0 };
}
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.g && s.g.length === N * N) return s; } catch (e) {} return null; }
let saveT = 0;
function save() { S.t = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 1500); }

/* ---------- Simulasi ---------- */
const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? null : S.g[y * N + x];
function nearRoad(x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = at(x + dx, y + dy); return c && c.t === 'jalan'; }); }
function happyAt(x, y) {
  let h = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = S.g[j * N + i], b = c.t && B[c.t];
    if (!b || !b.fx) continue;
    if (Math.max(Math.abs(i - x), Math.abs(j - y)) <= b.r && (b.fx < 0 || nearRoad(i, j))) h += b.fx;
  }
  const nat = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const c = at(x + dx, y + dy); return c && (c.t === 'pokok' || c.t === 'air'); }).length;
  return h + (nat ? 1 : 0);
}
const houseCap = (b, h) => Math.max(1, Math.round(b.pop * (h < 0 ? .5 : 1 + Math.min(h, 6) * .25)));
const houseLv = h => h >= 5 ? 2 : h >= 2 ? 1 : 0;   // rumah kayu -> batu -> banglo
let SIM = { pop: 0, cap: 0, jobs: 0, happy: 0, income: 0, info: [] };
function simulate() {
  let cap = 0, jobs = 0, pop = 0, hs = 0, hn = 0;
  const info = [];
  S.g.forEach((c, k) => {
    if (!c.t || !B[c.t]) return;
    const x = k % N, y = (k / N) | 0, b = B[c.t], road = nearRoad(x, y);
    if (b.pop) {
      const h = road ? happyAt(x, y) : -3, cp = road ? houseCap(b, h) : 0;
      c.cap = cp; c.h = h; c.lv = houseLv(h); cap += cp; pop += c.res || 0; hs += h * (c.res || 0); hn += c.res || 0;
      if (!road) info.push(k);
    } else if (b.jobs) { if (road) jobs += b.jobs; else info.push(k); }
  });
  const employed = Math.min(pop, jobs);
  SIM = { pop, cap, jobs, employed, happy: hn ? hs / hn : 0, info,
    income: employed * 0.35 + pop * 0.05 };   // RM sesaat
}
// penduduk pindah masuk/keluar perlahan-lahan (dt saat)
function growth(dt) {
  const jobsFree = SIM.jobs - SIM.employed;
  S.g.forEach(c => {
    if (!c.t || !B[c.t] || !B[c.t].pop) return;
    const cap = c.cap || 0, r = c.res || 0;
    if (r < cap && (jobsFree > 0 || SIM.pop < 8)) c.res = Math.min(cap, r + dt * 0.08);
    else if (r > cap) c.res = Math.max(cap, r - dt * 0.15);
  });
}

/* ---------- Kamera & kanvas ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: TH * N / 2 - 20, z: 1 };
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);       // had 2x untuk jimat bateri
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR | 0; cv.height = H * DPR | 0;
  if (!resize.done) { cam.z = Math.max(.6, Math.min(2, Math.min(W / (TW * N * .62), (H - 170) / (TH * N * 1.05)))); resize.done = 1; }
  draw();
}
const toScreen = (gx, gy) => [((gx - gy) * TW / 2 - cam.x) * cam.z + W / 2, ((gx + gy) * TH / 2 - cam.y) * cam.z + H / 2];
function toGrid(sx, sy) {
  const wx = (sx - W / 2) / cam.z + cam.x, wy = (sy - H / 2) / cam.z + cam.y;
  const gx = (wx / (TW / 2) + wy / (TH / 2)) / 2, gy = (wy / (TH / 2) - wx / (TW / 2)) / 2;
  return [Math.floor(gx), Math.floor(gy)];
}

/* ---------- Art pilihan (dari ChatGPT) ---------- */
const ART = {};
fetch('sprites/list.json').then(r => r.ok ? r.json() : []).then(l => {
  l.forEach(n => { const im = new Image(); im.onload = () => { ART[n] = im; draw(); }; im.src = 'sprites/' + n + '.webp'; });
}).catch(() => {});

/* ---------- Lukis ---------- */
let pending = false;
function draw() { if (pending) return; pending = true; requestAnimationFrame(render); }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const m = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function diamond(x, y, w, h) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w / 2, y + h / 2); ctx.lineTo(x, y + h); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath(); }
// kotak isometrik: (x,y) = bucu atas petak, ukuran ikut zoom
function box(x, y, w, h, z, top, left, right) {
  const hw = w / 2, hh = h / 2;
  ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(x - hw, y + hh - z); ctx.lineTo(x, y + h - z); ctx.lineTo(x, y + h); ctx.lineTo(x - hw, y + hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(x + hw, y + hh - z); ctx.lineTo(x, y + h - z); ctx.lineTo(x, y + h); ctx.lineTo(x + hw, y + hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = top; diamond(x, y - z, w, h); ctx.fill();
}
function roof(x, y, w, h, z, col) { // bumbung segitiga ala rumah kampung
  const hw = w / 2, hh = h / 2, rz = h * .9;
  ctx.fillStyle = shade(col, .8); ctx.beginPath(); ctx.moveTo(x - hw, y + hh - z); ctx.lineTo(x, y + h - z); ctx.lineTo(x, y + hh - z - rz); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + h - z); ctx.lineTo(x + hw, y + hh - z); ctx.lineTo(x, y + hh - z - rz); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(col, 1.15); ctx.beginPath(); ctx.moveTo(x - hw, y + hh - z); ctx.lineTo(x, y - z); ctx.lineTo(x, y + hh - z - rz); ctx.closePath(); ctx.fill();
}
function drawTile(gx, gy, c) {
  const z = cam.z, [sx, sy] = toScreen(gx, gy), w = TW * z, h = TH * z;
  if (sx < -w || sx > W + w || sy < -h * 4 || sy > H + h) return;   // luar skrin: skip
  const t = c.t;
  // tanah
  const gk = t === 'air' ? 'air' : 'tanah';
  if (ART[gk]) ctx.drawImage(ART[gk], sx - w / 2, sy, w, w * ART[gk].height / ART[gk].width);
  else { ctx.fillStyle = t === 'air' ? '#74c0fc' : ((gx + gy) % 2 ? '#a9dc8b' : '#9fd47f'); diamond(sx, sy, w, h); ctx.fill(); }
  if (t === 'air' && ART.air) return;
  if (t === 'air') { ctx.strokeStyle = '#d0ebff'; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.moveTo(sx - w * .2, sy + h * .5); ctx.quadraticCurveTo(sx, sy + h * .35, sx + w * .2, sy + h * .5); ctx.stroke(); return; }
  if (sel && sel[0] === gx && sel[1] === gy) { ctx.fillStyle = '#fff6'; diamond(sx, sy, w, h); ctx.fill(); }
  if (!t) return;
  if (t === 'pokok') { if (ART.pokok) sprite(ART.pokok, sx, sy, w, h); else tree(sx, sy + h * .5, z, 1); return; }
  const b = B[t];
  const key = t === 'rumah' ? 'rumah_' + (c.lv || 0) : t;
  if (t !== 'jalan' && ART[key]) { sprite(ART[key], sx, sy, w, h); badges(gx, gy, c, sx, sy, z, ART[key]); return; }
  if (t === 'jalan') {
    const isR = (a, b) => { const q = at(a, b); return q && q.t === 'jalan'; };
    const ex = isR(gx + 1, gy) || isR(gx - 1, gy), ey = isR(gx, gy + 1) || isR(gx, gy - 1);
    const rk = ex && ey ? 'jalan_simpang' : ex ? 'jalan_x' : 'jalan_y';
    if (ART[rk]) { ctx.drawImage(ART[rk], sx - w / 2, sy, w, w * ART[rk].height / ART[rk].width); return; }
    ctx.fillStyle = '#b8a586'; diamond(sx, sy + h * .08, w * .92, h * .92); ctx.fill();
    ctx.strokeStyle = '#fff8'; ctx.setLineDash([4 * z, 4 * z]); ctx.lineWidth = 1.2 * z;
    const lr = (at(gx + 1, gy) && at(gx + 1, gy).t === 'jalan') || (at(gx - 1, gy) && at(gx - 1, gy).t === 'jalan');
    ctx.beginPath(); if (lr) { ctx.moveTo(sx - w / 4, sy + h / 4); ctx.lineTo(sx + w / 4, sy + h * .75); } else { ctx.moveTo(sx + w / 4, sy + h / 4); ctx.lineTo(sx - w / 4, sy + h * .75); } ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  if (t === 'sawah' || t === 'taman') {
    ctx.fillStyle = b.col[1]; diamond(sx, sy + h * .06, w * .9, h * .9); ctx.fill();
    if (t === 'sawah') { ctx.strokeStyle = b.col[2]; ctx.lineWidth = 1 * z; for (let q = 1; q < 4; q++) { ctx.beginPath(); ctx.moveTo(sx - w / 2 + q * w / 8, sy + h / 2 - q * h / 8); ctx.lineTo(sx + q * w / 8, sy + h - q * h / 8); ctx.stroke(); } }
    else { tree(sx - w * .14, sy + h * .5, z * .7, 0); tree(sx + w * .16, sy + h * .6, z * .6, 1); ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.ellipse(sx, sy + h * .72, w * .08, h * .08, 0, 0, 7); ctx.fill(); }
    badges(gx, gy, c, sx, sy, z); return;
  }
  // bangunan: kotak + bumbung
  let bh = b.h, col = b.col;
  if (t === 'rumah') { const lv = c.lv || 0; bh = [14, 18, 24][lv]; col = [['#e6c18f', '#c9975b', '#a0522d'], ['#fff1e0', '#f6c58f', '#d9534f'], ['#ffffff', '#dbe4ff', '#4263eb']][lv]; }
  const s = .78, bw = w * s, bhh = h * s, ox = sx, oy = sy + h * (1 - s) / 2, zz = bh * z;
  box(ox, oy, bw, bhh, zz, col[0], shade(col[1], .85), col[1]);
  if (t === 'rumah' || t === 'surau' || t === 'warung' || t === 'sekolah' || t === 'klinik' || t === 'pasar') roof(ox, oy, bw, bhh, zz, col[2]);
  else { ctx.fillStyle = col[2]; diamond(ox, oy - zz, bw * .6, bhh * .6); ctx.fill(); }
  // tingkap
  ctx.fillStyle = '#fff9db'; const wn = Math.max(1, Math.round(bh / 10));
  for (let q = 0; q < wn; q++) { const yy = oy + bhh * .75 - zz * (q + .55) / (wn + .2); ctx.fillRect(ox + bw * .14, yy, bw * .1, Math.max(2, zz / (wn * 3.2))); ctx.fillRect(ox - bw * .26, yy - bhh * .1, bw * .1, Math.max(2, zz / (wn * 3.2))); }
  if (t === 'surau') { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(ox, oy + bhh / 2 - zz - h * .95, 4 * z, 0, 7); ctx.fill(); }
  if (t === 'kilang' && S.anim) { ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(ox + bw * .1, oy - zz - 8 * z - (frame % 12) * z, (3 + (frame % 12) * .3) * z, 0, 7); ctx.fill(); }
  badges(gx, gy, c, sx, sy, z);
}
// sprite ChatGPT: lebar = lebar petak, tapak berlian di bawah gambar duduk tepat atas petak
function sprite(im, sx, sy, w, h) { const ih = w * im.height / im.width; ctx.drawImage(im, sx - w / 2, sy + h - ih, w, ih); }
function tree(x, y, z, v) {
  ctx.fillStyle = '#8d6e4f'; ctx.fillRect(x - 1.5 * z, y - 8 * z, 3 * z, 8 * z);
  ctx.fillStyle = v ? '#51cf66' : '#37b24d'; ctx.beginPath(); ctx.arc(x, y - 12 * z, 7 * z, 0, 7); ctx.fill();
  ctx.fillStyle = v ? '#69db7c' : '#51cf66'; ctx.beginPath(); ctx.arc(x - 2 * z, y - 14 * z, 4 * z, 0, 7); ctx.fill();
}
function badges(gx, gy, c, sx, sy, z) {
  const k = gy * N + gx;
  if (SIM.info.includes(k)) { ctx.font = `${14 * z}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🚧', sx, sy - 18 * z); }
  else if (showHappy && c.t && B[c.t] && B[c.t].pop) {
    const h = c.h || 0; ctx.font = `${12 * z}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(h >= 4 ? '😍' : h >= 2 ? '😊' : h >= 0 ? '🙂' : '😠', sx, sy - 22 * z);
  }
}
let frame = 0, walkers = [];
function render() {
  pending = false;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfeaf9'); g.addColorStop(1, '#bfe3a6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // pulau tanah
  const z = cam.z, [tx, ty] = toScreen(0, 0);
  ctx.fillStyle = '#8bbf6a'; ctx.beginPath(); ctx.moveTo(tx, ty); const [rx, ry] = toScreen(N, 0); const [bx, by] = toScreen(N, N); const [lx, ly] = toScreen(0, N);
  ctx.lineTo(rx, ry); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 10 * z); ctx.lineTo(lx, ly + 10 * z); ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a5c3e'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 10 * z); ctx.lineTo(lx, ly + 10 * z); ctx.fill();
  for (let s = 0; s < N * 2 - 1; s++) for (let y = 0; y <= s; y++) { const x = s - y; if (x < N && y < N) drawTile(x, y, S.g[y * N + x]); }
  // penduduk berjalan
  if (S.anim) walkers.forEach(w => { const [px, py] = toScreen(w.x, w.y); ctx.fillStyle = w.c; ctx.beginPath(); ctx.arc(px, py + TH * z * .5 - 4 * z, 2.6 * z, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe3c2'; ctx.beginPath(); ctx.arc(px, py + TH * z * .5 - 7.5 * z, 2 * z, 0, 7); ctx.fill(); });
  // pratonton binaan
  if (tool && hover) {
    const [hx, hy] = hover, c = at(hx, hy);
    if (c) { const [sx, sy] = toScreen(hx, hy), ok = canBuild(tool, hx, hy) === true; ctx.fillStyle = ok ? '#69db7c88' : '#ff878788'; diamond(sx, sy, TW * z, TH * z); ctx.fill(); }
  }
}

/* ---------- Animasi ringan (12fps, boleh dimatikan) ---------- */
let animT = null;
function setAnim() {
  clearInterval(animT); animT = null;
  if (!S.anim || document.hidden) { walkers = []; draw(); return; }
  animT = setInterval(stepAnim, 1000 / 12);
}
function roads() { const r = []; S.g.forEach((c, k) => { if (c.t === 'jalan') r.push([k % N, (k / N) | 0]); }); return r; }
function stepAnim() {
  frame++;
  const rd = roads(), want = Math.min(12, Math.round(SIM.pop / 4));
  if (!rd.length) { walkers = []; } else {
    while (walkers.length < want) { const [x, y] = rd[Math.random() * rd.length | 0]; walkers.push({ x: x + .5, y: y + .5, tx: x, ty: y, c: ['#e64980', '#4c6ef5', '#f59f00', '#12b886', '#7950f2'][walkers.length % 5] }); }
    walkers.length = Math.min(walkers.length, want);
    walkers.forEach(w => {
      const dx = w.tx + .5 - w.x, dy = w.ty + .5 - w.y, d = Math.hypot(dx, dy);
      if (d < .05) { const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [w.tx + a, w.ty + b]).filter(([a, b]) => { const c = at(a, b); return c && c.t === 'jalan'; }); if (nb.length) { const n = nb[Math.random() * nb.length | 0]; w.tx = n[0]; w.ty = n[1]; } }
      else { w.x += dx / d * .06; w.y += dy / d * .06; }
    });
  }
  if (walkers.length || S.g.some(c => c.t === 'kilang')) draw();   // takde benda gerak = takde lukis
}

/* ---------- Ekonomi ikut masa ---------- */
let last = Date.now(), ecoT = null;
function tick() {
  const now = Date.now(), dt = Math.min(5, (now - last) / 1000); last = now;
  simulate(); growth(dt); simulate();
  S.money += SIM.income * dt;
  const lvBefore = level();
  S.best = Math.max(S.best || 0, Math.round(SIM.pop));
  if (level() > lvBefore) levelUp();
  hud(); saveSoon();
}
function startEco() { clearInterval(ecoT); last = Date.now(); ecoT = document.hidden ? null : setInterval(tick, 1000); }
function offline() {
  const away = Math.min(8 * 3600, (Date.now() - (S.t || Date.now())) / 1000);
  simulate();
  if (away > 60 && SIM.income > 0) {
    const got = Math.round(SIM.income * away * .5);
    S.money += got;
    const h = Math.floor(away / 3600), m = Math.floor(away % 3600 / 60);
    showPanel(`<div class="big">🌅</div><h2>Selamat kembali!</h2><p>Kau tinggal ${h ? h + ' jam ' : ''}${m} minit. Penduduk ${LEVELS[level()].name} kau kerja keras dan kumpul cukai:</p><h2>💰 RM${got.toLocaleString()}</h2><button class="btn" data-close>Terima kasih!</button>`);
  }
}

/* ---------- Level ---------- */
function level() { let l = 0; LEVELS.forEach((L, i) => { if ((S.best || 0) >= L.need) l = i; }); return l; }
function levelUp() {
  const L = LEVELS[level()], unlocked = TOOLS.filter(t => B[t].lv === level()).map(t => B[t].ic + ' ' + B[t].name).join(', ');
  beep(523, .1); setTimeout(() => beep(659, .1), 110); setTimeout(() => beep(784, .2), 220);
  showPanel(`<div class="big">${L.ic}</div><h2>Tahniah! Kini ${L.name}!</h2><p>Penduduk makin ramai, kampung kau dah berkembang.</p>${unlocked ? `<p>Bangunan baru dibuka: <b>${unlocked}</b></p>` : ''}<button class="btn" data-close>Yeay!</button>`);
  buildBar();
}

/* ---------- HUD & bar ---------- */
const fmt = n => n >= 10000 ? (n / 1000).toFixed(1) + 'k' : Math.floor(n).toLocaleString();
function hud() {
  $('sMoney').innerHTML = `💰 <b>${fmt(S.money)}</b>`;
  $('sPop').innerHTML = `👥 <b>${Math.floor(SIM.pop)}</b>`;
  $("sJob").innerHTML = `💼 <b>${Math.floor(SIM.employed || 0)}/${SIM.jobs}</b>`;
  $('sJob').classList.toggle('bad', SIM.jobs < SIM.pop - 1);
  $('sHappy').innerHTML = `${SIM.happy >= 3 ? '😍' : SIM.happy >= 1 ? '😊' : SIM.happy >= 0 ? '🙂' : '😠'} <b>${SIM.happy.toFixed(1)}</b>`;
  const l = level(), nx = LEVELS[l + 1];
  $('lvName').textContent = LEVELS[l].ic + ' ' + LEVELS[l].name;
  $('lvBar').style.width = nx ? Math.min(100, (S.best - LEVELS[l].need) / (nx.need - LEVELS[l].need) * 100) + '%' : '100%';
  $('lvNext').textContent = nx ? `${S.best}/${nx.need} 👥` : 'MAX';
  [...$('bar').children].forEach(el => { const t = el.dataset.t; if (B[t]) el.classList.toggle('poor', S.money < B[t].cost); });
}
let tool = null, showHappy = false;
function buildBar() {
  const l = level();
  $('bar').innerHTML = `<button class="tool ${tool === 'info' ? 'on' : ''}" data-t="info" type="button"><span>🔍</span><b>Info</b><small style="color:#868e96">tengok</small></button>` +
    TOOLS.map(t => { const b = B[t], lock = b.lv > l; return `<button class="tool ${tool === t ? 'on' : ''} ${lock ? 'lock' : ''}" data-t="${t}" type="button"><span>${lock ? '🔒' : b.ic}</span><b>${b.name}</b><small>${lock ? LEVELS[b.lv].name : 'RM' + b.cost}</small></button>`; }).join('') +
    `<button class="tool ${tool === 'roboh' ? 'on' : ''}" data-t="roboh" type="button"><span>🧹</span><b>Roboh</b><small style="color:#e03131">buang</small></button>`;
  hud();
}
$('bar').addEventListener('click', e => {
  const el = e.target.closest('.tool'); if (!el) return;
  const t = el.dataset.t;
  if (B[t] && B[t].lv > level()) { toast(`🔒 Buka bila jadi ${LEVELS[B[t].lv].name} (${LEVELS[B[t].lv].need} penduduk)`); return; }
  tool = tool === t ? null : t; showHappy = tool === 'rumah' || tool === 'info';
  if (B[tool]) toast(`${B[tool].ic} ${B[tool].name}: ${B[tool].desc}`);
  else if (tool === 'roboh') toast('🧹 Tap bangunan/pokok untuk buang (dapat balik separuh harga)');
  else if (tool === 'info') toast('🔍 Tap mana-mana petak untuk tengok info. 😊 = tahap gembira rumah');
  beep(600, .04); buildBar(); draw();
});

/* ---------- Bina ---------- */
function canBuild(t, x, y) {
  const c = at(x, y); if (!c) return 'Luar kawasan';
  if (t === 'roboh') return c.t && c.t !== 'air' ? true : 'Takde apa nak dibuang';
  if (!B[t]) return 'x';
  if (c.t === 'air') return 'Tak boleh bina atas sungai';
  if (c.t) return c.t === 'pokok' ? 'Buang pokok dulu (🧹)' : 'Dah ada bangunan';
  if (S.money < B[t].cost) return 'Duit tak cukup';
  return true;
}
function place(x, y) {
  if (tool === 'info' || !tool) { info(x, y); return; }
  const ok = canBuild(tool, x, y);
  if (ok !== true) { toast('⚠️ ' + ok); beep(200, .08); return; }
  const c = at(x, y);
  if (tool === 'roboh') {
    const back = c.t === 'pokok' ? -10 : Math.floor(B[c.t].cost / 2);
    if (back < 0 && S.money < 10) { toast('⚠️ Perlu RM10 untuk tebang pokok'); return; }
    S.money += back; c.t = null; c.res = 0; toast(back < 0 ? '🪓 Pokok ditebang (−RM10)' : `🧹 Dirobohkan (+RM${back})`); beep(300, .08);
  } else {
    S.money -= B[tool].cost; c.t = tool; c.res = 0; beep(700, .06); setTimeout(() => beep(900, .06), 60);
    if (B[tool].pop || B[tool].jobs) { simulate(); if (!nearRoad(x, y)) toast('🚧 Bina jalan sebelah bangunan ni supaya boleh guna!'); }
  }
  simulate(); hud(); draw(); saveSoon(); tutorial();
}
function info(x, y) {
  const c = at(x, y); if (!c) return;
  simulate();
  if (!c.t) { toast('🌱 Tanah kosong — pilih bangunan kat bawah untuk bina'); return; }
  if (c.t === 'pokok') { toast('🌳 Pokok — rumah sebelah pokok dapat +1 😊'); return; }
  if (c.t === 'air') { toast('🏞️ Sungai — rumah tepi sungai dapat +1 😊'); return; }
  const b = B[c.t], road = nearRoad(x, y);
  let rows = '';
  if (b.pop) rows = `<div><span>Penghuni</span><b>${Math.floor(c.res || 0)} / ${c.cap || 0}</b></div><div><span>Kegembiraan</span><b>${(c.h || 0)} ${c.h >= 4 ? '😍' : c.h >= 2 ? '😊' : c.h >= 0 ? '🙂' : '😠'}</b></div><div><span>Jenis</span><b>${['Rumah kayu', 'Rumah batu', 'Banglo'][c.lv || 0]}</b></div>`;
  if (b.jobs) rows += `<div><span>Kerja</span><b>${b.jobs} orang</b></div>`;
  if (b.fx) rows += `<div><span>Kesan</span><b>${b.fx > 0 ? '+' : ''}${b.fx} 😊 radius ${b.r}</b></div>`;
  rows += `<div><span>Sambung jalan</span><b>${road ? '✅' : '❌ Perlu jalan!'}</b></div>`;
  showPanel(`<div class="big">${b.ic}</div><h2>${b.name}</h2><p>${b.desc}</p><div class="rows">${rows}</div>${b.pop && (c.h || 0) < 5 ? '<p style="font-size:12.5px;opacity:.8">💡 Bina taman, warung, surau atau sekolah dekat rumah supaya jadi banglo!</p>' : ''}<button class="btn" data-close>OK</button>`);
}

/* ---------- Sentuhan: tap, seret, cubit ---------- */
const pts = new Map(); let drag = null, pinch = null, sel = null, hover = null, moved = 0;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moved = 0; }
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; drag = null; }
});
cv.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) { if (tool && e.pointerType === 'mouse') { hover = toGrid(e.clientX, e.clientY); draw(); } return; }
  pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; cam.z = Math.max(.45, Math.min(3, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); moved = 99; draw(); return; }
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
    if (moved > 8) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; clampCam(); draw(); }
  }
});
function end(e) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (pts.size < 2) pinch = null;
  if (pts.size === 0 && drag && moved <= 8) { const [x, y] = toGrid(e.clientX, e.clientY); if (at(x, y)) { sel = [x, y]; hover = [x, y]; place(x, y); setTimeout(() => { sel = null; draw(); }, 250); } }
  if (pts.size === 0) drag = null;
}
cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
cv.addEventListener('wheel', e => { e.preventDefault(); cam.z = Math.max(.45, Math.min(3, cam.z * (e.deltaY < 0 ? 1.1 : .9))); draw(); }, { passive: false });
function clampCam() { const lim = TW * N / 2; cam.x = Math.max(-lim, Math.min(lim, cam.x)); cam.y = Math.max(0, Math.min(TH * N, cam.y)); }

/* ---------- Panel, toast, bunyi ---------- */
function showPanel(html) { $('panelCard').innerHTML = html; $('panel').classList.remove('hidden'); }
$('panel').addEventListener('click', e => {
  if (e.target.id === 'panel' || e.target.closest('[data-close]')) $('panel').classList.add('hidden');
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'reset') { if (confirm('Mula semula? Kampung sekarang akan hilang.')) { S = freshState(); save(); $('panel').classList.add('hidden'); simulate(); buildBar(); draw(); tutorial(); } }
});
$('panel').addEventListener('change', e => {
  if (e.target.id === 'optAnim') { S.anim = e.target.checked; setAnim(); save(); }
  if (e.target.id === 'optSound') { S.sound = e.target.checked; save(); }
});
$('menuBtn').onclick = () => showPanel(`<h2>⚙️ Tetapan</h2>
  <label class="switch"><span>Animasi penduduk<small>Matikan = Mod Jimat Bateri 🔋</small></span><input type="checkbox" id="optAnim" ${S.anim ? 'checked' : ''}></label>
  <label class="switch"><span>Bunyi</span><input type="checkbox" id="optSound" ${S.sound ? 'checked' : ''}></label>
  <div class="rows"><div><span>Pendapatan</span><b>RM${(SIM.income * 60).toFixed(0)} / minit</b></div><div><span>Kapasiti rumah</span><b>${SIM.cap}</b></div><div><span>Rekod penduduk</span><b>${S.best}</b></div></div>
  <p style="font-size:12.5px;opacity:.8">💡 Tip: rumah perlukan <b>jalan</b> + <b>kerja</b>. Letak taman, warung, surau & sekolah dekat rumah supaya penduduk gembira dan rumah naik taraf.</p>
  <button class="btn" data-close>Tutup</button><button class="btn red" data-act="reset">Mula semula</button>`);
let tT = 0;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), 2600); }
let AC = null;
function beep(f, d) {
  if (!S || !S.sound) return;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); } catch (e) {}
}

/* ---------- Tutorial ringkas ---------- */
function tutorial() {
  const steps = [
    [() => S.g.filter(c => c.t === 'rumah').length >= 3, '👋 Selamat datang ke DesaKu! Pilih 🏠 Rumah, tap tanah kosong TEPI JALAN.'],
    [() => S.g.filter(c => c.t === 'warung' || c.t === 'kedai').length >= 1, '💼 Penduduk perlukan kerja. Bina 🍜 Warung dekat jalan.'],
    [() => S.g.filter(c => c.t === 'taman').length >= 1, '😊 Bina 🌳 Taman dekat rumah supaya penduduk gembira.'],
  ];
  while (S.tut < steps.length && steps[S.tut][0]()) S.tut++;
  if (S.tut < steps.length) toast(steps[S.tut][1]);
  else if (S.tut === steps.length) { S.tut++; toast('🎉 Bagus! Teruskan membina. Kejar 60 penduduk untuk jadi Pekan!'); }
}

/* ---------- Kitaran hidup app (jimat bateri) ---------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); clearInterval(ecoT); ecoT = null; setAnim(); }
  else { offline(); startEco(); setAnim(); simulate(); hud(); draw(); }
});
window.addEventListener('pagehide', save);
addEventListener('resize', resize);

window.__desaku = { toScreen: (x, y) => toScreen(x + .5, y + .5), S: () => S, SIM: () => SIM };
/* ---------- Mula ---------- */
S = load() || freshState();
simulate();
offline();
buildBar(); resize(); startEco(); setAnim();
setTimeout(tutorial, 600);
})();
