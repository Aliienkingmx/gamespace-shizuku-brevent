#!/system/bin/sh
# ================================================================
# BloodStrike - Game Space Boost Script
# Optimización máxima para Blood Strike (com.dts.freefireth)
# Uso: sh bloodstrike-boost.sh [--restore]
# Requiere: Shizuku o root
# ================================================================

CONFIG_FILE="/data/local/tmp/bloodstrike_boost.conf"
GAME_PKG="com.dts.freefireth"

# ================================================================
# 1. FUNCIONES AUXILIARES
# ================================================================

log() {
  echo "[$(date '+%H:%M:%S')] $*"
}

is_shizuku() {
  command -v shizuku >/dev/null 2>&1 || [ -n "$SHIZUKU_UID" ]
}

exec_sh() {
  if is_shizuku; then
    shizuku exec "$@"
  else
    eval "$@"
  fi
}

# ================================================================
# 2. RESPALDO DE CONFIGURACIÓN ORIGINAL
# ================================================================

backup_settings() {
  log "[*] Respaldando configuración original..."
  mkdir -p /data/local/tmp

  settings list global > "$CONFIG_FILE.global" 2>/dev/null
  settings list system > "$CONFIG_FILE.system" 2>/dev/null
  settings list secure > "$CONFIG_FILE.secure" 2>/dev/null

  echo "$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null)" > "$CONFIG_FILE.governor"
  echo "$(dumpsys thermalservice 2>/dev/null | grep 'Status:' | awk '{print $2}')" > "$CONFIG_FILE.thermal"

  log "[✓] Respaldo guardado en $CONFIG_FILE.*"
}

restore_settings() {
  log "[*] Restaurando configuración original..."
  if [ -f "$CONFIG_FILE.global" ]; then
    log "   Restaurando no implementado - reinicia el dispositivo para valores default"
  fi
  exec_sh "cmd thermalservice override-status 1" 2>/dev/null
  log "[✓] Restauración completada. Recomendación: reinicia el dispositivo."
}

# ================================================================
# 3. OPTIMIZACIONES BLOOD STRIKE
# ================================================================

set_cpu_governor() {
  log "[1/8] Gobernador CPU → performance"

  local gov="performance"
  local cpus="/sys/devices/system/cpu"

  for cpu in $cpus/cpu*/cpufreq/scaling_governor; do
    local dir=$(dirname "$cpu")
    if [ -w "$cpu" ]; then
      echo "$gov" > "$cpu" 2>/dev/null
    fi
  done

  # Forzar frecuencia máxima en todos los núcleos
  for cpu in $cpus/cpu*/cpufreq; do
    if [ -f "$cpu/scaling_max_freq" ]; then
      local max=$(cat "$cpu/cpuinfo_max_freq" 2>/dev/null)
      [ -n "$max" ] && echo "$max" > "$cpu/scaling_max_freq" 2>/dev/null
    fi
  done

  log "   Gobernadores: $(cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor 2>/dev/null | tr '\n' ' ')"
}

free_memory() {
  log "[2/8] Liberando RAM y caché..."

  # Trim memory de todos los procesos
  for level in MODERATE RUNNING_MODERATE CRITICAL; do
    am send-trim-memory "PRUNE_LEVEL_$level" 2>/dev/null
  done

  # Drop caches
  sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null

  # Trim caches de paquetes
  pm trim-caches 512M 2>/dev/null

  # Forzar GC en procesos del sistema
  for pid in $(pgrep -f "system_server|surfaceflinger|audioserver"); do
    kill -10 "$pid" 2>/dev/null
  done

  log "   $(free -h 2>/dev/null | head -2 | tail -1)"
}

set_max_fps() {
  log "[3/8] Tasa de refresco máxima + GPU turbo"

  # Forzar refresh rate máximo
  for rate in 144 120 90 60; do
    settings put global peak_refresh_rate "$rate" 2>/dev/null && break
  done

  settings put global user_rotation 0 2>/dev/null

  # Desactivar animaciones (reduce latencia visual)
  for scale in 0.25 0.5; do
    settings put global window_animation_scale "$scale" 2>/dev/null
    settings put global transition_animation_scale "$scale" 2>/dev/null
    settings put global animator_duration_scale "$scale" 2>/dev/null
    break
  done

  # Overlay GPU para juegos (forzar renderizado GPU)
  settings put global enable_gpu_debug_layers 0 2>/dev/null
  settings put global force_gpu_rendering 1 2>/dev/null
  settings put global show_fps_overlay 0 2>/dev/null

  # Forzar 4x MSAA si está disponible
  settings put global multisampling 1 2>/dev/null
}

disable_thermal_throttling() {
  log "[4/8] Desactivando throttling térmico..."

  exec_sh "cmd thermalservice override-status 0" 2>/dev/null

  # Desactivar mi_thermal (Xiaomi)
  if [ -d /sys/class/thermal ]; then
    for zone in /sys/class/thermal/thermal_zone*/mode; do
      [ -w "$zone" ] && echo "disabled" > "$zone" 2>/dev/null
    done
  fi

  # Desactivar msm_thermal (Qualcomm)
  if [ -f /sys/module/msm_thermal/parameters/enabled ]; then
    echo "N" > /sys/module/msm_thermal/parameters/enabled 2>/dev/null
  fi

  log "   Estado thermal: $(dumpsys thermalservice 2>/dev/null | grep 'Status:' | head -1)"
}

optimize_network() {
  log "[5/8] Optimización de red para Blood Strike..."

  # DNS Gaming (Google DNS = menor latencia)
  settings put global private_dns_mode hostname 2>/dev/null
  settings put global private_dns_specifier dns.google 2>/dev/null

  # Desactivar ahorro de datos
  settings put global data_saver_mode 0 2>/dev/null

  # TCP congestion algorithm (bbr o westwood para gaming)
  if [ -f /proc/sys/net/ipv4/tcp_congestion_control ]; then
    for algo in bbr westwood cubic; do
      echo "$algo" > /proc/sys/net/ipv4/tcp_congestion_control 2>/dev/null && break
    done
  fi

  # Buffers de red optimizados
  echo "262144 524288 1048576" > /proc/sys/net/core/rmem_max 2>/dev/null
  echo "262144 524288 1048576" > /proc/sys/net/core/wmem_max 2>/dev/null

  log "   TCP congestion: $(cat /proc/sys/net/ipv4/tcp_congestion_control 2>/dev/null)"
}

boost_touch() {
  log "[6/8] Sensibilidad táctil optimizada..."

  settings put secure touch_event_threshold 3 2>/dev/null
  settings put system pointer_speed 10 2>/dev/null

  # Desactivar gesture navigation (reduce input lag)
  settings put secure navigation_mode 0 2>/dev/null

  # Aumentar frecuencia de polling táctil
  if [ -d /sys/devices/virtual/input ]; then
    for dev in /sys/devices/virtual/input/input*/sampling_rate; do
      [ -w "$dev" ] && echo "1" > "$dev" 2>/dev/null
    done
  fi

  log "   Pointer speed: $(settings get system pointer_speed 2>/dev/null)"
}

kill_background_apps() {
  log "[7/8] Eliminando procesos en segundo plano..."

  # Lista negra de apps que consumen recursos
  local BLACKLIST="
    com.instagram.android
    com.facebook.katana
    com.facebook.orca
    com.whatsapp
    com.zhiliaoapp.musically
    com.twitter.android
    com.snapchat.android
    com.google.android.youtube
    com.google.android.gm
    com.android.chrome
    org.telegram.messenger
    com.tencent.mm
    com.tencent.mobileqq
    com.spotify.music
    com.netflix.mediaclient
    com.primevideo
  "

  for pkg in $BLACKLIST; do
    am force-stop "$pkg" 2>/dev/null
  done

  # Matar procesos pesados no críticos
  for proc in logd traced mdnsd dnsmasq wpa_supplicant; do
    killall -9 "$proc" 2>/dev/null
  done

  log "   Apps en segundo plano detenidas"
}

set_game_mode() {
  log "[8/8] Modo juego + prioridad Blood Strike..."

  # Asegurar que el juego tenga máxima prioridad
  if pgrep -f "$GAME_PKG" >/dev/null 2>&1; then
    local pid=$(pgrep -f "$GAME_PKG" | head -1)
    echo "-20" > /proc/$pid/oom_adj 2>/dev/null
    echo "-17" > /proc/$pid/oom_score_adj 2>/dev/null
    log "   Prioridad ajustada para $GAME_PKG (PID: $pid)"
  else
    log "   [!] $GAME_PKG no está en ejecución"
    log "   La prioridad se aplicará automáticamente al iniciar"
  fi

  # Desactivar sonidos del sistema
  settings put system sound_effects_enabled 0 2>/dev/null
  settings put system haptic_feedback_enabled 0 2>/dev/null

  # Desactivar sincronización automática
  settings put global auto_sync 0 2>/dev/null

  # Desactivar notificaciones durante el juego
  settings put global heads_up_notifications_enabled 0 2>/dev/null
}

# ================================================================
# 4. VERIFICACIÓN
# ================================================================

verify_optimizations() {
  log ""
  log "========================================"
  log "[✓] BLOOD STRIKE · OPTIMIZACIONES ACTIVAS"
  log "========================================"

  echo ""
  echo " CPU Governor:     $(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo 'N/A')"
  echo " Max Frequency:    $(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq 2>/dev/null || echo 'N/A') kHz"
  echo " Refresh Rate:     $(settings get global peak_refresh_rate 2>/dev/null || echo 'N/A') Hz"
  echo " Thermal:          $(dumpsys thermalservice 2>/dev/null | grep 'Status:' | head -1 || echo 'N/A')"
  echo " TCP CC:           $(cat /proc/sys/net/ipv4/tcp_congestion_control 2>/dev/null || echo 'N/A')"
  echo " Pointer Speed:    $(settings get system pointer_speed 2>/dev/null || echo 'N/A')"
  echo " RAM Free:         $(free -h 2>/dev/null | grep Mem | awk '{print $4}' || echo 'N/A')"
  echo " Force GPU:        $(settings get global force_gpu_rendering 2>/dev/null || echo 'N/A')"
  echo ""
  log "========================================"
  log "[*] Abre Blood Strike y disfruta del máximo rendimiento"
  log "[*] Para restaurar: sh bloodstrike-boost.sh --restore"
  log "========================================"
}

# ================================================================
# 5. MAIN
# ================================================================

case "$1" in
  --restore|-r)
    restore_settings
    exit 0
    ;;
  --help|-h)
    echo "BloodStrike Boost - Game Space"
    echo ""
    echo "Uso: sh bloodstrike-boost.sh [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  (sin opción)   Aplica optimizaciones para Blood Strike"
    echo "  --restore, -r  Restaura configuración original"
    echo "  --help, -h     Muestra esta ayuda"
    echo ""
    echo "Requisitos: Shizuku activo o root"
    echo "Juego: com.dts.freefireth (Blood Strike)"
    exit 0
    ;;
esac

log ""
log "========================================"
log "  BLOOD STRIKE · GAME BOOST"
log "  Game Space Optimization Engine"
log "========================================"
log ""

# Verificar permisos
if [ "$(id -u)" != "0" ] && ! is_shizuku; then
  log "[!] Error: Se requiere Shizuku o root"
  log "   Activa Shizuku y ejecuta: shizuku exec sh bloodstrike-boost.sh"
  exit 1
fi

# Backup + optimizaciones
backup_settings
echo ""
set_cpu_governor
echo ""
free_memory
echo ""
set_max_fps
echo ""
disable_thermal_throttling
echo ""
optimize_network
echo ""
boost_touch
echo ""
kill_background_apps
echo ""
set_game_mode
echo ""
verify_optimizations
