#!/data/data/com.termux/files/usr/bin/bash
# ==========================================
#  BloodStrike Boost — Instalador
#  Game Space Optimization Engine
# ==========================================
# Instala el script bloodboost en Termux
# para optimizar Blood Strike al máximo.
# ==========================================

set -e

SCRIPT_SRC="$(dirname "$0")/bloodstrike-boost.sh"
SCRIPT_DST="$HOME/bin/bloodboost"

if [ ! -f "$SCRIPT_SRC" ]; then
    echo "ERROR: No se encuentra bloodstrike-boost.sh"
    echo "Ejecuta este script desde el directorio del proyecto:"
    echo "  cd gamespace-shizuku-brevent && bash scripts/install-bloodboost.sh"
    exit 1
fi

echo "=========================================="
echo "  BloodStrike Boost · Instalador"
echo "=========================================="
echo ""

# Crear directorio bin si no existe
mkdir -p "$HOME/bin"

# Copiar script
cp "$SCRIPT_SRC" "$SCRIPT_DST"
chmod +x "$SCRIPT_DST"
echo "✓ Script copiado a: $SCRIPT_DST"

# Agregar al PATH si no está
if ! echo "$PATH" | grep -q "$HOME/bin"; then
    if [ -f "$HOME/.bashrc" ]; then
        echo '' >> "$HOME/.bashrc"
        echo '# Game Space — bloodboost' >> "$HOME/.bashrc"
        echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.bashrc"
        echo "✓ PATH actualizado en ~/.bashrc"
    fi
fi

echo ""
echo "=========================================="
echo "  ✓ Instalación completada"
echo "=========================================="
echo ""
echo "Comandos disponibles:"
echo ""
echo "  bloodboost start   → Activar optimización"
echo "  bloodboost stop    → Restaurar valores originales"
echo "  bloodboost status  → Ver estado actual"
echo ""
echo "Requisitos: Shizuku activo"
echo ""
echo "Para usar ahora, ejecuta:"
echo "  source ~/.bashrc"
echo "  bloodboost start"
echo "=========================================="
