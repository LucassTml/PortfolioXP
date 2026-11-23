/* =============================================================
   LucasOS XP - programas
   Bloco de Notas, Explorer (Projetos, Trajetória, Lixeira), Navegador (GitHub),
   Nova mensagem, Executar, Propriedades de Vídeo, Prompt de Comando,
   Invasores, Hexágono, Ordenação e Labirinto.
   Cada programa só é iniciado quando a janela abre pela primeira vez.
   ============================================================= */
(() => {
'use strict';
const OS = window.LucasOS;
if (!OS) return;

/* ============================================================
   AJUSTES DOS JOGOS (velocidades em "pixels por quadro a 60 fps";
   o jogo compensa telas de 120/144 Hz)
   ============================================================ */
const GAME_CONFIG = {
  invaders: {
    playerSpeed: 4.2, bulletSpeed: 6, enemyBulletSpeed: 4.2,
    invaderHorizontalSpeed: 1.1, invaderDescentStep: 3, enemyShootChance: 0.02,
    fireCooldown: 14, lives: 3,
    levels: [
      { rows: 3, cols: 7, speedMultiplier: 1.0 },
      { rows: 4, cols: 8, speedMultiplier: 1.25 },
      { rows: 5, cols: 9, speedMultiplier: 1.5 },
    ],
    powerUps: [
      { id: 'vida_extra', label: '+1 Vida', desc: 'Ganha uma vida extra.' },
      { id: 'tiro_duplo', label: 'Tiro Duplo', desc: 'Atira dois projéteis por vez.' },
      { id: 'tiro_rapido', label: 'Tiro Rápido', desc: 'Tiros mais rápidos e frequentes.' },
      { id: 'nave_agil', label: 'Nave Ágil', desc: 'A nave anda mais rápido.' },
      { id: 'escudo', label: 'Escudo', desc: 'Bloqueia o próximo tiro inimigo.' },
    ],
  },
  hexagon: { playerRotateSpeed: 7, baseSpeed: 170, speedRamp: 18, gapWidth: Math.PI / 3, cosmeticRotationSpeed: 0.25 },
  maze: { cols: 25, rows: 23 },
};

/* ---------------- utilidades ---------------- */
const coarse = matchMedia('(pointer: coarse)');
const isTyping = t => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const svgIcon = name => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'xi'); s.innerHTML = `<use href="#x-${name}"/>`; return s; };
const MONO = '"Lucida Console", Consolas, monospace';
// Escuta comandos de menu (data-cmd) de uma janela específica.
const onCmd = (id, fn) => document.addEventListener('lucasos:cmd', e => { if (e.detail.id === id) fn(e.detail.cmd, e.detail.el); });

function fitCanvas(canvas, W, H) {
  const ctx = canvas.getContext('2d');
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const s = Math.max(1, (canvas.getBoundingClientRect().width || W) / W) * dpr;
    canvas.width = Math.round(W * s); canvas.height = Math.round(H * s);
    ctx.setTransform(s, 0, 0, s, 0, 0);
  };
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas);
  return ctx;
}
function gameLoop(id, step) {
  let running = false, last = 0;
  const frame = ts => {
    if (!OS.isVisible(id)) { running = false; return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    last = ts; step(dt);
    requestAnimationFrame(frame);
  };
  const ensure = () => { if (running || !OS.isVisible(id)) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  document.addEventListener('lucasos:visibility', e => { if (e.detail.id === id && e.detail.visible) ensure(); });
  ensure();
}
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
function bindTouchpad(win, st) {
  win.querySelectorAll('.touchpad [data-key]').forEach(b => {
    const k = b.dataset.key;
    const down = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* ok */ } b.classList.add('is-down'); if (!st[k]) { st[k] = true; if (st.onPress) st.onPress(k); } };
    const up = () => { b.classList.remove('is-down'); st[k] = false; };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
}
function banner(ctx, W, H, title, sub) {
  ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, H / 2 - 34, W, 68);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Tahoma, Verdana, sans-serif'; ctx.fillText(title, W / 2, H / 2 - 9);
  ctx.fillStyle = '#ffd34d'; ctx.font = '12px Tahoma, Verdana, sans-serif'; ctx.fillText(sub, W / 2, H / 2 + 14);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ============================================================
   BLOCO DE NOTAS (Sobre Mim)
   ============================================================ */
OS.register('sobre', win => {
  const text = win.querySelector('.np-text');
  onCmd('sobre', async (cmd, item) => {
    if (cmd === 'wrap') {
      const on = item.getAttribute('aria-checked') !== 'true';
      item.setAttribute('aria-checked', String(on));
      text.classList.toggle('nowrap', !on);
    } else if (cmd === 'copy-all') {
      try { await navigator.clipboard.writeText(text.innerText); } catch { /* ok */ }
      OS.balloon({ title: 'Bloco de Notas', text: 'O texto foi copiado para a área de transferência.', ms: 4000 });
    }
  });
});

/* ============================================================
   EXPLORER (Meus Projetos, Trajetória, Lixeira)
   ============================================================ */
function explorer(id, win) {
  const box = win.querySelector('[data-explorer]');
  const details = box.querySelector('[data-details]');
  const tasks = box.querySelector('[data-tasks]');
  const status = box.querySelector('[data-status]');
  const items = () => Array.from(box.querySelectorAll('.ex-item'));
  let sel = null;

  function link(label, ico, href) {
    const a = el('a', 'tp-link'); a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.append(svgIcon(ico), document.createTextNode(label));
    return a;
  }
  function show(it) {
    if (details) {
      details.replaceChildren();
      if (it) {
        details.append(el('b', null, it.querySelector('.ex-name').textContent));
        details.append(el('span', 'tp-sub', [it.querySelector('.ex-c2'), it.querySelector('.ex-c3')].filter(Boolean).map(x => x.textContent).join(' | ')));
        const d = it.querySelector('.ex-desc'); if (d) details.append(el('p', null, d.textContent));
      } else {
        details.append(el('b', null, box.dataset.emptyTitle || ''));
        details.append(el('span', 'tp-sub', box.dataset.emptySub || ''));
      }
    }
    if (tasks) {
      tasks.replaceChildren();
      if (it && it.dataset.code) tasks.append(link('Ver o código no GitHub', 'github', it.dataset.code));
      if (it && it.dataset.site) tasks.append(link('Abrir o site', 'globe', it.dataset.site));
      if (it && it.dataset.download) tasks.append(link('Baixar a última versão', 'go', it.dataset.download));
      if (!it) tasks.append(link('Ver todos os repositórios', 'github', OS.config.githubUrl + '?tab=repositories'));
    }
    if (status) {
      const n = items().length;
      status.textContent = it ? '1 objeto(s) selecionado(s)' : `${n} objeto${n === 1 ? '' : 's'}`;
    }
  }
  function select(it) {
    sel = it;
    items().forEach(x => x.classList.toggle('is-sel', x === it));
    show(it);
  }
  function openItem(it) {
    const href = it.dataset.code || it.dataset.site;
    if (href) window.open(href, '_blank', 'noopener');
  }
  function setView(v) {
    box.dataset.view = v;
    win.querySelectorAll('[data-cmd^="view:"][role="menuitemradio"]').forEach(m => m.setAttribute('aria-checked', String(m.dataset.cmd === 'view:' + v)));
  }
  box.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const it = e.target.closest('.ex-item');
    if (it) select(it);
    else if (e.target.closest('.ex-view')) select(null);
  });
  box.addEventListener('dblclick', e => { const it = e.target.closest('.ex-item'); if (it && !e.target.closest('a')) openItem(it); });
  box.addEventListener('focusin', e => { const it = e.target.closest('.ex-item'); if (it && it !== sel) select(it); });
  box.addEventListener('keydown', e => {
    const it = e.target.closest('.ex-item'); if (!it) return;
    const list = items(), i = list.indexOf(it);
    if (e.key === 'Enter') openItem(it);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); (list[i + 1] || it).focus(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); (list[i - 1] || it).focus(); }
  });
  onCmd(id, cmd => {
    if (cmd === 'view:tiles') setView('tiles');
    else if (cmd === 'view:details') setView('details');
    else if (cmd === 'view:toggle') setView(box.dataset.view === 'tiles' ? 'details' : 'tiles');
    else if (cmd === 'open-item' && sel) openItem(sel);
  });
  select(null);
  return { select, refresh: () => select(null) };
}
OS.register('projetos', win => explorer('projetos', win));
OS.register('trajetoria', win => explorer('trajetoria', win));
OS.register('lixeira', win => {
  const ex = explorer('lixeira', win);
  const list = win.querySelector('[data-bin-items]');
  const empty = () => {
    list.replaceChildren(el('p', 'ex-empty', 'A Lixeira está vazia.'));
    win.querySelector('[data-status]').textContent = '0 objetos';
  };
  if (OS.isBinEmpty()) { empty(); ex.refresh(); win.querySelector('[data-status]').textContent = '0 objetos'; }
  onCmd('lixeira', async cmd => {
    if (cmd !== 'empty-bin') return;
    const n = list.querySelectorAll('.ex-item').length;
    if (!n) { OS.msgbox({ title: 'Lixeira', text: 'A Lixeira já está vazia.', ico: 'info' }); return; }
    const ok = await OS.msgbox({ title: 'Confirmar exclusão de vários arquivos', text: `Tem certeza de que deseja excluir permanentemente estes ${n} itens?`, ico: 'warn', buttons: ['Sim', 'Não'] });
    if (ok !== 0) return;
    OS.setBinEmpty(true);
    ex.refresh();
    empty();
  });
});

/* ============================================================
   NAVEGADOR (perfil do GitHub ao vivo)
   ============================================================ */
OS.register('github', win => {
  const user = OS.config.githubUser;
  const home = 'https://github.com/' + user;
  const page = win.querySelector('[data-page]');
  const status = win.querySelector('[data-status]');
  const form = win.querySelector('[data-address]');
  const input = form.querySelector('input');
  const reposEl = win.querySelector('[data-gh-repos]');
  const LANG_NAME = l => l || 'sem linguagem';
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const ago = iso => {
    const s = (new Date(iso) - Date.now()) / 1000;
    for (const [u, sec] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
      if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u);
    }
    return 'agora mesmo';
  };

  async function load(force) {
    const KEY = 'lucasos:gh-cache';
    let data = null;
    if (!force) { try { const c = JSON.parse(sessionStorage.getItem(KEY)); if (c && Date.now() - c.t < 10 * 60 * 1000) data = c; } catch { /* ok */ } }
    if (!data) {
      status.textContent = 'Abrindo página ' + home + '...';
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const opts = { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } };
        const [u, r] = await Promise.all([
          fetch(`https://api.github.com/users/${user}`, opts),
          fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`, opts),
        ]);
        if (!u.ok || !r.ok) throw new Error('HTTP');
        const uj = await u.json(), rj = await r.json();
        data = {
          t: Date.now(),
          user: { name: uj.name, bio: uj.bio, followers: uj.followers, repos: uj.public_repos },
          repos: rj.filter(x => !x.fork && !x.archived && x.name.toLowerCase() !== user.toLowerCase())
            .map(x => ({ name: x.name, url: x.html_url, desc: x.description, lang: x.language, pushed: x.pushed_at })),
        };
        try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ok */ }
      } catch {
        data = null;
      } finally { clearTimeout(timer); }
    }
    if (!data) {
      status.textContent = 'Não foi possível atualizar. Mostrando a página salva.';
      win.querySelector('[data-gh-status]').textContent = '(lista salva)';
      return;
    }
    const u = data.user;
    if (u.name) win.querySelector('[data-gh-name]').textContent = u.name;
    if (u.bio) win.querySelector('[data-gh-bio]').textContent = u.bio;
    win.querySelector('[data-gh-stats]').textContent = `${u.repos} repositórios públicos · ${u.followers} seguidor${u.followers === 1 ? '' : 'es'}`;
    reposEl.replaceChildren(...data.repos.slice(0, 14).map(r => {
      const li = el('li');
      const a = el('a', null, r.name); a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
      li.append(a, el('span', null, r.desc || 'Sem descrição.'), el('em', null, `${LANG_NAME(r.lang)} · atualizado ${ago(r.pushed)}`));
      return li;
    }));
    win.querySelector('[data-gh-status]').textContent = '(ao vivo)';
    status.textContent = 'Concluído';
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    let v = input.value.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    if (v.replace(/\/+$/, '').toLowerCase() === home.toLowerCase()) { load(true); return; }
    window.open(v, '_blank', 'noopener');
    input.value = home;
  });
  onCmd('github', cmd => {
    if (cmd === 'refresh') load(true);
    else if (cmd === 'home') { input.value = home; page.scrollTop = 0; }
    else if (cmd === 'open-external') window.open(home, '_blank', 'noopener');
  });
  load(false);
});

/* ============================================================
   NOVA MENSAGEM (Contato)
   ============================================================ */
OS.register('contato', win => {
  const form = win.querySelector('#compose');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = form.nome.value.trim(), assunto = form.assunto.value.trim(), msg = form.mensagem.value.trim();
    if (!msg) { OS.msgbox({ title: 'Nova mensagem', text: 'Escreva alguma coisa antes de enviar.', ico: 'warn' }).then(() => form.mensagem.focus()); return; }
    const subject = assunto || ('Contato pelo portfólio' + (nome ? ', de ' + nome : ''));
    const body = msg + (nome ? '\n\n' + nome : '');
    location.href = `mailto:${OS.config.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});

/* ============================================================
   EXECUTAR
   ============================================================ */
OS.register('executar', win => {
  const form = win.querySelector('[data-run]');
  const input = form.querySelector('input');
  const list = form.querySelector('.run-list');
  let results = [], sel = -1;
  input.value = OS.store.get('run-last', '');
  const mark = () => Array.from(list.children).forEach((li, i) => { li.classList.toggle('is-sel', i === sel); li.setAttribute('aria-selected', String(i === sel)); });
  const closeList = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  function render() {
    results = OS.searchIndex(input.value);
    list.replaceChildren(...results.map((r, i) => {
      const li = el('li'); li.setAttribute('role', 'option'); li.dataset.i = i;
      li.append(svgIcon(r.icon), el('span', null, r.title), el('small', null, r.sub ? '  ' + r.sub : ''));
      return li;
    }));
    sel = results.length ? 0 : -1;
    list.hidden = !results.length;
    input.setAttribute('aria-expanded', String(!list.hidden));
    mark();
  }
  function run(r) {
    OS.store.set('run-last', input.value.trim());
    closeList();
    OS.close('executar');
    r.run();
  }
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length) {
      e.preventDefault();
      if (list.hidden) { list.hidden = false; }
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      mark();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (!list.hidden) closeList(); else OS.close('executar');
    }
  });
  list.addEventListener('pointerdown', e => { e.preventDefault(); const li = e.target.closest('li'); if (li) run(results[+li.dataset.i]); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    if (!list.hidden && results[sel]) { run(results[sel]); return; }
    if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v)) {
      OS.store.set('run-last', v);
      OS.close('executar');
      window.open(/^https?:/i.test(v) ? v : 'https://' + v, '_blank', 'noopener');
      return;
    }
    const r = OS.searchIndex(v);
    if (r.length) { run(r[0]); return; }
    OS.msgbox({ title: v, text: `O LucasOS não pode encontrar '${v}'. Verifique se o nome foi digitado corretamente e tente novamente.`, ico: 'error' });
  });
  document.addEventListener('lucasos:focus', e => {
    if (e.detail.id === 'executar') setTimeout(() => { input.focus(); input.select(); }, 0);
  });
});

/* ============================================================
   PROPRIEDADES DE VÍDEO
   ============================================================ */
OS.register('video', win => {
  const fields = Array.from(win.querySelectorAll('[data-set]'));
  const screen = win.querySelector('[data-preview]');
  const monitor = win.querySelector('.monitor');
  const applyBtn = win.querySelector('[data-cmd="video-apply"]');
  const fileInput = document.getElementById('wallpaper-input');
  let pending = {};
  const KEYS = ['theme', 'scheme', 'wallpaper', 'saver', 'saverWait', 'effects', 'sound'];
  function load() {
    KEYS.forEach(k => { pending[k] = OS.settings[k]; });
    fields.forEach(f => { const k = f.dataset.set; if (f.type === 'checkbox') f.checked = !!pending[k]; else f.value = String(pending[k]); });
    preview();
    applyBtn.disabled = true;
  }
  function preview() {
    screen.dataset.wp = pending.wallpaper;
    monitor.dataset.scheme = pending.scheme;
  }
  function apply() {
    KEYS.forEach(k => { if (pending[k] !== OS.settings[k]) OS.setSetting(k, pending[k]); });
    applyBtn.disabled = true;
  }
  fields.forEach(f => f.addEventListener('change', () => {
    const k = f.dataset.set;
    pending[k] = f.type === 'checkbox' ? f.checked : k === 'saverWait' ? Math.max(1, Math.min(60, Math.round(+f.value) || 5)) : f.value;
    if (k === 'saverWait') f.value = pending[k];
    preview();
    applyBtn.disabled = false;
  }));
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    OS.setCustomWallpaper('custom', URL.createObjectURL(file));
    fileInput.value = '';
    OS.balloon({ title: 'Plano de fundo', text: 'A imagem foi aplicada. Ela vale até você recarregar a página.', ms: 5000 });
  });
  onCmd('video', cmd => {
    if (cmd === 'video-apply') apply();
    else if (cmd === 'video-ok') { apply(); OS.close('video'); }
    else if (cmd === 'video-cancel') OS.close('video');
    else if (cmd === 'browse-wallpaper') fileInput.click();
    else if (cmd === 'preview-saver') OS.previewSaver(pending.saver);
  });
  document.addEventListener('lucasos:visibility', e => { if (e.detail.id === 'video' && e.detail.visible) load(); });
  load();
});

/* ============================================================
   PROMPT DE COMANDO
   ============================================================ */
OS.register('terminal', win => {
  const body = win.querySelector('.term');
  const out = win.querySelector('.term-out');
  const input = win.querySelector('.term-in');
  const titleEl = win.querySelector('.t-title');
  input.dataset.autofocus = '';
  const PROMPT = 'C:\\Users\\Lucas>';
  const history = OS.store.get('term-history', []);
  let hIdx = history.length;
  const scroll = () => { out.scrollTop = out.scrollHeight; };
  const line = (text = '') => { const d = el('div', null, text || ' '); out.append(d); return d; };
  const link = (text, href) => { const a = el('a', null, text); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
  const rich = parts => { const d = el('div'); parts.forEach(p => d.append(typeof p === 'string' ? document.createTextNode(p) : p)); out.append(d); return d; };
  const apps = OS.apps.filter(a => !a.href);
  const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const findApp = q => q ? apps.find(a => a.id === plain(q) || plain(a.title).startsWith(plain(q))) : null;
  const COLORS = ['#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0', '#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffffff'];

  function welcome() {
    line('LucasOS XP [versão 5.1.2600]');
    line('(C) Copyright 2026 Lucas Melo.');
    line('');
    line('Digite help para ver os comandos.');
    line('');
  }
  function neofetch() {
    const up = Math.floor((Date.now() - OS.bootTime) / 1000);
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
      'lucas@lucasos', '-------------',
      'SO:          LucasOS XP (Service Pack 2)',
      'Nome:        Lucas Eduardo Melo',
      'Curso:       Engenharia da Computação, UPE Poli',
      'Local:       Recife, PE, Brasil',
      'Foco:        LLMs locais, agentes de IA, MCP',
      'Linguagens:  C, Python, JavaScript, Java, Rust',
      'Ferramentas: Docker, n8n, Linux/Unix, Git',
      'Idiomas:     português (nativo), inglês (avançado)',
      `Ligado há:   ${Math.floor(up / 60)}m ${up % 60}s`,
    ].join('\n');
    const wrap = el('div', 'neo');
    wrap.append(el('pre', null, fox), el('pre', null, info));
    out.append(wrap);
  }
  function hamster() {
    const d = el('div', 'hamster');
    d.append(el('div', 'wheel', '🐹'), el('div', null, 'um hamster apareceu. papel de parede atualizado.'));
    out.append(d);
    const tiles = Array.from({ length: 36 }, (_, i) => {
      const x = (i % 6) * 70 + 20, y = Math.floor(i / 6) * 70 + 20, rot = ((i * 53) % 40) - 20;
      return `<text x="${x}" y="${y}" font-size="40" transform="rotate(${rot} ${x} ${y})">\uD83D\uDC39</text>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420"><rect width="420" height="420" fill="#FFD97A"/>${tiles}</svg>`;
    OS.setCustomWallpaper('hamster', 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
  }
  function dir() {
    const d = new Date(), date = d.toLocaleDateString('pt-BR'), time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    line(' O volume na unidade C é LUCASOS');
    line('');
    line(' Pasta de C:\\Users\\Lucas');
    line('');
    apps.forEach(a => line(`${date}  ${time}    <DIR>          ${a.title}`));
    line(`              ${apps.length} pasta(s)`);
  }

  const COMMANDS = {
    help: { desc: 'Mostra esta lista.', run() { Object.entries(COMMANDS).forEach(([n, c]) => line(n.toUpperCase().padEnd(10) + c.desc)); } },
    sobre: { desc: 'Quem é o Lucas.', run() {
      line('Lucas Melo, estudante de Engenharia da Computação na UPE (Poli), em Recife.');
      line('Programa mais em C e Python. Hoje mexe muito com LLMs locais e agentes de IA.');
    } },
    projetos: { desc: 'Lista os projetos com links.', run() {
      document.querySelectorAll('[data-app="projetos"] .ex-item').forEach(it => rich(['  ', link(it.querySelector('.ex-name').textContent, it.dataset.site || it.dataset.code), '  ' + it.querySelector('.ex-c3').textContent]));
    } },
    contato: { desc: 'Formas de falar comigo.', run() {
      rich(['  e-mail    ', link(OS.config.email, 'mailto:' + OS.config.email)]);
      rich(['  linkedin  ', link('lucas-eduardo-melo-tenorio', OS.config.linkedinUrl)]);
      rich(['  github    ', link(OS.config.githubUser, OS.config.githubUrl)]);
    } },
    neofetch: { desc: 'Ficha técnica do sistema.', run: neofetch },
    dir: { desc: 'Lista os programas desta pasta.', run: dir },
    start: { desc: 'Abre um programa. Ex.: start projetos', run(args) {
      const a = findApp(args.join(' '));
      if (!a) { line(args.length ? `O sistema não pode encontrar o arquivo ${args.join(' ')}.` : 'Uso: start <programa>'); return; }
      setTimeout(() => OS.open(a.id), 100);
    } },
    color: { desc: 'Muda as cores. Ex.: color 0a', run(args) {
      const v = (args[0] || '').toLowerCase();
      if (!v) { body.style.background = ''; body.style.color = ''; return; }
      const [bg, fg] = v.length === 1 ? ['0', v] : [v[0], v[1]];
      const b = parseInt(bg, 16), f = parseInt(fg, 16);
      if (Number.isNaN(b) || Number.isNaN(f) || b === f || v.length > 2) { line('Uso: color XY, onde X é o fundo e Y o texto (0 a F, diferentes).'); return; }
      body.style.background = COLORS[b]; body.style.color = COLORS[f];
    } },
    title: { desc: 'Muda o título da janela.', run(args, raw) { titleEl.textContent = raw.replace(/^\s*title\s*/i, '') || 'Prompt de Comando'; } },
    tema: { desc: 'Esquema de cores: azul, oliva, prateado ou vista.', run(args) {
      const t = (args[0] || '').toLowerCase().replace('verde-oliva', 'oliva');
      if (t === 'vista') OS.setSetting('theme', 'vista');
      else if (['azul', 'oliva', 'prateado'].includes(t)) { OS.setSetting('theme', 'xp'); OS.setSetting('scheme', t); }
      else line('Uso: tema azul | oliva | prateado | vista');
    } },
    ver: { desc: 'Mostra a versão do sistema.', run() { line(''); line('LucasOS XP [versão 5.1.2600]'); } },
    date: { desc: 'Mostra a data.', run() { line('A data atual é: ' + new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })); } },
    time: { desc: 'Mostra a hora.', run() { line('A hora atual é: ' + new Date().toLocaleTimeString('pt-BR')); } },
    echo: { desc: 'Repete o texto.', run(args, raw) { line(raw.replace(/^\s*echo\s?/i, '') || 'ECHO está ativado.'); } },
    whoami: { desc: 'Usuário atual.', run() { line('lucasos\\lucas'); } },
    doskey: { desc: 'doskey /history mostra o histórico.', run() { history.forEach(h => line(h)); } },
    cls: { desc: 'Limpa a tela.', run() { out.replaceChildren(); } },
    logoff: { desc: 'Faz logoff.', run() { OS.exitDialog('logoff'); } },
    shutdown: { desc: 'Desliga o computador.', run() { OS.exitDialog('shutdown'); } },
    exit: { desc: 'Fecha o Prompt de Comando.', run() { setTimeout(() => OS.close('terminal'), 60); } },
  };
  const ALIASES = { ajuda: 'help', '?': 'help', ls: 'dir', clear: 'cls', open: 'start', abrir: 'start', cd: 'start', history: 'doskey', about: 'sobre' };

  function exec(raw) {
    line(PROMPT + raw);
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
    else if (key === 'sudo') line("'sudo' não existe aqui. Isto é Windows, só que de mentira.");
    else line(`'${name}' não é reconhecido como um comando interno\nou externo, um programa operável ou um arquivo em lotes.`);
    line('');
    scroll();
  }
  function complete() {
    const parts = input.value.split(/\s+/);
    let pool, prefix;
    if (parts.length <= 1) { pool = Object.keys(COMMANDS); prefix = parts[0] || ''; }
    else if (['start', 'open', 'abrir', 'cd'].includes(parts[0].toLowerCase())) { pool = apps.map(a => a.id); prefix = parts[1]; }
    else if (parts[0].toLowerCase() === 'tema') { pool = ['azul', 'oliva', 'prateado', 'vista']; prefix = parts[1]; }
    else return;
    const hits = pool.filter(p => p.startsWith(prefix.toLowerCase()));
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + ' '; }
    else if (hits.length > 1) { line(PROMPT + input.value); line(hits.join('   ')); scroll(); }
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const v = input.value; input.value = ''; exec(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) { hIdx--; input.value = history[hIdx]; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hIdx < history.length) { hIdx++; input.value = history[hIdx] || ''; } }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key === 'Escape') { input.value = ''; }
    else if (e.key.length === 1) OS.sfx.key();
  });
  body.addEventListener('click', e => { if (!e.target.closest('a') && !String(getSelection())) input.focus({ preventScroll: true }); });
  document.addEventListener('lucasos:focus', e => { if (e.detail.id === 'terminal' && !coarse.matches) setTimeout(() => input.focus({ preventScroll: true }), 0); });
  welcome();
});

/* ============================================================
   JOGO: INVASORES
   ============================================================ */
OS.register('invaders', win => {
  const cfg = GAME_CONFIG.invaders, W = 380, H = 280;
  const canvas = win.querySelector('canvas');
  const ctx = fitCanvas(canvas, W, H);
  const overlay = win.querySelector('.powerup-overlay');
  const optionsEl = win.querySelector('.powerup-options');
  const hudEl = win.querySelector('[data-hud]');
  const bestEl = win.querySelector('[data-best]');
  let best = OS.store.get('best-invaders', 0);
  const showBest = () => { bestEl.textContent = 'Recorde: ' + best; };
  showBest();
  const SPRITES = [
    ['....XXX....', '..XXXXXXX..', '.XXX...XXX.', '.XX..X..XX.', '.XXX...XXX.', '..XXXXXXX..', '..X..X..X..', '.X..X.X..X.'],
    ['....XXX....', '..XXXXXXX..', '.XXX...XXX.', '.XX..X..XX.', '.XXX...XXX.', '..XXXXXXX..', '..X..X..X..', '...X.X.X...'],
  ];
  const ROW_COLORS = ['#ff6bd5', '#b48cff', '#5fa8ff', '#5fe36b', '#ffd34d'];
  const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.3 + 0.3, v: Math.random() * 0.25 + 0.05 }));
  let player, bullets, eBullets, invaders, parts, dir, score, lives, level, state = 'ready', doubleShot, shield, cooldown, bulletBonus, speedBonus, t, flash, choices = [];

  function setupLevel() {
    const L = cfg.levels[level];
    player = { x: W / 2 - 14, y: H - 26, w: 28, h: 14 };
    bullets = []; eBullets = []; parts = []; invaders = []; cooldown = 0; dir = 1;
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) invaders.push({ x: 24 + c * 38, y: 30 + r * 24, w: 22, h: 16, row: r, alive: true });
  }
  function reset() { level = 0; score = 0; lives = cfg.lives; doubleShot = false; shield = false; bulletBonus = 0; speedBonus = 0; t = 0; flash = 0; overlay.hidden = true; setupLevel(); }
  reset();
  const hud = () => { hudEl.textContent = state === 'ready' ? (coarse.matches ? 'Toque para começar' : 'Espaço para começar') : `Fase ${level + 1}/${cfg.levels.length}   Pontos: ${score}   Vidas: ${lives}`; };
  const newGame = () => { reset(); state = 'playing'; cooldown = 10; hud(); };

  const st = keyState('invaders', { left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], fire: [' ', 'ArrowUp', 'w', 'W'], p1: ['1'], p2: ['2'], p3: ['3'], f2: ['F2'] });
  st.onPress = k => {
    if (k === 'f2') { newGame(); return; }
    if (state === 'levelup') { const i = { p1: 0, p2: 1, p3: 2 }[k]; if (i != null && choices[i]) pick(choices[i]); return; }
    if (k !== 'fire') return;
    if (state === 'playing') { if (cooldown <= 0) shoot(); }
    else newGame();
  };
  bindTouchpad(win, st);
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'playing') st.fire = true; st.onPress('fire'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => { st.fire = false; }));
  onCmd('invaders', cmd => {
    if (cmd === 'newgame') newGame();
    else if (cmd === 'howto') OS.msgbox({ title: 'Como jogar Invasores', text: 'Setas ou A e D movem a nave. Espaço atira (segure para atirar sem parar).\nAo terminar uma fase, escolha um power-up com o mouse ou com as teclas 1, 2 e 3.\nF2 começa um novo jogo.' });
  });

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function shoot() {
    const by = player.y - 8;
    if (doubleShot) bullets.push({ x: player.x + 4, y: by, w: 3, h: 10 }, { x: player.x + player.w - 7, y: by, w: 3, h: 10 });
    else bullets.push({ x: player.x + player.w / 2 - 1.5, y: by, w: 3, h: 10 });
    cooldown = cfg.fireCooldown - (bulletBonus ? 4 : 0);
    OS.sfx.shoot();
  }
  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = Math.random() * 2 + 0.6; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color }); }
  }
  function showLevelUp() {
    state = 'levelup';
    const pool = cfg.powerUps.slice();
    choices = [];
    while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    optionsEl.replaceChildren(...choices.map((p, i) => {
      const b = el('button', 'btn'); b.type = 'button';
      b.append(el('b', null, `${i + 1}. ${p.label}`), el('span', null, p.desc));
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
    level++; setupLevel(); state = 'playing'; hud();
  }
  function endGame(won) {
    state = won ? 'win' : 'over';
    if (score > best) { best = score; OS.store.set('best-invaders', best); showBest(); }
    if (won) OS.sfx.pick(); else OS.sfx.hit();
    hud();
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
    let changed = false;
    for (const b of bullets) {
      for (const i of alive) {
        if (i.alive && hit(b, i)) {
          i.alive = false; b.y = -999; score += 10 * (level + 1); changed = true;
          burst(i.x + i.w / 2, i.y + i.h / 2, ROW_COLORS[i.row % ROW_COLORS.length]);
          OS.sfx.tone(300 + Math.random() * 120, 0.06, 'triangle', 0.03);
          break;
        }
      }
    }
    for (const b of eBullets) {
      if (!hit(b, player)) continue;
      b.y = H + 999;
      if (shield) { shield = false; burst(player.x + player.w / 2, player.y, '#ffd34d', 14); continue; }
      lives--; flash = 0.35; changed = true;
      burst(player.x + player.w / 2, player.y + 6, '#5fa8ff', 18);
      OS.sfx.hit();
      if (lives <= 0) { endGame(false); return; }
    }
    if (changed) hud();
    if (alive.some(i => i.alive && i.y + i.h >= player.y)) { lives = 0; endGame(false); return; }
    if (invaders.every(i => !i.alive)) { if (level >= cfg.levels.length - 1) endGame(true); else showLevelUp(); }
  }
  function drawSprite(sp, x, y, px) {
    for (let r = 0; r < sp.length; r++) for (let c = 0; c < sp[r].length; c++) if (sp[r][c] === 'X') ctx.fillRect(x + c * px, y + r * px, px, px);
  }
  function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(s => { ctx.globalAlpha = 0.2 + s.s * 0.4; ctx.fillRect(s.x, s.y, s.s, s.s); });
    ctx.globalAlpha = 1;
    const fr = Math.floor(t * 2.4) % 2;
    invaders.forEach(i => { if (!i.alive) return; ctx.fillStyle = ROW_COLORS[i.row % ROW_COLORS.length]; drawSprite(SPRITES[fr], i.x, i.y, 2); });
    if (state !== 'over' || Math.floor(t * 6) % 2) {
      const { x, y } = player;
      ctx.fillStyle = '#5fa8ff'; ctx.fillRect(x, y + 8, 28, 6); ctx.fillRect(x + 4, y + 4, 20, 4); ctx.fillRect(x + 11, y, 6, 4);
      if (shield) { ctx.strokeStyle = 'rgba(255,211,77,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + 14, y + 8, 21, 13, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.fillStyle = '#ffd34d'; bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    ctx.fillStyle = '#ff5a4a'; eBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 2, 2); });
    ctx.globalAlpha = 1;
    if (flash > 0) { ctx.fillStyle = `rgba(255,60,40,${flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    const tap = coarse.matches ? 'Toque' : 'Espaço';
    if (state === 'ready') banner(ctx, W, H, 'INVASORES', `${tap} para começar`);
    else if (state === 'over') banner(ctx, W, H, 'FIM DE JOGO', `${score} pontos. ${tap} para jogar de novo`);
    else if (state === 'win') banner(ctx, W, H, 'VOCÊ VENCEU!', `${score} pontos. ${tap} para jogar de novo`);
  }
  hud();
  gameLoop('invaders', dt => { update(dt); draw(); });
});

/* ============================================================
   JOGO: HEXÁGONO
   ============================================================ */
OS.register('hexagon', win => {
  const cfg = GAME_CONFIG.hexagon, W = 320, H = 320, cx = W / 2, cy = H / 2, playerR = 46;
  const canvas = win.querySelector('canvas');
  const ctx = fitCanvas(canvas, W, H);
  const hudEl = win.querySelector('[data-hud]');
  const bestEl = win.querySelector('[data-best]');
  let best = OS.store.get('best-hexagon', 0);
  const showBest = () => { bestEl.textContent = `Recorde: ${best.toFixed(1)}s`; };
  showBest();
  let angle, walls, time, speed, rot = 0, hue = 210, pulse = 0, state = 'ready', lastHud = '';
  const spawn = r => walls.push({ r, gap: Math.random() * Math.PI * 2, gw: cfg.gapWidth, passed: false });
  function reset() { angle = -Math.PI / 2; walls = []; time = 0; speed = cfg.baseSpeed; spawn(200); spawn(300); spawn(400); }
  reset();
  const newGame = () => { reset(); state = 'playing'; };
  const st = keyState('hexagon', { left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], start: [' '], f2: ['F2'] });
  st.onPress = k => { if (k === 'f2' || (state !== 'playing' && (k === 'start' || k === 'touch'))) newGame(); };
  bindTouchpad(win, st);
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
  onCmd('hexagon', cmd => {
    if (cmd === 'newgame') newGame();
    else if (cmd === 'howto') OS.msgbox({ title: 'Como jogar Hexágono', text: 'Setas ou A e D giram o triângulo em volta do centro.\nPasse pelos vãos das paredes. A velocidade aumenta a cada segundo.\nEspaço ou F2 começam um novo jogo.' });
  });
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
    const dark = `hsl(${hue},45%,8%)`, mid = `hsl(${hue},42%,13%)`, wallC = `hsl(${(hue + 40) % 360},85%,62%)`;
    ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = mid;
    for (let i = 0; i < 6; i += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 400, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = dark; ctx.strokeStyle = `hsl(${hue},90%,66%)`; ctx.lineWidth = 3;
    hexPath(26 + pulse * 4); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = wallC; ctx.lineWidth = 10;
    walls.forEach(w => { ctx.beginPath(); ctx.arc(0, 0, Math.max(1, w.r), w.gap + w.gw / 2, w.gap - w.gw / 2 + Math.PI * 2); ctx.stroke(); });
    ctx.restore();
    ctx.save(); ctx.translate(cx + Math.cos(angle) * playerR, cy + Math.sin(angle) * playerR); ctx.rotate(angle);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5.5); ctx.lineTo(-5, 5.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    const tap = coarse.matches ? 'Toque' : 'Espaço';
    if (state === 'ready') banner(ctx, W, H, 'HEXÁGONO', `${tap} para começar`);
    else if (state === 'over') banner(ctx, W, H, 'VOCÊ BATEU!', `${time.toFixed(1)}s. ${tap} para tentar de novo`);
    const h = state === 'ready' ? (coarse.matches ? 'Toque para começar' : 'Espaço para começar') : `Tempo: ${time.toFixed(1)}s`;
    if (h !== lastHud) { hudEl.textContent = h; lastHud = h; }
  }
  gameLoop('hexagon', dt => { update(dt); draw(); });
});

/* ============================================================
   ORDENAÇÃO
   ============================================================ */
OS.register('ordenacao', win => {
  const ref = n => win.querySelector(`[data-ref="${n}"]`);
  const barsEl = ref('bars'), algoSel = ref('algo'), shuffleBtn = ref('shuffle'), runBtn = ref('run');
  const sizeIn = ref('size'), speedIn = ref('speed'), cmpEl = ref('cmp'), swpEl = ref('swp'), cxEl = ref('cx');
  const CX = { bubble: 'O(n²)', selection: 'O(n²)', insertion: 'O(n²)', quick: 'O(n log n) em média', merge: 'O(n log n)', heap: 'O(n log n)' };
  let arr = [], bars = [], running = false, stop = false, cmp = 0, swp = 0;
  function randomize() { arr = Array.from({ length: +sizeIn.value }, () => 5 + Math.floor(Math.random() * 95)); bars = arr.map(() => el('div', 'bar')); barsEl.replaceChildren(...bars); paint([]); }
  function paint(hl) { for (let i = 0; i < arr.length; i++) { bars[i].style.height = arr[i] + '%'; bars[i].classList.toggle('is-cmp', hl.includes(i)); bars[i].classList.remove('is-done'); } }
  function stats() { cmpEl.textContent = cmp; swpEl.textContent = swp; cxEl.textContent = 'Complexidade: ' + CX[algoSel.value]; }
  const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; swp++; };
  const ALGOS = {
    *bubble(a) { for (let i = 0; i < a.length - 1; i++) { let s = false; for (let j = 0; j < a.length - 1 - i; j++) { cmp++; yield [j, j + 1]; if (a[j] > a[j + 1]) { swap(a, j, j + 1); s = true; yield [j, j + 1]; } } if (!s) break; } },
    *selection(a) { for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) { cmp++; yield [m, j]; if (a[j] < a[m]) m = j; } if (m !== i) { swap(a, i, m); yield [i, m]; } } },
    *insertion(a) { for (let i = 1; i < a.length; i++) for (let j = i; j > 0; j--) { cmp++; yield [j - 1, j]; if (a[j - 1] <= a[j]) break; swap(a, j - 1, j); yield [j - 1, j]; } },
    *quick(a) {
      function* qs(lo, hi) { if (lo >= hi) return; const p = a[hi]; let i = lo - 1; for (let j = lo; j < hi; j++) { cmp++; yield [j, hi]; if (a[j] < p) { i++; swap(a, i, j); yield [i, j]; } } swap(a, i + 1, hi); yield [i + 1, hi]; yield* qs(lo, i); yield* qs(i + 2, hi); }
      yield* qs(0, a.length - 1);
    },
    *merge(a) {
      function* ms(lo, hi) {
        if (hi - lo <= 1) return;
        const mid = (lo + hi) >> 1; yield* ms(lo, mid); yield* ms(mid, hi);
        const L = a.slice(lo, mid), R = a.slice(mid, hi); let i = 0, j = 0, k = lo;
        while (i < L.length && j < R.length) { cmp++; a[k] = L[i] <= R[j] ? L[i++] : R[j++]; swp++; yield [k++, mid + Math.min(j, R.length - 1)]; }
        while (i < L.length) { a[k] = L[i++]; swp++; yield [k++]; }
        while (j < R.length) { a[k] = R[j++]; swp++; yield [k++]; }
      }
      yield* ms(0, a.length);
    },
    *heap(a) {
      const n = a.length;
      function* sift(i, size) { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < size) { cmp++; yield [l, m]; if (a[l] > a[m]) m = l; } if (r < size) { cmp++; yield [r, m]; if (a[r] > a[m]) m = r; } if (m === i) return; swap(a, i, m); yield [i, m]; i = m; } }
      for (let i = (n >> 1) - 1; i >= 0; i--) yield* sift(i, n);
      for (let end = n - 1; end > 0; end--) { swap(a, 0, end); yield [0, end]; yield* sift(0, end); }
    },
  };
  const delay = sp => sp >= 90 ? nextFrame() : sleep(Math.round(240 * Math.pow(1 - sp / 100, 2)));
  const setRunning = on => { runBtn.textContent = on ? 'Parar' : 'Iniciar'; shuffleBtn.disabled = on; algoSel.disabled = on; sizeIn.disabled = on; };
  async function run() {
    if (running) { stop = true; return; }
    running = true; stop = false; cmp = 0; swp = 0; setRunning(true); stats();
    let steps = 0;
    for (const hl of ALGOS[algoSel.value](arr)) {
      if (stop) break;
      const sp = +speedIn.value, batch = sp >= 90 ? 1 + (sp - 89) * 4 : 1;
      if (++steps % batch === 0) { paint(hl); stats(); await delay(sp); }
      while (!OS.isVisible('ordenacao') && !stop) await sleep(250);
    }
    paint([]); stats();
    if (!stop) { const chunk = Math.max(1, Math.ceil(bars.length / 40)); for (let i = 0; i < bars.length; i++) { bars[i].classList.add('is-done'); if (i % chunk === 0) await nextFrame(); } OS.sfx.pick(); }
    running = false; setRunning(false);
  }
  shuffleBtn.addEventListener('click', () => { if (!running) { randomize(); cmp = swp = 0; stats(); } });
  sizeIn.addEventListener('input', () => { if (!running) randomize(); });
  algoSel.addEventListener('change', stats);
  runBtn.addEventListener('click', run);
  randomize(); stats();
});

/* ============================================================
   LABIRINTO
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
  const isEnd = (r, c) => (r === start[0] && c === start[1]) || (r === end[0] && c === end[1]);
  function generate() {
    grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
    grid[0][0] = 1;
    const stack = [[0, 0]];
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = [[0, 2], [0, -2], [2, 0], [-2, 0]].filter(([dr, dc]) => { const nr = r + dr, nc = c + dc; return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !grid[nr][nc]; });
      if (!opts.length) { stack.pop(); continue; }
      const [dr, dc] = opts[Math.floor(Math.random() * opts.length)];
      grid[r + dr / 2][c + dc / 2] = 1; grid[r + dr][c + dc] = 1; stack.push([r + dr, c + dc]);
    }
    // Alguns atalhos extras para os algoritmos encontrarem caminhos diferentes.
    let extra = Math.round(ROWS * COLS * 0.025);
    for (let tries = 0; extra > 0 && tries < 2000; tries++) {
      const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
      if (grid[r][c]) continue;
      const h = r % 2 === 0 && c % 2 === 1 && c > 0 && c < COLS - 1 && grid[r][c - 1] && grid[r][c + 1];
      const v = r % 2 === 1 && c % 2 === 0 && r > 0 && r < ROWS - 1 && grid[r - 1][c] && grid[r + 1][c];
      if (h || v) { grid[r][c] = 1; extra--; }
    }
    grid[end[0]][end[1]] = 1;
  }
  function render() {
    cells = [];
    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) { const row = []; for (let c = 0; c < COLS; c++) { const d = el('div', 'maze-cell' + (grid[r][c] ? '' : ' wall')); frag.append(d); row.push(d); } cells.push(row); }
    gridEl.replaceChildren(frag);
    cells[start[0]][start[1]].classList.add('start');
    cells[end[0]][end[1]].classList.add('end');
    resetStats();
  }
  const clearMarks = () => cells.forEach(row => row.forEach(d => d.classList.remove('visited', 'path')));
  const resetStats = () => { visEl.textContent = '0'; pathEl.textContent = '-'; timeEl.textContent = '-'; };
  class MinHeap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  }
  function* uninformed(useStack) {
    const seen = new Set([key(...start)]), parent = new Map(), list = [start];
    while (list.length) {
      const [r, c] = useStack ? list.pop() : list.shift();
      yield [r, c];
      if (r === end[0] && c === end[1]) return parent;
      for (const [nr, nc] of neighbors(r, c)) { const k = key(nr, nc); if (!seen.has(k)) { seen.add(k); parent.set(k, [r, c]); list.push([nr, nc]); } }
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
      yield [cur.r, cur.c];
      if (cur.r === end[0] && cur.c === end[1]) return parent;
      for (const [nr, nc] of neighbors(cur.r, cur.c)) {
        const nk = key(nr, nc), ng = g.get(k) + 1;
        if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); parent.set(nk, [cur.r, cur.c]); open.push({ r: nr, c: nc, f: ng + h(nr, nc) * 1.001 }); }
      }
    }
    return null;
  }
  const ALGOS = { bfs: () => uninformed(false), dfs: () => uninformed(true), dijkstra: () => weighted(false), astar: () => weighted(true) };
  const delay = sp => sp >= 90 ? nextFrame() : sleep(Math.round(120 * Math.pow(1 - sp / 100, 2)));
  const setRunning = on => { runBtn.textContent = on ? 'Parar' : 'Buscar'; newBtn.disabled = on; algoSel.disabled = on; };
  async function run() {
    if (running) { stop = true; return; }
    running = true; stop = false; setRunning(true); clearMarks(); resetStats();
    const t0 = performance.now();
    const pass = ALGOS[algoSel.value]();
    while (!pass.next().done) { /* mede o tempo real, sem animação */ }
    timeEl.textContent = (performance.now() - t0).toFixed(2) + ' ms';
    const gen = ALGOS[algoSel.value]();
    let visited = 0, parent = null, steps = 0;
    for (;;) {
      if (stop) break;
      const { value, done } = gen.next();
      if (done) { parent = value; break; }
      const [r, c] = value;
      visited++;
      if (!isEnd(r, c)) cells[r][c].classList.add('visited');
      visEl.textContent = visited;
      const sp = +speedIn.value, batch = sp >= 90 ? 1 + (sp - 89) * 2 : 1;
      if (++steps % batch === 0) await delay(sp);
      while (!OS.isVisible('labirinto') && !stop) await sleep(250);
    }
    if (parent && !stop) {
      const path = [];
      let cur = end;
      while (cur && !(cur[0] === start[0] && cur[1] === start[1])) { path.push(cur); cur = parent.get(key(...cur)); }
      path.reverse();
      pathEl.textContent = path.length + ' passos';
      for (const [r, c] of path) { if (!isEnd(r, c)) cells[r][c].classList.add('path'); await sleep(8); }
      OS.sfx.pick();
    } else if (!stop) pathEl.textContent = 'sem caminho';
    running = false; setRunning(false);
  }
  newBtn.addEventListener('click', () => { if (!running) { generate(); render(); } });
  runBtn.addEventListener('click', run);
  generate(); render();
});

})();
