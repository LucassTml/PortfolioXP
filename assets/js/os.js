/* =============================================================
   LucasOS XP - núcleo do sistema
   Janelas, barra de tarefas, menu iniciar, menus, abas, balões,
   dicas, logon/logoff/desligar, proteção de tela e configurações.
   Os programas ficam em apps.js e se registram com LucasOS.register().
   ============================================================= */
(() => {
'use strict';

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */
const CONFIG = {
  githubUser: 'LucassTml',
  githubUrl: 'https://github.com/LucassTml',
  linkedinUrl: 'https://www.linkedin.com/in/lucas-eduardo-melo-tenorio-05326a311/',
  email: 'lemt99@gmail.com',
};

// "desk" coloca o ícone na área de trabalho; "dialog" cria uma janela só com o botão fechar.
const APPS = [
  { id: 'sistema', title: 'Meu Computador', win: 'Propriedades do sistema', icon: 'computer', desk: 1, dialog: 1, tip: 'Mostra informações sobre este computador e sobre o dono dele.', keys: 'sistema computador sobre' },
  { id: 'sobre', title: 'Sobre Mim', win: 'Sobre Mim.txt - Bloco de Notas', icon: 'notepad', desk: 1, tip: 'Quem eu sou, o que estudo e o que estou fazendo agora.', keys: 'bloco de notas notepad txt quem' },
  { id: 'projetos', title: 'Meus Projetos', icon: 'folder', desk: 1, tip: 'Projetos com links para o código e para os sites.', keys: 'portfolio repositorios pasta' },
  { id: 'habilidades', title: 'Habilidades', win: 'Propriedades de Habilidades', icon: 'cpanel', desk: 1, dialog: 1, tip: 'Linguagens, ferramentas e o que eu uso no dia a dia.', keys: 'skills stack tecnologias linguagens' },
  { id: 'trajetoria', title: 'Trajetória', icon: 'cap', desk: 1, tip: 'Faculdade, cursos e experiências.', keys: 'formacao curriculo upe rocketlab visagio' },
  { id: 'github', title: 'GitHub', win: 'GitHub: LucassTml - Navegador', icon: 'github', desk: 1, tip: 'Meu perfil e meus repositórios, carregados ao vivo.', keys: 'navegador internet repositorios' },
  { id: 'linkedin', title: 'LinkedIn', icon: 'linkedin', desk: 1, href: CONFIG.linkedinUrl, tip: 'Abre meu LinkedIn em uma nova aba.', keys: 'perfil profissional' },
  { id: 'contato', title: 'Contato', win: 'Nova mensagem', icon: 'mail', desk: 1, tip: 'E-mail, telefone e um jeito rápido de me escrever.', keys: 'email mensagem telefone' },
  { id: 'terminal', title: 'Prompt de Comando', icon: 'cmd', desk: 1, tip: 'Digite help para ver os comandos.', keys: 'cmd terminal console shell' },
  { id: 'invaders', title: 'Invasores', icon: 'invader', desk: 1, group: 'jogos', tip: 'Jogo de nave com três fases e power-ups.', keys: 'jogo game nave' },
  { id: 'hexagon', title: 'Hexágono', icon: 'hexagon', desk: 1, group: 'jogos', tip: 'Jogo de reflexo. Quanto tempo você aguenta?', keys: 'jogo game reflexo' },
  { id: 'ordenacao', title: 'Ordenação', icon: 'chart', desk: 1, group: 'acessorios', tip: 'Algoritmos de ordenação funcionando passo a passo.', keys: 'sort algoritmos quick merge heap' },
  { id: 'labirinto', title: 'Labirinto', icon: 'maze', desk: 1, group: 'acessorios', tip: 'Gera um labirinto e procura a saída com BFS, DFS, Dijkstra ou A*.', keys: 'maze grafos busca bfs dfs dijkstra' },
  { id: 'lixeira', title: 'Lixeira', icon: 'recycle', desk: 'corner', tip: 'Versões antigas deste site.', keys: 'lixo versao antiga v1' },
  { id: 'ajuda', title: 'Ajuda e suporte', icon: 'help', tip: 'Como usar o LucasOS.', keys: 'help ajuda atalhos' },
  { id: 'executar', title: 'Executar', icon: 'run', dialog: 1, keys: 'run' },
  { id: 'video', title: 'Propriedades de Vídeo', icon: 'display', dialog: 1, keys: 'painel de controle tema papel de parede aparencia protecao de tela cores' },
];

/* ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const mqMobile = matchMedia('(max-width: 760px)');
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqCoarse = matchMedia('(pointer: coarse)');
const isMobile = () => mqMobile.matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isTyping = t => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const icon = (name, cls = 'xi') => `<svg class="${cls}" aria-hidden="true"><use href="#${name.startsWith('p-') ? name : 'x-' + name}"/></svg>`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const APP = Object.fromEntries(APPS.map(a => [a.id, a]));

const store = {
  get(k, d) { try { const v = localStorage.getItem('lucasos:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lucasos:' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};

/* ---------------- Configurações ---------------- */
const DEFAULTS = { theme: 'xp', scheme: 'azul', wallpaper: 'colinas', sound: true, effects: true, saver: 'logo', saverWait: 5 };
const VALID = {
  theme: ['xp', 'vista'], scheme: ['azul', 'oliva', 'prateado'], wallpaper: ['colinas', 'azul', 'aero', 'nenhum'],
  saver: ['logo', 'estrelas', 'nenhuma'],
};
const settings = {};
Object.keys(DEFAULTS).forEach(k => {
  const v = store.get(k, DEFAULTS[k]);
  settings[k] = VALID[k] ? (VALID[k].includes(v) ? v : DEFAULTS[k]) : (typeof v === typeof DEFAULTS[k] ? v : DEFAULTS[k]);
});
settings.saverWait = clamp(Math.round(+settings.saverWait) || 5, 1, 60);
// ?tema=azul|oliva|prateado|vista abre no visual pedido (sem salvar).
const qTema = new URLSearchParams(location.search).get('tema');
if (qTema === 'vista') settings.theme = 'vista';
else if (VALID.scheme.includes(qTema)) { settings.theme = 'xp'; settings.scheme = qTema; }

let customWp = null;
function applySettings() {
  root.dataset.theme = settings.theme;
  root.dataset.scheme = settings.scheme;
  root.dataset.wp = customWp ? customWp.kind : settings.wallpaper;
  root.classList.toggle('no-fx', !settings.effects);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = settings.theme === 'vista' ? '#1b2a3e' : { azul: '#245edc', oliva: '#8aa366', prateado: '#c8c8d4' }[settings.scheme];
  syncTray();
  document.dispatchEvent(new CustomEvent('lucasos:settings', { detail: { ...settings } }));
}
function setSetting(k, v, persist = true) {
  settings[k] = v;
  if (persist) store.set(k, v);
  if (k === 'wallpaper') clearCustomWp();
  if (k === 'saver' || k === 'saverWait') resetIdle();
  applySettings();
}
function setCustomWallpaper(kind, url) {
  clearCustomWp();
  customWp = { kind, url };
  root.style.setProperty('--wp-custom', `url("${url}")`);
  applySettings();
}
function clearCustomWp() {
  if (customWp && customWp.url.startsWith('blob:')) URL.revokeObjectURL(customWp.url);
  customWp = null;
}

/* ---------------- Sons (sintetizados com Web Audio) ---------------- */
const sfx = (() => {
  let ctx = null, unlocked = false;
  addEventListener('pointerdown', () => { unlocked = true; }, { once: true, capture: true });
  addEventListener('keydown', () => { unlocked = true; }, { once: true, capture: true });
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
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    } catch { /* ignora */ }
  }
  return {
    tone,
    click() { tone(900, 0.03, 'triangle', 0.025); },
    ding() { tone(880, 0.35, 'sine', 0.05); tone(1320, 0.3, 'sine', 0.025, 0.02); },
    error() { tone(330, 0.12, 'square', 0.03); tone(247, 0.25, 'square', 0.03, 0.12); },
    balloon() { tone(1046, 0.12, 'sine', 0.04); tone(1568, 0.18, 'sine', 0.03, 0.08); },
    startup() { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, 'sine', 0.04, i * 0.12)); },
    logoff() { [783.99, 659.25, 523.25, 392].forEach((f, i) => tone(f, 0.4, 'sine', 0.04, i * 0.12)); },
    key() { tone(1150 + Math.random() * 250, 0.02, 'square', 0.008); },
    pick() { tone(660, 0.07, 'triangle', 0.045); tone(990, 0.09, 'triangle', 0.04, 0.06); },
    shoot() { tone(880, 0.05, 'square', 0.014); },
    hit() { tone(130, 0.16, 'sawtooth', 0.04); },
  };
})();
addEventListener('pointerdown', () => {
  try { if (sessionStorage.getItem('lucasos:chime')) return; sessionStorage.setItem('lucasos:chime', '1'); } catch { /* ok */ }
  if ($('#session').hidden) setTimeout(() => sfx.startup(), 40);
}, { once: true });

/* ---------------- Dicas (tooltips amarelas) ---------------- */
const tipEl = $('#tooltip');
let tipTimer = 0, tipFor = null, mouseX = 0, mouseY = 0;
function hideTip() { clearTimeout(tipTimer); tipEl.hidden = true; tipFor = null; }
addEventListener('pointermove', e => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const t = e.target.closest('[data-tip]');
  if (t === tipFor) return;
  hideTip();
  if (!t || !t.dataset.tip) return;
  tipFor = t;
  tipTimer = setTimeout(() => {
    tipEl.textContent = t.dataset.tip;
    tipEl.hidden = false;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = clamp(mouseX + 2, 4, innerWidth - w - 4) + 'px';
    tipEl.style.top = (mouseY + 22 + h > innerHeight ? mouseY - h - 6 : mouseY + 22) + 'px';
  }, 650);
});
document.addEventListener('pointerdown', hideTip, true);
addEventListener('blur', hideTip);

/* ---------------- Balões da área de notificação ---------------- */
const balloonsEl = $('#balloons');
function balloon({ title, text, ico = 'info', ms = 9000, anchor = $('.tray') }) {
  $$('.balloon', balloonsEl).forEach(b => b.remove());
  const b = document.createElement('div');
  b.className = 'balloon';
  b.setAttribute('role', 'status');
  b.innerHTML = `<b>${icon(ico)}<span></span></b><p></p><button class="bx" type="button" aria-label="Fechar">x</button>`;
  b.querySelector('span').textContent = title;
  b.querySelector('p').textContent = text;
  balloonsEl.append(b);
  const ar = anchor.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight;
  const cx = ar.left + Math.min(ar.width, 60) / 2;
  const left = clamp(cx - bw + 30, 8, innerWidth - bw - 8);
  b.style.left = left + 'px';
  b.style.top = Math.max(8, ar.top - bh - 18) + 'px';
  b.style.setProperty('--tail', clamp(left + bw - cx - 8, 10, bw - 30) + 'px');
  sfx.balloon();
  const kill = () => { if (!b.isConnected) return; b.classList.add('is-out'); setTimeout(() => b.remove(), 360); };
  b.querySelector('.bx').addEventListener('click', kill);
  setTimeout(kill, ms);
}

/* ---------------- Caixa de mensagem ---------------- */
const msgEl = $('#msgbox');
let msgResolve = null, msgReturn = null;
function msgbox({ title = 'LucasOS', text = '', ico = 'info', buttons = ['OK'] } = {}) {
  if (msgResolve) closeMsg(null);
  $('#msg-title').textContent = title;
  $('#msg-text').textContent = text;
  $('#msg-icon use').setAttribute('href', '#x-' + ico);
  const box = $('#msg-buttons');
  box.replaceChildren(...buttons.map((label, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => closeMsg(i));
    return b;
  }));
  msgReturn = document.activeElement;
  msgEl.hidden = false;
  box.firstElementChild.focus();
  if (ico === 'error') sfx.error(); else sfx.ding();
  return new Promise(res => { msgResolve = res; });
}
function closeMsg(result) {
  msgEl.hidden = true;
  const r = msgResolve; msgResolve = null;
  if (r) r(result);
  if (msgReturn && msgReturn.focus) msgReturn.focus({ preventScroll: true });
}
$('[data-msg-close]').addEventListener('click', () => closeMsg(null));
msgEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); closeMsg(null); }
  if (e.key === 'Tab') {
    const f = $$('button', msgEl), i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  }
});

/* ============================================================
   JANELAS
   ============================================================ */
const windowsHost = $('#windows');
const tasksEl = $('#tasks');
const wins = new Map();
const inits = {};
let zTop = 20, cascadeN = 0, activeWin = null;
const hostRect = () => windowsHost.getBoundingClientRect();

function buildWindow(el) {
  const id = el.dataset.app, app = APP[id];
  if (!app) return;
  const bar = document.createElement('header');
  bar.className = 'titlebar';
  bar.innerHTML =
    `<svg class="t-icon" aria-hidden="true"><use href="#x-${app.icon}"/></svg><h2 class="t-title" id="wt-${id}"></h2><div class="t-controls">` +
    (app.dialog ? '' :
      `<button class="t-btn" type="button" data-act="min" aria-label="Minimizar" data-tip="Minimizar"><svg><use href="#tb-min"/></svg></button>` +
      `<button class="t-btn" type="button" data-act="max" aria-label="Maximizar" data-tip="Maximizar"><svg><use href="#tb-max"/></svg></button>`) +
    `<button class="t-btn t-close" type="button" data-act="close" aria-label="Fechar" data-tip="Fechar"><svg><use href="#tb-close"/></svg></button></div>`;
  bar.querySelector('.t-title').textContent = app.win || app.title;
  el.prepend(bar);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'wt-' + id);
  el.tabIndex = -1;
  if (app.dialog) el.classList.add('no-resize');
  else ['se', 'e', 's'].forEach(dir => {
    const h = document.createElement('div');
    h.className = 'resize'; h.dataset.dir = dir;
    el.append(h);
  });
  const w = { id, app, el, bar, open: false, min: false, placed: false, inited: false, task: null, busy: false };
  wins.set(id, w);
  el.addEventListener('pointerdown', () => focusWin(w), true);
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'close') closeWin(w);
    else if (act === 'max') toggleMax(w);
    else if (act === 'min') {
      if (isMobile() && history.state && history.state.lucasos === id) history.back();
      else minimize(w);
    }
  });
  bar.addEventListener('dblclick', e => { if (!e.target.closest('.t-btn') && !app.dialog && !isMobile()) toggleMax(w); });
  bar.addEventListener('pointerdown', e => startDrag(e, w));
  $$('.resize', el).forEach(h => h.addEventListener('pointerdown', e => startResize(e, w, h)));
}

function place(w, pos) {
  const el = w.el, hr = hostRect();
  const W = Math.min((pos && pos.w) || +el.dataset.w || 520, hr.width - 16);
  const H = Math.min((pos && pos.h) || +el.dataset.h || 420, hr.height - 16);
  let x, y;
  if (pos) { x = pos.x; y = pos.y; }
  else {
    const n = cascadeN++ % 8;
    x = Math.max(24, (hr.width - W) / 2 - 90) + n * 26;
    y = Math.max(16, (hr.height - H) / 2 - 70) + n * 26;
  }
  x = clamp(x, 4, Math.max(4, hr.width - W - 4));
  y = clamp(y, 4, Math.max(4, hr.height - H - 4));
  Object.assign(el.style, { left: Math.round(x) + 'px', top: Math.round(y) + 'px', width: Math.round(W) + 'px', height: Math.round(H) + 'px' });
  w.placed = true;
}

const fx = () => settings.effects && !mqReduce.matches;
// Animação de "retângulo" do XP ao minimizar, restaurar e maximizar.
function ghost(from, to, ms = 210) {
  if (!fx() || !from || !to || isMobile()) return Promise.resolve();
  const g = document.createElement('div');
  g.className = 'zoom-ghost';
  document.body.append(g);
  const f = r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  const a = g.animate([f(from), f(to)], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
  return a.finished.catch(() => {}).then(() => g.remove());
}
const captionRect = w => { const r = w.el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: 30 }; };
const taskRect = w => {
  if (w.task) { const r = w.task.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  return { left: 0, top: innerHeight - 28, width: 150, height: 24 };
};

function busyCursor(ms) {
  if (!fx()) return Promise.resolve();
  root.classList.add('is-busy');
  return wait(ms).then(() => root.classList.remove('is-busy'));
}

function emitVis(w) {
  document.dispatchEvent(new CustomEvent('lucasos:visibility', { detail: { id: w.id, visible: w.open && !w.min } }));
}

async function openApp(id, opts = {}) {
  const app = APP[id]; if (!app) return;
  closeMenus();
  closeStart();
  if (app.href) { window.open(app.href, '_blank', 'noopener'); return; }
  const w = wins.get(id); if (!w || w.busy) return;
  if (w.open) {
    if (w.min) restore(w); else focusWin(w, { focusEl: true });
    return;
  }
  w.busy = true;
  if (!opts.silent) await busyCursor(240);   // o cursor de "trabalhando" do XP
  if (!w.placed) place(w, opts.pos);
  w.open = true; w.min = false; w.busy = false;
  w.el.classList.remove('is-min', 'is-hidden');
  w.el.classList.add('is-open');
  addTask(w);
  if (!w.inited && inits[id]) {
    w.inited = true;
    try { inits[id](w.el, API); } catch (err) { console.error('[LucasOS] falha ao iniciar', id, err); }
  }
  focusWin(w, { focusEl: !opts.silent });
  emitVis(w);
  if (!opts.silent) route(id);
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
    (w.el.querySelector('[data-autofocus]') || w.el).focus({ preventScroll: true });
  }
}
function focusTop() {
  let best = null, bz = -1;
  wins.forEach(o => { if (o.open && !o.min) { const z = +o.el.style.zIndex || 0; if (z > bz) { bz = z; best = o; } } });
  if (best) focusWin(best); else { activeWin = null; updateTasks(); }
}

function minimize(w) {
  if (!w.open || w.min) return;
  const from = captionRect(w);
  w.min = true;
  w.el.classList.add('is-min');
  w.el.classList.remove('is-active');
  if (activeWin === w) { activeWin = null; focusTop(); }
  updateTasks(); emitVis(w);
  ghost(from, taskRect(w));
  if (location.hash === '#' + w.id) setHash('');
}
async function restore(w) {
  if (!w.min) return;
  const from = taskRect(w);
  await ghost(from, captionRect(w));
  w.min = false;
  w.el.classList.remove('is-min');
  focusWin(w);
  updateTasks(); emitVis(w);
}
function closeWin(w) {
  if (!w.open) return;
  w.open = false; w.min = false;
  w.el.classList.remove('is-open', 'is-active', 'is-min');
  removeTask(w);
  if (activeWin === w) { activeWin = null; focusTop(); }
  emitVis(w);
  if (location.hash === '#' + w.id) setHash('');
  document.dispatchEvent(new CustomEvent('lucasos:closed', { detail: { id: w.id } }));
}
function setMaxIcon(w, on) {
  const b = w.bar.querySelector('[data-act="max"]');
  if (!b) return;
  b.querySelector('use').setAttribute('href', on ? '#tb-restore' : '#tb-max');
  b.setAttribute('aria-label', on ? 'Restaurar' : 'Maximizar');
  b.dataset.tip = b.getAttribute('aria-label');
}
async function toggleMax(w) {
  if (w.app.dialog) return;
  const from = captionRect(w);
  const on = !w.el.classList.contains('is-max');
  w.el.classList.add('is-hidden');
  w.el.classList.toggle('is-max', on);
  setMaxIcon(w, on);
  await ghost(from, captionRect(w));
  w.el.classList.remove('is-hidden');
  focusWin(w);
}

function startDrag(e, w) {
  if (e.button !== 0 || e.target.closest('.t-btn') || isMobile()) return;
  const el = w.el, bar = w.bar, hr = hostRect();
  const sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect();
  let ox = r.left - hr.left, oy = r.top - hr.top, moved = false;
  try { bar.setPointerCapture(e.pointerId); } catch { /* ok */ }
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      document.body.style.userSelect = 'none';
      if (el.classList.contains('is-max')) {
        const ratio = (sx - r.left) / r.width;
        el.classList.remove('is-max'); setMaxIcon(w, false);
        ox = sx - hr.left - ratio * (parseFloat(el.style.width) || r.width);
        oy = 0;
      }
    }
    el.style.left = clamp(ox + dx, -el.offsetWidth + 80, hr.width - 80) + 'px';
    el.style.top = clamp(oy + dy, 0, hr.height - 30) + 'px';
  };
  const up = () => {
    bar.removeEventListener('pointermove', move);
    bar.removeEventListener('pointerup', up);
    bar.removeEventListener('pointercancel', up);
    document.body.style.userSelect = '';
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
  try { h.setPointerCapture(e.pointerId); } catch { /* ok */ }
  const move = ev => {
    if (dir !== 's') el.style.width = clamp(r.width + ev.clientX - sx, 260, hr.right - r.left) + 'px';
    if (dir !== 'e') el.style.height = clamp(r.height + ev.clientY - sy, 150, hr.bottom - r.top) + 'px';
  };
  const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
  h.addEventListener('pointermove', move);
  h.addEventListener('pointerup', up);
  h.addEventListener('pointercancel', up);
}
let resizeT;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (isMobile()) return;
    const hr = hostRect();
    wins.forEach(w => {
      if (!w.placed) return;
      const s = w.el.style;
      const W = Math.min(parseFloat(s.width), hr.width - 8), H = Math.min(parseFloat(s.height), hr.height - 8);
      s.width = W + 'px'; s.height = H + 'px';
      s.left = clamp(parseFloat(s.left), -W + 80, Math.max(0, hr.width - 80)) + 'px';
      s.top = clamp(parseFloat(s.top), 0, Math.max(0, hr.height - 30)) + 'px';
    });
  }, 120);
});

/* ---------------- Barra de tarefas ---------------- */
function addTask(w) {
  if (w.task) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'task';
  const title = w.app.win || w.app.title;
  b.dataset.tip = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = `${icon(w.app.icon)}<span></span>`;
  b.querySelector('span').textContent = title;
  b.addEventListener('click', () => {
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
    w.task.setAttribute('aria-pressed', String(on));
  });
}
const clockEl = $('#clock');
function tick() {
  const d = new Date();
  clockEl.textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  clockEl.dateTime = d.toISOString();
  clockEl.dataset.tip = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
const traySound = $('#tray-sound');
function syncTray() {
  traySound.querySelector('use').setAttribute('href', settings.sound ? '#x-speaker' : '#x-speaker-off');
  traySound.setAttribute('aria-pressed', String(settings.sound));
  traySound.dataset.tip = settings.sound ? 'Volume (clique para silenciar)' : 'Sem som (clique para ativar)';
}
traySound.addEventListener('click', () => { setSetting('sound', !settings.sound); if (settings.sound) sfx.click(); });
$('#tray-display').addEventListener('click', () => openApp('video'));

/* ---------------- Rotas (#app) ---------------- */
function setHash(id) {
  try { history.replaceState(history.state, '', id ? '#' + id : location.pathname + location.search); } catch { /* ok */ }
}
function route(id) {
  if (isMobile()) { try { history.pushState({ lucasos: id }, '', '#' + id); } catch { /* ok */ } }
  else setHash(id);
}
addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (APP[id] && !APP[id].href) openApp(id, { silent: true });
});
addEventListener('popstate', () => {
  if (!isMobile()) return;
  const id = location.hash.slice(1);
  let top = null, bz = -1;
  wins.forEach(o => { if (o.open && !o.min && o.id !== id) { const z = +o.el.style.zIndex || 0; if (z > bz) { bz = z; top = o; } } });
  if (top) minimize(top);
});

/* ============================================================
   MENUS, ABAS E COMANDOS
   ============================================================ */
const ctxMenu = $('#ctx');
function closeMenus() {
  $$('.mb.is-open').forEach(m => m.classList.remove('is-open'));
  $$('.menubar.is-active').forEach(m => m.classList.remove('is-active'));
  ctxMenu.classList.remove('is-open');
}
document.addEventListener('click', e => {
  const mbBtn = e.target.closest('.mb-btn');
  if (mbBtn) {
    const mb = mbBtn.parentElement, wasOpen = mb.classList.contains('is-open');
    closeMenus();
    if (!wasOpen) { mb.classList.add('is-open'); mb.parentElement.classList.add('is-active'); }
    return;
  }
  const cmd = e.target.closest('[data-cmd]');
  if (cmd && !cmd.disabled) { e.preventDefault(); runCmd(cmd.dataset.cmd, cmd); closeMenus(); return; }
  const copy = e.target.closest('[data-copy]');
  if (copy) { copyText(copy.dataset.copy); closeMenus(); return; }
  const tab = e.target.closest('.tab');
  if (tab) {
    const host = tab.closest('[data-tabs]');
    $$('.tab', host).forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    $$('.tabpanel', host).forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    return;
  }
  const scroll = e.target.closest('[data-scroll]');
  if (scroll) {
    e.preventDefault();
    const t = document.getElementById(scroll.getAttribute('href').slice(1));
    if (t) t.scrollIntoView({ block: 'start', behavior: fx() ? 'smooth' : 'auto' });
    return;
  }
  if (e.target.closest('.mb .menu button, .mb .menu a, #ctx button')) closeMenus();
});
document.addEventListener('pointerover', e => {
  const b = e.target.closest('.mb-btn');
  if (b && b.closest('.menubar.is-active') && !b.parentElement.classList.contains('is-open')) {
    closeMenus();
    b.parentElement.classList.add('is-open');
    b.closest('.menubar').classList.add('is-active');
  }
});
function runCmd(cmd, el) {
  const winEl = el.closest('#windows .window');
  const w = winEl ? wins.get(winEl.dataset.app) : null;
  if (cmd === 'close' && w) return closeWin(w);
  if (cmd === 'min' && w) return minimize(w);
  if (cmd === 'max' && w) return toggleMax(w);
  if (cmd.startsWith('app:')) return openApp(cmd.slice(4));
  if (cmd === 'noop') return;
  document.dispatchEvent(new CustomEvent('lucasos:cmd', { detail: { cmd, id: w ? w.id : null, el, win: winEl } }));
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ok */ }
    ta.remove();
  }
  balloon({ title: 'Copiado', text: text + ' foi copiado para a área de transferência.', ms: 4000 });
}

/* ============================================================
   ÁREA DE TRABALHO
   ============================================================ */
const desktop = $('#desktop');
const iconsEl = $('#icons');
let binEmpty = store.get('bin-empty', false);
const iconOf = a => a.id === 'lixeira' && binEmpty ? 'recycle-empty' : a.icon;

function renderIcons() {
  iconsEl.innerHTML = APPS.filter(a => a.desk).map(a =>
    `<button class="dicon${a.desk === 'corner' ? ' corner' : ''}" type="button" data-app="${a.id}" data-tip="${esc(a.tip || '')}">` +
    `<span class="ico${a.href ? ' is-link' : ''}">${icon(iconOf(a))}</span><span class="lbl">${esc(a.title)}</span></button>`).join('');
}
let lastPointer = 'mouse';
iconsEl.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
iconsEl.addEventListener('click', e => {
  const b = e.target.closest('.dicon'); if (!b) return;
  if (e.detail === 0 || lastPointer !== 'mouse' || isMobile()) { openApp(b.dataset.app); return; }
  if (!(e.ctrlKey || e.metaKey)) $$('.dicon.is-sel').forEach(d => d.classList.remove('is-sel'));
  b.classList.toggle('is-sel', e.ctrlKey || e.metaKey ? !b.classList.contains('is-sel') : true);
});
iconsEl.addEventListener('dblclick', e => {
  const b = e.target.closest('.dicon');
  if (b && lastPointer === 'mouse' && !isMobile()) openApp(b.dataset.app);
});
iconsEl.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const sel = $$('.dicon.is-sel');
  if (sel.length > 1) { e.preventDefault(); sel.forEach(d => openApp(d.dataset.app)); }
});

// Retângulo de seleção ao arrastar na área de trabalho.
const lasso = $('#lasso');
desktop.addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.pointerType !== 'mouse' || e.target.closest('.dicon') || isMobile()) return;
  $$('.dicon.is-sel').forEach(d => d.classList.remove('is-sel'));
  const dr = desktop.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
  let on = false;
  try { desktop.setPointerCapture(e.pointerId); } catch { /* ok */ }
  const icons = $$('.dicon').map(d => ({ d, r: d.getBoundingClientRect() }));
  const move = ev => {
    const x = clamp(ev.clientX, dr.left, dr.right), y = clamp(ev.clientY, dr.top, dr.bottom);
    if (!on && Math.abs(x - sx) + Math.abs(y - sy) < 4) return;
    on = true;
    const l = Math.min(sx, x), t = Math.min(sy, y), r = Math.max(sx, x), b = Math.max(sy, y);
    Object.assign(lasso.style, { left: l - dr.left + 'px', top: t - dr.top + 'px', width: r - l + 'px', height: b - t + 'px' });
    lasso.hidden = false;
    icons.forEach(({ d, r: ir }) => d.classList.toggle('is-sel', ir.left < r && ir.right > l && ir.top < b && ir.bottom > t));
  };
  const up = () => {
    lasso.hidden = true;
    desktop.removeEventListener('pointermove', move);
    desktop.removeEventListener('pointerup', up);
    desktop.removeEventListener('pointercancel', up);
  };
  desktop.addEventListener('pointermove', move);
  desktop.addEventListener('pointerup', up);
  desktop.addEventListener('pointercancel', up);
});

desktop.addEventListener('contextmenu', e => {
  if (e.target.closest('a') || isTyping(e.target)) return;
  e.preventDefault();
  closeStart();
  closeMenus();
  ctxMenu.classList.add('is-open');
  const r = ctxMenu.getBoundingClientRect();
  ctxMenu.style.left = Math.min(e.clientX, innerWidth - r.width - 4) + 'px';
  ctxMenu.style.top = Math.min(e.clientY, innerHeight - r.height - 4) + 'px';
});
ctxMenu.addEventListener('click', e => {
  const b = e.target.closest('[data-ctx]'); if (!b) return;
  ctxMenu.classList.remove('is-open');
  const a = b.dataset.ctx;
  if (a === 'refresh' || a === 'arrange') {
    // O "piscar" dos ícones ao atualizar a área de trabalho.
    $$('.dicon').forEach(d => d.classList.add('is-refresh'));
    setTimeout(() => { renderIcons(); }, 140);
  } else if (a === 'run') openApp('executar');
  else if (a === 'props') openApp('video');
});

/* ============================================================
   MENU INICIAR
   ============================================================ */
const startBtn = $('#start-btn'), startMenu = $('#start-menu'), allProg = $('#all-programs');
function smItem(id, opts = {}) {
  const a = APP[id];
  const label = opts.label || a.title;
  const inner = opts.sub
    ? `${icon(iconOf(a))}<span><b>${esc(label)}</b><small>${esc(opts.sub)}</small></span>`
    : `${icon(iconOf(a))}<span>${esc(label)}</span>`;
  const cls = `sm-item${opts.sub ? ' two' : ''}${opts.bold ? ' bold' : ''}`;
  return a.href
    ? `<a class="${cls}" href="${esc(a.href)}" target="_blank" rel="noopener" role="menuitem" data-tip="${esc(a.tip || '')}">${inner}</a>`
    : `<button class="${cls}" type="button" role="menuitem" data-app="${id}" data-tip="${esc(a.tip || '')}">${inner}</button>`;
}
function renderStart() {
  $('#sm-left').innerHTML =
    smItem('github', { sub: 'Meu perfil e repositórios', bold: true }) +
    smItem('contato', { label: 'E-mail', sub: CONFIG.email, bold: true }) +
    '<div class="sm-sep"></div>' +
    ['sobre', 'projetos', 'terminal', 'invaders', 'hexagon', 'labirinto'].map(id => smItem(id)).join('') +
    '<div class="sm-spacer"></div><div class="sm-sep"></div>' +
    '<button class="sm-item sm-all" type="button" id="sm-all" aria-haspopup="menu">Todos os programas<span class="arrow"></span></button>';
  $('#sm-right').innerHTML =
    smItem('projetos', { bold: true }) + smItem('trajetoria', { bold: true }) + smItem('habilidades', { bold: true }) + smItem('sistema', { bold: true }) +
    '<div class="sm-sep"></div>' +
    smItem('video', { label: 'Painel de controle' }) + smItem('linkedin') + smItem('lixeira') +
    '<div class="sm-sep"></div>' +
    smItem('ajuda') + smItem('executar', { label: 'Executar...' });
  const prog = id => { const a = APP[id]; return a.href
    ? `<a role="menuitem" href="${esc(a.href)}" target="_blank" rel="noopener">${icon(a.icon)}${esc(a.title)}</a>`
    : `<button type="button" role="menuitem" data-app="${id}">${icon(a.icon)}${esc(a.title)}</button>`; };
  const group = (label, ids) => `<div class="sub-host"><button type="button" role="menuitem" class="has-sub" aria-haspopup="menu">${icon('folder')}${label}</button><div class="menu sub" role="menu">${ids.map(prog).join('')}</div></div>`;
  allProg.innerHTML =
    group('Acessórios', ['sobre', 'terminal', 'ordenacao', 'labirinto', 'executar']) +
    group('Jogos', ['invaders', 'hexagon']) +
    '<hr>' + ['github', 'linkedin', 'contato', 'projetos', 'trajetoria', 'habilidades', 'sistema', 'ajuda'].map(prog).join('');
}
function openStart() {
  closeMenus();
  startMenu.classList.add('is-open');
  startBtn.setAttribute('aria-expanded', 'true');
  hideTip();
}
function closeStart() {
  startMenu.classList.remove('is-open');
  allProg.classList.remove('is-open');
  $$('.sub-host.is-open').forEach(s => s.classList.remove('is-open'));
  startBtn.setAttribute('aria-expanded', 'false');
}
function openAllPrograms() {
  const btn = $('#sm-all'); if (!btn) return;
  allProg.classList.add('is-open');
  if (isMobile()) return;
  const left = $('#sm-left').getBoundingClientRect(), br = btn.getBoundingClientRect();
  allProg.style.left = left.right - 4 + 'px';
  allProg.style.top = 'auto';
  allProg.style.bottom = (innerHeight - br.bottom) + 'px';
}
startBtn.addEventListener('click', () => {
  if (startMenu.classList.contains('is-open')) closeStart(); else openStart();
});
startMenu.addEventListener('click', e => {
  if (e.target.closest('#sm-all')) { allProg.classList.contains('is-open') ? allProg.classList.remove('is-open') : openAllPrograms(); return; }
  const b = e.target.closest('[data-app]');
  if (b) openApp(b.dataset.app);
  else if (e.target.closest('a')) closeStart();
});
startMenu.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  if (e.target.closest('#sm-all')) openAllPrograms();
  else if (e.target.closest('.sm-item')) allProg.classList.remove('is-open');
});
allProg.addEventListener('click', e => {
  const host = e.target.closest('.sub-host > button');
  if (host) { host.parentElement.classList.toggle('is-open'); return; }
  const b = e.target.closest('[data-app]');
  if (b) openApp(b.dataset.app);
  else if (e.target.closest('a')) closeStart();
});
$('#sm-logoff').addEventListener('click', () => exitDialog('logoff'));
$('#sm-shutdown').addEventListener('click', () => exitDialog('shutdown'));

// Clique fora fecha menus.
document.addEventListener('pointerdown', e => {
  const t = e.target;
  if (startMenu.classList.contains('is-open') && !t.closest('#start-menu, #start-btn, #all-programs')) closeStart();
  if (!t.closest('.menubar') && !t.closest('#ctx')) closeMenus();
}, true);

document.addEventListener('keydown', e => {
  if (!msgEl.hidden) return;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openApp('executar'); return; }
  if (e.key === '/' && !isTyping(e.target) && $('#session').hidden) { e.preventDefault(); openApp('executar'); return; }
  if (e.key === 'Escape') {
    if (!$('#exit-dlg').hidden) { closeExit(); return; }
    if (startMenu.classList.contains('is-open')) { closeStart(); startBtn.focus(); return; }
    closeMenus();
  }
});

/* ============================================================
   LOGON, LOGOFF E DESLIGAR
   ============================================================ */
const session = $('#session'), graying = $('#graying'), exitDlg = $('#exit-dlg'), blackout = $('#blackout');
function showSession(mode, text) {
  $$('.balloon').forEach(b => b.remove());
  session.dataset.mode = mode;
  if (text) $('#ss-big').textContent = text;
  session.classList.remove('is-out');
  session.hidden = false;
  closeStart();
}
function hideSession() {
  if (!fx()) { session.hidden = true; return; }
  session.classList.add('is-out');
  setTimeout(() => { session.hidden = true; session.classList.remove('is-out'); }, 500);
}
function showLogin() { showSession('login'); setTimeout(() => $('#ss-user').focus({ preventScroll: true }), 50); }
$('#ss-user').addEventListener('click', async () => {
  sfx.startup();
  showSession('welcome', 'bem-vindo');
  await wait(1300);
  hideSession();
  resetIdle();
});
$('#ss-power').addEventListener('click', () => exitDialog('shutdown'));

const EXIT_OPTS = {
  shutdown: [['standby', 'Em espera', 'standby'], ['off', 'Desativar', 'power'], ['restart', 'Reiniciar', 'restart']],
  logoff: [['switch', 'Trocar usuário', 'switch'], ['logoff', 'Fazer logoff', 'logoff']],
};
function exitDialog(kind) {
  closeStart();
  closeMenus();
  $$('.balloon').forEach(b => b.remove());
  $('#exit-title').textContent = kind === 'logoff' ? 'Fazer logoff do LucasOS' : 'Desligar o computador';
  $('#exit-body').innerHTML = EXIT_OPTS[kind].map(([act, label, ico]) =>
    `<button class="exit-opt" type="button" data-exit="${act}">${icon(ico)}<span>${label}</span></button>`).join('');
  graying.hidden = false;
  if (session.hidden) requestAnimationFrame(() => requestAnimationFrame(() => graying.classList.add('is-on')));
  exitDlg.hidden = false;
  $('.exit-opt', exitDlg).focus();
}
function closeExit() {
  exitDlg.hidden = true;
  graying.classList.remove('is-on');
  graying.hidden = true;
}
$('#exit-cancel').addEventListener('click', closeExit);
$('#exit-body').addEventListener('click', async e => {
  const b = e.target.closest('[data-exit]'); if (!b) return;
  const act = b.dataset.exit;
  closeExit();
  if (act === 'standby') {
    showBlackout('', () => {});
  } else if (act === 'switch') {
    showLogin();
  } else if (act === 'logoff') {
    sfx.logoff();
    showSession('busy', 'Fazendo logoff...');
    await wait(1400);
    wins.forEach(w => closeWin(w));
    showLogin();
  } else if (act === 'off' || act === 'restart') {
    sfx.logoff();
    showSession('busy', act === 'off' ? 'O LucasOS está sendo desligado...' : 'Reiniciando...');
    await wait(1700);
    try { sessionStorage.removeItem('lucasos:booted'); } catch { /* ok */ }
    if (act === 'restart') { location.replace(location.pathname + location.search); return; }
    showBlackout('Agora é seguro desligar o computador.\nClique para ligar de novo.', () => location.replace(location.pathname + location.search));
  }
});
function showBlackout(text, onWake) {
  blackout.querySelector('p').textContent = text;
  blackout.hidden = false;
  const wake = () => {
    removeEventListener('keydown', wake, true);
    blackout.removeEventListener('pointerdown', wake);
    blackout.hidden = true;
    onWake();
  };
  setTimeout(() => {
    addEventListener('keydown', wake, true);
    blackout.addEventListener('pointerdown', wake);
  }, 500);
}

/* ============================================================
   PROTEÇÃO DE TELA
   ============================================================ */
const saverCanvas = $('#screensaver');
let idleTimer = 0, saverOn = false, saverRaf = 0, saverStartedAt = 0, saverStartX = 0, saverStartY = 0;
function resetIdle() {
  clearTimeout(idleTimer);
  if (settings.saver === 'nenhuma' || saverOn) return;
  idleTimer = setTimeout(() => {
    if (session.hidden && blackout.hidden && msgEl.hidden) startSaver(settings.saver);
    else resetIdle();
  }, settings.saverWait * 60000);
}
function onActivity(e) {
  if (saverOn) {
    if (performance.now() - saverStartedAt < 600) return;
    if (e.type === 'pointermove' && Math.abs(e.clientX - saverStartX) + Math.abs(e.clientY - saverStartY) < 8) return;
    stopSaver();
    if (e.type !== 'pointermove') { e.preventDefault(); e.stopPropagation(); }
  }
  resetIdle();
}
['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => addEventListener(ev, onActivity, { capture: true, passive: false }));

function startSaver(kind) {
  if (kind === 'nenhuma') return;
  saverOn = true;
  saverStartedAt = performance.now();
  saverStartX = mouseX; saverStartY = mouseY;
  hideTip();
  const c = saverCanvas, ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.hidden = false;
  const W = innerWidth, H = innerHeight;
  let draw;
  if (kind === 'estrelas') {
    const stars = Array.from({ length: 320 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W }));
    draw = () => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        s.z -= 6;
        if (s.z <= 1) { s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; s.z = W; }
        const k = 200 / s.z, px = W / 2 + s.x * k, py = H / 2 + s.y * k, sz = Math.max(0.5, 2.6 - s.z / (W / 2.4));
        if (px >= 0 && px < W && py >= 0 && py < H) ctx.fillRect(px, py, sz, sz);
      }
    };
  } else {
    // Logo que aparece, flutua e some em lugares diferentes da tela.
    let x = 0, y = 0, t0 = 0;
    const PERIOD = 6000;
    const pick = () => { x = 40 + Math.random() * Math.max(10, W - 340); y = 40 + Math.random() * Math.max(10, H - 160); };
    pick();
    draw = ts => {
      if (!t0) t0 = ts;
      let p = (ts - t0) / PERIOD;
      if (p >= 1) { t0 = ts; p = 0; pick(); }
      const alpha = p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + p * 30, y);
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, '#7fb8ff'); g.addColorStop(0.5, '#2f78e6'); g.addColorStop(1, '#1450b8');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, 64, 64, 14) : ctx.rect(0, 0, 64, 64); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(25, 17); ctx.lineTo(21, 46); ctx.lineTo(43, 46); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px "Trebuchet MS", Tahoma, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('LucasOS', 80, 32);
      ctx.fillStyle = '#ff7a12';
      ctx.font = 'italic bold 20px "Trebuchet MS", Tahoma, sans-serif';
      ctx.fillText('xp', 80 + ctx.measureText('LucasOS').width * 2 + 6, 18);
      ctx.restore();
    };
  }
  const loop = ts => { if (!saverOn) return; draw(ts); saverRaf = requestAnimationFrame(loop); };
  saverRaf = requestAnimationFrame(loop);
}
function stopSaver() {
  saverOn = false;
  cancelAnimationFrame(saverRaf);
  saverCanvas.hidden = true;
}

/* ============================================================
   BUSCA (usada pelo Executar)
   ============================================================ */
function searchIndex(q) {
  const nq = norm(q.trim());
  if (!nq) return [];
  const toks = nq.split(/\s+/);
  const items = [];
  APPS.forEach(a => items.push({ title: a.title, sub: a.win && a.win !== a.title ? a.win : 'Programa', icon: a.icon, words: `${a.id} ${a.title} ${a.win || ''} ${a.keys || ''}`, run: () => openApp(a.id) }));
  $$('[data-app="projetos"] .ex-item').forEach(it => {
    const name = it.querySelector('.ex-name').textContent;
    const href = it.dataset.site || it.dataset.code;
    const ico = it.querySelector('.ex-ico use').getAttribute('href').replace('#x-', '').replace('#', '');
    items.push({ title: name, sub: 'Projeto: ' + it.querySelector('.ex-c3').textContent, icon: ico, words: `${name} ${it.querySelector('.ex-c2').textContent} ${it.querySelector('.ex-desc').textContent}`, run: () => window.open(href, '_blank', 'noopener') });
  });
  [['tema azul', 'Esquema de cores Azul', () => { setSetting('theme', 'xp'); setSetting('scheme', 'azul'); }],
   ['tema verde-oliva', 'Esquema de cores Verde-oliva', () => { setSetting('theme', 'xp'); setSetting('scheme', 'oliva'); }],
   ['tema prateado', 'Esquema de cores Prateado', () => { setSetting('theme', 'xp'); setSetting('scheme', 'prateado'); }],
   ['tema vista', 'Visual do Windows Vista', () => setSetting('theme', 'vista')],
   ['fazer logoff', 'Sair da sessão', () => exitDialog('logoff')],
   ['desligar', 'Desligar o computador', () => exitDialog('shutdown')],
   ['proteção de tela', 'Mostrar agora', () => startSaver(settings.saver === 'nenhuma' ? 'logo' : settings.saver)],
  ].forEach(([title, sub, run]) => items.push({ title, sub, icon: 'display', words: title + ' ' + sub, run }));
  return items
    .map(it => {
      const words = norm(it.words).split(/[^a-z0-9*]+/).filter(Boolean);
      if (!toks.every(t => words.some(w => w.startsWith(t)))) return null;
      const nt = norm(it.title);
      return { it, s: (nt === nq ? 20 : nt.startsWith(nq) ? 10 : 0) + (it.sub === 'Programa' || APP[norm(it.title)] ? 2 : 0) };
    })
    .filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 8).map(x => x.it);
}

/* ============================================================
   API PÚBLICA (para apps.js)
   ============================================================ */
const API = {
  config: CONFIG, apps: APPS, bootTime: Date.now(), store, sfx, settings, icon,
  register(id, fn) { inits[id] = fn; },
  open: openApp,
  close(id) { const w = wins.get(id); if (w) closeWin(w); },
  isVisible(id) { const w = wins.get(id); return !!(w && w.open && !w.min); },
  isActive(id) { return !!(activeWin && activeWin.id === id && !activeWin.min); },
  setSetting, applySettings, setCustomWallpaper, msgbox, balloon, copyText, searchIndex, exitDialog,
  previewSaver(kind) { startSaver(kind === 'nenhuma' ? 'logo' : kind); },
  isBinEmpty: () => binEmpty,
  setBinEmpty(v) { binEmpty = v; store.set('bin-empty', v); renderIcons(); renderStart(); },
};
window.LucasOS = API;

/* ============================================================
   BOOT
   ============================================================ */
function openBootWindows() {
  const hr = hostRect();
  const iconsRight = Math.max(...$$('.dicon:not(.corner)').map(d => d.getBoundingClientRect().right), 100) + 14;
  const proj = wins.get('projetos'), sobre = wins.get('sobre');
  // "Sobre Mim" à esquerda e "Meus Projetos" à direita, na frente; lado a lado quando a tela permite.
  const pw = Math.min(+proj.el.dataset.w, hr.width - 16);
  const free = hr.width - iconsRight - 12;
  const sw = clamp(free - pw - 10, 420, 560);
  place(sobre, { x: iconsRight, y: 16, w: sw, h: Math.min(560, hr.height - 40) });
  place(proj, { x: Math.max(iconsRight + 140, iconsRight + sw + 10, hr.width - pw - 10), y: 40 });
  openApp('sobre', { silent: true });
  openApp('projetos', { silent: true });
}
function startDesktop(delayBalloon) {
  const hashId = location.hash.slice(1);
  const deep = APP[hashId] && !APP[hashId].href ? hashId : null;
  if (!isMobile()) openBootWindows();
  if (deep) openApp(deep, { silent: true });
  if (!store.get('seen-xp', false)) {
    store.set('seen-xp', true);
    setTimeout(() => balloon({
      title: 'Bem-vindo ao LucasOS',
      text: isMobile()
        ? 'Meus projetos estão na pasta Meus Projetos. Toque em qualquer ícone para abrir.'
        : 'Meus projetos estão na pasta Meus Projetos, já aberta. Dê dois cliques nos outros ícones para ver o resto.',
    }), delayBalloon);
  }
  resetIdle();
}
function boot() {
  $$('#windows .window').forEach(buildWindow);
  renderIcons();
  renderStart();
  applySettings();
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000);
  $$('img[data-userpic]').forEach(img => img.addEventListener('error', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.style.cssText = 'width:100%;height:100%;display:block';
    svg.innerHTML = '<use href="#x-userpic"/>';
    img.replaceWith(svg);
  }, { once: true }));

  const bootEl = $('#boot');
  const quick = root.classList.contains('no-boot');
  try { sessionStorage.setItem('lucasos:booted', '1'); } catch { /* ok */ }
  if (quick) { bootEl.remove(); startDesktop(900); return; }

  // Boot (tela preta) -> "bem-vindo" -> área de trabalho. Um clique pula tudo.
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    bootEl.remove();
    hideSession();
    startDesktop(1400);
  };
  const skip = () => finish();
  bootEl.addEventListener('pointerdown', skip);
  session.addEventListener('pointerdown', function once(e) { if (session.dataset.mode === 'welcome' && !done) { session.removeEventListener('pointerdown', once); skip(); } });
  setTimeout(() => {
    if (done) return;
    showSession('welcome', 'bem-vindo');
    bootEl.classList.add('is-out');
    setTimeout(() => { if (!done) bootEl.style.display = 'none'; }, 500);
    setTimeout(finish, 1300);
  }, 1500);
}

// Scripts "defer" rodam antes do DOMContentLoaded: esperar garante que apps.js já se registrou.
if (document.readyState === 'complete') boot();
else document.addEventListener('DOMContentLoaded', boot);

})();
