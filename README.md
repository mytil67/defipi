# Défi'Pi

Borne pédagogique autonome pour Raspberry Pi 3 — Escape Game numérique.

## Structure du projet

```
defipi-claude-ui/
├── backend/
│   ├── app.py          Serveur FastAPI, WebSocket /ws/nfc, REST /api/config
│   ├── nfc_reader.py   Thread PCSC/pyscard (debounce 2s, silencieux si pas de lecteur)
│   ├── config.json     Configuration du jeu (modifiable via interface admin)
│   └── requirements.txt
├── frontend/src/
│   ├── App.jsx         Logique principale du jeu
│   ├── Admin.jsx       Interface animateur (config + enregistrement NFC)
│   └── styles.css
└── scripts/start-defipi.sh  Lancement kiosque Chromium
```

## Mission 404 — Déroulé du jeu

| Étape    | Défi                                      | Fragment |
|----------|-------------------------------------------|----------|
| Briefing | Introduction de la mission                | —        |
| Défi 1   | Suite logique : 2-4-8-16-? → **32**      | 3        |
| Défi 2   | Scan NFC carte "CLÉ SERVEUR"              | 2        |
| Défi 3   | Quiz : quel mot de passe est le plus sûr ?| 4        |
| Défi 4   | Quiz : repère le message de phishing      | 1        |
| Final    | Code de redémarrage : **3241**            | —        |
| Victoire | Brigade Anti-Bug — Niveau 1              | —        |

Le code final correspond à l'ordre de collecte des fragments : Défi 1→3, Défi 2→2, Défi 3→4, Défi 4→1 → **3241**.

---

## Développement local (Windows)

### 1. Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Frontend (autre terminal)
```bash
cd frontend
npm install
npm run dev
```
Accédez à `http://localhost:5173`. Proxy Vite → backend sur `http://localhost:8000`.

---

## Déploiement sur Raspberry Pi 3

### 1. Prérequis système
```bash
sudo apt-get update
sudo apt-get install -y libpcsclite-dev pcscd chromium-browser
sudo systemctl enable pcscd
sudo systemctl start pcscd
```

### 2. Build du frontend
```bash
cd frontend
npm install
npm run build
# Génère backend/static/
```

### 3. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Lancement kiosque
```bash
chmod +x scripts/start-defipi.sh
./scripts/start-defipi.sh
```

---

## Interface admin

- URL : `http://localhost:8000/?admin=true`
- Raccourci clavier : **Ctrl+Shift+A** depuis l'écran de jeu

Permet de configurer :
- La suite numérique du Défi 1
- Les UIDs NFC autorisés pour le Défi 2 (enregistrement par scan)
- Les questions du quiz Défi 3 (mot de passe)
- Les messages de phishing du Défi 4
- Le code de redémarrage final

---

## Simulation NFC (test sans lecteur)

Le **bouton "Simuler Scan NFC"** s'affiche sur l'écran du Défi 2. Il est réservé aux animateurs pour tester sans carte physique.

- **Raccourci clavier** : **Ctrl+Shift+S** (uniquement actif sur le Défi 2)
- La simulation est **locale** : elle n'envoie pas de requête au backend et ne peut pas créer de double-événement.
- ⚠️ Il n'existe **pas** de touche unique (S, Entrée, etc.) qui déclenche la simulation — cela évite les faux scans.

---

## NFC réel (SpringCard via PC/SC)

- Le lecteur est détecté automatiquement au démarrage.
- Si aucun lecteur n'est branché, le backend démarre silencieusement sans erreur.
- Les UIDs autorisés se configurent dans l'interface admin (scan de la vraie carte).
- Format UID : `"D0 98 8C B9"` (hex avec espaces, tel que retourné par pyscard).

---

## Notes techniques

- **Pas de double-fire** : la simulation est purement locale (pas de POST `/api/simulate-nfc`). Le WebSocket `/ws/nfc` ne reçoit que les vrais scans hardware.
- **Debounce NFC** : 2 secondes côté `nfc_reader.py` pour éviter les scans répétés.
- **Kiosque** : `overflow: hidden` sur `html/body`, `100vw/100vh` strict, pas de scroll navigateur.
- **Offline** : polices Nunito et Comic Neue embarquées localement via `@fontsource`.
