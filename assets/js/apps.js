/* =============================================================
   LucasOS 2.0 — aplicativos
   Terminal, GitHub (ao vivo), Invasores, Hexágono, Ordenação e Labirinto.
   Cada app é iniciado só quando a janela abre pela primeira vez.
   ============================================================= */
(() => {
'use strict';
const OS = window.LucasOS;
if (!OS) return;

/* ============================================================
   AJUSTES DOS JOGOS — mexa nestes números para deixar mais fácil/difícil
   (velocidades em "pixels por quadro a 60 fps"; o jogo compensa telas de 120/144 Hz)
   ============================================================ */
const GAME_CONFIG = {
  invaders: {
    playerSpeed: 4.2,            // velocidade horizontal da nave
    bulletSpeed: 6,              // velocidade do tiro do jogador
    enemyBulletSpeed: 4.2,       // velocidade do tiro inimigo
    invaderHorizontalSpeed: 1.1, // velocidade lateral base dos invasores
    invaderDescentStep: 3,       // quanto descem ao bater na borda (menor = mais fácil)
    enemyShootChance: 0.02,      // chance por quadro de um invasor atirar
    fireCooldown: 14,            // quadros entre tiros ao segurar Espaço
    lives: 3,
    levels: [
      { rows: 3, cols: 7, speedMultiplier: 1.0 },
      { rows: 4, cols: 8, speedMultiplier: 1.25 },
      { rows: 5, cols: 9, speedMultiplier: 1.5 },
    ],
    // Ao terminar uma fase (exceto a última), o jogador escolhe 1 entre 3 sorteados.
    powerUps: [
      { id: 'vida_extra', label: '+1 Vida', desc: 'Ganha uma vida extra.' },
      { id: 'tiro_duplo', label: 'Tiro Duplo', desc: 'Atira dois projéteis por vez.' },
      { id: 'tiro_rapido', label: 'Tiro Rápido', desc: 'Tiros mais rápidos e frequentes.' },
      { id: 'nave_agil', label: 'Nave Ágil', desc: 'Aumenta a velocidade da nave.' },
      { id: 'escudo', label: 'Escudo', desc: 'Bloqueia o próximo tiro inimigo.' },
    ],
  },
  hexagon: {
    playerRotateSpeed: 7,        // velocidade de rotação do jogador
    baseSpeed: 170,              // velocidade inicial das paredes
    speedRamp: 18,               // aceleração por segundo
    gapWidth: Math.PI / 3,       // tamanho do vão em cada parede (radianos)
    cosmeticRotationSpeed: 0.25, // rotação só visual do fundo
  },
  maze: { cols: 25, rows: 23 },  // precisam ser ÍMPARES
};

/* ---------------- utilidades ---------------- */
const coarse = matchMedia('(pointer: coarse)');
const isTyping = t => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const MONO = 'ui-monospace, "Cascadia Code", Consolas, monospace';

// Canvas nítido em qualquer densidade de tela; desenha sempre em coordenadas lógicas W×H.
function fitCanvas(canvas, W, H) {
  const ctx = canvas.getContext('2d');
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = canvas.getBoundingClientRect().width || W;
    const s = Math.max(1, cssW / W) * dpr;
    canvas.width = Math.round(W * s);
    canvas.height = Math.round(H * s);
    ctx.setTransform(s, 0, 0, s, 0, 0);
  };
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas);
  return ctx;
}

// Loop de animação que só roda enquanto a janela está visível.
function gameLoop(id, step) {
  let running = false, last = 0;
  const frame = ts => {
    if (!OS.isVisible(id)) { running = false; return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    step(dt);
    requestAnimationFrame(frame);
  };
  const ensure = () => {
    if (running || !OS.isVisible(id)) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  };
  document.addEventListener('lucasos:visibility', e => { if (e.detail.id === id && e.detail.visible) ensure(); });
  ensure();
}

// Teclado só vale para o jogo da janela ativa (e nunca enquanto se digita em um campo).
function keyState(id, map) {
  const st = { onPress: null };
  const lookup = {};
  Object.entries(map).forEach(([k, keys]) => keys.forEach(key => { lookup[key] = k; }));
  const releaseAll = () => Object.values(lookup).forEach(k => { st[k] = false; });
  addEventListener('keydown', e => {
    if (!OS.isActive(id) || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = lookup[e.key]; if (!k) return;
    e.preventDefault();
    if (!st[k]) { st[k] = true; if (st.onPress) st.onPress(k); }
  });
  addEventListener('keyup', e => { const k = lookup[e.key]; if (k) st[k] = false; });
  addEventListener('blur', releaseAll);
  document.addEventListener('lucasos:focus', e => { if (e.detail.id !== id) releaseAll(); });
  return st;
}

// Botões de toque (aparecem em telas sensíveis ao toque).
function bindTouchpad(win, st) {
  win.querySelectorAll('.touchpad [data-key]').forEach(b => {
    const k = b.dataset.key;
    const down = e => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch { /* ok */ }
      b.classList.add('is-down');
      if (!st[k]) { st[k] = true; if (st.onPress) st.onPress(k); }
    };
    const up = () => { b.classList.remove('is-down'); st[k] = false; };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
}

function banner(ctx, W, H, title, sub) {
  ctx.fillStyle = 'rgba(5,3,15,.74)';
  ctx.fillRect(0, H / 2 - 36, W, 72);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde68a'; ctx.font = `700 18px ${MONO}`;
  ctx.fillText(title, W / 2, H / 2 - 10);
  ctx.fillStyle = '#cfe0ff'; ctx.font = `12px ${MONO}`;
  ctx.fillText(sub, W / 2, H / 2 + 15);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ============================================================
   TERMINAL
   ============================================================ */
OS.register('terminal', win => {
  const out = win.querySelector('.term-out');
  const input = win.querySelector('.term-in');
  const promptEl = win.querySelector('.term-prompt');
  input.dataset.autofocus = '';
  const history = OS.store.get('term-history', []);
  let hIdx = history.length;

  const classic = () => document.documentElement.dataset.theme !== 'moderno';
  const prompt = () => classic() ? 'C:\\Users\\Lucas>' : 'lucas@lucasos:~$';
  const updatePrompt = () => { promptEl.textContent = prompt(); };
  updatePrompt();
  document.addEventListener('lucasos:theme', updatePrompt);

  const scroll = () => { out.scrollTop = out.scrollHeight; };
  const line = (text = '', cls) => { const d = el('div', cls, text); out.append(d); return d; };
  const span = (text, cls) => el('span', cls, text);
  const link = (text, href) => { const a = el('a', null, text); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
  const rich = parts => { const d = el('div'); parts.forEach(p => d.append(typeof p === 'string' ? document.createTextNode(p) : p)); out.append(d); return d; };

  function welcome() {
    if (classic()) { line('LucasOS [versão 2.0]'); line('(c) Lucas Melo. Todos os direitos reservados.', 'c-dim'); }
    else line('LucasOS 2.0 · lucash', 'c-acc');
    rich(['Digite ', span('help', 'c-key'), ' para ver os comandos. ', span('Tab', 'c-key'), ' completa, ', span('↑ ↓', 'c-key'), ' navegam no histórico.']);
    line('');
  }

  const apps = OS.apps.filter(a => !a.href);
  const resolveApp = q => {
    if (!q) return null;
    const n = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return apps.find(a => a.id === n || a.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().startsWith(n)) || null;
  };

  function neofetch() {
    const up = Math.floor((Date.now() - OS.bootTime) / 1000);
    const theme = { moderno: 'Moderno', xp: 'XP (Luna)', vista: 'Vista (Aero)' }[document.documentElement.dataset.theme];
    const fox = [
      '      /\\   /\\',
      '     /  \\_/  \\__.-----------.__',
      "    /  -     ,'               `-.",
      '  _/        /                    `.',
      ' <__,----._/                       \\',
      '    (,,)  (,,)                     |',
      '  .-~~~-.________________________./',
      ' (~~~~~~   ~     ~     ~     ~    )',
      "  `-~~~-.________________________.'",
    ].join('\n');
    const info = [
      ['SO', `LucasOS 2.0 · tema ${theme}`],
      ['Nome', 'Lucas Eduardo Melo'],
      ['Função', 'Estudante de Eng. da Computação · IA/LLM'],
      ['Uni', 'UPE – Poli (2024 – 2029)'],
      ['Local', 'Recife, PE – Brasil'],
      ['Foco', 'LLMs locais, agentes de IA, skills & MCP'],
      ['Stack', 'C, Python, JavaScript, Java, Rust'],
      ['Ferramentas', 'Docker, n8n, Linux/Unix, Git'],
      ['Idiomas', 'Português (nativo), Inglês (avançado)'],
      ['Uptime', `${Math.floor(up / 60)}m ${up % 60}s`],
      ['Resolução', `${innerWidth}x${innerHeight}`],
    ];
    const wrap = el('div', 'neo');
    wrap.append(el('pre', null, fox));
    const box = el('div');
    box.append(rich([span('lucas', 'c-key'), '@', span('lucasos', 'c-key')]));
    box.append(el('div', 'c-dim', '-------------'));
    info.forEach(([k, v]) => box.append(rich([span((k + ':').padEnd(13), 'c-key'), v])));
    wrap.append(box);
    out.append(wrap);
  }

  function hamster() {
    const d = el('div', 'hamster');
    d.append(el('div', 'wheel', '🐹'), el('div', 'cap', 'um hamster apareceu. papel de parede atualizado.'));
    out.append(d);
    const tiles = Array.from({ length: 36 }, (_, i) => {
      const x = (i % 6) * 70 + 20, y = Math.floor(i / 6) * 70 + 20, rot = ((i * 53) % 40) - 20;
      return `<text x="${x}" y="${y}" font-size="40" transform="rotate(${rot} ${x} ${y})">\uD83D\uDC39</text>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420"><rect width="420" height="420" fill="#FFD97A"/>${tiles}</svg>`;
    OS.setCustomWallpaper('hamster', 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
  }

  const COMMANDS = {
    help: { desc: 'lista os comandos', run() {
      Object.entries(COMMANDS).forEach(([name, c]) => rich([span(name.padEnd(10), 'c-key'), c.desc]));
    } },
    sobre: { desc: 'quem é o Lucas', run() {
      line('Lucas Melo: estudante de Engenharia da Computação na UPE (Poli), em Recife.');
      line('Trabalha com C e Python em Unix; hoje focado em LLMs locais, agentes de IA, skills e MCP.');
    } },
    whoami: { desc: 'usuário atual', run() { line(classic() ? 'lucasos\\lucas' : 'lucas'); } },
    neofetch: { desc: 'ficha técnica do sistema', run: neofetch },
    projetos: { desc: 'lista os projetos com links', run() {
      document.querySelectorAll('#project-grid .project').forEach(card => {
        const a = card.querySelector('.plink');
        rich(['  ', span('▸ ', 'c-acc'), link(card.querySelector('h3').textContent.trim(), a ? a.href : OS.config.githubUrl)]);
      });
    } },
    skills: { desc: 'stack e ferramentas', run() {
      rich([span('Linguagens  ', 'c-key'), 'C · Python · JavaScript · TypeScript · Java · Rust']);
      rich([span('IA          ', 'c-key'), 'LLMs locais · llama.cpp · whisper.cpp · agentes · MCP · RAG']);
      rich([span('Web         ', 'c-key'), 'Node.js · React · Spring Boot · APIs REST · Streamlit']);
      rich([span('DevOps      ', 'c-key'), 'Docker · Linux/Unix · Git · GitHub Actions · n8n']);
    } },
    contato: { desc: 'como falar comigo', run() {
      rich([span('e-mail    ', 'c-key'), link(OS.config.email, 'mailto:' + OS.config.email)]);
      rich([span('linkedin  ', 'c-key'), link('lucas-eduardo-melo-tenorio', OS.config.linkedinUrl)]);
      rich([span('github    ', 'c-key'), link('@' + OS.config.githubUser, OS.config.githubUrl)]);
    } },
    ls: { desc: 'lista os apps instalados', run() {
      const d = new Date().toLocaleDateString('pt-BR');
      if (classic()) line(`\n Pasta de C:\\Users\\Lucas\n`);
      apps.forEach(a => line(classic() ? ` ${d}  <DIR>          ${a.id}` : `  ${a.id}/`));
    } },
    open: { desc: 'abre um app (ex.: open projetos)', run(args) {
      const a = resolveApp(args[0]);
      if (!a) { line(args[0] ? `App "${args[0]}" não encontrado. Use ls para ver a lista.` : 'Uso: open <app>', 'c-err'); return; }
      line(`Abrindo ${a.title}…`, 'c-dim');
      setTimeout(() => OS.open(a.id), 120);
    } },
    tema: { desc: 'tema: moderno, xp, vista, claro ou escuro', run(args) {
      const t = (args[0] || '').toLowerCase();
      if (['moderno', 'xp', 'vista'].includes(t)) OS.setSetting('theme', t);
      else if (t === 'claro' || t === 'escuro') { OS.setSetting('theme', 'moderno'); OS.setSetting('scheme', t === 'claro' ? 'light' : 'dark'); }
      else { line('Uso: tema moderno | xp | vista | claro | escuro', 'c-err'); return; }
      line(`Tema alterado para ${t}.`, 'c-dim');
    } },
    github: { desc: 'abre o app GitHub', run() { OS.open('github'); } },
    date: { desc: 'data e hora', run() { line(new Date().toLocaleString('pt-BR')); } },
    echo: { desc: 'repete o texto', run(args, raw) { line(raw.replace(/^\s*echo\s?/i, '')); } },
    history: { desc: 'comandos anteriores', run() { history.forEach((h, i) => line(String(i + 1).padStart(4) + '  ' + h)); } },
    clear: { desc: 'limpa a tela', run() { out.replaceChildren(); } },
    exit: { desc: 'fecha o terminal', run() { setTimeout(() => OS.close('terminal'), 80); } },
  };
  const ALIASES = { ajuda: 'help', '?': 'help', dir: 'ls', cls: 'clear', abrir: 'open', theme: 'tema', projects: 'projetos', about: 'sobre' };

  function exec(raw) {
    rich([span(prompt(), 'c-cmd'), (classic() ? '' : ' ') + raw]);
    const cmd = raw.trim();
    if (cmd) {
      if (history[history.length - 1] !== cmd) history.push(cmd);
      if (history.length > 50) history.shift();
      OS.store.set('term-history', history);
    }
    hIdx = history.length;
    if (!cmd) { scroll(); return; }
    if (cmd === 'idontwannabemercy') { hamster(); scroll(); return; }
    const [name, ...args] = cmd.split(/\s+/);
    const key = ALIASES[name.toLowerCase()] || name.toLowerCase();
    if (COMMANDS[key]) COMMANDS[key].run(args, cmd);
    else if (key === 'sudo') line('lucas não está no arquivo sudoers. Este incidente será reportado. 😉');
    else if (classic()) line(`'${name}' não é reconhecido como um comando interno\nou externo, um programa operável ou um arquivo em lotes.`, 'c-err');
    else line(`lucash: comando não encontrado: ${name} (tente help)`, 'c-err');
    scroll();
  }

  function complete() {
    const v = input.value;
    const parts = v.split(/\s+/);
    let pool, prefix;
    if (parts.length <= 1) { pool = Object.keys(COMMANDS); prefix = parts[0] || ''; }
    else if (['open', 'abrir'].includes(parts[0].toLowerCase())) { pool = apps.map(a => a.id); prefix = parts[1]; }
    else if (['tema', 'theme'].includes(parts[0].toLowerCase())) { pool = ['moderno', 'xp', 'vista', 'claro', 'escuro']; prefix = parts[1]; }
    else return;
    const hits = pool.filter(p => p.startsWith(prefix.toLowerCase()));
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + ' '; }
    else if (hits.length > 1) { rich([span(prompt(), 'c-cmd'), (classic() ? '' : ' ') + v]); line(hits.join('   '), 'c-dim'); scroll(); }
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const v = input.value; input.value = ''; exec(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) { hIdx--; input.value = history[hIdx]; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hIdx < history.length) { hIdx++; input.value = history[hIdx] || ''; } }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key.toLowerCase() === 'l' && e.ctrlKey) { e.preventDefault(); out.replaceChildren(); }
    else if (e.key.length === 1) OS.sfx.key();
  });
  win.querySelector('.term').addEventListener('click', e => {
    if (!e.target.closest('a') && !String(getSelection())) input.focus({ preventScroll: true });
  });
  document.addEventListener('lucasos:focus', e => {
    if (e.detail.id === 'terminal' && !coarse.matches) setTimeout(() => input.focus({ preventScroll: true }), 0);
  });

  welcome();
});

/* ============================================================
   GITHUB — perfil e repositórios ao vivo (API pública, com cache)
   ============================================================ */
OS.register('github', async win => {
  const user = OS.config.githubUser;
  const reposEl = win.querySelector('#gh-repos');
  const statusEl = win.querySelector('#gh-status');
  const LANG = { C: '#555555', 'C++': '#f34b7d', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#663399', Java: '#b07219', Rust: '#dea584', MDX: '#fcb32c', 'Jupyter Notebook': '#DA5B0B', Shell: '#89e051', Go: '#00ADD8' };
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const ago = iso => {
    const s = (new Date(iso) - Date.now()) / 1000;
    for (const [u, sec] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
      if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u);
    }
    return 'agora mesmo';
  };
  const setStatus = (live, text) => {
    statusEl.replaceChildren(el('span', live ? 'live' : 'live off'), document.createTextNode(text));
  };
  const stat = (ico, n, label) => {
    const s = el('span');
    s.innerHTML = OS.icon(ico);
    s.append(el('b', null, String(n)), document.createTextNode(' ' + label));
    return s;
  };

  setStatus(true, 'carregando…');
  const KEY = 'lucasos:gh-cache';
  let data = null;
  try { const c = JSON.parse(sessionStorage.getItem(KEY)); if (c && Date.now() - c.t < 10 * 60 * 1000) data = c; } catch { /* ok */ }
  if (!data) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const opts = { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } };
      const [u, r] = await Promise.all([
        fetch(`https://api.github.com/users/${user}`, opts),
        fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`, opts),
      ]);
      if (!u.ok || !r.ok) throw new Error('HTTP ' + u.status + '/' + r.status);
      const uj = await u.json(), rj = await r.json();
      data = {
        t: Date.now(),
        user: { name: uj.name, bio: uj.bio, avatar: uj.avatar_url, followers: uj.followers, following: uj.following, repos: uj.public_repos },
        repos: rj.filter(x => !x.fork && !x.archived && x.name.toLowerCase() !== user.toLowerCase())
          .map(x => ({ name: x.name, url: x.html_url, desc: x.description, lang: x.language, stars: x.stargazers_count, pushed: x.pushed_at, homepage: x.homepage })),
      };
      try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ok */ }
    } catch {
      data = null;
    } finally { clearTimeout(timer); }
  }

  if (!data) { setStatus(false, 'offline · lista salva'); return; }

  const u = data.user;
  if (u.name) win.querySelector('#gh-name').textContent = u.name;
  if (u.bio) win.querySelector('#gh-bio').textContent = u.bio;
  if (u.avatar) {
    const img = new Image();
    img.alt = ''; img.width = 76; img.height = 76; img.decoding = 'async';
    img.onload = () => win.querySelector('#gh-avatar').replaceChildren(img);
    img.src = u.avatar + (u.avatar.includes('?') ? '&' : '?') + 's=160';
  }
  win.querySelector('#gh-stats').replaceChildren(
    stat('repo', u.repos, 'repositórios'),
    stat('users', u.followers, u.followers === 1 ? 'seguidor' : 'seguidores'),
  );

  const frag = document.createDocumentFragment();
  data.repos.slice(0, 12).forEach(r => {
    const a = el('a', 'repo'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
    const name = el('span', 'repo-name'); name.innerHTML = OS.icon('repo'); name.append(document.createTextNode(r.name));
    const meta = el('span', 'repo-meta');
    if (r.lang) { const l = el('span'); const d = el('i', 'dot'); d.style.setProperty('--c', LANG[r.lang] || '#8b949e'); l.append(d, document.createTextNode(r.lang)); meta.append(l); }
    if (r.stars) { const s = el('span'); s.innerHTML = OS.icon('star'); s.append(document.createTextNode(String(r.stars))); meta.append(s); }
    meta.append(el('span', null, 'atualizado ' + ago(r.pushed)));
    a.append(name, el('p', null, r.desc || 'Sem descrição.'), meta);
    frag.append(a);
  });
  reposEl.replaceChildren(frag);
  setStatus(true, 'ao vivo do GitHub');
});

/* ============================================================
   JOGO 1 — INVASORES (tiro de nave com fases e power-ups)
   ============================================================ */
OS.register('invaders', win => {
  const cfg = GAME_CONFIG.invaders, W = 380, H = 280;
  const canvas = win.querySelector('canvas');
  const ctx = fitCanvas(canvas, W, H);
  const overlay = win.querySelector('.powerup-overlay');
  const optionsEl = win.querySelector('.powerup-options');
  const bestEl = win.querySelector('[data-best]');
  let best = OS.store.get('best-invaders', 0);
  const showBest = () => { bestEl.textContent = best ? 'Recorde: ' + best : ''; };
  showBest();

  // Alienígena de um olho só (11×8), dois quadros de animação.
  const SPRITES = [
    ['....XXX....', '..XXXXXXX..', '.XXX...XXX.', '.XX..X..XX.', '.XXX...XXX.', '..XXXXXXX..', '..X..X..X..', '.X..X.X..X.'],
    ['....XXX....', '..XXXXXXX..', '.XXX...XXX.', '.XX..X..XX.', '.XXX...XXX.', '..XXXXXXX..', '..X..X..X..', '...X.X.X...'],
  ];
  const ROW_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24'];
  const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.3 + 0.3, v: Math.random() * 0.25 + 0.05 }));
  let player, bullets, eBullets, invaders, parts, dir, score, lives, level, state, doubleShot, shield, cooldown, bulletBonus, speedBonus, t, flash, choices;

  function setupLevel() {
    const L = cfg.levels[level];
    player = { x: W / 2 - 14, y: H - 26, w: 28, h: 14 };
    bullets = []; eBullets = []; parts = []; invaders = []; cooldown = 0; dir = 1;
    for (let r = 0; r < L.rows; r++) {
      for (let c = 0; c < L.cols; c++) invaders.push({ x: 24 + c * 38, y: 30 + r * 24, w: 22, h: 16, row: r, alive: true });
    }
  }
  function reset() {
    level = 0; score = 0; lives = cfg.lives; doubleShot = false; shield = false;
    bulletBonus = 0; speedBonus = 0; t = 0; flash = 0;
    setupLevel();
  }
  reset();
  state = 'ready';

  const st = keyState('invaders', {
    left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], fire: [' ', 'ArrowUp', 'w', 'W'],
    p1: ['1'], p2: ['2'], p3: ['3'],
  });
  st.onPress = k => {
    if (state === 'levelup') { const i = { p1: 0, p2: 1, p3: 2 }[k]; if (i != null && choices[i]) pick(choices[i]); return; }
    if (k !== 'fire') return;
    if (state === 'playing') { if (cooldown <= 0) shoot(); } // toque rápido atira na hora; segurar continua atirando
    else { if (state !== 'ready') reset(); state = 'playing'; cooldown = 10; }
  };
  bindTouchpad(win, st);
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (state === 'playing') st.fire = true;
    st.onPress('fire');
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => { st.fire = false; }));

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function shoot() {
    const by = player.y - 8;
    if (doubleShot) bullets.push({ x: player.x + 4, y: by, w: 3, h: 10 }, { x: player.x + player.w - 7, y: by, w: 3, h: 10 });
    else bullets.push({ x: player.x + player.w / 2 - 1.5, y: by, w: 3, h: 10 });
    cooldown = cfg.fireCooldown - (bulletBonus ? 4 : 0);
    OS.sfx.shoot();
  }
  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * 2 + 0.6;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
    }
  }
  function showLevelUp() {
    state = 'levelup';
    const pool = cfg.powerUps.slice();
    choices = [];
    while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    optionsEl.replaceChildren(...choices.map((p, i) => {
      const b = el('button', 'powerup-btn');
      b.type = 'button';
      b.append(el('kbd', null, String(i + 1)), el('b', null, p.label), el('span', null, p.desc));
      b.addEventListener('click', () => pick(p));
      return b;
    }));
    overlay.hidden = false;
    OS.sfx.pick();
  }
  function pick(p) {
    if (p.id === 'vida_extra') lives++;
    else if (p.id === 'tiro_duplo') doubleShot = true;
    else if (p.id === 'tiro_rapido') bulletBonus += 3;
    else if (p.id === 'nave_agil') speedBonus += 1.6;
    else if (p.id === 'escudo') shield = true;
    overlay.hidden = true;
    level++; setupLevel();
    state = 'playing';
    OS.sfx.click();
  }
  function endGame(won) {
    state = won ? 'win' : 'over';
    if (score > best) { best = score; OS.store.set('best-invaders', best); showBest(); }
    if (won) OS.sfx.pick(); else OS.sfx.hit();
  }

  function update(dt) {
    const k = dt * 60;
    t += dt;
    stars.forEach(s => { s.y += s.v * k; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
    parts.forEach(p => { p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.04 * k; p.life -= 0.035 * k; });
    parts = parts.filter(p => p.life > 0);
    if (flash > 0) flash -= dt;
    if (state !== 'playing') return;

    const L = cfg.levels[level];
    const sp = (cfg.playerSpeed + speedBonus) * k;
    if (st.left) player.x -= sp;
    if (st.right) player.x += sp;
    player.x = Math.max(4, Math.min(W - player.w - 4, player.x));
    cooldown -= k;
    if (st.fire && cooldown <= 0) shoot();

    const bs = (cfg.bulletSpeed + bulletBonus) * k;
    bullets.forEach(b => { b.y -= bs; });
    bullets = bullets.filter(b => b.y > -12);

    const alive = invaders.filter(i => i.alive);
    // Os invasores aceleram conforme a tropa diminui.
    const hs = cfg.invaderHorizontalSpeed * L.speedMultiplier * (1 + (1 - alive.length / invaders.length) * 1.1) * k;
    let edge = false;
    alive.forEach(i => { i.x += dir * hs; if ((dir > 0 && i.x > W - i.w - 8) || (dir < 0 && i.x < 8)) edge = true; });
    if (edge) { dir *= -1; alive.forEach(i => { i.y += cfg.invaderDescentStep; }); }

    if (alive.length && Math.random() < cfg.enemyShootChance * L.speedMultiplier * k) {
      const s = alive[Math.floor(Math.random() * alive.length)];
      eBullets.push({ x: s.x + s.w / 2 - 1.5, y: s.y + s.h, w: 3, h: 9 });
    }
    eBullets.forEach(b => { b.y += cfg.enemyBulletSpeed * k; });
    eBullets = eBullets.filter(b => b.y < H + 10);

    for (const b of bullets) {
      for (const i of alive) {
        if (i.alive && hit(b, i)) {
          i.alive = false; b.y = -999; score += 10 * (level + 1);
          burst(i.x + i.w / 2, i.y + i.h / 2, ROW_COLORS[i.row % ROW_COLORS.length]);
          OS.sfx.tone(300 + Math.random() * 120, 0.06, 'triangle', 0.03);
          break;
        }
      }
    }
    for (const b of eBullets) {
      if (!hit(b, player)) continue;
      b.y = H + 999;
      if (shield) { shield = false; burst(player.x + player.w / 2, player.y, '#fde68a', 14); continue; }
      lives--; flash = 0.35;
      burst(player.x + player.w / 2, player.y + 6, '#60a5fa', 18);
      OS.sfx.hit();
      if (lives <= 0) { endGame(false); return; }
    }
    if (alive.some(i => i.alive && i.y + i.h >= player.y)) { lives = 0; endGame(false); return; }
    if (invaders.every(i => !i.alive)) {
      if (level >= cfg.levels.length - 1) endGame(true);
      else showLevelUp();
    }
  }

  function drawSprite(sp, x, y, px) {
    for (let r = 0; r < sp.length; r++) {
      const row = sp[r];
      for (let c = 0; c < row.length; c++) if (row[c] === 'X') ctx.fillRect(x + c * px, y + r * px, px, px);
    }
  }
  function drawShip(x, y) {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x, y + 8, 28, 6);
    ctx.fillRect(x + 4, y + 4, 20, 4);
    ctx.fillRect(x + 11, y, 6, 4);
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(x + 12, y + 1, 4, 2);
    if (shield) {
      ctx.strokeStyle = 'rgba(253,230,138,.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x + 14, y + 8, 21, 13, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function draw() {
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(s => { ctx.globalAlpha = 0.2 + s.s * 0.4; ctx.fillRect(s.x, s.y, s.s, s.s); });
    ctx.globalAlpha = 1;
    const fr = Math.floor(t * 2.4) % 2;
    invaders.forEach(i => { if (!i.alive) return; ctx.fillStyle = ROW_COLORS[i.row % ROW_COLORS.length]; drawSprite(SPRITES[fr], i.x, i.y, 2); });
    if (state !== 'over' || Math.floor(t * 6) % 2) drawShip(player.x, player.y);
    ctx.fillStyle = '#fde68a'; bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    ctx.fillStyle = '#fb7185'; eBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 2, 2); });
    ctx.globalAlpha = 1;
    ctx.font = `600 11px ${MONO}`; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(207,224,255,.88)';
    ctx.fillText(`FASE ${level + 1}/${cfg.levels.length}   ${String(score).padStart(4, '0')}`, 8, 8);
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < lives; i++) {
      const x = W - 18 - i * 17, y = 9;
      ctx.fillStyle = '#60a5fa'; ctx.fillRect(x, y + 4, 12, 3); ctx.fillRect(x + 2, y + 2, 8, 2); ctx.fillRect(x + 5, y, 2, 2);
    }
    if (flash > 0) { ctx.fillStyle = `rgba(244,63,94,${flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    const tap = coarse.matches ? 'Toque' : 'Espaço';
    if (state === 'ready') banner(ctx, W, H, 'INVASORES', `${tap} para começar`);
    else if (state === 'over') banner(ctx, W, H, 'FIM DE JOGO', `${score} pontos · ${tap} para reiniciar`);
    else if (state === 'win') banner(ctx, W, H, 'VOCÊ VENCEU!', `${score} pontos · ${tap} para jogar de novo`);
  }

  gameLoop('invaders', dt => { update(dt); draw(); });
});

/* ============================================================
   JOGO 2 — HEXÁGONO (desvie das paredes que se fecham)
   ============================================================ */
OS.register('hexagon', win => {
  const cfg = GAME_CONFIG.hexagon, W = 320, H = 320, cx = W / 2, cy = H / 2, playerR = 46;
  const canvas = win.querySelector('canvas');
  const ctx = fitCanvas(canvas, W, H);
  const bestEl = win.querySelector('[data-best]');
  let best = OS.store.get('best-hexagon', 0);
  const showBest = () => { bestEl.textContent = best ? `Recorde: ${best.toFixed(1)}s` : ''; };
  showBest();

  let angle, walls, time, speed, rot = 0, hue = 290, pulse = 0, state = 'ready';
  const spawn = r => walls.push({ r, gap: Math.random() * Math.PI * 2, gw: cfg.gapWidth, passed: false });
  function reset() { angle = -Math.PI / 2; walls = []; time = 0; speed = cfg.baseSpeed; spawn(200); spawn(300); spawn(400); }
  reset();

  const st = keyState('hexagon', { left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], start: [' '] });
  st.onPress = k => { if (state !== 'playing' && (k === 'start' || k === 'touch')) { reset(); state = 'playing'; OS.sfx.click(); } };
  bindTouchpad(win, st);
  // Toque no canvas: metade esquerda/direita gira; com o jogo parado, começa.
  let side = null;
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (state !== 'playing') { st.onPress('touch'); return; }
    const r = canvas.getBoundingClientRect();
    side = e.clientX - r.left < r.width / 2 ? 'left' : 'right';
    st[side] = true;
  });
  const release = () => { if (side) { st[side] = false; side = null; } };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, release));

  function die() {
    state = 'over';
    if (time > best) { best = time; OS.store.set('best-hexagon', best); showBest(); }
    OS.sfx.hit();
  }
  function update(dt) {
    rot += dt * cfg.cosmeticRotationSpeed * (state === 'playing' ? 1 : 0.4);
    hue = (hue + dt * 14) % 360;
    pulse = Math.max(0, pulse - dt * 3);
    if (state !== 'playing') return;
    time += dt;
    if (st.left) angle -= dt * cfg.playerRotateSpeed;
    if (st.right) angle += dt * cfg.playerRotateSpeed;
    speed += dt * cfg.speedRamp;
    walls.forEach(w => { w.r -= dt * speed * 0.55; });
    if (walls.length && walls[walls.length - 1].r < 260) spawn(420);
    for (const w of walls) {
      if (w.r <= playerR + 7 && w.r > playerR - 7) {
        let a = ((angle - w.gap) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (a > Math.PI) a -= Math.PI * 2;
        if (Math.abs(a) > w.gw / 2) { die(); return; }
      }
      if (!w.passed && w.r <= playerR - 7) { w.passed = true; pulse = 1; }
    }
    walls = walls.filter(w => w.r > 6);
  }
  function hexPath(r) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2; if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
  }
  function draw() {
    const dark = `hsl(${hue},45%,8%)`, mid = `hsl(${hue},42%,12%)`, wallC = `hsl(${(hue + 40) % 360},85%,62%)`;
    ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
    // Fundo em fatias girando (só visual).
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = mid;
    for (let i = 0; i < 6; i += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 400, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = dark; ctx.strokeStyle = `hsl(${hue},90%,66%)`; ctx.lineWidth = 3;
    hexPath(26 + pulse * 4); ctx.fill(); ctx.stroke();
    ctx.restore();
    // Paredes: NÃO giram, para bater exatamente com o cálculo de colisão.
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = wallC; ctx.lineWidth = 10; ctx.shadowColor = wallC; ctx.shadowBlur = 10;
    walls.forEach(w => { ctx.beginPath(); ctx.arc(0, 0, Math.max(1, w.r), w.gap + w.gw / 2, w.gap - w.gw / 2 + Math.PI * 2); ctx.stroke(); });
    ctx.restore();
    // Jogador.
    ctx.save(); ctx.translate(cx + Math.cos(angle) * playerR, cy + Math.sin(angle) * playerR); ctx.rotate(angle);
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5.5); ctx.lineTo(-5, 5.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = `600 13px ${MONO}`; ctx.textBaseline = 'top';
    ctx.fillText(time.toFixed(1) + 's', 10, 10);
    ctx.textBaseline = 'alphabetic';
    const tap = coarse.matches ? 'Toque' : 'Espaço';
    if (state === 'ready') banner(ctx, W, H, 'HEXÁGONO', `${tap} para começar`);
    else if (state === 'over') banner(ctx, W, H, 'VOCÊ BATEU!', `${time.toFixed(1)}s · ${tap} para tentar de novo`);
  }

  gameLoop('hexagon', dt => { update(dt); draw(); });
});

/* ============================================================
   VISUALIZADOR DE ORDENAÇÃO
   ============================================================ */
OS.register('ordenacao', win => {
  const ref = n => win.querySelector(`[data-ref="${n}"]`);
  const barsEl = ref('bars'), algoSel = ref('algo'), shuffleBtn = ref('shuffle'), runBtn = ref('run');
  const sizeIn = ref('size'), speedIn = ref('speed'), cmpEl = ref('cmp'), swpEl = ref('swp'), cxEl = ref('cx');
  const CX = { bubble: 'O(n²)', selection: 'O(n²)', insertion: 'O(n²)', quick: 'O(n log n) em média', merge: 'O(n log n)', heap: 'O(n log n)' };
  let arr = [], bars = [], running = false, stop = false, cmp = 0, swp = 0;

  function randomize() { arr = Array.from({ length: +sizeIn.value }, () => 5 + Math.floor(Math.random() * 95)); build(); }
  function build() {
    bars = arr.map(() => el('div', 'bar'));
    barsEl.replaceChildren(...bars);
    paint([]);
  }
  function paint(hl) {
    for (let i = 0; i < arr.length; i++) {
      bars[i].style.height = arr[i] + '%';
      bars[i].classList.toggle('is-cmp', hl.includes(i));
      bars[i].classList.remove('is-done');
    }
  }
  function stats() { cmpEl.textContent = cmp; swpEl.textContent = swp; cxEl.textContent = 'Complexidade: ' + CX[algoSel.value]; }
  const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; swp++; };

  const ALGOS = {
    *bubble(a) {
      for (let i = 0; i < a.length - 1; i++) {
        let swapped = false;
        for (let j = 0; j < a.length - 1 - i; j++) {
          cmp++; yield [j, j + 1];
          if (a[j] > a[j + 1]) { swap(a, j, j + 1); swapped = true; yield [j, j + 1]; }
        }
        if (!swapped) break;
      }
    },
    *selection(a) {
      for (let i = 0; i < a.length - 1; i++) {
        let m = i;
        for (let j = i + 1; j < a.length; j++) { cmp++; yield [m, j]; if (a[j] < a[m]) m = j; }
        if (m !== i) { swap(a, i, m); yield [i, m]; }
      }
    },
    *insertion(a) {
      for (let i = 1; i < a.length; i++) {
        for (let j = i; j > 0; j--) {
          cmp++; yield [j - 1, j];
          if (a[j - 1] <= a[j]) break;
          swap(a, j - 1, j); yield [j - 1, j];
        }
      }
    },
    *quick(a) {
      function* qs(lo, hi) {
        if (lo >= hi) return;
        const p = a[hi]; let i = lo - 1;
        for (let j = lo; j < hi; j++) {
          cmp++; yield [j, hi];
          if (a[j] < p) { i++; swap(a, i, j); yield [i, j]; }
        }
        swap(a, i + 1, hi); yield [i + 1, hi];
        yield* qs(lo, i); yield* qs(i + 2, hi);
      }
      yield* qs(0, a.length - 1);
    },
    *merge(a) {
      function* ms(lo, hi) {
        if (hi - lo <= 1) return;
        const mid = (lo + hi) >> 1;
        yield* ms(lo, mid); yield* ms(mid, hi);
        const L = a.slice(lo, mid), R = a.slice(mid, hi);
        let i = 0, j = 0, k = lo;
        while (i < L.length && j < R.length) { cmp++; a[k] = L[i] <= R[j] ? L[i++] : R[j++]; swp++; yield [k++, mid + Math.min(j, R.length - 1)]; }
        while (i < L.length) { a[k] = L[i++]; swp++; yield [k++]; }
        while (j < R.length) { a[k] = R[j++]; swp++; yield [k++]; }
      }
      yield* ms(0, a.length);
    },
    *heap(a) {
      const n = a.length;
      function* sift(i, size) {
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < size) { cmp++; yield [l, m]; if (a[l] > a[m]) m = l; }
          if (r < size) { cmp++; yield [r, m]; if (a[r] > a[m]) m = r; }
          if (m === i) return;
          swap(a, i, m); yield [i, m]; i = m;
        }
      }
      for (let i = (n >> 1) - 1; i >= 0; i--) yield* sift(i, n);
      for (let end = n - 1; end > 0; end--) { swap(a, 0, end); yield [0, end]; yield* sift(0, end); }
    },
  };

  const delay = sp => sp >= 90 ? nextFrame() : sleep(Math.round(240 * Math.pow(1 - sp / 100, 2)));
  function setRunning(on) {
    runBtn.innerHTML = OS.icon(on ? 'stop' : 'play') + (on ? 'Parar' : 'Iniciar');
    shuffleBtn.disabled = on; algoSel.disabled = on; sizeIn.disabled = on;
  }
  async function run() {
    if (running) { stop = true; return; }
    running = true; stop = false; cmp = 0; swp = 0;
    setRunning(true); stats();
    let steps = 0;
    for (const hl of ALGOS[algoSel.value](arr)) {
      if (stop) break;
      const sp = +speedIn.value;
      const batch = sp >= 90 ? 1 + (sp - 89) * 4 : 1;
      if (++steps % batch === 0) { paint(hl); stats(); await delay(sp); }
      while (!OS.isVisible('ordenacao') && !stop) await sleep(250);
    }
    paint([]); stats();
    if (!stop) {
      const chunk = Math.max(1, Math.ceil(bars.length / 40));
      for (let i = 0; i < bars.length; i++) { bars[i].classList.add('is-done'); if (i % chunk === 0) await nextFrame(); }
      OS.sfx.pick();
    }
    running = false; setRunning(false);
  }

  shuffleBtn.addEventListener('click', () => { if (!running) { randomize(); cmp = swp = 0; stats(); } });
  sizeIn.addEventListener('input', () => { if (!running) randomize(); });
  algoSel.addEventListener('change', stats);
  runBtn.addEventListener('click', run);
  randomize(); stats();
});

/* ============================================================
   LABIRINTO — geração + busca (BFS, DFS, Dijkstra e A*)
   ============================================================ */
OS.register('labirinto', win => {
  const ref = n => win.querySelector(`[data-ref="${n}"]`);
  const gridEl = ref('grid'), algoSel = ref('algo'), newBtn = ref('new'), runBtn = ref('run'), speedIn = ref('speed');
  const visEl = ref('visited'), pathEl = ref('path'), timeEl = ref('time');
  const ROWS = GAME_CONFIG.maze.rows, COLS = GAME_CONFIG.maze.cols;
  const start = [0, 0], end = [ROWS - 1, COLS - 1];
  let grid, cells, running = false, stop = false;
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

  const key = (r, c) => r * COLS + c;
  const neighbors = (r, c) => [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]].filter(([a, b]) => a >= 0 && a < ROWS && b >= 0 && b < COLS && grid[a][b]);
  const isEndpoint = (r, c) => (r === start[0] && c === start[1]) || (r === end[0] && c === end[1]);

  function generate() {
    // Backtracking iterativo (sem risco de estourar a pilha) + algumas paredes removidas
    // para criar caminhos alternativos, o que deixa as diferenças entre algoritmos visíveis.
    grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
    grid[0][0] = 1;
    const stack = [[0, 0]];
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = [[0, 2], [0, -2], [2, 0], [-2, 0]].filter(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !grid[nr][nc];
      });
      if (!opts.length) { stack.pop(); continue; }
      const [dr, dc] = opts[Math.floor(Math.random() * opts.length)];
      grid[r + dr / 2][c + dc / 2] = 1;
      grid[r + dr][c + dc] = 1;
      stack.push([r + dr, c + dc]);
    }
    let extra = Math.round(ROWS * COLS * 0.025);
    for (let tries = 0; extra > 0 && tries < 2000; tries++) {
      const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
      if (grid[r][c]) continue;
      const horiz = r % 2 === 0 && c % 2 === 1 && c > 0 && c < COLS - 1 && grid[r][c - 1] && grid[r][c + 1];
      const vert = r % 2 === 1 && c % 2 === 0 && r > 0 && r < ROWS - 1 && grid[r - 1][c] && grid[r + 1][c];
      if (horiz || vert) { grid[r][c] = 1; extra--; }
    }
    grid[end[0]][end[1]] = 1;
  }
  function render() {
    cells = [];
    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const d = el('div', 'maze-cell' + (grid[r][c] ? '' : ' wall'));
        frag.append(d); row.push(d);
      }
      cells.push(row);
    }
    gridEl.replaceChildren(frag);
    cells[start[0]][start[1]].classList.add('start');
    cells[end[0]][end[1]].classList.add('end');
    resetStats();
  }
  function clearMarks() { cells.forEach(row => row.forEach(d => d.classList.remove('visited', 'path'))); }
  function resetStats() { visEl.textContent = '0'; pathEl.textContent = '—'; timeEl.textContent = '—'; }

  class MinHeap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x) {
      const a = this.a; a.push(x);
      let i = a.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
    }
    pop() {
      const a = this.a, top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < a.length && a[l].f < a[m].f) m = l;
          if (r < a.length && a[r].f < a[m].f) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]]; i = m;
        }
      }
      return top;
    }
  }

  function* uninformed(useStack) {
    const seen = new Set([key(...start)]), parent = new Map(), list = [start];
    while (list.length) {
      const [r, c] = useStack ? list.pop() : list.shift();
      yield { visit: [r, c] };
      if (r === end[0] && c === end[1]) return parent;
      for (const [nr, nc] of neighbors(r, c)) {
        const k = key(nr, nc);
        if (!seen.has(k)) { seen.add(k); parent.set(k, [r, c]); list.push([nr, nc]); }
      }
    }
    return null;
  }
  function* weighted(heuristic) {
    const h = (r, c) => heuristic ? Math.abs(r - end[0]) + Math.abs(c - end[1]) : 0;
    const g = new Map([[key(...start), 0]]), parent = new Map(), done = new Set(), open = new MinHeap();
    open.push({ r: start[0], c: start[1], f: h(...start) });
    while (open.size) {
      const cur = open.pop(), k = key(cur.r, cur.c);
      if (done.has(k)) continue;
      done.add(k);
      yield { visit: [cur.r, cur.c] };
      if (cur.r === end[0] && cur.c === end[1]) return parent;
      for (const [nr, nc] of neighbors(cur.r, cur.c)) {
        const nk = key(nr, nc), ng = g.get(k) + 1;
        if (!g.has(nk) || ng < g.get(nk)) {
          g.set(nk, ng); parent.set(nk, [cur.r, cur.c]);
          // desempate leve: entre empates, prefere quem está mais perto do fim
          open.push({ r: nr, c: nc, f: ng + h(nr, nc) * 1.001 });
        }
      }
    }
    return null;
  }
  const ALGOS = { bfs: () => uninformed(false), dfs: () => uninformed(true), dijkstra: () => weighted(false), astar: () => weighted(true) };

  const delay = sp => sp >= 90 ? nextFrame() : sleep(Math.round(120 * Math.pow(1 - sp / 100, 2)));
  function setRunning(on) {
    runBtn.innerHTML = OS.icon(on ? 'stop' : 'play') + (on ? 'Parar' : 'Buscar');
    newBtn.disabled = on; algoSel.disabled = on;
  }
  async function run() {
    if (running) { stop = true; return; }
    running = true; stop = false;
    setRunning(true); clearMarks(); resetStats();
    // Mede o tempo real do algoritmo (sem animação) antes de animar.
    const t0 = performance.now();
    const pass = ALGOS[algoSel.value]();
    while (!pass.next().done) { /* executa até o fim */ }
    timeEl.textContent = (performance.now() - t0).toFixed(2) + ' ms';

    const gen = ALGOS[algoSel.value]();
    let visited = 0, parent = null, steps = 0;
    for (;;) {
      if (stop) break;
      const { value, done } = gen.next();
      if (done) { parent = value; break; }
      const [r, c] = value.visit;
      visited++;
      if (!isEndpoint(r, c)) cells[r][c].classList.add('visited');
      visEl.textContent = visited;
      const sp = +speedIn.value;
      const batch = sp >= 90 ? 1 + (sp - 89) * 2 : 1;
      if (++steps % batch === 0) await delay(sp);
      while (!OS.isVisible('labirinto') && !stop) await sleep(250);
    }
    if (parent && !stop) {
      const path = [];
      let cur = end;
      while (cur && !(cur[0] === start[0] && cur[1] === start[1])) { path.push(cur); cur = parent.get(key(...cur)); }
      path.reverse();
      pathEl.textContent = path.length + ' passos';
      for (const [r, c] of path) { if (!isEndpoint(r, c)) cells[r][c].classList.add('path'); await sleep(8); }
      OS.sfx.pick();
    } else if (!stop) pathEl.textContent = 'sem caminho';
    running = false; setRunning(false);
  }

  newBtn.addEventListener('click', () => { if (!running) { generate(); render(); } });
  runBtn.addEventListener('click', run);
  generate(); render();
});

})();
