import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Admin from './Admin';
import { BlockRenderer } from './BlockRenderer';

// ─── Thèmes par étape ─────────────────────────────────────────────────────────
const THEME_PRESETS = {
  sombre:   { '--card-bg': '#0f172a', '--primary-color': '#818cf8', '--text-color': '#f8fafc' },
  alerte:   { '--card-bg': '#450a0a', '--primary-color': '#f87171', '--text-color': '#fff1f2' },
  mystere:  { '--card-bg': '#1a0533', '--primary-color': '#a855f7', '--text-color': '#faf5ff' },
  neutre:   { '--card-bg': '#0c1a2e', '--primary-color': '#38bdf8', '--text-color': '#f0f9ff' },
  victoire: { '--card-bg': '#052e16', '--primary-color': '#4ade80', '--text-color': '#f0fdf4' },
};

function getThemeStyle(step, config) {
  const theme = config?.step_themes?.[step];
  if (!theme?.preset) return {};
  if (theme.preset === 'custom') {
    const bg = theme.bg || '#0f172a';
    return {
      '--card-bg': bg,
      '--primary-color': theme.accent || '#818cf8',
      '--text-color': theme.text || '#f8fafc',
      background: bg,
    };
  }
  const preset = THEME_PRESETS[theme.preset];
  if (!preset) return {};
  return { ...preset, background: preset['--card-bg'] };
}

// ─── FeedbackBanner ───────────────────────────────────────────────────────────
function FeedbackBanner({ feedback, onClose }) {
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [feedback, onClose]);
  if (!feedback) return null;
  return (
    <div className={`feedback-banner feedback-${feedback.type}`} role="alert" aria-live="assertive" aria-atomic="true">
      <span className="feedback-icon" aria-hidden="true">{feedback.type === 'error' ? '❌' : '✅'}</span>
      <span className="feedback-text">{feedback.message}</span>
      <button className="feedback-close" onClick={onClose} aria-label="Fermer">✕</button>
    </div>
  );
}

// ─── AccessibilityBar ─────────────────────────────────────────────────────────
function AccessibilityBar({ dyslexic, setDyslexic, highContrast, setHighContrast, fontSize, setFontSize }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a11y-bar">
      <button className="a11y-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="true" aria-label="Options d'accessibilité">
        <span aria-hidden="true">🎨</span>
        <span className="a11y-toggle-label">Aa</span>
      </button>
      {open && (
        <div className="a11y-panel" role="group" aria-label="Réglages d'accessibilité">
          <p className="a11y-panel-title">Affichage</p>
          <button className={`a11y-btn ${dyslexic ? 'active' : ''}`} onClick={() => setDyslexic(d => !d)} aria-pressed={dyslexic}>🔤 Police dyslexie</button>
          <button className={`a11y-btn ${highContrast ? 'active' : ''}`} onClick={() => setHighContrast(h => !h)} aria-pressed={highContrast}>☀️ Fort contraste</button>
          <div role="group" aria-label="Taille du texte">
            <p className="a11y-font-label">Taille :</p>
            <div className="a11y-font-size">
              {[
                { key: 'normal', label: 'A',   aria: 'Normale'     },
                { key: 'large',  label: 'A+',  aria: 'Grande'      },
                { key: 'xlarge', label: 'A++', aria: 'Très grande' },
              ].map(({ key, label, aria }) => (
                <button key={key} className={`a11y-btn size-btn ${fontSize === key ? 'active' : ''}`} onClick={() => setFontSize(key)} aria-pressed={fontSize === key} aria-label={`Taille ${aria}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StepProgress ─────────────────────────────────────────────────────────────
const STEPS_ORDER = ['step1', 'step2', 'step3', 'step4', 'final'];
const STEP_META = {
  step1: { icon: '🔐', label: 'Suite logique' },
  step2: { icon: '📡', label: 'Clé NFC'       },
  step3: { icon: '🔑', label: 'Mot de passe'  },
  step4: { icon: '🕵️', label: 'Phishing'      },
  final: { icon: '💻', label: 'Code final'    },
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
            {i > 0 && <div className={`step-progress-line ${done ? 'done' : ''}`} aria-hidden="true" />}
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

// ─── TransitionOverlay ────────────────────────────────────────────────────────
function TransitionOverlay({ message }) {
  if (!message) return null;
  return (
    <div className="transition-overlay" role="status" aria-live="assertive">
      <div className="transition-box">
        <span className="transition-icon" aria-hidden="true">⚡</span>
        <p className="transition-text">{message}</p>
        <p className="transition-sub">Défi suivant en cours de chargement…</p>
      </div>
    </div>
  );
}

// ─── Fallback questions défi 4 ────────────────────────────────────────────────
const DEFAULT_STEP4_QUESTIONS = [
  {
    id: 1,
    fake_message: "De : cadeaux@super-site.biz\n\nFélicitations ! Tu as gagné un iPad !\nClique ici et donne ton mot de passe scolaire pour recevoir ton cadeau.\nOffre valable 5 minutes seulement !",
    text: "Ce message reçu par e-mail, c'est… ?",
    type: "quiz",
    options: ["Un vrai cadeau de l'école", "Un message dangereux (phishing)", "Une information normale", "Une blague d'un camarade"],
    answer: "Un message dangereux (phishing)",
  },
];

// ─── GameApp ──────────────────────────────────────────────────────────────────
function GameApp({ onAdmin }) {
  const [step, setStep]                 = useState('home');
  const [code, setCode]                 = useState('');
  const [fragments, setFragments]       = useState([]);
  const [lastNfc, setLastNfc]           = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback]         = useState(null);
  const [transition, setTransition]     = useState(null);

  const [dyslexic, setDyslexic]         = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize]         = useState('normal');

  const [config, setConfig] = useState(null);

  const [step3QuestionIdx, setStep3QuestionIdx] = useState(0);
  const [step4QuestionIdx, setStep4QuestionIdx] = useState(0);

  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  const ws = useRef(null);

  const showFeedback  = useCallback((msg, type = 'error') => setFeedback({ message: msg, type }), []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setConfig(d))
      .catch(e => console.error('config fetch error:', e));
  }, []);

  const goNext = useCallback((nextStep, msg) => {
    setTransition(msg);
    setTimeout(() => { setTransition(null); setStep(nextStep); setCode(''); clearFeedback(); }, 2200);
  }, [clearFeedback]);

  const addFragment = useCallback((val, nextStep, msg) => {
    setFragments(prev => [...prev, val]);
    goNext(nextStep, msg);
  }, [goNext]);

  const handleNfcDetection = useCallback((data) => {
    if (stepRef.current !== 'step2') return;
    setLastNfc(data);
  }, []);

  const handleNfcRef = useRef(handleNfcDetection);
  useEffect(() => { handleNfcRef.current = handleNfcDetection; }, [handleNfcDetection]);
  const triggerSimRef = useRef(null);

  const triggerSimulation = useCallback(() => {
    if (isSimulating || stepRef.current !== 'step2') return;
    setIsSimulating(true);
    handleNfcDetection({ uid: 'SIM-SERVEUR', timestamp: new Date().toLocaleTimeString(), simulated: true });
    setTimeout(() => setIsSimulating(false), 2200);
  }, [isSimulating, handleNfcDetection]);

  useEffect(() => { triggerSimRef.current = triggerSimulation; }, [triggerSimulation]);

  // WebSocket + raccourcis clavier — deps vides (pattern ref stable)
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl    = `${protocol}//${window.location.host}/ws/nfc`;
    const connect  = () => {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'nfc_scan') handleNfcRef.current(data);
        } catch {}
      };
      ws.current.onclose = () => setTimeout(connect, 3000);
    };
    connect();

    const onKey = (e) => {
      if (e.repeat) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSimRef.current?.();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        window.location.hash = '#admin';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { ws.current?.close(); window.removeEventListener('keydown', onKey); };
  }, []); // EMPTY DEPS — ne jamais ajouter de dépendances ici

  // Validation NFC
  useEffect(() => {
    if (step !== 'step2' || !lastNfc) return;
    if (lastNfc.simulated) {
      setLastNfc(null); clearFeedback();
      addFragment('2', 'step3', '⚡ Clé serveur validée ! Fragment 2 récupéré !');
      return;
    }
    const allowedUids = config?.step2_nfc_uids || [];
    if (allowedUids.includes(lastNfc.uid)) {
      setLastNfc(null); clearFeedback();
      addFragment('2', 'step3', '⚡ Clé serveur validée ! Fragment 2 récupéré !');
    } else {
      showFeedback('Carte non reconnue — Utilise la carte CLÉ SERVEUR !', 'error');
      setLastNfc(null);
    }
  }, [lastNfc, step, config, showFeedback, clearFeedback, addFragment]);

  const shuffledFragments = useMemo(
    () => step === 'final' ? [...fragments].sort(() => Math.random() - 0.5) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  );

  const resetGame = useCallback(() => {
    setStep('home'); setFragments([]); setCode(''); setLastNfc(null);
    setStep3QuestionIdx(0); setStep4QuestionIdx(0);
    setTransition(null); clearFeedback();
  }, [clearFeedback]);

  // ── Défi 1 ──
  const checkEnigma = useCallback((e) => {
    if (e?.preventDefault) e.preventDefault();
    if (code.trim() === (config?.step1_answer || '32')) {
      addFragment('3', 'step2', "⚡ Code d'accès correct ! Fragment 3 récupéré !");
    } else {
      showFeedback('Pas tout à fait… Observe comment chaque nombre évolue !', 'error');
      setCode('');
    }
  }, [code, config, addFragment, showFeedback]);

  // ── Défi 3 ──
  const checkStep3Answer = useCallback((selected) => {
    const questions = config?.step3_questions || [];
    const q = questions[step3QuestionIdx];
    if (!q) return;
    if (selected.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
      showFeedback('🌟 Bravo, Agent !', 'success');
      if (step3QuestionIdx < questions.length - 1) {
        setTimeout(() => { setStep3QuestionIdx(i => i + 1); setCode(''); clearFeedback(); }, 1200);
      } else {
        setTimeout(() => { clearFeedback(); addFragment('4', 'step4', '⚡ Mot de passe sécurisé ! Fragment 4 récupéré !'); }, 1200);
      }
    } else {
      showFeedback("Ce n'est pas la bonne réponse… Réfléchis encore !", 'error');
      setCode('');
    }
  }, [step3QuestionIdx, config, showFeedback, clearFeedback, addFragment]);

  // ── Défi 4 ──
  const checkStep4Answer = useCallback((selected) => {
    const questions = config?.step4_questions || DEFAULT_STEP4_QUESTIONS;
    const q = questions[step4QuestionIdx];
    if (!q) return;
    if (selected.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
      showFeedback('🌟 Bonne détection, Agent !', 'success');
      if (step4QuestionIdx < questions.length - 1) {
        setTimeout(() => { setStep4QuestionIdx(i => i + 1); setCode(''); clearFeedback(); }, 1200);
      } else {
        setTimeout(() => { clearFeedback(); addFragment('1', 'final', '⚡ Piège déjoué ! Fragment 1 récupéré !'); }, 1200);
      }
    } else {
      showFeedback('Attention ! Ce message cachait un piège !', 'error');
      setCode('');
    }
  }, [step4QuestionIdx, config, showFeedback, clearFeedback, addFragment]);

  // ── Code final ──
  const checkFinalCode = useCallback((e) => {
    if (e?.preventDefault) e.preventDefault();
    const finalCode = config?.final_code || '3241';
    if (code.trim() === finalCode) {
      setStep('victory');
    } else {
      showFeedback("Code incorrect ! Retrouve l'ordre dans lequel tu as collecté les fragments.", 'error');
      setCode('');
    }
  }, [code, config, showFeedback]);

  if (!config) {
    return (
      <div className="loading-screen">
        <span className="loading-icon" aria-hidden="true">💻</span>
        <p>Connexion au serveur…</p>
      </div>
    );
  }

  const rootClasses = [
    'app-container',
    dyslexic     ? 'dyslexic-font' : '',
    highContrast ? 'high-contrast'  : '',
    `font-size-${fontSize}`,
  ].filter(Boolean).join(' ');

  const themeStyle = getThemeStyle(step, config);
  const stepLayout = config.step_layouts?.[step]?.blocks || [];
  const hasLayout  = stepLayout.length > 0;

  const step3Questions = config?.step3_questions || [];
  const step4Questions = config?.step4_questions || DEFAULT_STEP4_QUESTIONS;
  const currentStep3Q  = step3Questions[step3QuestionIdx] || null;
  const currentStep4Q  = step4Questions[step4QuestionIdx] || null;

  // Callbacks fournis au BlockRenderer selon l'étape
  const stepData = ({
    home:     { onAction: () => setStep('briefing'), fragments },
    briefing: { onAction: () => setStep('step1'), fragments },
    step1:    { questionText: `${config.step1_sequence} — ?`, onAction: checkEnigma, fragments },
    step2:    { onAction: triggerSimulation, fragments },
    step3:    { questionText: currentStep3Q?.text, options: currentStep3Q?.options, onAnswer: checkStep3Answer, fragments },
    step4:    { questionText: currentStep4Q?.text, options: currentStep4Q?.options, onAnswer: checkStep4Answer, fragments },
    final:    { onAction: checkFinalCode, fragments: shuffledFragments },
    victory:  { onAction: resetGame, fragments },
  })[step] || {};

  return (
    <div className={rootClasses} style={themeStyle}>
      <TransitionOverlay message={transition} />

      <AccessibilityBar
        dyslexic={dyslexic}       setDyslexic={setDyslexic}
        highContrast={highContrast} setHighContrast={setHighContrast}
        fontSize={fontSize}       setFontSize={setFontSize}
      />
      <FeedbackBanner feedback={feedback} onClose={clearFeedback} />

      {step !== 'home' && step !== 'victory' && (
        <div className="fragments-bar" role="status" aria-live="polite" aria-label={`Fragments récupérés : ${fragments.length} sur 4`}>
          <span className="fragments-label">🧩 Fragments :</span>
          {fragments.map((f, i) => <span key={i} className="fragment-chip" aria-label={`Fragment ${f}`}>{f}</span>)}
          {[...Array(4 - fragments.length)].map((_, i) => <span key={i} className="fragment-placeholder" aria-label="Fragment manquant">?</span>)}
        </div>
      )}

      <StepProgress step={step} />

      <main className="card" role="main">
        <div className="card-scroll">

          {hasLayout ? (
            <BlockRenderer blocks={stepLayout} stepData={stepData} />
          ) : (
            <>
              {/* ── ACCUEIL ── */}
              {step === 'home' && (
                <div className="screen-center">
                  <span className="home-logo" aria-hidden="true">🛡️</span>
                  <h1>Défi<span className="title-accent">'</span>Pi</h1>
                  <p className="tagline">Le serveur de l'école est en danger.<br />Ta mission : le sauver !</p>
                  <button className="btn btn-primary btn-xl" onClick={() => setStep('briefing')} autoFocus>
                    🚀 Lancer Mission 404
                  </button>
                </div>
              )}

              {/* ── BRIEFING ── */}
              {step === 'briefing' && (
                <div className="screen-center">
                  <span className="step-icon" aria-hidden="true">🚨</span>
                  <h2 className="step-title">Mission 404 — Panique au serveur !</h2>
                  <div className="alert-box">
                    <p className="alert-line"><strong>ALERTE ROUGE !</strong> Le serveur de l'école est infecté !</p>
                    <p className="alert-line">Le virus <strong>BUG-404</strong> a tout verrouillé.</p>
                    <p className="alert-line">Pour le relancer, tu dois réunir <strong>4 fragments</strong> secrets.</p>
                    <p className="alert-line">Chaque défi accompli te donnera un fragment.<br />Bonne chance, Agent !</p>
                  </div>
                  <button className="btn btn-primary btn-xl" onClick={() => setStep('step1')} autoFocus>
                    ⚡ Accepter la mission !
                  </button>
                </div>
              )}

              {/* ── DÉFI 1 ── */}
              {step === 'step1' && (
                <div>
                  <span className="step-icon" aria-hidden="true">🔐</span>
                  <h2 className="step-title">Défi 1 — Code d'accès</h2>
                  <p className="step-content">Le serveur exige un code secret.<br />Complète la suite de nombres pour l'obtenir !</p>
                  <strong className="sequence" aria-label={`Suite : ${config.step1_sequence}, point d'interrogation`}>
                    {config.step1_sequence} — <span className="sequence-missing">?</span>
                  </strong>
                  <form onSubmit={checkEnigma}>
                    <label htmlFor="code-d1" className="input-label">Ta réponse :</label>
                    <br />
                    <input id="code-d1" className="input-code" value={code} onChange={e => setCode(e.target.value)} placeholder="??" autoFocus inputMode="numeric" maxLength={4} aria-describedby="hint-d1" />
                    <p id="hint-d1" className="hint">💡 Comment passe-t-on d'un nombre au suivant ?</p>
                    <br />
                    <button type="submit" className="btn btn-primary">✅ Valider</button>
                  </form>
                </div>
              )}

              {/* ── DÉFI 2 ── */}
              {step === 'step2' && (
                <div>
                  <span className="step-icon" aria-hidden="true">📡</span>
                  <h2 className="step-title">Défi 2 — Clé serveur</h2>
                  <p className="step-content">
                    Trouve la carte <strong>"CLÉ SERVEUR"</strong><br />
                    et pose-la sur le lecteur NFC.
                  </p>
                  <div className="nfc-waiting" role="status" aria-live="polite" aria-label="En attente du scan NFC">
                    <div className="nfc-anim-wrapper">
                      <div className="nfc-ring" aria-hidden="true" />
                      <span className="nfc-icon" aria-hidden="true">📶</span>
                    </div>
                    <span>En attente de la carte…</span>
                  </div>
                  <div className="sim-zone">
                    <button
                      className="btn btn-secondary"
                      onClick={triggerSimulation}
                      disabled={isSimulating}
                      aria-label={isSimulating ? 'Simulation en cours' : 'Simuler le scan NFC (test animateur)'}
                    >
                      {isSimulating ? '⏳ Scan en cours…' : '🔄 Simuler Scan NFC'}
                    </button>
                    <p className="sim-hint">Bouton réservé à l'animateur — test sans carte NFC</p>
                  </div>
                </div>
              )}

              {/* ── DÉFI 3 ── */}
              {step === 'step3' && currentStep3Q && (
                <div>
                  <span className="step-icon" aria-hidden="true">🔑</span>
                  <h2 className="step-title">Défi 3 — Mot de passe sécurisé</h2>
                  {step3Questions.length > 1 && (
                    <p className="question-counter">Question {step3QuestionIdx + 1} / {step3Questions.length}</p>
                  )}
                  <p className="step-content">{currentStep3Q.text}</p>
                  {currentStep3Q.type === 'quiz' ? (
                    <div className="quiz-grid" role="group" aria-label="Choix de la réponse">
                      {currentStep3Q.options.map((opt, idx) => (
                        <button key={idx} className="btn-quiz" onClick={() => checkStep3Answer(opt)}>
                          <span className="quiz-letter">{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={e => { e.preventDefault(); checkStep3Answer(code); }}>
                      <label htmlFor="code-d3" className="input-label">Ta réponse :</label>
                      <br />
                      <input id="code-d3" className="input-code input-code-wide" value={code} onChange={e => setCode(e.target.value)} placeholder="Tape ici..." autoFocus spellCheck={false} />
                      <br />
                      <button type="submit" className="btn btn-primary">✅ Valider</button>
                    </form>
                  )}
                </div>
              )}

              {/* ── DÉFI 4 ── */}
              {step === 'step4' && currentStep4Q && (
                <div>
                  <span className="step-icon" aria-hidden="true">🕵️</span>
                  <h2 className="step-title">Défi 4 — Message suspect !</h2>
                  {step4Questions.length > 1 && (
                    <p className="question-counter">Message {step4QuestionIdx + 1} / {step4Questions.length}</p>
                  )}
                  {currentStep4Q.fake_message && (
                    <div className="fake-message" role="img" aria-label="Message suspect à analyser">
                      <div className="fake-badge">📧 Message reçu</div>
                      <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{currentStep4Q.fake_message}</p>
                    </div>
                  )}
                  <p className="step-content">{currentStep4Q.text}</p>
                  {currentStep4Q.type === 'quiz' ? (
                    <div className="quiz-grid" role="group" aria-label="Choix de la réponse">
                      {currentStep4Q.options.map((opt, idx) => (
                        <button key={idx} className="btn-quiz" onClick={() => checkStep4Answer(opt)}>
                          <span className="quiz-letter">{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={e => { e.preventDefault(); checkStep4Answer(code); }}>
                      <label htmlFor="code-d4" className="input-label">Ta réponse :</label>
                      <br />
                      <input id="code-d4" className="input-code input-code-wide" value={code} onChange={e => setCode(e.target.value)} placeholder="Tape ici..." autoFocus spellCheck={false} />
                      <br />
                      <button type="submit" className="btn btn-primary">✅ Valider</button>
                    </form>
                  )}
                </div>
              )}

              {/* ── FINAL ── */}
              {step === 'final' && (
                <div>
                  <span className="step-icon" aria-hidden="true">💻</span>
                  <h2 className="step-title">Redémarrage du serveur !</h2>
                  <p className="step-content">
                    Tu as réuni les <strong>4 fragments</strong>.<br />
                    Entre-les dans l'ordre où tu les as collectés<br />
                    pour former le code de redémarrage !
                  </p>
                  <div className="fragments-hint" aria-label="Tes fragments (mélangés)">
                    {shuffledFragments.map((f, i) => (
                      <span key={i} className="fragment-chip-large" aria-label={`Fragment ${f}`}>{f}</span>
                    ))}
                  </div>
                  <p className="hint">💡 Quel défi as-tu réussi en premier ? En deuxième ?…</p>
                  <form onSubmit={checkFinalCode}>
                    <label htmlFor="code-final" className="input-label">Code de redémarrage (4 chiffres) :</label>
                    <br />
                    <input id="code-final" className="input-code" value={code} onChange={e => setCode(e.target.value)} placeholder="????" autoFocus inputMode="numeric" maxLength={4} aria-describedby="hint-final" />
                    <p id="hint-final" className="hint">Défi 1 → position 1, Défi 2 → position 2, etc.</p>
                    <br />
                    <button type="submit" className="btn btn-primary btn-xl">🔄 REDÉMARRER LE SERVEUR</button>
                  </form>
                </div>
              )}

              {/* ── VICTOIRE ── */}
              {step === 'victory' && (
                <div className="screen-center victory-screen">
                  <span className="victory-icon" aria-hidden="true">🏆</span>
                  <h1 className="victory">SERVEUR SAUVÉ !</h1>
                  <div className="stars" aria-label="3 étoiles sur 3" role="img">⭐⭐⭐</div>
                  <div className="victory-badge">🎖️ Brigade Anti-Bug — Niveau 1</div>
                  <p className="step-content">
                    Félicitations, Agents !<br />
                    Vous avez vaincu le virus <strong>BUG-404</strong><br />
                    et sauvé le serveur de l'école !
                  </p>
                  <button className="btn btn-primary btn-xl" onClick={resetGame} autoFocus>
                    🔁 Rejouer
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {step !== 'home' && step !== 'victory' && (
        <button className="btn-home-link" onClick={resetGame} aria-label="Recommencer depuis le début">
          🏠 Recommencer
        </button>
      )}

      {/* Bouton ⚙ discret sur l'accueil — animateur uniquement */}
      {step === 'home' && (
        <button className="admin-access-btn" onClick={onAdmin} aria-label="Interface administration" title="Administration (Ctrl+Shift+A)">
          ⚙
        </button>
      )}

      {/* Bouton de simulation discret — coin bas droite */}
      <button className="simulate-btn" onClick={triggerSimulation} disabled={isSimulating || step !== 'step2'} aria-hidden="true" tabIndex={-1}>
        Simuler NFC (Ctrl+Shift+S)
      </button>
    </div>
  );
}

// ─── App — routeur hash ────────────────────────────────────────────────────────
function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const exitAdmin = useCallback(() => {
    window.location.hash = '';
    setGameKey(k => k + 1); // remonte GameApp → re-fetch config
  }, []);

  const goAdmin = useCallback(() => {
    window.location.hash = '#admin';
  }, []);

  if (hash === '#admin') return <Admin onExit={exitAdmin} />;
  return <GameApp key={gameKey} onAdmin={goAdmin} />;
}

export default App;
