# Défi'Pi Backend

Ce backend FastAPI gère la lecture NFC et sert l'interface frontend.

## Installation (Windows)

1. Installer Python 3.9+
2. Créer un environnement virtuel :
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Installer les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

## Installation (Raspberry Pi)

1. Installer les dépendances système pour PC/SC :
   ```bash
   sudo apt-get update
   sudo apt-get install -y libpcsclite-dev pcscd
   ```
2. Installer les dépendances Python :
   ```bash
   pip3 install -r requirements.txt
   ```

## Lancement

```bash
python app.py
```

Le serveur sera accessible sur `http://localhost:8000`.
Les fichiers du frontend doivent être placés dans le dossier `static/`.
