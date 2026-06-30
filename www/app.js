(() => {
'use strict';

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
  games: [],
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Object.assign(structuredClone(defaultState), JSON.parse(raw)) : structuredClone(defaultState);
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

const env = {
  isAndroid: /Android/i.test(navigator.userAgent),
  isTermux: typeof window.TermuxTTY !== 'undefined' || /Termux/i.test(navigator.userAgent),
  hasShizuku: 'Shizukuinfo' in window || typeof window.shizukuinfo !== 'undefined',
  hasBrevent: false,
  hasTermuxAPI: 'termux' in window,
};

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  const btn = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
}

function toast(icon, msg, type = 'info') {
  const t = document.getElementById('toast');
  t.className = 'toast show ' + type;
  t.textContent = (icon ? icon + ' ' : '') + msg;
  setTimeout(() => t.classList.remove('show'), 2600);
}

function updateMetrics() {
  const cpu = 8 + Math.random() * 38;
  document.getElementById('cpuVal').textContent = cpu.toFixed(0) + '%';
  document.getElementById('cpuBar').style.width = cpu + '%';
  
  const ram = 38 + Math.random() * 28;
  document.getElementById('ramVal').textContent = ram.toFixed(0) + '%';
  document.getElementById('ramBar').style.width = ram + '%';
  
  const gpu = 90 + Math.random() * 30;
  document.getElementById('gpuVal').textContent = gpu.toFixed(0) + ' fps';
  document.getElementById('gpuBar').style.width = Math.min(gpu, 100) + '%';
}

function init() {
  const initial = location.hash.slice(1) || 'dashboard';
  if (document.getElementById('view-' + initial)) switchView(initial);
  
  updateMetrics();
  setInterval(updateMetrics, 4000);
  
  document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });
  
  document.querySelectorAll('.action-card').forEach(c => {
    c.addEventListener('click', () => toast('⚡', 'Optimización ' + c.dataset.act, 'success'));
  });
  
  document.getElementById('fab').addEventListener('click', () => {
    toast('🚀', 'Boost Total iniciado', 'success');
  });
  
  document.getElementById('refreshBtn').addEventListener('click', () => {
    updateMetrics();
    toast('↻', 'Métricas actualizadas', 'info');
  });
  
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
  });
  
  document.getElementById('closeSidebar')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  });
  
  toast('✅', 'Game Space iniciado', 'success');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', init);

})();