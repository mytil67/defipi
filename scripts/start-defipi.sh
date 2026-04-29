#!/bin/bash

# Déplacement vers le dossier backend
cd "$(dirname "$0")/../backend"

# Activation de l'environnement virtuel si présent
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Démarrage du backend en arrière-plan
echo "Démarrage du backend Défi'Pi..."
python3 app.py &
BACKEND_PID=$!

# Attente du démarrage du serveur
echo "Attente du serveur (5s)..."
sleep 5

# Lancement de Chromium en mode kiosque
echo "Lancement de Chromium en mode kiosque..."
chromium-browser --kiosk --incognito --disable-infobars http://localhost:8000

# Arrêt du backend quand Chromium est fermé
kill $BACKEND_PID
echo "Application arrêtée."
