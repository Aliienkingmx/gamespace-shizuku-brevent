<div align="center">

<img src="https://img.shields.io/badge/Game%20Space-v1.0-00e5ff?style=for-the-badge&logo=android&logoColor=white" alt="Game Space v1.0"/>
<img src="https://img.shields.io/badge/license-MIT-69f0ae?style=for-the-badge" alt="License MIT"/>
<img src="https://img.shields.io/badge/HTML5-orange?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5"/>
<img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3"/>
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>

# Game Space

**Centro de control gaming para Android — Sin root, sin bloatware, máximo rendimiento.**

Integra Shizuku · Termux · Brevent para aplicar optimizaciones reales del sistema
y mejorar el rendimiento en juegos con un solo toque.

[Características](#-características) · [Instalación](#-instalación) · [Uso](#-uso) · [Comandos](#-catálogo-de-comandos) · [APK](#-generar-apk)

</div>

---

## ⚡ Capturas

| Panel | Booster | Terminal |
|------|--------|----------|
| Métricas CPU, RAM, GPU, batería + procesos | Acciones rápidas de optimización | Terminal con autocompletado |

| Juegos | Bridges | Perfiles |
|------|----------|----------|
| Escaneo de juegos instalados | Shizuku · Termux · Brevent | 6 perfiles listos para aplicar |

---

## 🎯 Características

### Optimización
- ⚡ **Boost Total** en un toque (RAM + CPU + GPU + FPS)
- 🧊 **Freeze** de apps en segundo plano vía Brevent
- 📈 **FPS+** fuerza 90/120/144 Hz y reduce animaciones
- ❄️ **Thermal** desactiva throttling por temperatura
- 🎯 **Touch Boost** aumenta sensibilidad táctil
- 🌐 **DNS Gaming** reduce latencia en juegos online

### Integración nativa
- 🔌 **Shizuku** ejecuta comandos privilegiados sin root
- 🐚 **Termux** shell avanzada con `termux-shizuku-tools`
- ❄️ **Brevent** congela apps en background para liberar RAM
- 🔍 **Auto-scan** detecta juegos instalados vía `pm list packages`

### UX
- 📱 **100% responsive** — optimizado para móvil, tablet y escritorio
- 🎨 **Tema dark gaming** con gradientes neón
- 💾 **Persistencia** local (localStorage) — tus presets y perfiles
- 🔘 **FAB flotante** = boost instantáneo desde cualquier vista
- 📲 **PWA instalable** — añádelo a pantalla de inicio

---

## 📋 Requisitos

| App | Propósito | Enlace |
|-----|-----------|--------|
| **Android** 8.0+ | Sistema operativo | — |
| **Shizuku** v13.5+ | Ejecución de comandos privilegiados | [GitHub](https://github.com/RikkaApps/Shizuku) |
| **Termux** (F-Droid) | Terminal Linux en Android | [F-Droid](https://f-droid.org/packages/com.termux/) |
| **termux-shizuku-tools** | Puente Shizuku ↔ Termux | [GitHub](https://github.com/AlexeiCrystal/termux-shizuku-tools) |
| **Brevent** (opcional) | Congelar apps en background | [Play Store](https://play.google.com/store/apps/details?id=me.piebridge.brevent) |

---

## 🚀 Instalación

### Opción 1 — PWA (sin APK, recomendado)

Sirve los archivos localmente o publícalos en GitHub Pages:

```bash
# Opción A: GitHub Pages (gratis, online)
# 1. Sube este repo a GitHub
# 2. Settings → Pages → Source: main branch → Save
# 3. Abre https://TU_USUARIO.github.io/gamespace-shizuku-brevent/
# 4. Chrome → menú → "Añadir a pantalla de inicio"
```

```bash
# Opción B: Servidor local en Termux
pkg install -y python
cd gamespace-shizuku-brevent
python -m http.server 8080
# Abre http://localhost:8080 desde el navegador del móvil
```

### Opción 2 — APK nativo con PWABuilder

1. Publica el repo en GitHub Pages (arriba)
2. Ve a https://www.pwabuilder.com y pega tu URL
3. Pulsa **Package for stores → Android**
4. Descarga el APK firmado
5. Instálalo en tu Android

### Opción 3 — TWA con Bubblewrap

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://TU_USUARIO.github.io/gamespace-shizuku-brevent/manifest.webmanifest
bubblewrap build
# Genera app-release-signed.apk listo para subir a Play Store
```

### Opción 4 — APK con Apache Cordova

```bash
npm i -g cordova
cordova create gspace com.aliienkingmx.gamespace GameSpace
cd gspace
cordova platform add android
# Copia los 3 archivos (index.html, styles.css, app.js) a www/
cordova build android
```

---

## 🎮 Uso

### Conectar los bridges

1. Abre **Shizuku** y actívalo (vía ADB o root)
2. Abre **Termux** y verifica:
   ```bash
   shizuku info
   ```
3. (Opcional) Instala **Brevent** y autoriza Shizuku desde su menú
4. En Game Space, ve a **Bridges** → **Verificar** para confirmar conexión

### Aplicar un Boost

Tres formas:
- Toca el **FAB flotante** ⚡ (esquina inferior derecha) desde cualquier vista
- **Panel** → **Acciones rápidas** → el modo que necesites
- **Booster** → **Boost Total**

### Crear perfil personalizado

Edita `app.js` y añade a `state.profiles`:

```js
{ id:'p7', name:'Mi Perfil', icon:'⭐', desc:'Custom', opts:['fps','thermal'] }
```

O usa **Terminal** o **Bridges → Comando personalizado** con:

```bash
shizuku exec "settings put global peak_refresh_rate 144"
```

---

## 📟 Catálogo de comandos

| Acción | Comando |
|--------|---------|
| Liberar RAM | `shizuku exec "am send-trim-memory PRUNE_LEVEL_RUNNING_MODERATE"` |
| Refresh Rate Max | `shizuku exec "settings put global peak_refresh_rate 144"` |
| Animaciones 0.5x | `shizuku exec "settings put global window_animation_scale 0.5"` |
| Thermal Performance | `shizuku exec "cmd thermalservice override-status 0"` |
| Touch Boost | `shizuku exec "settings put system pointer_speed 7"` |
| DNS Gaming | `shizuku exec "settings put global private_dns_specifier dns.google"` |
| Congelar apps | `brevent freeze com.instagram.android` |
| Limpiar caches | `shizuku exec "pm trim-caches 256M"` |
| Escanear juegos | `shizuku exec "pm list packages -3"` |
| Stats CPU | `shizuku exec "dumpsys cpuinfo"` |
| Stats RAM | `shizuku exec "dumpsys meminfo"` |
| Stats GPU | `shizuku exec "dumpsys gfxinfo"` |

---

## 🏗️ Estructura

```
gamespace-shizuku-brevent/
├── index.html              # UI principal
├── styles.css              # Tema dark responsive
├── app.js                  # Lógica + bridges Shizuku/Termux/Brevent
├── manifest.webmanifest    # PWA manifest
├── README.md
└── assets/                 # (opcional) iconos PWA
    ├── icon-192.png
    └── icon-512.png
```

---

## 🔧 Desarrollo local

```bash
git clone https://github.com/Aliienkingmx/gamespace-shizuku-brevent.git
cd gamespace-shizuku-brevent
python -m http.server 8080
# Abre http://localhost:8080
```

---

## 🤝 Contribuir

1. Fork el repo
2. Crea tu branch (`git checkout -b feature/MiFeature`)
3. Commit (`git commit -m 'Add MiFeature'`)
4. Push (`git push origin feature/MiFeature`)
5. Abre Pull Request

---

## 📜 Licencia

MIT © Aliienkingmx — Libre uso, modificación y distribución.

---

## ⚠️ Disclaimer

Game Space es una herramienta de optimización. Los comandos `shizuku exec` modifican
ajustes del sistema: úsalo bajo tu responsabilidad. Algunos comandos requieren
permisos especiales según fabricante (Samsung, Xiaomi, Huawei pueden bloquear
`settings put`). No nos hacemos responsables de bricks, bootloops ni baneos en
juegos online por uso de boosts.

---

<div align="center">

**⭐ Si te sirve, dale estrella al repo · 🐛 Issues bienvenidos**

Hecho con 💜 para la comunidad Android gaming

</div>
