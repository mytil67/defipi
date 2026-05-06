import React, { useState } from 'react';
import { BlockRenderer } from './BlockRenderer';
import { getThemeStyle } from './gameModel';

// ─── QuizQuestionContent ──────────────────────────────────────────────────────
// Sub-component with its own state so quiz_multiple selections reset per question.
// Rendered with key={questionIdx} by the parent to hard-reset on question change.
function QuizQuestionContent({ q, pageId, previewMode, onAnswer, onInfoAdvance, code, setCode }) {
  const [multiSelected, setMultiSelected] = useState([]);

  const toggleMulti = (opt) => {
    if (previewMode) return;
    setMultiSelected(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const qType = q.type || 'quiz_single';

  if (qType === 'info') {
    return (
      <button className="btn btn-primary" onClick={onInfoAdvance} disabled={previewMode}>
        Continuer →
      </button>
    );
  }

  if (qType === 'quiz_multiple') {
    return (
      <>
        <div className="quiz-multiple-grid" role="group" aria-label="Sélectionne toutes les bonnes réponses">
          {(q.options || []).map((opt, idx) => (
            <button
              key={idx}
              className={`quiz-multiple-option${multiSelected.includes(opt) ? ' quiz-multiple-option--selected' : ''}`}
              onClick={() => toggleMulti(opt)}
              disabled={previewMode}
              aria-pressed={multiSelected.includes(opt)}
            >
              <span className="quiz-multi-check" aria-hidden="true">
                {multiSelected.includes(opt) ? '☑' : '☐'}
              </span>
              {opt}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onAnswer(multiSelected)}
          disabled={previewMode || multiSelected.length === 0}
          style={{ marginTop: '1rem' }}
        >
          ✅ Valider
        </button>
      </>
    );
  }

  if (qType === 'true_false') {
    return (
      <div className="true-false-grid" role="group" aria-label="Vrai ou Faux">
        <button className="btn-quiz btn-quiz--tf" onClick={() => onAnswer('Vrai')} disabled={previewMode}>
          ✅ Vrai
        </button>
        <button className="btn-quiz btn-quiz--tf" onClick={() => onAnswer('Faux')} disabled={previewMode}>
          ❌ Faux
        </button>
      </div>
    );
  }

  if (qType === 'text_answer') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); onAnswer(code); }}>
        <label htmlFor={`q-ta-${pageId}`} className="input-label">Ta réponse :</label>
        <br />
        <input
          id={`q-ta-${pageId}`}
          className="input-code input-code-wide"
          value={previewMode ? '' : code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Tape ici..."
          autoFocus={!previewMode}
          disabled={previewMode}
          spellCheck={false}
        />
        <br />
        <button type="submit" className="btn btn-primary" disabled={previewMode}>✅ Valider</button>
      </form>
    );
  }

  // quiz_single, quiz (legacy), or unknown — grid of option buttons
  return (
    <div className="quiz-grid" role="group" aria-label="Choix de la réponse">
      {(q.options || []).map((opt, idx) => (
        <button key={idx} className="btn-quiz" onClick={() => onAnswer(opt)} disabled={previewMode}>
          <span className="quiz-letter">{String.fromCharCode(65 + idx)}.</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── GamePageRenderer ─────────────────────────────────────────────────────────
// Composant partagé entre le jeu réel et le preview admin.
// Props :
//   page        — objet page issu de game.pages
//   gameState   — { fragments, code, setCode, pagesState, isSimulating, shuffledFragments }
//   callbacks   — { onNext, onAnswer, onTextAnswer, onNfcScan, onFinalCode, onRestart, onBack }
//   previewMode — boolean : rend les boutons et actions inactifs

export default function GamePageRenderer({ page, gameState = {}, callbacks = {}, previewMode = false }) {
  // En mode preview, toutes les actions sont des no-ops
  const safe = (fn) => (...args) => { if (!previewMode && fn) fn(...args); };

  const {
    fragments       = [],
    code            = '',
    setCode         = () => {},
    pagesState      = {},
    isSimulating    = false,
    shuffledFragments = [],
  } = gameState;

  const {
    onNext        = () => {},
    onAnswer      = () => {},
    onTextAnswer  = () => {},
    onNfcScan     = () => {},
    onFinalCode   = () => {},
    onRestart     = () => {},
  } = callbacks;

  if (!page) return null;

  // Utilise les blocs custom si définis, sinon rendu natif
  const hasBlocks = (page.blocks?.length || 0) > 0;

  // stepData pour BlockRenderer (même interface que l'ancienne version)
  const questionIdx = pagesState[page.id]?.questionIdx || 0;
  const currentQ    = page.questions?.[questionIdx] || null;
  const blockStepData = {
    questionText: currentQ?.text || page.content?.headline || '',
    options:      currentQ?.options || [],
    fragments,
    onAnswer:  safe(onAnswer),
    onAction:  safe(onNext),
  };

  if (hasBlocks) {
    return <BlockRenderer blocks={page.blocks} stepData={blockStepData} />;
  }

  // ── Rendu natif selon page.type ────────────────────────────────────────────
  const c = page.content || {};

  switch (page.type) {

    case 'info':
      return (
        <div className="screen-center">
          <span className="step-icon" aria-hidden="true">🚨</span>
          <h2 className="step-title">{c.headline || page.title}</h2>
          {c.alert ? (
            <div className="alert-box">
              {(c.body || '').split('\n').map((line, i) => (
                <p key={i} className="alert-line" dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </div>
          ) : (
            <p className="step-content" style={{ whiteSpace: 'pre-line' }}>{c.body}</p>
          )}
          <button className="btn btn-primary btn-xl" onClick={() => safe(onNext)()} autoFocus={!previewMode}>
            {c.buttonLabel || 'Continuer →'}
          </button>
        </div>
      );

    case 'text_answer':
      return (
        <div>
          <span className="step-icon" aria-hidden="true">🔐</span>
          <h2 className="step-title">{c.headline || page.title}</h2>
          {c.body && <p className="step-content" style={{ whiteSpace: 'pre-line' }}>{c.body}</p>}
          {c.sequence && (
            <strong className="sequence">
              {c.sequence} — <span className="sequence-missing">?</span>
            </strong>
          )}
          <form onSubmit={(e) => { e.preventDefault(); safe(onTextAnswer)(code, page); }}>
            <label htmlFor={`input-${page.id}`} className="input-label">Ta réponse :</label>
            <br />
            <input
              id={`input-${page.id}`}
              className="input-code"
              value={previewMode ? '' : code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="??"
              autoFocus={!previewMode}
              inputMode={c.inputMode || 'text'}
              maxLength={c.maxLength || 20}
              disabled={previewMode}
              aria-label="Champ réponse"
            />
            {c.hint && <p className="hint">{c.hint}</p>}
            <br />
            <button type="submit" className="btn btn-primary" disabled={previewMode}>✅ Valider</button>
          </form>
        </div>
      );

    case 'nfc':
      return (
        <div>
          <span className="step-icon" aria-hidden="true">📡</span>
          <h2 className="step-title">{c.headline || page.title}</h2>
          {c.body && <p className="step-content" style={{ whiteSpace: 'pre-line' }}>{c.body}</p>}
          <div className="nfc-waiting" role="status" aria-live="polite">
            <div className="nfc-anim-wrapper">
              <div className="nfc-ring" aria-hidden="true" />
              <span className="nfc-icon" aria-hidden="true">📶</span>
            </div>
            <span>En attente de la carte…</span>
          </div>
          <div className="sim-zone">
            <button
              className="btn btn-secondary"
              onClick={safe(onNfcScan)}
              disabled={isSimulating || previewMode}
              aria-label={isSimulating ? 'Simulation en cours' : 'Simuler le scan NFC'}
            >
              {isSimulating ? '⏳ Scan en cours…' : '🔄 Simuler Scan NFC'}
            </button>
            <p className="sim-hint">Bouton réservé à l'animateur — test sans carte NFC</p>
          </div>
        </div>
      );

    case 'quiz': {
      const qs = page.questions || [];
      const qIdx = pagesState[page.id]?.questionIdx || 0;
      const q = qs[qIdx] || null;
      if (!q) return <p className="step-content">Aucune question configurée.</p>;
      return (
        <div>
          <span className="step-icon" aria-hidden="true">🔑</span>
          <h2 className="step-title">{c.headline || page.title}</h2>
          {qs.length > 1 && (
            <p className="question-counter">Question {qIdx + 1} / {qs.length}</p>
          )}
          {q.fake_message && (
            <div className="fake-message" role="img" aria-label="Message suspect à analyser">
              <div className="fake-badge">📧 Message reçu</div>
              <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{q.fake_message}</p>
            </div>
          )}
          {q.type !== 'info' && <p className="step-content">{q.text}</p>}
          <QuizQuestionContent
            key={qIdx}
            q={q}
            pageId={page.id}
            previewMode={previewMode}
            onAnswer={(selected) => safe(onAnswer)(selected, page)}
            onInfoAdvance={() => safe(onAnswer)('__info__', page)}
            code={code}
            setCode={setCode}
          />
        </div>
      );
    }

    case 'final_code': {
      const display = shuffledFragments.length > 0 ? shuffledFragments : fragments;
      return (
        <div>
          <span className="step-icon" aria-hidden="true">💻</span>
          <h2 className="step-title">{c.headline || page.title}</h2>
          {c.body && <p className="step-content" style={{ whiteSpace: 'pre-line' }}>{c.body}</p>}
          <div className="fragments-hint" aria-label="Tes fragments (mélangés)">
            {display.length > 0
              ? display.map((f, i) => <span key={i} className="fragment-chip-large">{f}</span>)
              : ['?', '?', '?', '?'].map((_, i) => <span key={i} className="fragment-chip-large" style={{ opacity: 0.3 }}>?</span>)
            }
          </div>
          {c.hint && <p className="hint">{c.hint}</p>}
          <form onSubmit={(e) => { e.preventDefault(); safe(onFinalCode)(code); }}>
            <label htmlFor={`final-${page.id}`} className="input-label">Code (4 chiffres) :</label>
            <br />
            <input
              id={`final-${page.id}`}
              className="input-code"
              value={previewMode ? '' : code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="????"
              autoFocus={!previewMode}
              inputMode="numeric"
              maxLength={4}
              disabled={previewMode}
            />
            <br />
            <button type="submit" className="btn btn-primary btn-xl" disabled={previewMode}>
              {c.buttonLabel || '🔄 Valider le code'}
            </button>
          </form>
        </div>
      );
    }

    case 'victory':
      return (
        <div className="screen-center victory-screen">
          <span className="victory-icon" aria-hidden="true">🏆</span>
          <h1 className="victory">{c.headline || 'Mission accomplie !'}</h1>
          <div className="stars" aria-label="3 étoiles" role="img">⭐⭐⭐</div>
          {c.badge && <div className="victory-badge">{c.badge}</div>}
          {c.body && <p className="step-content" style={{ whiteSpace: 'pre-line' }}>{c.body}</p>}
          {!previewMode && (
            <button className="btn btn-primary btn-xl" onClick={safe(onRestart)} autoFocus>
              🔁 Rejouer
            </button>
          )}
        </div>
      );

    default:
      return (
        <div className="screen-center" style={{ padding: '2rem', textAlign: 'center', gap: '0.75rem' }}>
          <p style={{ color: 'var(--danger-color)', fontSize: '1.1rem' }}>
            ⚠️ Type de page non reconnu : <strong>{page.type || '(non défini)'}</strong>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Cette étape ne peut pas être affichée. Corrige-la depuis l'administration.
          </p>
        </div>
      );
  }
}

// ─── PreviewFrame ─────────────────────────────────────────────────────────────
// Wrapper autonome pour l'aperçu admin : applique le thème de la page.
export function PreviewFrame({ page, style = {} }) {
  const themeStyle = getThemeStyle(page?.theme);
  const dummyState = {
    fragments: ['3', '2'],
    code: '',
    setCode: () => {},
    pagesState: {},
    isSimulating: false,
    shuffledFragments: ['3', '2', '4', '1'],
  };
  return (
    <div className="preview-frame-outer" style={{ ...themeStyle, ...style }}>
      <div className="preview-frame-card">
        <div className="preview-frame-scroll">
          <GamePageRenderer page={page} gameState={dummyState} callbacks={{}} previewMode />
        </div>
      </div>
    </div>
  );
}
