import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import jsQR from 'jsqr';

// ─── Config (à adapter par l'animateur) ─────────────────────────────────────

// Étape 4 — QR : le QR imprimé dans la salle doit encoder cette chaîne exacte.
// Le code visible sous le QR (pour la saisie manuelle) doit être le même.
const QR_SECRET = 'DEFPI-QR-5';

// Étape 5 — Chasse au trésor : une carte physique est cachée dans la salle.
// Modifie l'énigme et le code secret selon ton installation.
const HUNT_RIDDLE  = 'Je garde les livres et les secrets. Cherche derrière moi, sur l\'étagère du bas.';
const HUNT_SECRET  = 'SERVEUR1'; // code écrit sur la carte cachée (insensible à la casse)

// ─── Bannière de feedback ────────────────────────────────────────────────────
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
      <button className="feedback-close" onClick={onClose} aria-label="Fermer">✕</button>
    </div>
  );
}

// ─── Barre d'accessibilité ───────────────────────────────────────────────────
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
        title="Personnaliser l'affichage"
      >
        <span aria-hidden="true">🎨</span>
        <span className="a11y-toggle-label">Aa</span>
      </button>
      {open && (
        <div className="a11y-panel" role="group" aria-label="Réglages d'accessibilité">
          <p className="a11y-panel-title">Affichage</p>
          <button className={`a11y-btn ${dyslexic ? 'active' : ''}`} onClick={() => setDyslexic(d => !d)} aria-pressed={dyslexic}>
            🔤 Police dyslexie
          </button>
          <button className={`a11y-btn ${highContrast ? 'active' : ''}`} onClick={() => setHighContrast(h => !h)} aria-pressed={highContrast}>
            ☀️ Fort contraste
          </button>
          <div role="group" aria-label="Taille du texte">
            <p className="a11y-font-label">Taille :</p>
            <div className="a11y-font-size">
              {[
                { key: 'normal', label: 'A',   aria: 'Normale'      },
                { key: 'large',  label: 'A+',  aria: 'Grande'       },
                { key: 'xlarge', label: 'A++', aria: 'Très grande'  },
              ].map(({ key, label, aria }) => (
                <button
                  key={key}
                  className={`a11y-btn size-btn ${fontSize === key ? 'active' : ''}`}
                  onClick={() => setFontSize(key)}
                  aria-pressed={fontSize === key}
                  aria-label={`Taille ${aria}`}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Indicateur de progression ───────────────────────────────────────────────
const STEPS_ORDER = ['step1', 'step2', 'step3', 'step4', 'step5', 'final'];
const STEP_META = {
  step1: { icon: '🔐', label: 'Défi 1' },
  step2: { icon: '📡', label: 'Défi 2' },
  step3: { icon: '🔑', label: 'Défi 3' },
  step4: { icon: '📷', label: 'Défi 4' },
  step5: { icon: '🗺️', label: 'Défi 5' },
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

// ─── Scanner QR (webcam USB + jsQR, fallback saisie manuelle) ────────────────
function QRScanner({ onScan }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode]         = useState('starting'); // starting | camera | manual | detected | error
  const [manualCode, setManualCode] = useState('');

  const stopCamera = useCallback(() => {
    if (animRef.current)   cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const scanFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result  = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
    if (result) {
      stopCamera();
      setMode('detected');
      onScan(result.data);
    } else {
      animRef.current = requestAnimationFrame(scanFrame);
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    let mounted = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('manual');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setMode('camera');
          animRef.current = requestAnimationFrame(scanFrame);
        };
      })
      .catch(() => { if (mounted) setMode('manual'); });
    return () => { mounted = false; stopCamera(); };
  }, [scanFrame, stopCamera]);

  const submitManual = (e) => {
    e.preventDefault();
    onScan(manualCode.trim().toUpperCase());
  };

  // Vue caméra
  if (mode === 'starting') {
    return (
      <div className="qr-status" role="status">
        <span className="qr-status-icon" aria-hidden="true">📷</span>
        <p>Activation de la caméra…</p>
      </div>
    );
  }

  if (mode === 'detected') {
    return (
      <div className="qr-status qr-status-ok" role="status" aria-live="polite">
        <span className="qr-status-icon" aria-hidden="true">✅</span>
        <p>QR Code détecté !</p>
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="qr-wrapper" aria-label="Scanner QR Code actif">
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
        <div className="qr-viewfinder">
          <canvas ref={canvasRef} className="qr-canvas" />
          <div className="qr-corners" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <div className="qr-scan-line" aria-hidden="true" />
        </div>
        <p className="qr-hint" role="status" aria-live="polite">Pointe la caméra vers le QR code…</p>
        <button className="qr-switch-btn" onClick={() => { stopCamera(); setMode('manual'); }}>
          ⌨️ Saisir le code manuellement
        </button>
      </div>
    );
  }

  // Mode manuel (pas de webcam, ou choix de l'utilisateur)
  return (
    <div className="qr-manual" role="region" aria-label="Saisie manuelle du code QR">
      <div className="qr-manual-icon" aria-hidden="true">🔍</div>
      <p className="step-content">
        Trouve le QR code caché dans la salle.<br />
        Le code est écrit juste en dessous. Tape-le ici :
      </p>
      <form onSubmit={submitManual}>
        <label htmlFor="qr-manual-input" className="input-label">Code du QR :</label>
        <br />
        <input
          id="qr-manual-input"
          className="input-code input-code-wide"
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          placeholder="ex: DEFPI-QR-5"
          autoFocus
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby="qr-manual-hint"
        />
        <p id="qr-manual-hint" className="hint">
          💡 Le code est imprimé sous le QR code.
        </p>
        <br />
        <button type="submit" className="btn btn-primary">✅ Valider</button>
      </form>
      {navigator.mediaDevices?.getUserMedia && (
        <button className="qr-switch-btn" style={{ marginTop: '1rem' }} onClick={() => setMode('starting')}>
          📷 Utiliser la caméra
        </button>
      )}
    </div>
  );
}

// ─── Chasse au trésor physique ───────────────────────────────────────────────
function TreasureHunt({ onSuccess, showFeedback }) {
  const [phase, setPhase]   = useState('riddle'); // riddle | search | input
  const [secret, setSecret] = useState('');

  const submitSecret = (e) => {
    e.preventDefault();
    if (secret.trim().toUpperCase() === HUNT_SECRET.toUpperCase()) {
      onSuccess();
    } else {
      showFeedback('Ce n\'est pas le bon code… cherche encore !', 'error');
      setSecret('');
    }
  };

  if (phase === 'riddle') {
    return (
      <div className="hunt-container">
        <div className="hunt-riddle-box" role="status" aria-live="polite">
          <span className="hunt-riddle-label" aria-hidden="true">🧩 Énigme</span>
          <p className="hunt-riddle-text">« {HUNT_RIDDLE} »</p>
        </div>
        <p className="step-content">Résous l'énigme, trouve l'endroit, et cherche le code caché !</p>
        <button className="btn btn-primary" onClick={() => setPhase('search')}>
          🏃 Je pars chercher !
        </button>
      </div>
    );
  }

  if (phase === 'search') {
    return (
      <div className="hunt-container">
        <div className="hunt-searching" role="status" aria-live="polite">
          <span className="hunt-search-icon" aria-hidden="true">🔦</span>
          <p>En train de chercher…</p>
          <p className="hint">Rappel : « {HUNT_RIDDLE} »</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPhase('input')}>
          🎯 J'ai trouvé le code !
        </button>
      </div>
    );
  }

  return (
    <div className="hunt-container">
      <div className="hunt-found-icon" aria-hidden="true">📜</div>
      <p className="step-content">Tape le code secret que tu as trouvé :</p>
      <form onSubmit={submitSecret}>
        <label htmlFor="hunt-input" className="input-label">Code secret :</label>
        <br />
        <input
          id="hunt-input"
          className="input-code input-code-wide"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="????????"
          autoFocus
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          aria-describedby="hunt-hint"
        />
        <p id="hunt-hint" className="hint">💡 Tape exactement ce qui est écrit sur la carte.</p>
        <br />
        <button type="submit" className="btn btn-primary">✅ Valider</button>
      </form>
    </div>
  );
}

// ─── Application principale ──────────────────────────────────────────────────
function App() {
  const [step, setStep]         = useState('home');
  const [code, setCode]         = useState('');
  const [fragments, setFragments] = useState([]);
  const [lastNfc, setLastNfc]   = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [dyslexic, setDyslexic]         = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize]         = useState('normal');

  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  const ws = useRef(null);

  const showFeedback  = useCallback((msg, type = 'error') => setFeedback({ message: msg, type }), []);
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

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl    = `${protocol}//${window.location.host}/ws/nfc`;
    const connect  = () => {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'nfc_scan') handleNfcDetection(data);
      };
      ws.current.onclose = () => setTimeout(connect, 3000);
    };
    connect();
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSimulation();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { ws.current?.close(); window.removeEventListener('keydown', onKey); };
  }, [handleNfcDetection, triggerSimulation]);

  useEffect(() => {
    if (step === 'step2' && lastNfc) addFragment('2', 'step3');
  }, [lastNfc, step]);

  // Fragments affichés dans un ordre aléatoire sur l'étape finale
  const shuffledFragments = useMemo(
    () => step === 'final' ? [...fragments].sort(() => Math.random() - 0.5) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  );

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
      showFeedback('Pas tout à fait… Regarde comment chaque nombre évolue !', 'error');
      setCode('');
    }
  };

  const handleQRScan = useCallback((scanned) => {
    if (scanned === QR_SECRET) {
      showFeedback('🎉 Code QR validé ! Fragment récupéré !', 'success');
      setTimeout(() => addFragment('5', 'step5'), 1200);
    } else {
      showFeedback('Ce code n\'est pas le bon, cherche encore !', 'error');
    }
  }, []);

  const handleHuntSuccess = useCallback(() => {
    showFeedback('🌟 Excellent ! Fragment caché trouvé !', 'success');
    setTimeout(() => addFragment('1', 'final'), 1200);
  }, []);

  // Code final : fragments dans l'ordre de collection → '32451'
  const checkFinalCode = (e) => {
    e.preventDefault();
    if (code === '32451') {
      setStep('victory');
    } else {
      showFeedback('Code incorrect ! Souviens-toi de l\'ordre dans lequel tu as réussi les défis.', 'error');
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

  const rootClasses = [
    'app-container',
    dyslexic     ? 'dyslexic-font' : '',
    highContrast ? 'high-contrast'  : '',
    `font-size-${fontSize}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClasses}>
      <AccessibilityBar
        dyslexic={dyslexic}         setDyslexic={setDyslexic}
        highContrast={highContrast} setHighContrast={setHighContrast}
        fontSize={fontSize}         setFontSize={setFontSize}
      />

      <FeedbackBanner feedback={feedback} onClose={clearFeedback} />

      {step !== 'home' && step !== 'victory' && (
        <div
          className="fragments-bar"
          role="status"
          aria-live="polite"
          aria-label={`Fragments récupérés : ${fragments.length} sur 5`}
        >
          <span className="fragments-label">🧩 Fragments :</span>
          {fragments.map((f, i) => (
            <span key={i} className="fragment-chip" aria-label={`Fragment ${f}`}>{f}</span>
          ))}
          {[...Array(5 - fragments.length)].map((_, i) => (
            <span key={i} className="fragment-placeholder" aria-label="Fragment manquant">?</span>
          ))}
        </div>
      )}

      <StepProgress step={step} />

      <main className="card" role="main">
        <div className="card-scroll">

          {/* ── ACCUEIL ── */}
          {step === 'home' && (
            <div>
              <span className="home-logo" aria-hidden="true">🛡️</span>
              <h1>Défi<span className="title-accent">'</span>Pi</h1>
              <p className="tagline">Sauve le serveur en relevant 5 défis !</p>
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
              <div className="alert-box" role="status">
                <p className="step-content">
                  🚨 <strong>ALERTE 404 !</strong> Le serveur de l'école est infecté !<br />
                  Le virus <strong>BUG-404</strong> a tout bloqué.<br />
                  Trouve les <strong>5 fragments</strong> pour relancer le système !
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
                <label htmlFor="code-d1" className="input-label">Ta réponse :</label>
                <br />
                <input
                  id="code-d1"
                  className="input-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="??"
                  autoFocus
                  inputMode="numeric"
                  maxLength={4}
                  aria-describedby="hint-d1"
                />
                <p id="hint-d1" className="hint">💡 Comment passe-t-on d'un nombre au suivant ?</p>
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
              <div className="nfc-waiting" role="status" aria-live="polite" aria-label="En attente du scan NFC">
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
                aria-label={isSimulating ? 'Simulation en cours' : 'Simuler le scan NFC'}
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
                <button className="btn-quiz" onClick={() => showFeedback('Trop court et trop facile à deviner !', 'error')}>
                  A.&nbsp;&nbsp;ecole
                </button>
                <button className="btn-quiz" onClick={() => showFeedback('Trop simple ! Le plus piraté au monde !', 'error')}>
                  B.&nbsp;&nbsp;123456
                </button>
                <button className="btn-quiz" onClick={() => showFeedback('Un mot du dictionnaire, trop risqué !', 'error')}>
                  C.&nbsp;&nbsp;Chocolat
                </button>
                <button
                  className="btn-quiz btn-quiz-success"
                  onClick={() => {
                    showFeedback('🌟 Parfait ! Lettres, chiffres et symboles : imbattable !', 'success');
                    setTimeout(() => addFragment('4', 'step4'), 1600);
                  }}
                >
                  D.&nbsp;&nbsp;Crabe!Violet_27
                </button>
              </div>
            </div>
          )}

          {/* ── DÉFI 4 : QR Code ── */}
          {step === 'step4' && (
            <div>
              <span className="step-icon" aria-hidden="true">📷</span>
              <h2 className="step-title">Défi 4 : Le QR Code caché</h2>
              <p className="step-content">
                Un QR code est caché quelque part dans la salle.<br />
                Trouve-le et scanne-le — ou tape le code imprimé dessous !
              </p>
              <QRScanner onScan={handleQRScan} />
            </div>
          )}

          {/* ── DÉFI 5 : Chasse au trésor ── */}
          {step === 'step5' && (
            <div>
              <span className="step-icon" aria-hidden="true">🗺️</span>
              <h2 className="step-title">Défi 5 : Chasse au trésor</h2>
              <TreasureHunt onSuccess={handleHuntSuccess} showFeedback={showFeedback} />
            </div>
          )}

          {/* ── ÉTAPE FINALE ── */}
          {step === 'final' && (
            <div>
              <span className="step-icon" aria-hidden="true">💻</span>
              <h2 className="step-title">Redémarrage du serveur</h2>
              <p className="step-content">
                Retrouve l'ordre dans lequel tu as collecté les 5 fragments<br />
                pour former le code de redémarrage !
              </p>
              <div className="fragments-hint" aria-label="Tes fragments (dans le désordre)">
                {shuffledFragments.map((f, i) => (
                  <span key={i} className="fragment-chip-large" aria-label={`Fragment ${f}`}>{f}</span>
                ))}
              </div>
              <p className="hint">💡 Dans quel ordre as-tu résolu les défis ?</p>
              <form onSubmit={checkFinalCode}>
                <label htmlFor="code-final" className="input-label">Code (5 chiffres) :</label>
                <br />
                <input
                  id="code-final"
                  className="input-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="?????"
                  autoFocus
                  inputMode="numeric"
                  maxLength={5}
                  aria-describedby="hint-final"
                />
                <p id="hint-final" className="hint">Le fragment du Défi 1 est en 1ère position, etc.</p>
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
              <button className="btn btn-primary" onClick={resetGame} autoFocus>🔁 Rejouer</button>
            </div>
          )}

        </div>
      </main>

      {step !== 'home' && (
        <button className="btn-home-link" onClick={resetGame} aria-label="Retour à l'écran d'accueil">
          🏠 Accueil
        </button>
      )}

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
