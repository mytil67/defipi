# Défi'Pi

Borne pédagogique autonome pour Raspberry Pi 3 (Escape Game).

## Structure du projet

- `backend/` : Serveur FastAPI + Lecteur NFC (Python).
- `frontend/` : Interface utilisateur (React + Vite).
- `scripts/` : Scripts de lancement.

## Développement Local (Windows)

### 1. Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Frontend
Dans un autre terminal :
```bash
cd frontend
npm install
npm run dev
```
Accédez à `http://localhost:5173`.

## Déploiement sur Raspberry Pi 3

### 1. Préparation du système
```bash
sudo apt-get update
sudo apt-get install -y libpcsclite-dev pcscd chromium-browser
sudo systemctl enable pcscd
sudo systemctl start pcscd
```

### 2. Build du Frontend
Sur votre machine de dev ou sur le Pi :
```bash
cd frontend
npm install
npm run build
```
Cela génère les fichiers dans `backend/static/`.

### 3. Installation du Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Lancement
```bash
chmod +x scripts/start-defipi.sh
./scripts/start-defipi.sh
```

## Fonctionnement de la Mission 404
1. **Énigme** : Le code à saisir est `32` (suite logique 2, 4, 8, 16).
2. **NFC** : Scannez n'importe quelle carte NFC ou utilisez la touche `S` du clavier pour simuler un scan.
