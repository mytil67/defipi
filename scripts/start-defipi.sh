#!/bin/bash

echo "Démarrage du backend Défi'Pi..."

cd /home/di/defipi/backend || exit 1
source venv/bin/activate

python app.py &
BACKEND_PID=$!

echo "Attente du serveur..."
sleep 5

echo "Fermeture des anciennes sessions Chromium..."
pkill chromium 2>/dev/null
pkill chromium-browser 2>/dev/null
sleep 2

echo "Lancement de Chromium..."

rm -rf /tmp/defipi-chromium-profile

DISPLAY=:0 chromium \
  --kiosk \
  --new-window \
  --user-data-dir=/tmp/defipi-chromium-profile \
--disable-translate \
--disable-features=Translate,TranslateUI \
--lang=fr-FR \
--accept-lang=fr,FR,fr \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --start-fullscreen \
  --window-position=0,0 \
  --window-size=1920,1080 \
  http://localhost:8000 &

CHROMIUM_PID=$!

sleep 4

echo "Forçage du plein écran..."

WINDOW_ID=$(xdotool search --onlyvisible --class chromium | head -n 1)

if [ -n "$WINDOW_ID" ]; then
  xdotool windowactivate "$WINDOW_ID"
  xdotool windowsize "$WINDOW_ID" 100% 100%
  xdotool windowmove "$WINDOW_ID" 0 0
  xdotool key F11
  wmctrl -r :ACTIVE: -b add,fullscreen
else
  echo "Fenêtre Chromium non trouvée."
fi

wait $CHROMIUM_PID

echo "Application arrêtée."
kill $BACKEND_PID
