import React, { useState, useEffect } from 'react';
import AdminGames from './AdminGames';
import { migrateConfig } from './gameModel';
import { loadConfig, saveConfig, isStaticDemo } from './staticDemo';

// ─── Admin ────────────────────────────────────────────────────────────────────
export default function Admin({ onExit }) {
  const [config, setConfig]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('jeux');
  const [lastNfcSeen, setLastNfcSeen] = useState(null);

  useEffect(() => {
    loadConfig()
      .then(raw => { setConfig(migrateConfig(raw)); setLoading(false); })
      .catch(() => setLoading(false));

    let ws = null;
    if (!isStaticDemo) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/nfc`);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'nfc_scan') setLastNfcSeen(data.uid);
        } catch {}
      };
    }
    return () => ws?.close();
  }, []);

  const handleSave = async () => {
    setMessage('Enregistrement…');
    try {
      await saveConfig(config);
      setMessage(isStaticDemo
        ? '💾 Sauvegarde locale navigateur — démo Vercel'
        : '✅ Configuration enregistrée !');
      setTimeout(() => setMessage(''), 3500);
    } catch {
      setMessage("❌ Erreur lors de l'enregistrement");
    }
  };

  if (loading) return <div className="admin-page"><p style={{ padding: '3rem', color: '#636e72' }}>Chargement…</p></div>;
  if (!config)  return <div className="admin-page"><p style={{ padding: '3rem', color: '#d63031' }}>Erreur de chargement.</p></div>;

  const TABS = [
    ['jeux', '🎮 Jeux'],
    ['nfc',  '📡 NFC'],
  ];

  return (
    <div className="admin-page">

      <header className="admin-header">
        <h1 className="admin-title">⚙️ Administration — Défi'Pi</h1>
        <button className="btn btn-secondary" onClick={onExit}>← Retour au jeu</button>
      </header>

      <nav className="admin-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" className={`admin-tab${activeTab === id ? ' admin-tab--active' : ''}`} aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="admin-body">

        {/* ── ONGLET JEUX ── */}
        {activeTab === 'jeux' && (
          <AdminGames config={config} setConfig={setConfig} />
        )}

        {/* ── ONGLET NFC (monitoring + UIDs) ── */}
        {activeTab === 'nfc' && (
          <div className="admin-sections" style={{ maxWidth: 600 }}>
            {isStaticDemo && (
              <div className="builder-restricted-warning" style={{ marginBottom: '0.8rem' }}>
                📡 Mode démo Vercel — le lecteur NFC physique n'est pas disponible.<br />
                Dans le jeu, utilisez le bouton <strong>🔄 Simuler Scan NFC</strong> pour tester les étapes NFC.
              </div>
            )}
            <section className="admin-section">
              <h2>Lecteur NFC — Monitoring</h2>
              <p className="admin-hint">Passez une carte sur le lecteur pour voir son UID en direct.</p>
              <div className={`nfc-monitor ${lastNfcSeen ? 'active' : ''}`}>
                {isStaticDemo
                  ? 'Monitoring NFC désactivé en mode démo.'
                  : <>UID détecté : <strong>{lastNfcSeen || '---'}</strong></>}
              </div>
              <p className="admin-hint" style={{ marginTop: '1rem' }}>
                Pour associer un UID NFC à une étape, éditez le jeu → page NFC → onglet Config → collez l'UID dans "UIDs autorisés".
              </p>
            </section>
          </div>
        )}

      </div>

      <footer className="admin-footer">
        {message && <p className="admin-message">{message}</p>}
        <button type="button" className="btn btn-primary" onClick={handleSave}>💾 Enregistrer tout</button>
      </footer>

    </div>
  );
}
