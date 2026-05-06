import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Admin from './Admin';
import GamePageRenderer from './GamePageRenderer';
import { migrateConfig, getActiveGames, getGameById, getThemeStyle } from './gameModel';
import { loadConfig, isStaticDemo } from './staticDemo';

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
              {[{ key: 'normal', label: 'A', aria: 'Normale' }, { key: 'large', label: 'A+', aria: 'Grande' }, { key: 'xlarge', label: 'A++', aria: 'Très grande' }].map(({ key, label, aria }) => (
                <button key={key} className={`a11y-btn size-btn ${fontSize === key ? 'active' : ''}`} onClick={() => setFontSize(key)} aria-pressed={fontSize === key} aria-label={`Taille ${aria}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
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

// ─── StepProgress générique ───────────────────────────────────────────────────
const STEP_ICONS = { text_answer: '🔐', nfc: '📡', quiz: '🔑', final_code: '💻' };

function StepProgressGeneric({ pages, pageIdx }) {
  const shown = pages.filter(p => !['info', 'victory'].includes(p.type));
  if (shown.length === 0) return null;
  const currentShownIdx = shown.findIndex(p => p === pages[pageIdx]);
  if (currentShownIdx === -1) return null;
  return (
    <nav className="step-progress" aria-label="Progression">
      {shown.map((p, i) => (
        <React.Fragment key={p.id}>
          {i > 0 && <div className={`step-progress-line ${i <= currentShownIdx ? 'done' : ''}`} aria-hidden="true" />}
          <div className={`step-dot ${i < currentShownIdx ? 'done' : i === currentShownIdx ? 'current' : ''}`} title={p.title}>
            <span aria-hidden="true">{i < currentShownIdx ? '✓' : (STEP_ICONS[p.type] || (i + 1))}</span>
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── GameSelector (écran de choix des missions) ───────────────────────────────
function GameSelector({ games, onSelectGame, onAdmin }) {
  return (
    <div className="game-selector">
      <div className="game-selector-header">
        <span className="home-logo" aria-hidden="true">🛡️</span>
        <h1 className="game-selector-title">Défi<span className="title-accent">'</span>Pi</h1>
        <p className="game-selector-sub">Choisis ta mission, Agent !</p>
      </div>
      <div className="game-cards-grid">
        {games.length === 0 && (
          <p className="game-selector-empty">Aucune mission active.<br />Crée-en une depuis l'administration.</p>
        )}
        {games.map(game => (
          <div key={game.id} className="game-card">
            <div className="game-card-body">
              <h2 className="game-card-title">{game.title}</h2>
              {game.description && <p className="game-card-desc">{game.description}</p>}
              <div className="game-card-meta">
                {game.age      && <span className="game-meta-badge">👥 {game.age}</span>}
                {game.duration && <span className="game-meta-badge">⏱ {game.duration}</span>}
              </div>
            </div>
            <button className="btn btn-primary btn-xl game-card-btn" onClick={() => onSelectGame(game)}>
              🚀 Lancer
            </button>
          </div>
        ))}
      </div>
      <button className="admin-access-btn" onClick={onAdmin} aria-label="Interface administration" title="Administration (Ctrl+Shift+A)">⚙</button>
    </div>
  );
}

// ─── GameApp — moteur générique multi-pages ───────────────────────────────────
function GameApp({ game, onAdmin, onBack }) {
  const [pageIdx, setPageIdx]         = useState(0);
  const [fragments, setFragments]     = useState([]);
  const [code, setCode]               = useState('');
  const [lastNfc, setLastNfc]         = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback]       = useState(null);
  const [transition, setTransition]   = useState(null);
  const [pagesState, setPagesState]   = useState({});

  const [dyslexic, setDyslexic]         = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize]         = useState('normal');

  const currentPage    = game.pages[pageIdx] || game.pages[0];
  const isNfcPage      = currentPage?.type === 'nfc';
  const isVictoryPage  = currentPage?.type === 'victory';

  const isNfcPageRef = useRef(isNfcPage);
  useEffect(() => { isNfcPageRef.current = isNfcPage; }, [isNfcPage]);

  const ws = useRef(null);

  const showFeedback  = useCallback((msg, type = 'error') => setFeedback({ message: msg, type }), []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  const getPageState = useCallback((pageId) => pagesState[pageId] || {}, [pagesState]);
  const setPageState = useCallback((pageId, changes) =>
    setPagesState(prev => ({ ...prev, [pageId]: { ...((prev[pageId]) || {}), ...changes } })),
  []);

  // Navigation
  const goNext = useCallback((msg) => {
    const pages = game.pages; // snapshot pour éviter stale closure dans setTimeout
    const label = typeof msg === 'string' ? msg : null;
    setTransition(label || 'Étape suivante…');
    setTimeout(() => {
      setTransition(null);
      setPageIdx(i => {
        const next = i + 1;
        const nextPage = pages[next];
        console.log('[goNext]', {
          currentIdx: i,
          nextIdx: next,
          currentPageId: pages[i]?.id,
          nextPageId: nextPage?.id,
          nextPageType: nextPage?.type,
        });
        if (next < pages.length) return next;
        const vIdx = pages.findIndex(p => p.type === 'victory');
        if (vIdx > -1) {
          console.log('[goNext] pas de page suivante → victory à index', vIdx);
          return vIdx;
        }
        console.warn('[goNext] pas de page suivante et pas de victory, index inchangé', i);
        return i;
      });
      setCode('');
      clearFeedback();
    }, 2200);
  }, [clearFeedback, game.pages]);

  const addFragmentAndNext = useCallback((fragment, msg) => {
    if (fragment) setFragments(prev => [...prev, fragment]);
    goNext(msg);
  }, [goNext]);

  const resetGame = useCallback(() => {
    setPageIdx(0); setFragments([]); setCode(''); setLastNfc(null);
    setPagesState({}); setTransition(null); clearFeedback();
  }, [clearFeedback]);

  // NFC
  const handleNfcDetection = useCallback((data) => {
    if (!isNfcPageRef.current) return;
    setLastNfc(data);
  }, []);

  const handleNfcRef = useRef(handleNfcDetection);
  useEffect(() => { handleNfcRef.current = handleNfcDetection; }, [handleNfcDetection]);
  const triggerSimRef = useRef(null);

  const triggerSimulation = useCallback(() => {
    if (isSimulating || !isNfcPageRef.current) return;
    setIsSimulating(true);
    handleNfcDetection({ uid: 'SIM-SERVEUR', timestamp: new Date().toLocaleTimeString(), simulated: true });
    setTimeout(() => setIsSimulating(false), 2200);
  }, [isSimulating, handleNfcDetection]);

  useEffect(() => { triggerSimRef.current = triggerSimulation; }, [triggerSimulation]);

  // WebSocket + raccourcis — EMPTY DEPS, pattern ref stable, inchangé
  useEffect(() => {
    if (!isStaticDemo) {
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
    }
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); triggerSimRef.current?.(); }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); window.location.hash = '#admin'; }
    };
    window.addEventListener('keydown', onKey);
    return () => { ws.current?.close(); window.removeEventListener('keydown', onKey); };
  }, []); // EMPTY DEPS — ne jamais modifier

  // Validation NFC
  useEffect(() => {
    if (!isNfcPage || !lastNfc) return;
    if (lastNfc.simulated) {
      setLastNfc(null); clearFeedback();
      addFragmentAndNext(currentPage.fragment, currentPage.successMessage);
      return;
    }
    const allowed = currentPage.accepted_uids || [];
    if (currentPage.accept_any_card || allowed.includes(lastNfc.uid)) {
      setLastNfc(null); clearFeedback();
      addFragmentAndNext(currentPage.fragment, currentPage.successMessage);
    } else {
      showFeedback('Carte non reconnue — utilise la bonne carte !', 'error');
      setLastNfc(null);
    }
  }, [lastNfc, isNfcPage, currentPage, showFeedback, clearFeedback, addFragmentAndNext]);

  // Fragments mélangés pour l'étape final_code
  const shuffledFragments = useMemo(
    () => currentPage?.type === 'final_code' ? [...fragments].sort(() => Math.random() - 0.5) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage?.type],
  );

  // Callbacks transmis à GamePageRenderer
  const callbacks = useMemo(() => ({
    onNext: (msg) => goNext(msg),
    onAnswer: (selected, page) => {
      const qIdx = getPageState(page.id).questionIdx || 0;
      const q    = page.questions?.[qIdx];
      if (!q) return;

      const qType = q.type || 'quiz_single';

      if (qType === 'info') {
        if (qIdx < (page.questions.length - 1)) {
          setPageState(page.id, { questionIdx: qIdx + 1 });
        } else {
          setPageState(page.id, { questionIdx: 0 });
          addFragmentAndNext(page.fragment, page.successMessage);
        }
        return;
      }

      let correct;
      if (qType === 'quiz_multiple') {
        const sortedSel = (Array.isArray(selected) ? selected : []).slice().sort().join('|');
        const sortedAns = (q.answers || []).slice().sort().join('|');
        correct = sortedSel === sortedAns;
      } else {
        correct = String(selected || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
      }

      if (correct) {
        showFeedback('🌟 Bravo, Agent !', 'success');
        if (qIdx < (page.questions.length - 1)) {
          setTimeout(() => { setPageState(page.id, { questionIdx: qIdx + 1 }); setCode(''); clearFeedback(); }, 1200);
        } else {
          setTimeout(() => { clearFeedback(); setPageState(page.id, { questionIdx: 0 }); addFragmentAndNext(page.fragment, page.successMessage); }, 1200);
        }
      } else {
        showFeedback("Ce n'est pas la bonne réponse… Réfléchis encore !", 'error');
        setCode('');
      }
    },
    onTextAnswer: (value, page) => {
      if (value.trim().toLowerCase() === (page.answer || '').trim().toLowerCase()) {
        addFragmentAndNext(page.fragment, page.successMessage);
      } else {
        showFeedback('Pas tout à fait… Observe bien !', 'error');
        setCode('');
      }
    },
    onNfcScan: triggerSimulation,
    onFinalCode: (value) => {
      if (value.trim() === (currentPage.answer || '').trim()) {
        goNext('🎉 Serveur redémarré !');
      } else {
        showFeedback("Code incorrect ! Retrouve l'ordre dans lequel tu as collecté les fragments.", 'error');
        setCode('');
      }
    },
    onRestart: resetGame,
    onBack,
  }), [goNext, getPageState, setPageState, showFeedback, clearFeedback, addFragmentAndNext, triggerSimulation, currentPage, resetGame, onBack]);

  const rootClasses = ['app-container', dyslexic ? 'dyslexic-font' : '', highContrast ? 'high-contrast' : '', `font-size-${fontSize}`].filter(Boolean).join(' ');
  const themeStyle  = getThemeStyle(currentPage?.theme);

  if (!currentPage) {
    return (
      <div className="app-container">
        <div className="screen-center" style={{ padding: '2rem', textAlign: 'center', gap: '1.5rem' }}>
          <p style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>⚠️ Cette mission contient une étape invalide.</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={onBack}>← Retour aux missions</button>
            <button className="btn btn-secondary" onClick={() => { window.location.hash = '#admin'; }}>⚙️ Administration</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClasses} style={themeStyle}>
      <TransitionOverlay message={transition} />
      <AccessibilityBar dyslexic={dyslexic} setDyslexic={setDyslexic} highContrast={highContrast} setHighContrast={setHighContrast} fontSize={fontSize} setFontSize={setFontSize} />
      <FeedbackBanner feedback={feedback} onClose={clearFeedback} />

      {!isVictoryPage && (
        <div className="fragments-bar" role="status" aria-live="polite">
          <span className="fragments-label">🧩 Fragments :</span>
          {fragments.map((f, i) => <span key={i} className="fragment-chip">{f}</span>)}
          {[...Array(Math.max(0, 4 - fragments.length))].map((_, i) => <span key={i} className="fragment-placeholder">?</span>)}
        </div>
      )}

      <StepProgressGeneric pages={game.pages} pageIdx={pageIdx} />

      <main className="card" role="main">
        <div className="card-scroll">
          <GamePageRenderer
            page={currentPage}
            gameState={{ fragments, code, setCode, pagesState, isSimulating, shuffledFragments }}
            callbacks={callbacks}
            previewMode={false}
          />
        </div>
      </main>

      <button className="btn-home-link" onClick={onBack} aria-label="Retour aux missions">
        ← Missions
      </button>

      <button className="simulate-btn" onClick={triggerSimulation} disabled={isSimulating || !isNfcPage} aria-hidden="true" tabIndex={-1}>
        Simuler NFC (Ctrl+Shift+S)
      </button>
    </div>
  );
}

// ─── App — routeur hash + sélecteur de jeux ───────────────────────────────────
function App() {
  const [hash, setHash]                 = useState(window.location.hash);
  const [gameKey, setGameKey]           = useState(0);
  const [config, setConfig]             = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    loadConfig()
      .then(raw => setConfig(migrateConfig(raw)))
      .catch(console.error);
  }, [gameKey]);

  const exitAdmin = useCallback(() => {
    window.location.hash = '';
    setGameKey(k => k + 1);
    setSelectedGameId(null);
  }, []);

  const goAdmin = useCallback(() => { window.location.hash = '#admin'; }, []);

  if (hash === '#admin') return <Admin onExit={exitAdmin} />;

  if (!config) {
    return (
      <div className="loading-screen">
        <span className="loading-icon" aria-hidden="true">💻</span>
        <p>Connexion au serveur…</p>
      </div>
    );
  }

  const activeGames    = getActiveGames(config);
  const selectedGame   = selectedGameId ? getGameById(config, selectedGameId) : null;

  if (selectedGame) {
    return (
      <GameApp
        key={selectedGameId}
        game={selectedGame}
        onAdmin={goAdmin}
        onBack={() => setSelectedGameId(null)}
      />
    );
  }

  return (
    <GameSelector
      games={activeGames}
      onSelectGame={(g) => setSelectedGameId(g.id)}
      onAdmin={goAdmin}
    />
  );
}

export default App;
