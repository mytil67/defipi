import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Bannière de feedback (remplace alert()) ────────────────────────────────
function FeedbackBanner({ feedback, onClose }) {
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [feedback, onClose]);

  if (!feedback) return null;

  return (
    <div
      className={`feedback-banner feedback-${feedback.type}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="feedback-icon" aria-hidden="true">
        {feedback.type === 'error' ? '❌' : '✅'}
      </span>
      <span className="feedback-text">{feedback.message}</span>
      <button
        className="feedback-close"
        onClick={onClose}
        aria-label="Fermer le message"
      >✕</button>
    </div>
  );
}

// ─── Barre d'accessibilité ──────────────────────────────────────────────────
function AccessibilityBar({ dyslexic, setDyslexic, highContrast, setHighContrast, fontSize, setFontSize }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="a11y-bar">
      <button
        className="a11y-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Options d'accessibilité"
        title="Options d'accessibilité"
      >
        ♿
      </button>
      {open && (
        <div className="a11y-panel" role="group" aria-label="Réglages d'accessibilité">
          <p className="a11y-panel-title">Accessibilité</p>

          <button
            className={`a11y-btn ${dyslexic ? 'active' : ''}`}
            onClick={() => setDyslexic(d => !d)}
            aria-pressed={dyslexic}
          >
            🔤 Police dyslexie
          </button>

          <button
            className={`a11y-btn ${highContrast ? 'active' : ''}`}
            onClick={() => setHighContrast(h => !h)}
            aria-pressed={highContrast}
          >
            ☀️ Fort contraste
          </button>

          <div role="group" aria-label="Taille du texte">
            <p className="a11y-font-label">Taille du texte :</p>
            <div className="a11y-font-size">
              {[
                { key: 'normal', label: 'A',   aria: 'Normale' },
                { key: 'large',  label: 'A+',  aria: 'Grande'  },
                { key: 'xlarge', label: 'A++', aria: 'Très grande' },
              ].map(({ key, label, aria }) => (
                <button
                  key={key}
                  className={`a11y-btn size-btn ${fontSize === key ? 'active' : ''}`}
                  onClick={() => setFontSize(key)}
                  aria-pressed={fontSize === key}
                  aria-label={`Taille ${aria}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Indicateur de progression par étapes ──────────────────────────────────
const STEPS_ORDER = ['step1', 'step2', 'step3', 'step4', 'final'];
const STEP_META = {
  step1: { icon: '🔐', label: 'Défi 1' },
  step2: { icon: '📡', label: 'Défi 2' },
  step3: { icon: '🔑', label: 'Défi 3' },
  step4: { icon: '📧', label: 'Défi 4' },
  final: { icon: '💻', label: 'Code'   },
};

function StepProgress({ step }) {
  const currentIdx = STEPS_ORDER.indexOf(step);
  if (currentIdx === -1) return null;

  return (
    <nav className="step-progress" aria-label="Progression de la mission">
      {STEPS_ORDER.map((s, i) => {
        const { icon, label } = STEP_META[s];
        const done    = i < currentIdx;
        const current = i === currentIdx;
        return (
          <React.Fragment key={s}>
            {i > 0 && <div className="step-progress-line" aria-hidden="true" />}
            <div
              className={`step-dot ${done ? 'done' : ''} ${current ? 'current' : ''}`}
              aria-label={`${label} : ${done ? 'terminé' : current ? 'en cours' : 'à faire'}`}
              title={label}
            >
              <span aria-hidden="true">{done ? '✓' : icon}</span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── Application principale ─────────────────────────────────────────────────
function App() {
  const [step, setStep]             = useState('home');
  const [code, setCode]             = useState('');
  const [fragments, setFragments]   = useState([]);
  const [lastNfc, setLastNfc]       = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback]     = useState(null);

  // Préférences d'accessibilité
  const [dyslexic, setDyslexic]         = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize]         = useState('normal');

  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  const ws = useRef(null);

  const showFeedback = useCallback((message, type = 'error') => setFeedback({ message, type }), []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  const handleNfcDetection = useCallback((data) => {
    if (stepRef.current !== 'step2') return;
    setLastNfc(data);
  }, []);

  const triggerSimulation = useCallback(() => {
    if (isSimulating || stepRef.current !== 'step2') return;
    setIsSimulating(true);
    const simData = {
      uid: 'SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toLocaleTimeString(),
    };
    handleNfcDetection(simData);
    fetch('/api/simulate-nfc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: simData.uid }),
    }).catch(() => {});
    setTimeout(() => setIsSimulating(false), 2000);
  }, [isSimulating, handleNfcDetection]);

  // WebSocket NFC + raccourci clavier
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl    = `${protocol}//${window.location.host}/ws/nfc`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'nfc_scan') handleNfcDetection(data);
      };
      ws.current.onclose = () => setTimeout(connect, 3000);
    };
    connect();

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSimulation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (ws.current) ws.current.close();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNfcDetection, triggerSimulation]);

  // Avancer automatiquement après scan NFC
  useEffect(() => {
    if (step === 'step2' && lastNfc) addFragment('2', 'step3');
  }, [lastNfc, step]);

  const addFragment = (val, nextStep) => {
    setFragments(prev => [...prev, val]);
    setStep(nextStep);
    setCode('');
    clearFeedback();
  };

  const checkEnigma = (e) => {
    e.preventDefault();
    if (code === '32') {
      addFragment('3', 'step2');
    } else {
      showFeedback('Pas tout à fait… Regarde comment chaque nombre évolue par rapport au précédent !', 'error');
      setCode('');
    }
  };

  const checkFinalCode = (e) => {
    e.preventDefault();
    if (code === '3241') {
      setStep('victory');
    } else {
      showFeedback('Code incorrect ! Relis bien l\'ordre dans lequel tu as réussi les défis.', 'error');
      setCode('');
    }
  };

  const resetGame = () => {
    setStep('home');
    setFragments([]);
    setCode('');
    setLastNfc(null);
    clearFeedback();
  };

  // Classes CSS selon les préférences d'accessibilité
  const rootClasses = [
    'app-container',
    dyslexic     ? 'dyslexic-font' : '',
    highContrast ? 'high-contrast'  : '',
    `font-size-${fontSize}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClasses}>
      {/* Barre d'accessibilité */}
      <AccessibilityBar
        dyslexic={dyslexic}           setDyslexic={setDyslexic}
        highContrast={highContrast}   setHighContrast={setHighContrast}
        fontSize={fontSize}           setFontSize={setFontSize}
      />

      {/* Bannière de feedback (remplace alert) */}
      <FeedbackBanner feedback={feedback} onClose={clearFeedback} />

      {/* Barre de fragments */}
      {step !== 'home' && step !== 'victory' && (
        <div
          className="fragments-bar"
          role="status"
          aria-label={`Fragments récupérés : ${fragments.length} sur 4`}
          aria-live="polite"
        >
          <span className="fragments-label">🧩 Fragments :</span>
          {fragments.map((f, i) => (
            <span key={i} className="fragment-chip" aria-label={`Fragment ${f}`}>{f}</span>
          ))}
          {[...Array(4 - fragments.length)].map((_, i) => (
            <span key={i} className="fragment-placeholder" aria-label="Fragment manquant">?</span>
          ))}
        </div>
      )}

      {/* Indicateur de progression */}
      <StepProgress step={step} />

      {/* Carte principale */}
      <main className="card" role="main">

        {/* ── ACCUEIL ── */}
        {step === 'home' && (
          <div>
            <span className="home-logo" aria-hidden="true">🛡️</span>
            <h1>Défi<span className="title-accent">'</span>Pi</h1>
            <p className="tagline">Sauve le serveur de l'école en relevant 4 défis !</p>
            <button className="btn btn-primary" onClick={() => setStep('briefing')} autoFocus>
              🚀 Lancer Mission 404
            </button>
          </div>
        )}

        {/* ── BRIEFING ── */}
        {step === 'briefing' && (
          <div>
            <span className="step-icon" aria-hidden="true">📋</span>
            <h2 className="step-title">Mission 404 — Panique au serveur !</h2>
            <div className="alert-box" role="status" aria-live="polite">
              <p className="step-content">
                🚨 <strong>ALERTE 404 !</strong> Le serveur de l'école ne répond plus.<br />
                Le virus <strong>BUG-404</strong> a tout bloqué !<br />
                Réussis les <strong>4 défis</strong> pour sauver le système !
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setStep('step1')} autoFocus>
              ⚡ C'est parti !
            </button>
          </div>
        )}

        {/* ── DÉFI 1 : Suite numérique ── */}
        {step === 'step1' && (
          <div>
            <span className="step-icon" aria-hidden="true">🔐</span>
            <h2 className="step-title">Défi 1 : Le code d'accès</h2>
            <p className="step-content">Complète la suite de nombres :</p>
            <strong className="sequence" aria-label="Suite : 2, 4, 8, 16, point d'interrogation">
              2 — 4 — 8 — 16 — <span className="sequence-missing">?</span>
            </strong>
            <form onSubmit={checkEnigma}>
              <label htmlFor="code-d1" className="input-label">Tape ta réponse ici :</label>
              <br />
              <input
                id="code-d1"
                className="input-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="??"
                autoFocus
                inputMode="numeric"
                maxLength={4}
                aria-describedby="hint-d1"
              />
              <p id="hint-d1" className="hint">
                💡 Regarde comment chaque nombre change par rapport au précédent...
              </p>
              <br />
              <button type="submit" className="btn btn-primary">✅ Valider</button>
            </form>
          </div>
        )}

        {/* ── DÉFI 2 : Scan NFC ── */}
        {step === 'step2' && (
          <div>
            <span className="step-icon" aria-hidden="true">📡</span>
            <h2 className="step-title">Défi 2 : La clé serveur</h2>
            <p className="step-content">
              Trouve la carte NFC <strong>"CLÉ SERVEUR"</strong><br />
              et passe-la sur le lecteur.
            </p>
            <div
              className="nfc-waiting"
              role="status"
              aria-live="polite"
              aria-label="En attente du scan NFC"
            >
              <div className="nfc-anim-wrapper">
                <div className="nfc-ring" aria-hidden="true" />
                <span className="nfc-icon" aria-hidden="true">📶</span>
              </div>
              <span>En attente du scan…</span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={triggerSimulation}
              disabled={isSimulating}
              style={{ marginTop: '1.5rem' }}
              aria-label={isSimulating ? 'Simulation en cours, patiente…' : 'Simuler le scan NFC'}
            >
              {isSimulating ? '⏳ Scan en cours…' : '🔄 Simuler Scan NFC'}
            </button>
          </div>
        )}

        {/* ── DÉFI 3 : Mot de passe ── */}
        {step === 'step3' && (
          <div>
            <span className="step-icon" aria-hidden="true">🔑</span>
            <h2 className="step-title">Défi 3 : Le bon mot de passe</h2>
            <p className="step-content">Quel mot de passe est le plus solide ?</p>
            <div className="quiz-grid" role="group" aria-label="Choix du meilleur mot de passe">
              <button
                className="btn-quiz"
                onClick={() => showFeedback('Trop court et trop facile à deviner !', 'error')}
              >
                A.&nbsp;&nbsp;ecole
              </button>
              <button
                className="btn-quiz"
                onClick={() => showFeedback('Trop simple ! C\'est le mot de passe le plus piraté du monde !', 'error')}
              >
                B.&nbsp;&nbsp;123456
              </button>
              <button
                className="btn-quiz"
                onClick={() => showFeedback('C\'est un mot du dictionnaire, trop risqué pour un mot de passe !', 'error')}
              >
                C.&nbsp;&nbsp;Chocolat
              </button>
              <button
                className="btn-quiz btn-quiz-success"
                onClick={() => {
                  showFeedback('🌟 Parfait ! Lettres, chiffres, majuscules et symboles : imbattable !', 'success');
                  setTimeout(() => addFragment('4', 'step4'), 1600);
                }}
              >
                D.&nbsp;&nbsp;Crabe!Violet_27
              </button>
            </div>
          </div>
        )}

        {/* ── DÉFI 4 : Message suspect ── */}
        {step === 'step4' && (
          <div>
            <span className="step-icon" aria-hidden="true">📧</span>
            <h2 className="step-title">Défi 4 : Le message suspect</h2>
            <div
              className="fake-message"
              role="img"
              aria-label="Message suspect reçu"
            >
              <span className="fake-badge">📩 MESSAGE REÇU</span>
              <p>
                "Bravo ! Tu as gagné une tablette gratuite.<br />
                Clique ici et donne ton mot de passe."
              </p>
            </div>
            <p className="step-content">Que fais-tu ?</p>
            <div className="quiz-grid" role="group" aria-label="Que faire face à ce message suspect">
              <button
                className="btn-quiz"
                onClick={() => showFeedback('⚠️ Attention ! C\'est sûrement un piège. On appelle ça du phishing.', 'error')}
              >
                A. Cliquer vite
              </button>
              <button
                className="btn-quiz"
                onClick={() => showFeedback('🚫 Jamais ! Ton mot de passe est un secret absolu.', 'error')}
              >
                B. Donner mon mot de passe
              </button>
              <button
                className="btn-quiz btn-quiz-success"
                onClick={() => {
                  showFeedback('🌟 Excellent ! Un adulte de confiance peut toujours t\'aider à décider.', 'success');
                  setTimeout(() => addFragment('1', 'final'), 1600);
                }}
              >
                C. Demander à un adulte
              </button>
              <button
                className="btn-quiz"
                onClick={() => showFeedback('😱 Non ! Tes amis risqueraient d\'être piratés aussi.', 'error')}
              >
                D. Envoyer aux amis
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE FINALE : Code de redémarrage ── */}
        {step === 'final' && (
          <div>
            <span className="step-icon" aria-hidden="true">💻</span>
            <h2 className="step-title">Redémarrage du serveur</h2>
            <p className="step-content">
              Remets les <strong>4 fragments</strong> dans l'ordre des défis<br />
              pour former le code final.
            </p>
            <div
              className="fragments-hint"
              aria-label={`Tes fragments : ${fragments.join(', ')}`}
            >
              {fragments.map((f, i) => (
                <span key={i} className="fragment-chip-large" aria-label={`Fragment ${f}`}>{f}</span>
              ))}
            </div>
            <form onSubmit={checkFinalCode}>
              <label htmlFor="code-final" className="input-label">
                Tape le code dans le bon ordre :
              </label>
              <br />
              <input
                id="code-final"
                className="input-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="????"
                autoFocus
                inputMode="numeric"
                maxLength={4}
                aria-describedby="hint-final"
              />
              <p id="hint-final" className="hint">
                💡 Quel défi est venu en premier ? En deuxième ?…
              </p>
              <br />
              <button type="submit" className="btn btn-primary">🔄 REDÉMARRER</button>
            </form>
          </div>
        )}

        {/* ── VICTOIRE ── */}
        {step === 'victory' && (
          <div>
            <span className="victory-icon" aria-hidden="true">🏆</span>
            <h1 className="victory">VICTOIRE !</h1>
            <h2 className="step-title">Mission Réussie !</h2>
            <p className="step-content">
              Votre équipe a sauvé le serveur de l'école !<br />
              🎖️ Titre : <strong>Brigade Anti-Bug niveau 1</strong>
            </p>
            <div className="stars" aria-label="3 étoiles sur 3" role="img">⭐⭐⭐</div>
            <button className="btn btn-primary" onClick={resetGame} autoFocus>
              🔁 Rejouer
            </button>
          </div>
        )}

      </main>

      {/* Retour accueil (toujours visible sauf home) */}
      {step !== 'home' && (
        <button
          className="btn-home-link"
          onClick={resetGame}
          aria-label="Retour à l'écran d'accueil"
        >
          🏠 Accueil
        </button>
      )}

      {/* Bouton simulation discret (développeurs) */}
      <button
        className="simulate-btn"
        onClick={triggerSimulation}
        disabled={isSimulating || step !== 'step2'}
        aria-hidden="true"
        tabIndex={-1}
      >
        Simuler NFC (Ctrl+Shift+S)
      </button>
    </div>
  );
}

export default App;
