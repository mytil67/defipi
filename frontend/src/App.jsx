import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import jsQR from 'jsqr';

// ─── Config ─────────────────────────────────────────────────────────────────
// QR code : le QR imprimé dans la salle doit encoder exactement cette chaîne
const QR_SECRET = 'DEFPI-FRAGMENT-QR-5';

// GPS : coordonnées de la cible (à modifier selon l'emplacement réel)
const GPS_TARGET = { lat: 48.8566, lng: 2.3522 };
const GPS_TOLERANCE_M = 15; // distance en mètres pour valider

// ─── Utilitaires GPS ────────────────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

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
      <button className="feedback-close" onClick={onClose} aria-label="Fermer">
        ✕
      </button>
    </div>
  );
}

// ─── Barre d'accessibilité ──────────────────────────────────────────────────
function AccessibilityBar({
  dyslexic, setDyslexic,
  highContrast, setHighContrast,
  fontSize, setFontSize,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="a11y-bar">
      <button
        className="a11y-toggle"
        onClick={() => setOpen((o) => !o)}
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

          <button
            className={`a11y-btn ${dyslexic ? 'active' : ''}`}
            onClick={() => setDyslexic((d) => !d)}
            aria-pressed={dyslexic}
          >
            🔤 Police dyslexie
          </button>

          <button
            className={`a11y-btn ${highContrast ? 'active' : ''}`}
            onClick={() => setHighContrast((h) => !h)}
            aria-pressed={highContrast}
          >
            ☀️ Fort contraste
          </button>

          <div role="group" aria-label="Taille du texte">
            <p className="a11y-font-label">Taille :</p>
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

// ─── Indicateur de progression ──────────────────────────────────────────────
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

// ─── Scanner QR Code (caméra + jsQR) ────────────────────────────────────────
function QRScanner({ onScan }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const streamRef  = useRef(null);
  const [camError, setCamError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  const stopCamera = useCallback(() => {
    if (animRef.current)  cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
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
    const code    = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code) {
      setDetected(true);
      stopCamera();
      onScan(code.data);
    } else {
      animRef.current = requestAnimationFrame(scanFrame);
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setScanning(true);
          animRef.current = requestAnimationFrame(scanFrame);
        };
      })
      .catch(() => {
        if (mounted) setCamError(true);
      });

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [scanFrame, stopCamera]);

  if (camError) {
    return (
      <div className="qr-error" role="status">
        <span className="qr-error-icon" aria-hidden="true">📵</span>
        <p>La caméra n'est pas accessible.<br/>Demande à l'animateur de valider manuellement.</p>
      </div>
    );
  }

  return (
    <div className="qr-wrapper" aria-label="Scanner QR Code actif">
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <div className="qr-viewfinder">
        <canvas ref={canvasRef} className={`qr-canvas ${detected ? 'qr-detected' : ''}`} />
        {!detected && (
          <div className="qr-corners" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
        )}
        {scanning && !detected && (
          <div className="qr-scan-line" aria-hidden="true" />
        )}
        {detected && (
          <div className="qr-success-overlay" aria-hidden="true">✅</div>
        )}
      </div>
      {scanning && !detected && (
        <p className="qr-hint" role="status" aria-live="polite">
          Pointe la caméra vers le QR code…
        </p>
      )}
    </div>
  );
}

// ─── Défi GPS ────────────────────────────────────────────────────────────────
function GPSChallenge({ onSuccess, showFeedback }) {
  const [pos, setPos]           = useState(null);
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing]   = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS non disponible sur cet appareil.');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        setPos({ lat, lng });
        const dist = haversineDistance(lat, lng, GPS_TARGET.lat, GPS_TARGET.lng);
        setDistance(Math.round(dist));
        setBearing(getBearing(lat, lng, GPS_TARGET.lat, GPS_TARGET.lng));
        setGpsError(null);
      },
      () => setGpsError('Impossible d\'accéder au GPS. Autorise la localisation !'),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const arrived = distance !== null && distance <= GPS_TOLERANCE_M;

  const distanceColor =
    distance === null ? '#94a3b8'
    : distance < 30   ? '#4ade80'
    : distance < 80   ? '#fbbf24'
    :                   '#f87171';

  return (
    <div className="gps-container">
      <div className="gps-target-box" role="status">
        <span className="gps-coord-label">📍 Coordonnées cibles :</span>
        <code className="gps-coords">
          {GPS_TARGET.lat.toFixed(5)}°N &nbsp; {GPS_TARGET.lng.toFixed(5)}°E
        </code>
      </div>

      {gpsError ? (
        <div className="gps-error">
          <p>⚠️ {gpsError}</p>
          <button className="btn btn-secondary" onClick={onSuccess}>
            ✅ Valider (animateur)
          </button>
        </div>
      ) : (
        <>
          {/* Boussole */}
          <div className="gps-compass-wrapper" aria-label={`Direction : ${Math.round(bearing || 0)} degrés`}>
            <div
              className="gps-compass-needle"
              style={{ transform: `rotate(${bearing ?? 0}deg)` }}
              aria-hidden="true"
            >
              🧭
            </div>
          </div>

          {/* Distance */}
          <div
            className="gps-distance"
            role="status"
            aria-live="polite"
            aria-label={`Distance : ${distance ?? '...'} mètres`}
            style={{ color: distanceColor }}
          >
            {distance !== null ? (
              <>
                <span className="gps-dist-number">{distance}</span>
                <span className="gps-dist-unit">mètres</span>
              </>
            ) : (
              <span className="gps-searching">Recherche du signal GPS…</span>
            )}
          </div>

          {/* Barre de progression vers la cible */}
          {distance !== null && (
            <div className="gps-progress-bar" aria-hidden="true">
              <div
                className="gps-progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, ((200 - distance) / 200) * 100))}%`,
                  background: distanceColor,
                }}
              />
            </div>
          )}

          {arrived && (
            <div className="gps-arrived" role="status" aria-live="assertive">
              <p>🎉 Tu es au bon endroit !</p>
              <button className="btn btn-primary" onClick={onSuccess}>
                ✅ Récupérer le fragment !
              </button>
            </div>
          )}

          {pos && !arrived && (
            <p className="gps-current-pos">
              Ta position : {pos.lat.toFixed(5)}°N, {pos.lng.toFixed(5)}°E
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Application principale ─────────────────────────────────────────────────
function App() {
  // États du jeu
  const [step, setStep]           = useState('home');
  const [code, setCode]           = useState('');
  const [fragments, setFragments] = useState([]);
  const [lastNfc, setLastNfc]     = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback]   = useState(null);

  // Préférences d'accessibilité
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

  // WebSocket NFC
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
        e.preventDefault(); triggerSimulation();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { ws.current?.close(); window.removeEventListener('keydown', onKey); };
  }, [handleNfcDetection, triggerSimulation]);

  // Avance automatiquement après scan NFC
  useEffect(() => {
    if (step === 'step2' && lastNfc) addFragment('2', 'step3');
  }, [lastNfc, step]);

  // Fragments mélangés pour l'affichage sur l'étape finale
  const shuffledFragments = useMemo(() => {
    if (step !== 'final') return [];
    return [...fragments].sort(() => Math.random() - 0.5);
  }, [step]); // ne recalcule qu'une fois quand on arrive à 'final'

  const addFragment = (val, nextStep) => {
    setFragments((prev) => [...prev, val]);
    setStep(nextStep);
    setCode('');
    clearFeedback();
  };

  const checkEnigma = (e) => {
    e.preventDefault();
    if (code === '32') {
      addFragment('3', 'step2');
    } else {
      showFeedback('Pas tout à fait… Regarde comment chaque nombre est lié au suivant !', 'error');
      setCode('');
    }
  };

  // Défi 4 : validation QR
  const handleQRScan = useCallback((scannedData) => {
    if (scannedData === QR_SECRET) {
      showFeedback('🎉 QR Code validé ! Fragment récupéré !', 'success');
      setTimeout(() => addFragment('5', 'step5'), 1200);
    } else {
      showFeedback('Ce QR code n\'est pas le bon, cherche encore !', 'error');
    }
  }, []);

  // Défi 5 : validation GPS
  const handleGPSSuccess = useCallback(() => {
    showFeedback('🌟 Tu es au bon endroit ! Fragment récupéré !', 'success');
    setTimeout(() => addFragment('1', 'final'), 1200);
  }, []);

  // Code final : '32451' (ordre de collection des fragments)
  const checkFinalCode = (e) => {
    e.preventDefault();
    if (code === '32451') {
      setStep('victory');
    } else {
      showFeedback('Code incorrect ! Souviens-toi de l\'ordre dans lequel tu as trouvé les fragments.', 'error');
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

  const totalFragments = 5;

  return (
    <div className={rootClasses}>
      <AccessibilityBar
        dyslexic={dyslexic}         setDyslexic={setDyslexic}
        highContrast={highContrast} setHighContrast={setHighContrast}
        fontSize={fontSize}         setFontSize={setFontSize}
      />

      <FeedbackBanner feedback={feedback} onClose={clearFeedback} />

      {/* Barre de fragments */}
      {step !== 'home' && step !== 'victory' && (
        <div
          className="fragments-bar"
          role="status"
          aria-live="polite"
          aria-label={`Fragments récupérés : ${fragments.length} sur ${totalFragments}`}
        >
          <span className="fragments-label">🧩 Fragments :</span>
          {fragments.map((f, i) => (
            <span key={i} className="fragment-chip" aria-label={`Fragment ${f}`}>{f}</span>
          ))}
          {[...Array(totalFragments - fragments.length)].map((_, i) => (
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
              <strong
                className="sequence"
                aria-label="Suite : 2, 4, 8, 16, point d'interrogation"
              >
                2 — 4 — 8 — 16 — <span className="sequence-missing">?</span>
              </strong>
              <form onSubmit={checkEnigma}>
                <label htmlFor="code-d1" className="input-label">Ta réponse :</label>
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
                  💡 Comment passe-t-on d'un nombre au suivant ?
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
                <button
                  className="btn-quiz"
                  onClick={() => showFeedback('Trop court et trop facile à deviner !', 'error')}
                >
                  A.&nbsp;&nbsp;ecole
                </button>
                <button
                  className="btn-quiz"
                  onClick={() => showFeedback('Trop simple ! Le plus piraté au monde !', 'error')}
                >
                  B.&nbsp;&nbsp;123456
                </button>
                <button
                  className="btn-quiz"
                  onClick={() => showFeedback('Un mot du dictionnaire, trop risqué !', 'error')}
                >
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
                Trouve-le et scanne-le avec ta caméra !
              </p>
              <QRScanner onScan={handleQRScan} />
            </div>
          )}

          {/* ── DÉFI 5 : GPS ── */}
          {step === 'step5' && (
            <div>
              <span className="step-icon" aria-hidden="true">🗺️</span>
              <h2 className="step-title">Défi 5 : Chasse au trésor GPS</h2>
              <p className="step-content">
                Un fragment est caché à des coordonnées précises.<br />
                Suis la boussole pour t'y rendre !
              </p>
              <GPSChallenge onSuccess={handleGPSSuccess} showFeedback={showFeedback} />
            </div>
          )}

          {/* ── ÉTAPE FINALE : Code ── */}
          {step === 'final' && (
            <div>
              <span className="step-icon" aria-hidden="true">💻</span>
              <h2 className="step-title">Redémarrage du serveur</h2>
              <p className="step-content">
                Retrouve l'ordre dans lequel tu as collecté les 5 fragments<br />
                pour former le code de redémarrage !
              </p>
              <div
                className="fragments-hint"
                aria-label="Tes fragments (dans le désordre)"
              >
                {shuffledFragments.map((f, i) => (
                  <span key={i} className="fragment-chip-large" aria-label={`Fragment ${f}`}>{f}</span>
                ))}
              </div>
              <p className="hint">💡 Dans quel ordre as-tu résolu les défis ?</p>
              <form onSubmit={checkFinalCode}>
                <label htmlFor="code-final" className="input-label">
                  Tape le code (5 chiffres) :
                </label>
                <br />
                <input
                  id="code-final"
                  className="input-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="?????"
                  autoFocus
                  inputMode="numeric"
                  maxLength={5}
                  aria-describedby="hint-final"
                />
                <p id="hint-final" className="hint">
                  Le fragment du Défi 1 est en 1ère position, le Défi 2 en 2ème…
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

        </div>
      </main>

      {step !== 'home' && (
        <button
          className="btn-home-link"
          onClick={resetGame}
          aria-label="Retour à l'écran d'accueil"
        >
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
