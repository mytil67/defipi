import React, { useState, useEffect } from 'react';
import AdminBuilder from './AdminBuilder';

// ─── Labels et options ───────────────────────────────────────────────────────
const STEP_THEME_LABELS = {
  briefing: 'Briefing',
  step1:    'Défi 1 — Suite logique',
  step2:    'Défi 2 — Scan NFC',
  step3:    'Défi 3 — Mot de passe',
  step4:    'Défi 4 — Phishing',
  final:    'Final — Code',
  victory:  'Victoire',
};

const PRESET_OPTIONS = [
  { value: '',         label: '— Défaut (rendu de base) —' },
  { value: 'sombre',   label: '🌑 Sombre' },
  { value: 'alerte',   label: '🔴 Alerte' },
  { value: 'mystere',  label: '🟣 Mystère' },
  { value: 'neutre',   label: '🔵 Neutre' },
  { value: 'victoire', label: '🟢 Victoire' },
  { value: 'custom',   label: '🎨 Personnalisé…' },
];

// ─── Sous-composant onglet Thèmes ────────────────────────────────────────────
function AdminThemes({ config, setConfig }) {
  const getTheme = (step) => config?.step_themes?.[step] || { preset: '' };

  const setTheme = (step, changes) =>
    setConfig(prev => ({
      ...prev,
      step_themes: { ...(prev.step_themes || {}), [step]: { ...getTheme(step), ...changes } },
    }));

  return (
    <div>
      <p className="admin-hint">
        Ces thèmes modifient les couleurs de la carte pour chaque étape du jeu.<br />
        Si aucun thème n'est défini, le rendu de base (fond bleu nuit) est utilisé.
      </p>

      {Object.entries(STEP_THEME_LABELS).map(([step, label]) => {
        const theme = getTheme(step);
        const isCustom = theme.preset === 'custom';
        return (
          <div key={step} className="theme-row">
            <div className="theme-row-header">
              <span className="theme-step-label">{label}</span>
              <select
                className="theme-preset-select"
                value={theme.preset || ''}
                onChange={e => setTheme(step, { preset: e.target.value })}
              >
                {PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {theme.preset && theme.preset !== 'custom' && (
                <span className={`theme-chip theme-chip--${theme.preset}`} title={theme.preset} />
              )}
            </div>

            {isCustom && (
              <div className="theme-custom-fields">
                {[
                  { key: 'bg',     label: 'Fond',   def: '#0f172a' },
                  { key: 'accent', label: 'Accent', def: '#818cf8' },
                  { key: 'text',   label: 'Texte',  def: '#f8fafc' },
                ].map(({ key, label, def }) => (
                  <div key={key} className="theme-custom-row">
                    <label>{label} :</label>
                    <input
                      type="color"
                      value={theme[key] || def}
                      onChange={e => setTheme(step, { [key]: e.target.value })}
                    />
                    <input
                      type="text"
                      className="theme-hex-input"
                      value={theme[key] || def}
                      onChange={e => setTheme(step, { [key]: e.target.value })}
                      maxLength={9}
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal Admin ────────────────────────────────────────────────
function Admin({ onExit }) {
  const [config, setConfig]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [message, setMessage]         = useState('');
  const [activeTab, setActiveTab]     = useState('mission');
  const [lastNfcSeen, setLastNfcSeen] = useState(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => { setConfig(d); setLoading(false); })
      .catch(() => setLoading(false));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/nfc`);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'nfc_scan') setLastNfcSeen(data.uid);
      } catch {}
    };
    return () => ws.close();
  }, []);

  // ── Helpers config ──
  const patchConfig  = (name, value) => setConfig(prev => ({ ...prev, [name]: value }));
  const handleChange = (e) => patchConfig(e.target.name, e.target.value);
  const patchList    = (key, i, val) => { const l = [...config[key]]; l[i] = val; patchConfig(key, l); };

  // NFC UIDs
  const addNfcUid    = () => patchConfig('step2_nfc_uids', [...(config.step2_nfc_uids || []), lastNfcSeen || '']);
  const removeNfcUid = (i) => patchConfig('step2_nfc_uids', config.step2_nfc_uids.filter((_, j) => j !== i));

  // Step 3 questions
  const addQ3 = () => patchConfig('step3_questions', [
    ...(config.step3_questions || []),
    { id: Date.now(), text: 'Nouvelle question ?', type: 'quiz', options: ['A', 'B', 'C', 'D'], answer: 'D' },
  ]);
  const updateQ3 = (i, f, v) => {
    const qs = [...config.step3_questions]; qs[i] = { ...qs[i], [f]: v };
    patchConfig('step3_questions', qs);
  };
  const removeQ3 = (i) => patchConfig('step3_questions', config.step3_questions.filter((_, j) => j !== i));

  // Step 4 questions (phishing)
  const addQ4 = () => patchConfig('step4_questions', [
    ...(config.step4_questions || []),
    { id: Date.now(), fake_message: 'Contenu du faux message…', text: 'Ce message est… ?', type: 'quiz', options: ['Normal', 'Dangereux (phishing)', 'Vrai', 'Drôle'], answer: 'Dangereux (phishing)' },
  ]);
  const updateQ4 = (i, f, v) => {
    const qs = [...(config.step4_questions || [])]; qs[i] = { ...qs[i], [f]: v };
    patchConfig('step4_questions', qs);
  };
  const removeQ4 = (i) => patchConfig('step4_questions', (config.step4_questions || []).filter((_, j) => j !== i));

  const handleSave = () => {
    setMessage('Enregistrement…');
    fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
      .then(r => r.json())
      .then(() => { setMessage('✅ Configuration enregistrée !'); setTimeout(() => setMessage(''), 3000); })
      .catch(() => setMessage('❌ Erreur lors de l\'enregistrement'));
  };

  // ── Chargement ──
  if (loading) return <div className="admin-page"><p style={{ padding: '3rem', color: '#636e72' }}>Chargement…</p></div>;
  if (!config)  return <div className="admin-page"><p style={{ padding: '3rem', color: '#d63031' }}>Erreur de chargement de la configuration.</p></div>;

  const q3 = config.step3_questions || [];
  const q4 = config.step4_questions || [];

  const TABS = [
    ['mission', '🎮 Mission'],
    ['themes',  '🎨 Thèmes'],
    ['builder', '🏗️ Builder'],
  ];

  return (
    <div className="admin-page">

      {/* ── En-tête ── */}
      <header className="admin-header">
        <h1 className="admin-title">⚙️ Administration — Défi'Pi</h1>
        <button className="btn btn-secondary" onClick={onExit}>← Retour au jeu</button>
      </header>

      {/* ── Onglets ── */}
      <nav className="admin-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            className={`admin-tab${activeTab === id ? ' admin-tab--active' : ''}`}
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Corps ── */}
      <div className="admin-body">

        {/* ════ ONGLET MISSION ════ */}
        {activeTab === 'mission' && (
          <div className="admin-sections">

            <section className="admin-section">
              <h2>Défi 1 — Suite numérique</h2>
              <div className="form-group">
                <label>Séquence affichée :</label>
                <input type="text" name="step1_sequence" value={config.step1_sequence || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Réponse attendue :</label>
                <input type="text" name="step1_answer" value={config.step1_answer || ''} onChange={handleChange} />
              </div>
            </section>

            <section className="admin-section">
              <h2>Défi 2 — Cartes NFC autorisées</h2>
              <p className="hint">Passez une carte sur le lecteur pour voir son UID :</p>
              <div className={`nfc-monitor ${lastNfcSeen ? 'active' : ''}`}>
                UID détecté : <strong>{lastNfcSeen || '---'}</strong>
              </div>
              <div className="uid-list">
                {(config.step2_nfc_uids || []).map((uid, i) => (
                  <div key={i} className="uid-item">
                    <input type="text" value={uid} onChange={e => patchList('step2_nfc_uids', i, e.target.value)} />
                    <button type="button" className="btn-small btn-danger" onClick={() => removeNfcUid(i)}>✕</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-small" onClick={addNfcUid}>+ Ajouter l'UID détecté</button>
            </section>

            <section className="admin-section">
              <h2>Défi 3 — Quiz mot de passe sécurisé</h2>
              {q3.map((q, i) => (
                <div key={q.id} className="question-editor">
                  <div className="form-group">
                    <label>Question {i + 1} :</label>
                    <input type="text" value={q.text} onChange={e => updateQ3(i, 'text', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Type :</label>
                    <select value={q.type} onChange={e => updateQ3(i, 'type', e.target.value)}>
                      <option value="quiz">QCM (4 choix)</option>
                      <option value="text">Texte libre</option>
                    </select>
                  </div>
                  {q.type === 'quiz' && q.options.map((opt, oi) => (
                    <div key={oi} className="opt-item">
                      <span>{String.fromCharCode(65 + oi)}.</span>
                      <input type="text" value={opt} onChange={e => { const o = [...q.options]; o[oi] = e.target.value; updateQ3(i, 'options', o); }} />
                    </div>
                  ))}
                  {q.type === 'quiz' && (
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label>Bonne réponse (texte exact) :</label>
                      <input type="text" value={q.answer} onChange={e => updateQ3(i, 'answer', e.target.value)} />
                    </div>
                  )}
                  {q.type === 'text' && (
                    <div className="form-group">
                      <label>Réponse attendue :</label>
                      <input type="text" value={q.answer} onChange={e => updateQ3(i, 'answer', e.target.value)} />
                    </div>
                  )}
                  <button type="button" className="btn-small btn-danger" onClick={() => removeQ3(i)}>Supprimer cette question</button>
                </div>
              ))}
              <button type="button" className="btn btn-small" onClick={addQ3}>+ Ajouter une question</button>
            </section>

            <section className="admin-section">
              <h2>Défi 4 — Quiz phishing / message suspect</h2>
              {q4.map((q, i) => (
                <div key={q.id} className="question-editor">
                  <div className="form-group">
                    <label>Faux message affiché (le piège) :</label>
                    <textarea rows="4" value={q.fake_message || ''} onChange={e => updateQ4(i, 'fake_message', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Question posée :</label>
                    <input type="text" value={q.text} onChange={e => updateQ4(i, 'text', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Type :</label>
                    <select value={q.type} onChange={e => updateQ4(i, 'type', e.target.value)}>
                      <option value="quiz">QCM (4 choix)</option>
                      <option value="text">Texte libre</option>
                    </select>
                  </div>
                  {q.type === 'quiz' && (q.options || []).map((opt, oi) => (
                    <div key={oi} className="opt-item">
                      <span>{String.fromCharCode(65 + oi)}.</span>
                      <input type="text" value={opt} onChange={e => { const o = [...q.options]; o[oi] = e.target.value; updateQ4(i, 'options', o); }} />
                    </div>
                  ))}
                  {q.type === 'quiz' && (
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label>Bonne réponse (texte exact) :</label>
                      <input type="text" value={q.answer} onChange={e => updateQ4(i, 'answer', e.target.value)} />
                    </div>
                  )}
                  {q.type === 'text' && (
                    <div className="form-group">
                      <label>Réponse attendue :</label>
                      <input type="text" value={q.answer} onChange={e => updateQ4(i, 'answer', e.target.value)} />
                    </div>
                  )}
                  <button type="button" className="btn-small btn-danger" onClick={() => removeQ4(i)}>Supprimer</button>
                </div>
              ))}
              <button type="button" className="btn btn-small" onClick={addQ4}>+ Ajouter un message piège</button>
            </section>

            <section className="admin-section">
              <h2>Code de redémarrage final</h2>
              <div className="form-group">
                <label>Code attendu (4 chiffres) :</label>
                <input
                  type="text" name="final_code"
                  value={config.final_code || '3241'}
                  onChange={handleChange}
                  maxLength={10}
                  style={{ maxWidth: '200px' }}
                />
              </div>
              <p className="hint">Défi 1→fragment 3, Défi 2→2, Défi 3→4, Défi 4→1 → code <strong>3241</strong></p>
            </section>

          </div>
        )}

        {/* ════ ONGLET THÈMES ════ */}
        {activeTab === 'themes' && (
          <div className="admin-sections">
            <AdminThemes config={config} setConfig={setConfig} />
          </div>
        )}

        {/* ════ ONGLET BUILDER ════ */}
        {activeTab === 'builder' && (
          <AdminBuilder config={config} setConfig={setConfig} />
        )}

      </div>

      {/* ── Pied de page sticky ── */}
      <footer className="admin-footer">
        {message && <p className="admin-message">{message}</p>}
        <button type="button" className="btn btn-primary" onClick={handleSave}>💾 Enregistrer tout</button>
      </footer>

    </div>
  );
}

export default Admin;
