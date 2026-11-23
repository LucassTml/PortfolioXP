/* =============================================================
   LucasOS 2.0 — núcleo do sistema
   Gerenciador de janelas, barra de tarefas, menu Iniciar com busca,
   personalização (tema/cor/papel de parede), sons, atalhos e rotas (#app).
   Os aplicativos interativos ficam em apps.js e se registram via LucasOS.register().
   ============================================================= */
(() => {
'use strict';

/* ============================================================
   CONFIGURAÇÃO — edite aqui
   ============================================================ */
const CONFIG = {
  githubUser: 'LucassTml',
  githubUrl: 'https://github.com/LucassTml',
  linkedinUrl: 'https://www.linkedin.com/in/lucas-eduardo-melo-tenorio-05326a311/',
  email: 'lemt99@gmail.com',
};

// Ordem = ordem dos ícones na área de trabalho e no menu Iniciar.
// "href" transforma o ícone em atalho externo.
const APPS = [
  { id:'sobre',       title:'Sobre Mim',   icon:'user',     tile:'linear-gradient(135deg,#60a5fa,#2563eb)', keywords:'quem bio perfil lucas melo' },
  { id:'projetos',    title:'Projetos',    icon:'folder',   tile:'linear-gradient(135deg,#fcd34d,#f59e0b)', keywords:'portfolio trabalhos repositorios' },
  { id:'habilidades', title:'Habilidades', icon:'wrench',   tile:'linear-gradient(135deg,#fdba74,#ea580c)', keywords:'skills stack tecnologias linguagens' },
  { id:'trajetoria',  title:'Trajetória',  icon:'cap',      tile:'linear-gradient(135deg,#c4b5fd,#7c3aed)', keywords:'formacao educacao experiencia upe rocketlab visagio curriculo' },
  { id:'github',      title:'GitHub',      icon:'github',   tile:'linear-gradient(135deg,#64748b,#0f172a)', keywords:'repositorios codigo' },
  { id:'contato',     title:'Contato',     icon:'mail',     tile:'linear-gradient(135deg,#6ee7b7,#059669)', keywords:'email telefone mensagem falar' },
  { id:'linkedin',    title:'LinkedIn',    icon:'linkedin', tile:'linear-gradient(135deg,#38bdf8,#0a66c2)', keywords:'perfil profissional', href: CONFIG.linkedinUrl },
  { id:'terminal',    title:'Terminal',    icon:'terminal', tile:'linear-gradient(135deg,#475569,#020617)', keywords:'cmd shell prompt console' },
  { id:'invaders',    title:'Invasores',   icon:'invader',  tile:'linear-gradient(135deg,#4ade80,#15803d)', keywords:'jogo game nave espaco' },
  { id:'hexagon',     title:'Hexágono',    icon:'hexagon',  tile:'linear-gradient(135deg,#f472b6,#be185d)', keywords:'jogo game reflexo' },
  { id:'ordenacao',   title:'Ordenação',   icon:'chart',    tile:'linear-gradient(135deg,#22d3ee,#0369a1)', keywords:'sort algoritmos quick merge bubble heap' },
  { id:'labirinto',   title:'Labirinto',   icon:'maze',     tile:'linear-gradient(135deg,#fdba74,#c2410c)', keywords:'maze bfs dfs dijkstra a* busca caminho grafos' },
  { id:'bemvindo',    title:'Bem-vindo',   icon:'sparkles', tile:'linear-gradient(135deg,#f0abfc,#6366f1)', keywords:'ajuda dicas novidades sobre o site lucasos' },
];

/* ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const mqMobile = matchMedia('(max-width: 760px)');
const mqDark = matchMedia('(prefers-color-scheme: dark)');
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqCoarse = matchMedia('(pointer: coarse)');
const isMobile = () => mqMobile.matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isTyping = t => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const icon = (name, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const tileHTML = (app, extra = '') => `<span class="tile${extra}" style="background:${app.tile}">${icon(app.icon)}</span>`;
const APP = Object.fromEntries(APPS.map(a => [a.id, a]));

const store = {
  get(k, d) { try { const v = localStorage.getItem('lucasos:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lucasos:' + k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } },
};

/* ---------------- Configurações ---------------- */
const settings = {
  theme: store.get('theme', 'moderno'),
  scheme: store.get('scheme', 'auto'),
  accent: store.get('accent', '#3d6bff'),
  wallpaper: store.get('wallpaper', 'auto'),
  sound: store.get('sound', true),
};
// Links com ?tema=xp|vista|moderno e ?modo=claro|escuro abrem no visual pedido (sem salvar).
const query = new URLSearchParams(location.search);
if (query.get('tema')) settings.theme = query.get('tema');
if (query.get('modo') === 'escuro') settings.scheme = 'dark';
else if (query.get('modo') === 'claro') settings.scheme = 'light';
if (!['moderno', 'xp', 'vista'].includes(settings.theme)) settings.theme = 'moderno';
const THEME_WP = { moderno: 'aurora', xp: 'colinas', vista: 'aero' };
let customWallpaper = null; // { kind:'custom'|'hamster', url }

function applySettings() {
  const t = settings.theme;
  // Sem transições durante a troca de tema (evita menus "voando" de um canto a outro).
  root.classList.add('is-switching');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-switching')));
  const dark = t === 'moderno' && (settings.scheme === 'dark' || (settings.scheme === 'auto' && mqDark.matches));
  root.dataset.theme = t;
  root.dataset.scheme = dark ? 'dark' : 'light';
  if (t === 'moderno') root.style.setProperty('--accent', settings.accent);
  else root.style.removeProperty('--accent');
  root.dataset.wp = customWallpaper ? customWallpaper.kind
    : (settings.wallpaper === 'auto' ? THEME_WP[t] : settings.wallpaper);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = t === 'xp' ? '#245edc' : t === 'vista' ? '#1b4c8a' : dark ? '#070b17' : '#e8edf7';
  syncQuick();
  document.dispatchEvent(new CustomEvent('lucasos:theme', { detail: { ...settings, dark } }));
}
function setSetting(k, v) {
  settings[k] = v;
  store.set(k, v);
  if (k === 'wallpaper') clearCustomWallpaper();
  applySettings();
}
mqDark.addEventListener('change', () => { if (settings.scheme === 'auto') applySettings(); });

function setCustomWallpaper(kind, url) {
  clearCustomWallpaper();
  customWallpaper = { kind, url };
  $('#desktop').style.setProperty('--wp-custom', `url("${url}")`);
  applySettings();
}
function clearCustomWallpaper() {
  if (customWallpaper && customWallpaper.url.startsWith('blob:')) URL.revokeObjectURL(customWallpaper.url);
  customWallpaper = null;
}

/* ---------------- Sons (Web Audio, sem arquivos) ---------------- */
const sfx = (() => {
  let ctx = null, unlocked = false;
  const unlock = () => { unlocked = true; };
  addEventListener('pointerdown', unlock, { once: true, capture: true });
  addEventListener('keydown', unlock, { once: true, capture: true });
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.05, delay = 0) {
    if (!settings.sound || !unlocked) return;
    const c = ensure(); if (!c) return;
    try {
      const t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    } catch { /* ignora */ }
  }
  return {
    tone,
    click() { tone(920, 0.045, 'triangle', 0.03); },
    open() { tone(520, 0.08, 'sine', 0.05); tone(780, 0.1, 'sine', 0.045, 0.05); },
    close() { tone(620, 0.07, 'sine', 0.045); tone(380, 0.09, 'sine', 0.04, 0.05); },
    error() { tone(196, 0.2, 'triangle', 0.07); },
    boot() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.38, 'sine', 0.045, i * 0.11)); },
    key() { tone(1150 + Math.random() * 250, 0.02, 'square', 0.01); },
    pick() { tone(660, 0.07, 'triangle', 0.05); tone(990, 0.09, 'triangle', 0.045, 0.06); },
    shoot() { tone(880, 0.05, 'square', 0.014); },
    hit() { tone(130, 0.16, 'sawtooth', 0.04); },
  };
})();
// Sininho de "boot" no primeiro gesto da sessão (navegadores bloqueiam áudio antes disso).
addEventListener('pointerdown', () => {
  try { if (sessionStorage.getItem('lucasos:chime')) return; sessionStorage.setItem('lucasos:chime', '1'); } catch { /* ok */ }
  setTimeout(() => sfx.boot(), 30);
}, { once: true });

/* ---------------- Toasts ---------------- */
const toastsEl = $('#toasts');
function toast(msg, ico = 'info', ms = 3400) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = icon(ico) + '<span></span>';
  el.lastChild.textContent = msg;
  toastsEl.append(el);
  while (toastsEl.children.length > 3) toastsEl.firstElementChild.remove();
  const kill = () => { if (!el.isConnected) return; el.classList.add('is-out'); setTimeout(() => el.remove(), 220); };
  setTimeout(kill, ms);
  el.addEventListener('click', kill);
}

/* ---------------- Diálogo ---------------- */
const modal = $('#modal');
let modalReturn = null;
function showModal({ title, message, buttons }) {
  sfx.error();
  $('#modal-title').textContent = title;
  $('#modal-msg').textContent = message;
  const act = $('#modal-actions');
  act.replaceChildren(...buttons.map(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn' + (b.primary ? ' btn-primary' : '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => { hideModal(); if (b.onClick) b.onClick(); });
    return btn;
  }));
  modalReturn = document.activeElement;
  modal.hidden = false;
  (act.querySelector('.btn-primary') || act.firstElementChild).focus();
}
function hideModal() {
  modal.hidden = true;
  if (modalReturn && modalReturn.focus) modalReturn.focus({ preventScroll: true });
}
modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });
modal.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button', modal); const i = f.indexOf(document.activeElement);
  e.preventDefault();
  f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
});

/* ============================================================
   GERENCIADOR DE JANELAS
   ============================================================ */
const windowsHost = $('#windows');
const tasksEl = $('#tasks');
const snapEl = $('#snap');
const wins = new Map();
const inits = {};
let zTop = 20, cascadeN = 0, activeWin = null;

const hostRect = () => windowsHost.getBoundingClientRect();
const rectOf = w => { const s = w.el.style; return { left: parseFloat(s.left) || 0, top: parseFloat(s.top) || 0, width: parseFloat(s.width) || 400, height: parseFloat(s.height) || 300 }; };
const applyRect = (w, r) => Object.assign(w.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });

function buildWindow(el) {
  const id = el.dataset.app, app = APP[id];
  if (!app) return;
  const bar = document.createElement('header');
  bar.className = 'titlebar';
  bar.innerHTML =
    `<button class="t-btn t-back" type="button" data-act="back" aria-label="Voltar">${icon('back')}</button>` +
    `<span class="t-tile" style="background:${app.tile}">${icon(app.icon)}</span>` +
    `<h2 class="t-title" id="wt-${id}"></h2>` +
    `<div class="t-controls">` +
      `<button class="t-btn" type="button" data-act="min" aria-label="Minimizar" title="Minimizar">${icon('min')}</button>` +
      `<button class="t-btn" type="button" data-act="max" aria-label="Maximizar" title="Maximizar">${icon('max')}</button>` +
      `<button class="t-btn t-close" type="button" data-act="close" aria-label="Fechar" title="Fechar">${icon('x')}</button>` +
    `</div>`;
  bar.querySelector('.t-title').textContent = app.title;
  el.prepend(bar);
  el.removeAttribute('aria-label');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'wt-' + id);
  el.tabIndex = -1;
  ['se', 'e', 's'].forEach(dir => {
    const h = document.createElement('div');
    h.className = 'resize'; h.dataset.dir = dir; h.setAttribute('aria-hidden', 'true');
    el.append(h);
  });

  const w = { id, app, el, bar, open: false, min: false, placed: false, prev: null, snapped: null, inited: false, task: null };
  wins.set(id, w);

  el.addEventListener('pointerdown', () => focusWin(w), true);
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'close') closeWin(w);
    else if (act === 'max') toggleMax(w);
    else if (act === 'back' && isMobile() && history.state && history.state.lucasos === id) history.back();
    else minimize(w);
  });
  bar.addEventListener('dblclick', e => { if (!e.target.closest('.t-btn') && !isMobile()) toggleMax(w); });
  bar.addEventListener('pointerdown', e => startDrag(e, w));
  $$('.resize', el).forEach(h => h.addEventListener('pointerdown', e => startResize(e, w, h)));
}

function place(w, pos) {
  const el = w.el, hr = hostRect();
  const W = Math.min(+el.dataset.w || 560, hr.width - 24);
  const H = Math.min(+el.dataset.h || 480, hr.height - 24);
  let x, y;
  if (pos) { x = pos.x; y = pos.y; }
  else {
    const n = cascadeN++ % 7;
    x = (hr.width - W) / 2 + (n - 3) * 26;
    y = (hr.height - H) / 2 + (n - 3) * 22;
  }
  x = clamp(x, 8, Math.max(8, hr.width - W - 8));
  y = clamp(y, 8, Math.max(8, hr.height - H - 8));
  applyRect(w, { left: Math.round(x), top: Math.round(y), width: Math.round(W), height: Math.round(H) });
  w.placed = true;
}

function replayAnim(el, cls) {
  if (mqReduce.matches) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  const end = e => { if (e.target !== el) return; el.classList.remove(cls); el.removeEventListener('animationend', end); };
  el.addEventListener('animationend', end);
}

function emitVis(w) {
  document.dispatchEvent(new CustomEvent('lucasos:visibility', { detail: { id: w.id, visible: w.open && !w.min } }));
}

function openApp(id, opts = {}) {
  const app = APP[id]; if (!app) return;
  setFlyout(null);
  if (app.href) { sfx.click(); window.open(app.href, '_blank', 'noopener'); return; }
  const w = wins.get(id); if (!w) return;
  if (!w.open) {
    if (!w.placed) place(w, opts.pos);
    w.open = true; w.min = false;
    w.el.classList.remove('is-min', 'is-closing');
    w.el.classList.add('is-open');
    replayAnim(w.el, 'is-entering');
    if (!opts.silent) sfx.open();
    addTask(w);
    if (!w.inited && inits[id]) {
      w.inited = true;
      try { inits[id](w.el, API); } catch (err) { console.error('[LucasOS] falha ao iniciar', id, err); }
    }
    emitVis(w);
  } else if (w.min) {
    restore(w);
  }
  focusWin(w, { focusEl: !opts.silent });
  if (!opts.silent) {
    if (isMobile()) { try { history.pushState({ lucasos: id }, '', '#' + id); } catch { /* ok */ } }
    else setHash(id);
  }
}

function focusWin(w, { focusEl = false } = {}) {
  if (!w.open || w.min) return;
  if (activeWin !== w) {
    w.el.style.zIndex = ++zTop;
    if (activeWin) activeWin.el.classList.remove('is-active');
    activeWin = w;
    w.el.classList.add('is-active');
    updateTasks();
    document.dispatchEvent(new CustomEvent('lucasos:focus', { detail: { id: w.id } }));
  }
  if (focusEl && !w.el.contains(document.activeElement) && !mqCoarse.matches) {
    const auto = w.el.querySelector('[data-autofocus]');
    (auto || w.el).focus({ preventScroll: true });
  }
}

function focusTop() {
  let best = null, bz = -1;
  wins.forEach(o => { if (o.open && !o.min) { const z = +o.el.style.zIndex || 0; if (z > bz) { bz = z; best = o; } } });
  if (best) focusWin(best); else updateTasks();
}

function minimize(w) {
  if (!w.open || w.min) return;
  sfx.click();
  w.min = true;
  w.el.classList.add('is-min');
  w.el.classList.remove('is-active');
  if (activeWin === w) { activeWin = null; focusTop(); }
  updateTasks(); emitVis(w);
  if (location.hash === '#' + w.id) setHash('');
}
function restore(w) {
  w.min = false;
  w.el.classList.remove('is-min');
  focusWin(w);
  updateTasks(); emitVis(w);
}

function closeWin(w) {
  if (!w.open) return;
  sfx.close();
  w.open = false; w.min = false;
  w.el.classList.remove('is-active', 'is-entering');
  const finish = () => { if (!w.open) w.el.classList.remove('is-open', 'is-closing', 'is-min'); };
  if (mqReduce.matches) finish();
  else {
    w.el.classList.add('is-closing');
    const t = setTimeout(finish, 240);
    const end = e => { if (e.target !== w.el) return; w.el.removeEventListener('animationend', end); clearTimeout(t); finish(); };
    w.el.addEventListener('animationend', end);
  }
  removeTask(w);
  if (activeWin === w) { activeWin = null; focusTop(); }
  emitVis(w);
  if (location.hash === '#' + w.id) setHash('');
}

function setMaxIcon(w, on) {
  const b = w.bar.querySelector('[data-act="max"]');
  b.innerHTML = icon(on ? 'restore' : 'max');
  b.setAttribute('aria-label', on ? 'Restaurar' : 'Maximizar');
  b.title = b.getAttribute('aria-label');
}
function toggleMax(w) { w.el.classList.contains('is-max') ? unmax(w) : maximize(w); }
function maximize(w) { sfx.click(); w.el.classList.add('is-max'); setMaxIcon(w, true); focusWin(w); }
function unmax(w) { sfx.click(); w.el.classList.remove('is-max'); setMaxIcon(w, false); }

function snapTo(w, zone) {
  if (zone === 'max') { if (w.snapped && w.prev) applyRect(w, w.prev); w.snapped = null; maximize(w); return; }
  const hr = hostRect();
  if (!w.snapped) w.prev = rectOf(w);
  w.snapped = zone;
  applyRect(w, { left: zone === 'left' ? 0 : Math.round(hr.width / 2), top: 0, width: Math.round(hr.width / 2), height: Math.round(hr.height) });
}
function showSnap(zone) {
  if (!zone) { snapEl.hidden = true; return; }
  const hr = hostRect(), g = 6, half = hr.width / 2;
  const r = zone === 'max' ? [g, g, hr.width - 2 * g, hr.height - 2 * g]
    : zone === 'left' ? [g, g, half - 1.5 * g, hr.height - 2 * g]
    : [half + g / 2, g, half - 1.5 * g, hr.height - 2 * g];
  Object.assign(snapEl.style, { left: r[0] + 'px', top: r[1] + 'px', width: r[2] + 'px', height: r[3] + 'px' });
  snapEl.hidden = false;
}

function startDrag(e, w) {
  if (e.button !== 0 || e.target.closest('.t-btn') || isMobile()) return;
  const el = w.el, bar = w.bar, hr = hostRect();
  const sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect();
  let ox = r.left - hr.left, oy = r.top - hr.top, moved = false, zone = null;
  try { bar.setPointerCapture(e.pointerId); } catch { /* ok */ }
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      moved = true;
      el.classList.add('is-dragging');
      document.body.style.userSelect = 'none';
      if (el.classList.contains('is-max') || w.snapped) {
        // "Desencaixa" mantendo o cursor na mesma proporção da barra de título.
        const ratio = (sx - r.left) / r.width;
        if (w.snapped && w.prev) { el.style.width = w.prev.width + 'px'; el.style.height = w.prev.height + 'px'; }
        el.classList.remove('is-max'); setMaxIcon(w, false); w.snapped = null;
        ox = sx - hr.left - ratio * (parseFloat(el.style.width) || r.width);
        oy = 0;
      }
    }
    const nx = clamp(ox + dx, -el.offsetWidth + 100, hr.width - 100);
    const ny = clamp(oy + dy, 0, hr.height - 44);
    el.style.left = nx + 'px'; el.style.top = ny + 'px';
    const z = ev.clientY <= hr.top + 2 ? 'max' : ev.clientX <= 2 ? 'left' : ev.clientX >= innerWidth - 3 ? 'right' : null;
    if (z !== zone) { zone = z; showSnap(zone); }
  };
  const up = () => {
    bar.removeEventListener('pointermove', move);
    bar.removeEventListener('pointerup', up);
    bar.removeEventListener('pointercancel', up);
    el.classList.remove('is-dragging');
    document.body.style.userSelect = '';
    if (zone) snapTo(w, zone);
    showSnap(null);
  };
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', up);
  bar.addEventListener('pointercancel', up);
}

function startResize(e, w, h) {
  if (e.button !== 0 || isMobile() || w.el.classList.contains('is-max')) return;
  e.preventDefault(); e.stopPropagation();
  focusWin(w);
  const el = w.el, dir = h.dataset.dir, sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect(), hr = hostRect();
  const minW = parseFloat(getComputedStyle(el).minWidth) || 300, minH = 200;
  try { h.setPointerCapture(e.pointerId); } catch { /* ok */ }
  el.classList.add('is-resizing');
  w.snapped = null;
  const move = ev => {
    if (dir !== 's') el.style.width = clamp(r.width + ev.clientX - sx, minW, hr.right - r.left) + 'px';
    if (dir !== 'e') el.style.height = clamp(r.height + ev.clientY - sy, minH, hr.bottom - r.top) + 'px';
  };
  const up = () => {
    h.removeEventListener('pointermove', move);
    h.removeEventListener('pointerup', up);
    h.removeEventListener('pointercancel', up);
    el.classList.remove('is-resizing');
  };
  h.addEventListener('pointermove', move);
  h.addEventListener('pointerup', up);
  h.addEventListener('pointercancel', up);
}

// Mantém as janelas alcançáveis quando o navegador muda de tamanho.
let resizeT;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (isMobile()) return;
    const hr = hostRect();
    wins.forEach(w => {
      if (!w.placed) return;
      if (w.snapped) { const z = w.snapped; w.snapped = null; snapTo(w, z); return; }
      const r = rectOf(w);
      r.width = Math.min(r.width, hr.width - 16);
      r.height = Math.min(r.height, hr.height - 16);
      r.left = clamp(r.left, -r.width + 100, Math.max(0, hr.width - 100));
      r.top = clamp(r.top, 0, Math.max(0, hr.height - 44));
      applyRect(w, r);
    });
  }, 120);
});

/* ---------------- Barra de tarefas ---------------- */
function addTask(w) {
  if (w.task) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'task';
  b.title = w.app.title;
  b.setAttribute('aria-label', w.app.title);
  b.innerHTML = `<span class="tile" style="background:${w.app.tile}">${icon(w.app.icon)}</span><span class="task-label"></span>`;
  b.querySelector('.task-label').textContent = w.app.title;
  b.addEventListener('click', () => {
    sfx.click();
    if (w.min) restore(w);
    else if (activeWin === w) minimize(w);
    else focusWin(w);
  });
  tasksEl.append(b);
  w.task = b;
}
function removeTask(w) { if (w.task) { w.task.remove(); w.task = null; } }
function updateTasks() {
  wins.forEach(w => {
    if (!w.task) return;
    const on = activeWin === w && !w.min;
    w.task.classList.toggle('is-active', on);
    w.task.classList.toggle('is-min', w.min);
    w.task.setAttribute('aria-pressed', String(on));
  });
}

const clockTime = $('#clock .time'), clockDate = $('#clock .date');
function tick() {
  const d = new Date();
  clockTime.textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  clockTime.dateTime = d.toISOString();
  clockDate.textContent = d.toLocaleDateString('pt-BR');
}

/* ---------------- Rotas: #app abre o app ---------------- */
function setHash(id) {
  try { history.replaceState(history.state, '', id ? '#' + id : location.pathname + location.search); } catch { /* ok */ }
}
addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (APP[id] && !APP[id].href) openApp(id, { silent: true });
});
addEventListener('popstate', () => {
  // No celular, o botão "voltar" do aparelho fecha (minimiza) o app aberto.
  if (!isMobile()) return;
  const id = location.hash.slice(1);
  let top = null, bz = -1;
  wins.forEach(o => { if (o.open && !o.min && o.id !== id) { const z = +o.el.style.zIndex || 0; if (z > bz) { bz = z; top = o; } } });
  if (top) minimize(top);
});

/* ============================================================
   ÁREA DE TRABALHO, MENUS E PERSONALIZAÇÃO
   ============================================================ */
const startBtn = $('#start-btn'), startMenu = $('#start-menu'), smInput = $('#sm-input');
const smHome = $('#sm-home'), smResults = $('#sm-results');
const quick = $('#quick'), trayQuick = $('#tray-quick'), traySound = $('#tray-sound'), qsSound = $('#qs-sound');
const ctxMenu = $('#ctx');

function renderIcons() {
  const nav = $('#icons');
  nav.innerHTML = APPS.map(a =>
    `<button class="dicon" type="button" data-app="${a.id}" title="${esc(a.title)}${a.href ? ' (abre em nova aba)' : ''}">` +
    `${tileHTML(a, a.href ? ' is-link' : '')}<span class="dicon-label">${esc(a.title)}</span></button>`).join('');
  let lastPointer = 'mouse';
  nav.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
  nav.addEventListener('click', e => {
    const b = e.target.closest('.dicon'); if (!b) return;
    // Toque, celular ou teclado (Enter/Espaço) abrem direto; mouse seleciona e o duplo clique abre.
    if (e.detail === 0 || lastPointer !== 'mouse' || isMobile()) { openApp(b.dataset.app); return; }
    $$('.dicon.is-selected').forEach(d => d.classList.remove('is-selected'));
    b.classList.add('is-selected');
    sfx.click();
  });
  nav.addEventListener('dblclick', e => {
    const b = e.target.closest('.dicon');
    if (b && lastPointer === 'mouse' && !isMobile()) openApp(b.dataset.app);
  });
}

/* Menu Iniciar + busca */
let INDEX = [], results = [], sel = 0;
function projectInfo(card) {
  const ic = card.querySelector('.project-icon');
  const link = card.querySelector('.plink');
  return {
    title: card.querySelector('h3').textContent.trim(),
    desc: card.querySelector('p').textContent.trim(),
    tags: card.querySelector('.tags') ? card.querySelector('.tags').textContent : '',
    href: link ? link.href : CONFIG.githubUrl,
    icon: ic.querySelector('use').getAttribute('href').replace('#i-', ''),
    tile: ic.style.getPropertyValue('--g'),
  };
}
function buildIndex() {
  const items = [];
  APPS.forEach(a => items.push({ kind: 'App', title: a.title, desc: a.href ? 'Abre em nova aba' : 'Abrir aplicativo', keywords: a.keywords, icon: a.icon, tile: a.tile, run: () => openApp(a.id) }));
  const CAT_WORDS = { ia: 'ia inteligencia artificial agentes llm', web: 'web site', dados: 'dados data analytics', algo: 'algoritmos jogos game' };
  $$('#project-grid .project').forEach(card => {
    const p = projectInfo(card);
    const keywords = card.dataset.cat.split(' ').map(c => CAT_WORDS[c] || c).join(' ');
    items.push({ ...p, keywords, kind: 'Projeto', run: () => window.open(p.href, '_blank', 'noopener') });
  });
  const gray = 'linear-gradient(135deg,#94a3b8,#475569)';
  [
    ['Tema Moderno', 'Visual atual, claro ou escuro', 'palette', () => setSetting('theme', 'moderno')],
    ['Tema XP', 'Visual clássico Luna', 'palette', () => setSetting('theme', 'xp')],
    ['Tema Vista', 'Visual Aero com vidro', 'palette', () => setSetting('theme', 'vista')],
    ['Modo escuro', 'Tema Moderno escuro', 'moon', () => { settings.theme = 'moderno'; store.set('theme', 'moderno'); setSetting('scheme', 'dark'); }],
    ['Modo claro', 'Tema Moderno claro', 'sun', () => { settings.theme = 'moderno'; store.set('theme', 'moderno'); setSetting('scheme', 'light'); }],
    ['Ligar ou desligar sons', 'Efeitos sonoros do sistema', 'volume', () => setSound(!settings.sound)],
    ['Personalizar', 'Tema, cor de destaque e papel de parede', 'palette', () => setFlyout('quick')],
    ['Copiar e-mail', CONFIG.email, 'copy', () => copyText(CONFIG.email)],
    ['Encerrar sessão', 'Desligar o LucasOS', 'power', askShutdown],
  ].forEach(([title, desc, ic, run]) => items.push({ kind: 'Comando', title, desc, icon: ic, tile: gray, keywords: 'comando configuracao tema', run }));
  // Busca por início de palavra ("ia" acha "IA", mas não "tecnologias").
  items.forEach(it => { it.words = norm([it.title, it.desc, it.keywords, it.tags].filter(Boolean).join(' ')).split(/[^a-z0-9*#+]+/).filter(Boolean); });
  return items;
}
function itemHTML(it, i) {
  return `<button class="sm-item" type="button" role="option" data-idx="${i}">` +
    `<span class="mini" style="background:${it.tile}">${icon(it.icon)}</span>` +
    `<span class="grow"><b>${esc(it.title)}</b><small>${esc(it.desc || '')}</small></span>` +
    `<span class="kind">${it.kind}</span></button>`;
}
function renderStart() {
  $('#sm-apps').innerHTML = APPS.map(a =>
    `<button class="sm-app" type="button" data-app="${a.id}">${tileHTML(a, a.href ? ' is-link' : '')}<span>${esc(a.title)}</span></button>`).join('');
  $('#sm-featured').innerHTML = $$('#project-grid .project.is-featured').map(card => {
    const p = projectInfo(card);
    return `<a class="sm-item" href="${esc(p.href)}" target="_blank" rel="noopener">` +
      `<span class="mini" style="background:${p.tile}">${icon(p.icon)}</span>` +
      `<span class="grow"><b>${esc(p.title)}</b><small>${esc(p.desc)}</small></span>${icon('external')}</a>`;
  }).join('');
  INDEX = buildIndex();
}
function runSearch(q) {
  const nq = norm(q.trim());
  if (!nq) { smHome.hidden = false; smResults.hidden = true; results = []; return; }
  const toks = nq.split(/\s+/);
  results = INDEX
    .map(it => {
      if (!toks.every(t => it.words.some(w => w.startsWith(t)))) return null;
      const nt = norm(it.title);
      const s = (nt.startsWith(nq) ? 10 : nt.includes(nq) ? 5 : 0) + (it.kind === 'App' ? 2 : it.kind === 'Projeto' ? 1 : 0);
      return { it, s };
    })
    .filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 9).map(x => x.it);
  sel = 0;
  smHome.hidden = true; smResults.hidden = false;
  smResults.innerHTML = results.length ? results.map(itemHTML).join('')
    : `<div class="sm-empty">Nada encontrado para “${esc(q.trim())}”. Tente “jogo”, “IA” ou “tema”.</div>`;
  markSel();
}
function markSel() {
  $$('.sm-item', smResults).forEach((b, i) => { b.classList.toggle('is-sel', i === sel); b.setAttribute('aria-selected', String(i === sel)); });
  const cur = smResults.children[sel];
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}
function activate(it) { setFlyout(null); sfx.click(); it.run(); }

smInput.addEventListener('input', () => runSearch(smInput.value));
smInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!results.length) return;
    e.preventDefault();
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    markSel();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (results[sel]) activate(results[sel]);
  }
});
smResults.addEventListener('click', e => { const b = e.target.closest('.sm-item'); if (b) activate(results[+b.dataset.idx]); });
$('#sm-apps').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) openApp(b.dataset.app); });
$('#sm-featured').addEventListener('click', e => { if (e.target.closest('a')) setFlyout(null); });

/* Flyouts: menu Iniciar, Personalizar, menu de contexto */
function flyoutOpen() {
  return startMenu.classList.contains('is-open') ? 'start' : quick.classList.contains('is-open') ? 'quick' : null;
}
function setFlyout(name) {
  const s = name === 'start', q = name === 'quick';
  startMenu.classList.toggle('is-open', s); startBtn.setAttribute('aria-expanded', String(s));
  quick.classList.toggle('is-open', q); trayQuick.setAttribute('aria-expanded', String(q));
  ctxMenu.classList.remove('is-open');
  if (s) {
    smInput.value = ''; runSearch('');
    smHome.parentElement.scrollTop = 0;
    if (!mqCoarse.matches) requestAnimationFrame(() => smInput.focus({ preventScroll: true }));
  }
}
startBtn.addEventListener('click', () => { sfx.click(); setFlyout(flyoutOpen() === 'start' ? null : 'start'); });
trayQuick.addEventListener('click', () => { sfx.click(); setFlyout(flyoutOpen() === 'quick' ? null : 'quick'); });
$('#sm-power').addEventListener('click', askShutdown);

quick.addEventListener('click', e => {
  const b = e.target.closest('[data-value]'); if (!b) return;
  const group = b.closest('[data-setting]'); if (!group) return;
  sfx.click();
  setSetting(group.dataset.setting, b.dataset.value);
});
function syncQuick() {
  $$('[data-setting]', quick).forEach(g => {
    const k = g.dataset.setting;
    $$('[data-value]', g).forEach(b => b.setAttribute('aria-pressed', String(!(k === 'wallpaper' && customWallpaper) && b.dataset.value === settings[k])));
  });
  $('.qs-modern', quick).hidden = settings.theme !== 'moderno';
  qsSound.setAttribute('aria-checked', String(settings.sound));
  traySound.innerHTML = icon(settings.sound ? 'volume' : 'mute');
  traySound.setAttribute('aria-pressed', String(settings.sound));
  traySound.setAttribute('aria-label', settings.sound ? 'Sons ativados' : 'Sons desativados');
}
function setSound(on) { setSetting('sound', on); if (on) sfx.click(); }
traySound.addEventListener('click', () => setSound(!settings.sound));
qsSound.addEventListener('click', () => setSound(!settings.sound));

const wpInput = $('#wallpaper-input');
$('#qs-upload').addEventListener('click', () => wpInput.click());
wpInput.addEventListener('change', () => {
  const f = wpInput.files && wpInput.files[0];
  if (!f) return;
  setCustomWallpaper('custom', URL.createObjectURL(f));
  wpInput.value = '';
  toast('Papel de parede aplicado (vale até recarregar a página).', 'image');
});

$('#desktop').addEventListener('contextmenu', e => {
  if (isTyping(e.target) || e.target.closest('a')) return;
  e.preventDefault();
  setFlyout(null);
  ctxMenu.classList.add('is-open');
  const r = ctxMenu.getBoundingClientRect();
  ctxMenu.style.left = Math.min(e.clientX, innerWidth - r.width - 6) + 'px';
  ctxMenu.style.top = Math.min(e.clientY, innerHeight - r.height - 6) + 'px';
  ctxMenu.querySelector('button').focus({ preventScroll: true });
});
ctxMenu.addEventListener('click', e => {
  const b = e.target.closest('[data-ctx]'); if (!b) return;
  ctxMenu.classList.remove('is-open');
  const a = b.dataset.ctx;
  if (a === 'quick') setFlyout('quick');
  else if (a === 'wallpaper') wpInput.click();
  else if (a === 'terminal') openApp('terminal');
  else if (a === 'about') openApp('bemvindo');
});

// Clique fora fecha menus e desmarca ícones.
document.addEventListener('pointerdown', e => {
  const t = e.target;
  const open = flyoutOpen();
  if (open === 'start' && !t.closest('#start-menu, #start-btn')) setFlyout(null);
  if (open === 'quick' && !t.closest('#quick, #tray-quick')) setFlyout(null);
  if (!t.closest('#ctx')) ctxMenu.classList.remove('is-open');
  if (!t.closest('.dicon')) $$('.dicon.is-selected').forEach(d => d.classList.remove('is-selected'));
}, true);

// Atalhos globais.
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault(); setFlyout(flyoutOpen() === 'start' ? null : 'start'); return;
  }
  if (e.key === '/' && !isTyping(e.target) && modal.hidden) { e.preventDefault(); setFlyout('start'); return; }
  if (e.key === 'Escape') {
    if (!modal.hidden) { hideModal(); return; }
    const open = flyoutOpen();
    if (open || ctxMenu.classList.contains('is-open')) {
      setFlyout(null);
      (open === 'quick' ? trayQuick : startBtn).focus({ preventScroll: true });
    }
  }
});

/* ---------------- Conteúdo das janelas ---------------- */
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); openApp(o.dataset.open); return; }
  const c = e.target.closest('[data-copy]');
  if (c) copyText(c.dataset.copy);
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ok */ }
    ta.remove();
  }
  sfx.pick();
  toast('Copiado: ' + text, 'check');
}

function setupProjects() {
  const cards = $$('#project-grid .project'), count = $('#project-count'), filters = $$('.filter');
  const apply = f => {
    let n = 0;
    cards.forEach(c => { const show = f === 'all' || c.dataset.cat.split(' ').includes(f); c.hidden = !show; if (show) n++; });
    count.textContent = n + (n === 1 ? ' projeto' : ' projetos');
  };
  filters.forEach(b => b.addEventListener('click', () => {
    filters.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply(b.dataset.filter);
    sfx.click();
  }));
  apply('all');
}

function setupCompose() {
  const form = $('#compose');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = form.nome.value.trim(), assunto = form.assunto.value.trim(), msg = form.mensagem.value.trim();
    if (!msg) { form.mensagem.focus(); toast('Escreva uma mensagem antes de continuar.', 'info'); return; }
    const subject = assunto || ('Contato pelo portfólio' + (nome ? ' — ' + nome : ''));
    const body = msg + (nome ? '\n\n— ' + nome : '');
    location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

/* ---------------- Encerrar sessão ---------------- */
function askShutdown() {
  setFlyout(null);
  showModal({
    title: 'Encerrar sessão',
    message: 'Quer mesmo desligar o LucasOS? Dá pra ligar de novo com um clique.',
    buttons: [{ label: 'Continuar navegando' }, { label: 'Desligar', primary: true, onClick: shutdown }],
  });
}
function shutdown() {
  sfx.close();
  const sd = $('#shutdown');
  sd.hidden = false;
  const wake = () => {
    removeEventListener('keydown', wake);
    sd.removeEventListener('click', wake);
    try { sessionStorage.removeItem('lucasos:booted'); } catch { /* ok */ }
    location.replace(location.pathname + location.search);
  };
  setTimeout(() => { addEventListener('keydown', wake); sd.addEventListener('click', wake); }, 700);
}

/* ============================================================
   API pública (usada por apps.js)
   ============================================================ */
const API = {
  config: CONFIG,
  apps: APPS,
  bootTime: Date.now(),
  store, sfx, toast, icon, settings, showModal,
  register(id, fn) { inits[id] = fn; },
  open: openApp,
  close(id) { const w = wins.get(id); if (w) closeWin(w); },
  isVisible(id) { const w = wins.get(id); return !!(w && w.open && !w.min); },
  isActive(id) { return !!(activeWin && activeWin.id === id && !activeWin.min); },
  setSetting,
  setCustomWallpaper,
};
window.LucasOS = API;

/* ============================================================
   BOOT
   ============================================================ */
function openBootWindows() {
  const hr = hostRect();
  const iconsRight = $('#icons').getBoundingClientRect().right + 18;
  const widgets = $('.widgets');
  const widgetsLeft = widgets && widgets.offsetParent ? widgets.getBoundingClientRect().left - 18 : hr.width - 18;
  const proj = wins.get('projetos'), sobre = wins.get('sobre');
  const pw = Math.min(+proj.el.dataset.w, hr.width - 24);
  place(proj, { x: Math.max(iconsRight + 160, widgetsLeft - pw), y: 70 });
  place(sobre, { x: iconsRight, y: 24 });
  openApp('projetos', { silent: true });
  openApp('sobre', { silent: true });
}

function boot() {
  $$('#windows .window').forEach(buildWindow);
  renderIcons();
  setupProjects();
  setupCompose();
  renderStart();
  applySettings();
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000);

  const bootEl = $('#boot');
  const quickBoot = root.classList.contains('no-boot');
  if (bootEl) {
    if (quickBoot) bootEl.remove();
    else bootEl.addEventListener('animationend', e => { if (e.animationName === 'boot-out') bootEl.remove(); });
  }
  try { sessionStorage.setItem('lucasos:booted', '1'); } catch { /* ok */ }

  setTimeout(() => {
    const hashId = location.hash.slice(1);
    const deepLink = APP[hashId] && !APP[hashId].href ? hashId : null;
    if (!isMobile()) openBootWindows();
    if (deepLink) openApp(deepLink, { silent: true });
    if (!store.get('seen-v2', false)) {
      store.set('seen-v2', true);
      setTimeout(() => toast(isMobile()
        ? 'Bem-vindo ao LucasOS! Toque em um ícone para abrir. A paleta na barra troca o tema.'
        : 'Bem-vindo ao LucasOS 2.0! Ctrl+K busca tudo, e a paleta na barra troca o tema (XP e Vista incluídos).', 'sparkles', 7000), 700);
    }
  }, quickBoot ? 0 : 1050);
}

// Scripts "defer" rodam antes do DOMContentLoaded: esperar garante que apps.js já se registrou.
if (document.readyState === 'complete') boot();
else document.addEventListener('DOMContentLoaded', boot);

})();
