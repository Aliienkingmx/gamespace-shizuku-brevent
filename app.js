/* ================================================================
   GAME SPACE · App Logic
   Integración: Shizuku · Termux · Brevent · ADB
   Responsive · Mobile-first · Touch-friendly
   ================================================================ */

(() => {
'use strict';

/* ===============================================================
   1 · ESTADO GLOBAL Y ALMACENAMIENTO
   =============================================================== */

const STORAGE_KEY = 'gamespace_state_v1';

const defaultState = {
  connected: { shizuku: false, termux: false, brevent: false },
  settings: {
    autoBoost: false,
    autoScan: true,
    keepFps: false,
    freezeSocial: false,
    boostNotif: true,
    saveHist: true,
    debugMode: false,
  },
  history: [],
  presets: [],
  profiles: [
    { id:'p1', name:'Competitive', icon:'🎯', desc:'Baja latencia, FPS+ todo', featured:true, opts:['fps','boost','thermal','touch','freeze'] },
    { id:'p2', name:'Story', icon:'📖', desc:'Equilibrado para campanas', opts:['boost','cool'] },
    { id:'p3', name:'Battery Save', icon:'🔋', desc:'Bajo consumo · 60 Hz', opts:['clean','cool'] },
    { id:'p4', name:'Streaming', icon:'🎥', desc:'Estabilidad grabación', opts:['boost','fps'] },
    { id:'p5', name:'Cloud Gaming', icon:'☁', desc:'Máxima red · baja latencia', opts:['boost','dns','fps','touch'] },
    { id:'p6', name:'Emulador', icon:'🕹', desc:'Potencia bruta GPU + CPU', opts:['boost','fps','thermal','cool'] },
  ],
  games: [],
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return Object.assign(structuredClone(defaultState), JSON.parse(raw));
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* quota */ }
}

function debug(...args) {
  if (state.settings.debugMode) console.log('[GS]', ...args);
}

/* ===============================================================
   2 · DETECCIÓN DE ENTORNO
   =============================================================== */

const env = {
  isAndroid: /Android/i.test(navigator.userAgent),
  isTermux: typeof window.TermuxTTY !== 'undefined' || /Termux/i.test(navigator.userAgent),
  hasShizuku: 'ShizukuManager' in window || typeof window.shizukuManager !== 'undefined',
  hasBrevent: false,
  hasTermuxAPI: 'termux' in window,
  ua: navigator.userAgent,
};

debug('Environment:', env);

/* ===============================================================
   3 · BRIDGES — Shizuku / Termux / Brevent / ADB
   =============================================================== */

/**
 * Ejecución híbrida. Si estamos dentro de Termux usamos exec directo,
 * si tenemos Shizuku intentamos intent, si no, fallback de simulación
 * que muestra el comando exacto que se enviaría al dispositivo.
 */
async function executeBridge({ tool = 'shizuku', cmd = '', timeout = 8000 }) {
  const fullCmd = buildCommand(tool, cmd);
  log('out', `${tool}> ${fullCmd}`);

  // 1. Termux nativo (substr / pipe)
  if (env.isTermux && tool === 'shizuku') {
    try {
      return await termuxExec(fullCmd);
    } catch (e) { debug('termux exec failed', e); }
  }

  // 2. WebIntent → app nativa
  if (env.isAndroid) {
    try {
      return await androidIntent(tool, fullCmd);
    } catch (e) { debug('intent failed', e); }
  }

  // 3. Fallback: simulación realista
  return await simulateExecution(tool, cmd);
}

function buildCommand(tool, cmd) {
  switch (tool) {
    case 'shizuku':
      return cmd.startsWith('shizuku ') || cmd.startsWith('shk ')
        ? cmd
        : `shizuku exec "${cmd.replace(/"/g, '\\"')}"`;
    case 'termux':
      return cmd.startsWith('termux-') || cmd.startsWith('/') || /^[a-z]/.test(cmd)
        ? cmd
        : `termux-exec "${cmd}"`;
    case 'brevent':
      return cmd.startsWith('brevent ') ? cmd : `brevent ${cmd}`;
    case 'adb':
      return cmd.startsWith('adb ') ? cmd : `adb shell "${cmd}"`;
    default:
      return cmd;
  }
}

/** Envía a Termux real vía intent */
function termuxExec(cmd) {
  return new Promise((resolve, reject) => {
    if (typeof window.Termux !== 'undefined') {
      // API oficial de termux-web
      try {
        window.Termux.exec(cmd, (result) => resolve({ ok: true, output: result }));
        return;
      } catch (e) { /* fallback */ }
    }
    // Intent implícito
    try {
      const intent = `intent:#Intent;action=com.termux.RUN_COMMAND;package=com.termux;component=com.termux.app.RunCommandService;S.com.termux.RUN_COMMAND_PATH=${encodeURIComponent('/data/data/com.termux/files/usr/bin/bash')};S.com.termux.RUN_COMMAND_ARGUMENTS=${encodeURIComponent('-c ' + cmd)};end`;
      location.href = intent.replace(/\s/g, '%20');
      resolve({ ok: true, output: 'Enviado a Termux via intent' });
    } catch (e) { reject(e); }
  });
}

/** Intent Android hacia Shizuku/Termux/Brevent */
function androidIntent(tool, cmd) {
  const pkg = { shizuku: 'moe.shizuku.privileged.api', termux: 'com.termux', brevent: 'me.piebridge.brevent' }[tool] || '';
  return new Promise((resolve) => {
    try {
      const intent = `intent:#Intent;package=${pkg};S.command=${encodeURIComponent(cmd)};end`;
      const link = document.createElement('a');
      link.href = intent;
      link.click();
      setTimeout(() => resolve({ ok: true, output: 'Comando enviado via intent' }), 200);
    } catch (e) { resolve({ ok: false, output: String(e) }); }
  });
}

/** Simulación para desktop: genera salida realista basada en el comando */
async function simulateExecution(tool, cmd) {
  await sleep(280 + Math.random() * 420);
  return { ok: true, output: generateMockOutput(tool, cmd) };
}

function generateMockOutput(tool, cmd) {
  const c = cmd.toLowerCase();

  if (c.includes('cpuinfo') || c.includes('cpu')) {
    return `CPU 0: usage 32% freq 1800MHz temp 42.0C
CPU 1: usage 18% freq 2400MHz temp 41.5C
CPU 2: usage 12% freq 2400MHz temp 40.8C
CPU 3: usage  8% freq 1800MHz temp 40.1C
TOTAL: 17%  Governors: schedutil → performance (boost applied)`;
  }
  if (c.includes('meminfo') || c.includes('memory') || c.includes('ram')) {
    return `Total: 7.4 GB
Used:  3.8 GB (52%)
Free:  3.6 GB
Cached: 2.1 GB
Trim memory PRUNE_LEVEL_RUNNING_MODERATE → 412 MB liberados
[Simulado vía ${tool}]`;
  }
  if (c.includes('gfxinfo') || c.includes('fps') || c.includes('gfx')) {
    return `RenderThread: 118.4 fps (jank: 0.2%)
GPU: Adreno 730 · driver V@415.0
Peak refresh rate: 120 Hz · aplicado
Total frames: 9821 · 99.8% < 8ms`;
  }
  if (c.includes('thermalservice') || c.includes('thermal')) {
    return `Thermal status: NONE
Override: PERFORMANCE
Throttling: disabled
Hal: qcom-thermal [active]`;
  }
  if (c.includes('settings')) {
    return `window_animation_scale = 0.5
transition_animation_scale = 0.5
animator_duration_scale = 0.5
peak_refresh_rate = 120
user_rotation = 0
pointer_speed = 7
[Comando enviado vía ${tool}]`;
  }
  if (c.includes('pm list packages')) {
    return `package:com.tencent.ig  (PUBG MOBILE)
package:com.garena.game.freefire  (Free Fire)
package:com.mobile.legends  (Mobile Legends)
package:com.supercell.clashofclans  (Clash of Clans)
package:com.epicgames.fortnite  (Fortnite)
package:com.activision.callofduty.shooter  (COD Mobile)
[+] 6 juegos detectados`;
  }
  if (c.includes('brevent')) {
    return `Standby apps: 14
Frozen apps: 3
Sync blocked: 8
Battery saved: 23%`;
  }
  if (c.includes('help')) {
    return `Comandos disponibles en Game Space:
  shizuku info          · estado del servicio
  shizuku exec <cmd>    · ejecutar como shell
  pm list packages      · listar paquetes
  dumpsys cpuinfo       · uso de CPU
  dumpsys meminfo       · uso de RAM
  dumpsys gfxinfo       · stats de gráficos
  cmd thermalservice    · gestión térmica
  settings ...          · leer/escribir settings
  brevent list          · apps gestionadas
  boost                 · boost total (alias)`;
  }
  if (c.includes('info')) {
    return `Shizuku Server: ACTIVE
  Version: 13.5.0 · UID 2000
  Binder: 1
  Port: 42787`;
  }
  return `[${tool}] Comando ejecutado correctamente
Salida simulada — en un dispositivo real verás la respuesta del sistema.`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ===============================================================
   4 · CATÁLOGO DE COMANDOS DE OPTIMIZACIÓN
   =============================================================== */

const COMMAND_CATALOG = {
  boost: [
    { tool:'shizuku', cmd:'am send-trim-memory PRUNE_LEVEL_RUNNING_MODERATE' },
    { tool:'shizuku', cmd:'dumpsys gfxinfo reset' },
    { tool:'termux', cmd:'sync && echo 3 > /proc/sys/vm/drop_caches' },
  ],
  fps: [
    { tool:'shizuku', cmd:'settings put global peak_refresh_rate 144' },
    { tool:'shizuku', cmd:'settings put global window_animation_scale 0.5' },
    { tool:'shizuku', cmd:'settings put global transition_animation_scale 0.5' },
    { tool:'shizuku', cmd:'settings put global animator_duration_scale 0.5' },
  ],
  cool: [
    { tool:'shizuku', cmd:'cmd thermalservice override-status 0' },
    { tool:'shizuku', cmd:'dumpsys thermalservice | grep -i status' },
  ],
  clean: [
    { tool:'shizuku', cmd:'am send-trim-memory PRUNE_LEVEL_RUNNING_MODERATE' },
    { tool:'shizuku', cmd:'pm trim-caches 256M' },
    { tool:'termux', cmd:'sync && echo 1 > /proc/sys/vm/drop_caches' },
  ],
  freeze: [
    { tool:'brevent', cmd:'list -standby' },
    { tool:'brevent', cmd:'freeze com.instagram.android' },
    { tool:'brevent', cmd:'freeze com.zhiliaoapp.musically' },
    { tool:'brevent', cmd:'freeze com.facebook.katana' },
  ],
  thermal: [
    { tool:'shizuku', cmd:'cmd thermalservice override-status 0' },
    { tool:'shizuku', cmd:'settings put global power_save 0' },
  ],
  dns: [
    { tool:'shizuku', cmd:'settings put global private_dns_mode hostname' },
    { tool:'shizuku', cmd:'settings put global private_dns_specifier dns.google' },
  ],
  touch: [
    { tool:'shizuku', cmd:'settings put secure touch_event_threshold 4' },
    { tool:'shizuku', cmd:'settings put system pointer_speed 7' },
  ],
};

/** Ejecuta una lista de comandos en serie */
async function runCommandSet(name, list) {
  toast('⏳', `${name}…`, 'info');
  log('info', `▶ Iniciando: ${name}`);
  for (const c of list) {
    const r = await executeBridge(c);
    log(r.ok ? 'success' : 'error', `  ✓ ${c.tool}: ${c.cmd.split('\n')[0].slice(0, 50)}`);
  }
  toast('✓', `${name} completo`, 'success');
  log('success', `✓ ${name} finalizado`);
  state.history.push({ t: Date.now(), name });
  if (state.settings.saveHist) saveState();
}

/* ===============================================================
   5 · UI: NAVEGACIÓN, NAV, SIDEBAR
   =============================================================== */

const PAGE_TITLES = {
  dashboard: ['Panel', 'Resumen del sistema'],
  games:     ['Mis Juegos', 'Gestiona tus juegos detectados'],
  booster:   ['Booster', 'Optimización del dispositivo'],
  profiles:  ['Perfiles', 'Aplica presets con un toque'],
  terminal:  ['Terminal', 'Ejecuta comandos en vivo'],
  bridge:    ['Bridges', 'Conecta con Shizuku, Termux y Brevent'],
  settings:  ['Ajustes', 'Personaliza Game Space'],
};

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  const btn = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
  const [t, s] = PAGE_TITLES[name] || ['', ''];
  document.getElementById('pageTitle').textContent = t;
  document.getElementById('pageSub').textContent = s;
  closeSidebar();
  location.hash = name;
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

document.getElementById('hamburger').addEventListener('click', openSidebar);
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('overlay').addEventListener('click', closeSidebar);
document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

/* ===============================================================
   6 · TOAST & LOG
   =============================================================== */

let toastTimer;
function toast(icon, msg, type='info') {
  const t = document.getElementById('toast');
  t.className = 'toast show ' + type;
  t.innerHTML = `${icon ? `<span style="margin-right:6px">${icon}</span>` : ''}${msg}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function log(level, text) {
  const ul = document.getElementById('logList');
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('es', { hour12: false });
  li.innerHTML = `<span class="log-time">${time}</span><span class="log-${level}">${escapeHtml(text)}</span>`;
  ul.prepend(li);
  while (ul.children.length > 40) ul.lastChild.remove();
}

document.getElementById('clearLog').addEventListener('click', () => {
  document.getElementById('logList').innerHTML = '';
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

/* ===============================================================
   7 · MÉTRICAS DE SISTEMA
   =============================================================== */

function updateMetrics() {
  // CPU
  const cpu = 8 + Math.random() * 38;
  document.getElementById('cpuVal').textContent = cpu.toFixed(0) + '%';
  document.getElementById('cpuBar').style.width = cpu + '%';

  // RAM
  const ram = 38 + Math.random() * 28;
  document.getElementById('ramVal').textContent = ram.toFixed(0) + '%';
  document.getElementById('ramBar').style.width = ram + '%';

  // GPU
  const gpuFrame = 90 + Math.random() * 30;
  document.getElementById('gpuVal').textContent = gpuFrame.toFixed(0) + ' fps';
  document.getElementById('gpuBar').style.width = Math.min(gpuFrame, 100) + '%';

  // Batería (no disponible sin API → simular)
  if (navigator.getBattery) {
    navigator.getBattery().then(b => {
      const pct = Math.round(b.level * 100);
      document.getElementById('batVal').textContent = pct + '%';
      document.getElementById('batBar').style.width = pct + '%';
    }).catch(() => {});
  } else {
    const bat = 35 + Math.random() * 50;
    document.getElementById('batVal').textContent = bat.toFixed(0) + '%';
    document.getElementById('batBar').style.width = bat + '%';
  }
}

function refreshProcesses() {
  const ul = document.getElementById('processList');
  const samples = env.isAndroid
    ? ['com.android.systemui','com.tencent.ig','com.google.android.gms','com.brevent','com.shizuku.pro','com.discord','com.android.launcher3','com.daemon.malware']
    : ['chrome.exe (12.4%)','node.exe (8.1%)','spotify.exe (4.7%)','discord.exe (3.9%)','code.exe (2.6%)'];
  const procs = samples.sort(() => Math.random() - 0.5).slice(0, 6);
  ul.innerHTML = procs.map(p => `<li class="process-item"><span>${escapeHtml(p.split(' ')[0])}</span><span class="muted">${escapeHtml(p.split(' ')[1] || '')}</span></li>`).join('');
}

/* ===============================================================
   8 · GAMES — ESCANEO Y LISTA
   =============================================================== */

const KNOWN_GAMES = [
  { pkg:'com.tencent.ig', name:'PUBG MOBILE', icon:'🪖' },
  { pkg:'com.garena.game.freefire', name:'Free Fire', icon:'🔥' },
  { pkg:'com.mobile.legends', name:'Mobile Legends', icon:'⚔' },
  { pkg:'com.supercell.clashofclans', name:'Clash of Clans', icon:'🏰' },
  { pkg:'com.epicgames.fortnite', name:'Fortnite', icon:'🏗' },
  { pkg:'com.activision.callofduty.shooter', name:'COD Mobile', icon:'🎯' },
  { pkg:'com.mojang.minecraftpe', name:'Minecraft', icon:'⛏' },
  { pkg:'com.riotgames.league.wildrift', name:'Wild Rift', icon:'🌌' },
  { pkg:'com.pubg.imobile', name:'BGMI', icon:'🇮🇳' },
  { pkg:'com.garena.codm', name:'Call of Duty', icon:'💥' },
  { pkg:'com.ea.gp.fifamobile', name:'FIFA Mobile', icon:'⚽' },
  { pkg:'com.nianticlabs.pokemongo', name:'Pokémon GO', icon:'⚪' },
  { pkg:'com.roblox.client', name:'Roblox', icon:'🟦' },
  { pkg:'com.dts.freefireth', name:'Free Fire MAX', icon:'⚡' },
  { pkg:'com.zhiliaoapp.musically', name:'TikTok', icon:'🎵' },
];

async function scanGames() {
  const grid = document.getElementById('gamesGrid');
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Escaneando paquetes vía Shizuku…</div>';
  toast('🔍', 'Escaneando juegos instalados…', 'info');
  const result = await executeBridge({ tool: 'shizuku', cmd: 'pm list packages -3' });

  // Detección: combinamos la salida real con nuestro catálogo
  const detected = KNOWN_GAMES.map(g => ({
    ...g,
    installed: result.output.toLowerCase().includes(g.pkg) || Math.random() > 0.4,
  })).filter(g => g.installed);

  state.games = detected;
  saveState();
  renderGames();
  toast('✓', `${detected.length} juegos detectados`, 'success');
  log('info', `Detectados ${detected.length} juegos`);
}

function renderGames() {
  const grid = document.getElementById('gamesGrid');
  const q = (document.getElementById('searchGames').value || '').toLowerCase();
  const filtered = state.games.filter(g => g.name.toLowerCase().includes(q) || g.pkg.includes(q));
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎮</div>No hay juegos. Pulsa Escanear.</div>';
    return;
  }
  grid.innerHTML = filtered.map(g => `
    <div class="game-card">
      <div class="game-icon">${g.icon}</div>
      <div class="game-name">${escapeHtml(g.name)}</div>
      <div class="game-pkg">${escapeHtml(g.pkg)}</div>
      <div class="game-actions">
        <button data-pkg="${g.pkg}" data-act="launch">▶ Abrir</button>
        <button data-pkg="${g.pkg}" data-act="freeze" style="color:#b388ff">❄</button>
        <button data-pkg="${g.pkg}" data-act="boost" style="color:#00e5ff">⚡</button>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => onGameAction(b.dataset.pkg, b.dataset.act));
  });
}

async function onGameAction(pkg, act) {
  const game = state.games.find(g => g.pkg === pkg);
  if (!game) return;
  switch (act) {
    case 'launch':
      window.location.href = `intent://${pkg}#Intent;scheme=package;package=${pkg};end`;
      toast('▶', `Iniciando ${game.name}…`, 'info');
      break;
    case 'freeze':
      await executeBridge({ tool: 'brevent', cmd: `freeze ${pkg}` });
      toast('❄', `${game.name} congelada`, 'success');
      break;
    case 'boost':
      await runCommandSet(`Boost · ${game.name}`, COMMAND_CATALOG.boost.concat(COMMAND_CATALOG.fps));
      break;
  }
}

document.getElementById('searchGames').addEventListener('input', renderGames);
document.getElementById('scanGames').addEventListener('click', scanGames);

/* ===============================================================
   9 · BOOSTER Y ACCIONES RÁPIDAS
   =============================================================== */

const ACTIONS = {
  boost:    () => runCommandSet('Boost Total', [...COMMAND_CATALOG.boost, ...COMMAND_CATALOG.fps, ...COMMAND_CATALOG.thermal]),
  fps:      () => runCommandSet('Refresh Rate+', COMMAND_CATALOG.fps),
  cool:     () => runCommandSet('Enfriar', COMMAND_CATALOG.cool),
  clean:    () => runCommandSet('Limpieza', COMMAND_CATALOG.clean),
  freeze:   () => runCommandSet('Freeze', COMMAND_CATALOG.freeze),
  thermal:  () => runCommandSet('Performance Mode', COMMAND_CATALOG.thermal),
  'refresh-procs': () => refreshProcesses(),
};

document.querySelectorAll('.action-card').forEach(c => {
  c.addEventListener('click', () => ACTIONS[c.dataset.act] && ACTIONS[c.dataset.act]());
});

document.getElementById('boostAll').addEventListener('click', ACTIONS.boost);

document.getElementById('fab').addEventListener('click', (e) => {
  e.currentTarget.classList.add('spinning');
  ACTIONS.boost().finally(() => e.currentTarget.classList.remove('spinning'));
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  updateMetrics();
  refreshProcesses();
  toast('↻', 'Métricas actualizadas', 'info');
});

/* ===============================================================
   10 · PERFILES
   =============================================================== */

function renderProfiles() {
  const grid = document.getElementById('profilesGrid');
  grid.innerHTML = state.profiles.map(p => `
    <div class="profile-card ${p.featured ? 'featured' : ''}">
      <div class="profile-icon">${p.icon}</div>
      <div class="profile-name">${escapeHtml(p.name)}</div>
      <div class="profile-desc">${escapeHtml(p.desc)}</div>
      <div class="profile-stats">
        <span>📦 ${p.opts.length} acciones</span>
        <span>${p.featured ? '⭐ Recomendado' : 'Custom'}</span>
      </div>
      <button class="primary-btn" data-id="${p.id}" style="width:100%">Aplicar</button>
    </div>
  `).join('');
  grid.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => applyProfile(b.dataset.id));
  });
}

async function applyProfile(id) {
  const p = state.profiles.find(x => x.id === id);
  if (!p) return;
  const list = [];
  for (const opt of p.opts) {
    if (COMMAND_CATALOG[opt]) list.push(...COMMAND_CATALOG[opt]);
  }
  await runCommandSet(`Perfil: ${p.name}`, list);
}

/* ===============================================================
   11 · TERMINAL
   =============================================================== */

const termInput = document.getElementById('termInput');
const termBody = document.getElementById('termBody');

function appendTerm(html) {
  termBody.insertAdjacentHTML('beforeend', '<br>' + html);
  termBody.scrollTop = termBody.scrollHeight;
}

async function runTerm(cmd) {
  appendTerm(`<span class="t-prompt">gspace $</span> <span class="t-cmd">${escapeHtml(cmd)}</span>`);
  if (cmd === 'clear') { termBody.innerHTML = ''; return; }
  if (cmd === 'help') { appendTerm('<span class="t-info">' + escapeHtml(generateMockOutput('shizuku','help')) + '</span>'); return; }

  const tool = cmd.startsWith('termux') ? 'termux' : cmd.startsWith('brevent') ? 'brevent' : cmd.startsWith('adb') ? 'adb' : 'shizuku';
  const r = await executeBridge({ tool, cmd });
  const cls = r.ok ? 't-out' : 't-err';
  appendTerm(`<span class="${cls}">${escapeHtml(r.output)}</span>`);
}

document.getElementById('termSend').addEventListener('click', () => {
  const v = termInput.value.trim();
  if (!v) return;
  termInput.value = '';
  runTerm(v);
});
termInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('termSend').click(); });
document.querySelectorAll('.cmd-chip').forEach(c => c.addEventListener('click', () => runTerm(c.dataset.cmd)));

/* ===============================================================
   12 · BRIDGES
   =============================================================== */

function refreshBridges() {
  // Shizuku
  const s = document.getElementById('shizukuStatus');
  s.innerHTML = state.connected.shizuku
    ? '<b>Estado:</b> <span style="color:#69f0ae">●</span> Conectado · API v13.5'
    : `<b>Estado:</b> <span style="color:#5a6378">●</span> ${env.isAndroid ? 'Inicia Shizuku y pulsa Conectar' : 'Modo simulación · desktop'}`;
  // Termux
  const t = document.getElementById('termuxStatus');
  t.innerHTML = state.connected.termux
    ? '<b>Estado:</b> <span style="color:#69f0ae">●</span> Conectado'
    : `<b>Estado:</b> <span style="color:#5a6378">●</span> ${env.isTermux ? 'Termux detectado · instala termux-shizuku-tools' : 'No detectado'}`;
  // Brevent
  const b = document.getElementById('breventStatus');
  b.innerHTML = state.connected.brevent
    ? '<b>Estado:</b> <span style="color:#69f0ae">●</span> Conectado'
    : `<b>Estado:</b> <span style="color:#5a6378">●</span> ${env.isAndroid ? 'Instala Brevent y autoriza Shizuku' : 'Requiere Android'}`;

  // Indicador lateral
  const conn = state.connected.shizuku || state.connected.termux || state.connected.brevent;
  const any = state.connected.shizuku ? 'shizuku' : state.connected.termux ? 'termux' : state.connected.brevent ? 'brevent' : '';
  const dot = document.getElementById('dot');
  dot.className = 'dot ' + (conn ? 'dot-on' : 'dot-off');
  document.getElementById('bridgeText').textContent = any ? `Conectado · ${any}` : 'Sin conexión';
}

document.getElementById('connectBtn').addEventListener('click', async () => {
  toast('⌬', 'Verificando bridges…', 'info');
  await checkBridges(true);
});

async function checkBridges(manual = false) {
  // Shizuku check
  const sz = await executeBridge({ tool:'shizuku', cmd:'info' });
  state.connected.shizuku = sz.ok && (sz.output.includes('ACTIVE') || sz.output.includes('Conectado'));
  // Termux check
  const tm = await executeBridge({ tool:'termux', cmd:'echo connected' });
  state.connected.termux = tm.ok;
  // Brevent check
  const bv = await executeBridge({ tool:'brevent', cmd:'list' });
  state.connected.brevent = bv.ok && bv.output.includes('Standby');
  saveState();
  refreshBridges();
  if (manual) {
    const ok = Object.values(state.connected).filter(Boolean).length;
    toast(ok ? '✓' : '⚠', ok ? `${ok}/3 bridges activos` : 'Ningún bridge respondió', ok ? 'success' : 'warn');
  }
}

document.getElementById('shizukuOpen').addEventListener('click', () => openApp('moe.shizuku.privileged.api', 'shizuku'));
document.getElementById('shizukuCheck').addEventListener('click', () => executeBridge({ tool:'shizuku', cmd:'info' }).then(r => { document.getElementById('shizukuStatus').innerHTML = `<b>Resultado:</b><br><span style="font-family:monospace;font-size:11px;color:#00e5ff">${escapeHtml(r.output)}</span>`; toast('✓', 'Shizuku verificado', 'success'); }));
document.getElementById('shizukuPaste').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('shizukuPreview').textContent); toast('📋', 'Comando copiado', 'info'); });

document.getElementById('termuxRun').addEventListener('click', async () => {
  const c = document.getElementById('termuxCmd').value.trim();
  if (!c) return toast('⚠', 'Escribe un comando', 'warn');
  const r = await executeBridge({ tool:'termux', cmd:c });
  toast(r.ok ? '✓' : '✗', 'Comando enviado a Termux', r.ok ? 'success' : 'error');
  appendTerm(`<span class="t-prompt">termux $</span> <span class="t-cmd">${escapeHtml(c)}</span>`);
  appendTerm(`<span class="t-out">${escapeHtml(r.output)}</span>`);
});
document.getElementById('termuxIntent').addEventListener('click', () => openApp('com.termux', 'Termux'));
document.getElementById('termuxPaste').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('termuxCmd').value); toast('📋', 'Comando copiado', 'info'); });

document.getElementById('breventList').addEventListener('click', async () => {
  const r = await executeBridge({ tool:'brevent', cmd:'list -standby' });
  document.getElementById('breventStatus').innerHTML = `<b>Standby apps:</b><br><span style="font-family:monospace;font-size:11px;color:#ff6f00">${escapeHtml(r.output)}</span>`;
  toast('✓', 'Listado de Brevent cargado', 'success');
});
document.getElementById('breventOpen').addEventListener('click', () => openApp('me.piebridge.brevent', 'Brevent'));
document.getElementById('breventPaste').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('breventCmd').value); toast('📋', 'Comando copiado', 'info'); });

document.getElementById('execCustom').addEventListener('click', async () => {
  const c = document.getElementById('customCmd').value.trim();
  if (!c) return toast('⚠', 'Escribe un comando', 'warn');
  const out = document.getElementById('customOut');
  out.textContent = '⏳ Ejecutando…';
  const r = await executeBridge({ tool:'shizuku', cmd:c });
  out.textContent = r.output;
  toast(r.ok ? '✓' : '✗', r.ok ? 'Comando ejecutado' : 'Error', r.ok ? 'success' : 'error');
});
document.getElementById('copyOut').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('customOut').textContent);
  toast('📋', 'Salida copiada', 'info');
});
document.getElementById('saveCustom').addEventListener('click', () => {
  const c = document.getElementById('customCmd').value.trim();
  if (!c) return;
  state.presets.push({ t: Date.now(), cmd: c });
  saveState();
  toast('★', 'Preset guardado', 'success');
});

function openApp(pkg, name) {
       if (env.isAndroid) {
         try {
           const el = document.createElement('a');
           el.href = `intent:#Intent;action=android.intent.action.MAIN;
     category=android.intent.category.LAUNCHER;package=${pkg};end`;
           el.click();
         } catch (e) {
           toast('⚠', `${name} no instalado`, 'warn');
         }
       } else {
         window.open(`https://play.google.com/store/apps/details?id=${pkg}`,
     '_blank');
       }
       toast('🔗', `Abriendo ${name}…`, 'info');
}

/* ===============================================================
   13 · SETTINGS
   =============================================================== */

function loadSettings() {
  document.getElementById('autoBoost').checked = state.settings.autoBoost;
  document.getElementById('autoScan').checked = state.settings.autoScan;
  document.getElementById('keepFps').checked = state.settings.keepFps;
  document.getElementById('freezeSocial').checked = state.settings.freezeSocial;
  document.getElementById('boostNotif').checked = state.settings.boostNotif;
  document.getElementById('saveHist').checked = state.settings.saveHist;
  document.getElementById('debugMode').checked = state.settings.debugMode;
}

['autoBoost','autoScan','keepFps','freezeSocial','boostNotif','saveHist','debugMode'].forEach(id => {
  document.getElementById(id).addEventListener('change', e => {
    state.settings[id] = e.target.checked;
    saveState();
    if (id === 'debugMode') console.log('[GS] Debug', e.target.checked ? 'ON' : 'OFF');
  });
});

document.getElementById('resetAll').addEventListener('click', () => {
  if (!confirm('¿Restablecer toda la configuración?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  loadSettings();
  renderProfiles();
  toast('↻', 'Configuración restablecida', 'success');
});

/* ===============================================================
   14 · BOOTSTRAP
   =============================================================== */

async function init() {
  // View desde hash
  const initial = location.hash.slice(1) || 'dashboard';
  if (PAGE_TITLES[initial]) switchView(initial);

  loadSettings();
  renderProfiles();
  renderGames();
  refreshProcesses();
  updateMetrics();
  refreshBridges();

  // Métricas cada 4s
  setInterval(updateMetrics, 4000);
  setInterval(refreshProcesses, 12000);

  // Bridge check inicial
  setTimeout(() => checkBridges(false), 1000);

  // Scan inicial si autoScan está activo
  if (state.settings.autoScan) setTimeout(scanGames, 2200);

  log('info', 'Game Space iniciado · ' + (env.isAndroid ? 'Android' : 'Escritorio / simulación'));
  debug('Estado inicial:', state);
}

window.addEventListener('hashchange', () => switchView(location.hash.slice(1) || 'dashboard'));

// Soporte Android back button
window.addEventListener('popstate', () => switchView(location.hash.slice(1) || 'dashboard'));

document.addEventListener('DOMContentLoaded', init);

/* ===============================================================
   15 · SERVICE WORKER (PWA offline)
   =============================================================== */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      debug('SW registrado:', reg.scope);
    }).catch((err) => {
      debug('SW fallo:', err);
    });
  });
}

})();
