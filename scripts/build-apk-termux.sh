#!/data/data/com.termux/files/usr/bin/bash
# ==========================================
#  GAME SPACE · APK Builder for Termux
#  Construye un APK directamente en Termux
#  con aapt + d8 + apksigner
# ==========================================
# Requiere: Termux, openjdk-17, aapt, apksigner
# 
# Uso:
#   cd gamespace-shizuku-brevent
#   bash scripts/build-apk-termux.sh
# ==========================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()  { echo -e "  ${GREEN}✓${NC} $1"; }
err() { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }

echo -e "${CYAN}=========================================="
echo "  GAME SPACE · APK Builder for Termux"
echo -e "==========================================${NC}"

WORK_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORK_DIR"

# ---- 1. Dependencias ----
echo ""
info "Instalando dependencias..."
pkg update -y 2>&1 | tail -1

for pkg in openjdk-17 python aapt apksigner zip; do
  if pkg list-installed 2>/dev/null | grep -q "^$pkg "; then
    ok "$pkg ya instalado"
  else
    pkg install -y "$pkg" 2>&1 | tail -1
    ok "$pkg instalado"
  fi
done

export JAVA_HOME="/data/data/com.termux/files/usr/opt/openjdk-17"
export PATH="$JAVA_HOME/bin:$PATH"

# ---- 2. Verificar archivos fuente ----
echo ""
info "Verificando archivos fuente..."
for f in index.html styles.css app.js manifest.webmanifest; do
  [ -f "$f" ] && ok "$f encontrado" || { err "Falta $f"; exit 1; }
done

# ---- 3. Estructura del APK ----
echo ""
info "Creando estructura del APK..."
WORK="$HOME/.gamespace-build"
rm -rf "$WORK"
mkdir -p "$WORK"/assets
mkdir -p "$WORK"/java
mkdir -p "$WORK"/res/values
mkdir -p "$WORK"/res/drawable
mkdir -p "$WORK"/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}

cp index.html styles.css app.js manifest.webmanifest "$WORK/assets/"
cp -r scripts/*.sh "$WORK/assets/" 2>/dev/null || true
ok "Assets copiados"

# ---- 4. AndroidManifest.xml ----
cat > "$WORK/AndroidManifest.xml" << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.aliienkingmx.gamespace"
    android:versionCode="1" android:versionName="1.0">
    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
    <queries>
        <package android:name="moe.shizuku.privileged.api" />
        <package android:name="com.termux" />
        <package android:name="me.piebridge.brevent" />
    </queries>
    <application android:label="Game Space"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme"
        android:hardwareAccelerated="true"
        android:allowBackup="true" android:supportsRtl="true">
        <activity android:name=".MainActivity" android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|uiMode"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/AppTheme.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
XML
ok "AndroidManifest.xml"

# ---- 5. Recursos ----
cat > "$WORK/res/values/strings.xml" << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources><string name="app_name">Game Space</string></resources>
XML

cat > "$WORK/res/values/styles.xml" << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="android:Theme.Material.Light.DarkActionBar">
        <item name="android:colorPrimary">#0a0e1a</item>
        <item name="android:colorPrimaryDark">#0a0e1a</item>
        <item name="android:colorAccent">#00e5ff</item>
    </style>
    <style name="AppTheme.NoActionBar">
        <item name="android:windowActionBar">false</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowBackground">@android:color/black</item>
    </style>
</resources>
XML
ok "Recursos XML creados"

# ---- 6. Iconos PNG ----
python3 << 'PY'
from struct import pack
import zlib, os

def png(size, color):
    r, g, b = color
    raw = b''
    for y in range(size):
        raw += b'\x00'
        for x in range(size):
            dx, dy = abs(x-size/2), abs(y-size/2)
            if dx + dy > (size/2-2) * 1.4:
                raw += bytes([0,0,0,0])
            else:
                t = (x+y)/(2*size)
                raw += bytes([int(r*(1-t)+179*t), int(g*(1-t)+136*t), int(b*(1-t)+255*t), 255])
    ihdr = pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    def c(typ, d):
        return pack('>I',len(d))+typ+d+pack('>I', zlib.crc32(typ+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+c(b'IHDR',ihdr)+c(b'IDAT',zlib.compress(raw,9))+c(b'IEND',b'')

work = os.environ['WORK']
for d, s in {'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}.items():
    with open(f"{work}/res/mipmap-{d}/ic_launcher.png", 'wb') as f:
        f.write(png(s, (0,229,255)))
PY
ok "Iconos PNG generados"

# ---- 7. MainActivity.java ----
cat > "$WORK/java/MainActivity.java" << 'JAVA'
package com.aliienkingmx.gamespace;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.KeyEvent;

public class MainActivity extends Activity {
    private WebView wv;

    @Override
    protected void onCreate(Bundle s) {
        super.onCreate(s);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().setStatusBarColor(0xff0a0e1a);
        getWindow().setNavigationBarColor(0xff0a0e1a);

        wv = new WebView(this);
        WebSettings ws = wv.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setSupportZoom(false);
        ws.setBuiltInZoomControls(false);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);

        wv.setWebViewClient(new WebViewClient());
        wv.setWebChromeClient(new WebChromeClient());

        wv.loadUrl("file:///android_asset/index.html");
        setContentView(wv);
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK && wv.canGoBack()) {
            wv.goBack();
            return true;
        }
        return super.onKeyDown(code, e);
    }
}
JAVA
ok "MainActivity.java"

# ---- 8. android.jar ----
echo ""
info "Preparando android.jar..."
ANDROID_JAR="$HOME/.gamespace-android/android.jar"
if [ ! -f "$ANDROID_JAR" ]; then
  mkdir -p "$HOME/.gamespace-android"
  cd "$HOME/.gamespace-android"
  curl -fsSLo android.jar \
    https://github.com/Sable/android-platforms/raw/master/android-33/android.jar
  ok "android.jar descargado ($(du -h android.jar | cut -f1))"
else
  ok "android.jar ya existe"
fi

# ---- 9. Compilar Java → .class → .dex ----
echo ""
info "Compilando Java..."
cd "$WORK/java"
javac -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR" \
  -cp "$ANDROID_JAR" MainActivity.java
ok "MainActivity.class"

info "Generando classes.dex..."
cd "$WORK"
if command -v d8 &>/dev/null; then
  d8 --output "$WORK/classes.dex" java/MainActivity.class
elif command -v dx &>/dev/null; then
  dx --dex --output="$WORK/classes.dex" java/MainActivity.class
else
  err "No se encontró d8 ni dx"
  exit 1
fi
ok "classes.dex ($(du -h classes.dex | cut -f1))"

# ---- 10. Empaquetar APK ----
echo ""
info "Empaquetando APK..."
cd "$WORK"
APK_UNSIGNED="$HOME/gamespace-unsigned.apk"

aapt package -f -F "$APK_UNSIGNED" \
  -M AndroidManifest.xml \
  -S res -A assets \
  -I "$ANDROID_JAR"
ok "aapt: recursos empaquetados"

cd "$WORK"
zip -j "$APK_UNSIGNED" classes.dex
ok "classes.dex añadido al APK"

# ---- 11. Firmar ----
echo ""
info "Firmando APK..."
KEYSTORE="$HOME/.gamespace.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" -alias gamespace \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass gamespace123 -keypass gamespace123 \
    -dname "CN=Game Space, OU=Dev, O=Aliienkingmx, C=MX"
  ok "Keystore creado"
fi

apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:gamespace123 \
  --key-pass pass:gamespace123 \
  --out "$HOME/gamespace.apk" \
  "$APK_UNSIGNED"
ok "APK firmado"

# ---- 12. Copiar a Descargas ----
cp "$HOME/gamespace.apk" /sdcard/Download/gamespace.apk 2>/dev/null && \
  ok "Copiado a /sdcard/Download/" || true

# ---- 13. Limpiar ----
rm -f "$APK_UNSIGNED"
rm -rf "$WORK"

echo ""
echo -e "${GREEN}=========================================="
echo "  ✓ APK LISTO"
echo "  Ruta: ~/gamespace.apk"
echo "  Tamaño: $(ls -lh $HOME/gamespace.apk | awk '{print $5}')"
echo -e "==========================================${NC}"
echo ""
echo "Para instalar:"
echo "  1. Abre ~/gamespace.apk"
echo "  2. Permite instalación de fuentes desconocidas"
echo "  3. Disfruta Game Space"
