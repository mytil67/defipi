import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PreviewFrame } from './GamePageRenderer';
import { newBlankPage, PAGE_TYPE_LABELS, THEME_PRESETS, QUESTION_TYPE_LABELS } from './gameModel';

const BLOCK_TYPES = {
  text:     '📝 Texte',
  image:    '🖼️ Image',
  question: '❓ Question',
  choices:  '🔘 Choix',
  button:   '🔲 Bouton',
  fragment: '🧩 Fragments',
};

const PRESET_OPTIONS = [
  { value: '',         label: '— Défaut —' },
  { value: 'sombre',   label: '🌑 Sombre' },
  { value: 'alerte',   label: '🔴 Alerte' },
  { value: 'mystere',  label: '🟣 Mystère' },
  { value: 'neutre',   label: '🔵 Neutre' },
  { value: 'victoire', label: '🟢 Victoire' },
  { value: 'custom',   label: '🎨 Personnalisé…' },
];

// ── Item de page triable ────────────────────────────────────────────────────────
function SortablePageItem({ page, index, isActive, pagesCount, onSelect, onMoveUp, onMoveDown, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`agb-page-item ${isActive ? 'agb-page-item--active' : ''}`}
    >
      <span className="agb-drag-handle" {...attributes} {...listeners} title="Déplacer">⠿</span>
      <div className="agb-page-item-row" onClick={onSelect}>
        <span className="agb-page-type-tag">{PAGE_TYPE_LABELS[page.type]?.split(' ')[0]}</span>
        <span className="agb-page-name">{page.title}</span>
      </div>
      <div className="agb-page-item-btns" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onMoveUp} disabled={index === 0} title="Monter">↑</button>
        <button type="button" onClick={onMoveDown} disabled={index === pagesCount - 1} title="Descendre">↓</button>
        <button type="button" className="builder-btn-del" onClick={onDelete} title="Supprimer">✕</button>
      </div>
    </div>
  );
}

// ── Item de bloc triable ────────────────────────────────────────────────────────
function SortableBlockItem({ block, index, blocksCount, isEditing, onToggleEdit, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`builder-block ${isEditing ? 'builder-block--active' : ''}`}
    >
      <div className="builder-block-header" onClick={onToggleEdit}>
        <span
          className="agb-drag-handle"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          title="Déplacer"
        >⠿</span>
        <span className="builder-block-icon">{BLOCK_TYPES[block.type] || block.type}</span>
        <span className="builder-block-preview">{block.content?.slice(0, 35) || '—'}</span>
        <div className="builder-block-btns" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={onMoveUp} disabled={index === 0}>↑</button>
          <button type="button" onClick={onMoveDown} disabled={index === blocksCount - 1}>↓</button>
          <button type="button" className="builder-btn-del" onClick={onRemove}>✕</button>
        </div>
      </div>
      {isEditing && (
        <div className="builder-block-form">
          <div className="bf-row">
            <label>Type</label>
            <select value={block.type} onChange={e => onUpdate({ type: e.target.value })}>
              {Object.entries(BLOCK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {!['choices', 'fragment'].includes(block.type) && (
            <div className="bf-row">
              <label>Contenu</label>
              <textarea rows="3" value={block.content || ''} onChange={e => onUpdate({ content: e.target.value })} />
            </div>
          )}
          {block.type === 'image' && (
            <div className="bf-row">
              <label>URL image</label>
              <input type="url" value={block.options?.url || ''} onChange={e => onUpdate({ options: { ...block.options, url: e.target.value } })} placeholder="https://..." />
            </div>
          )}
          <div className="bf-row bf-row-2">
            <div>
              <label>Position</label>
              <select value={block.align || 'center'} onChange={e => onUpdate({ align: e.target.value })}>
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>
            <div>
              <label>Largeur</label>
              <select value={block.size || 'full'} onChange={e => onUpdate({ size: e.target.value })}>
                <option value="small">Petit 25%</option>
                <option value="medium">Moyen 50%</option>
                <option value="large">Grand 75%</option>
                <option value="full">Plein 100%</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdminGameBuilder ─────────────────────────────────────────────────────────
export default function AdminGameBuilder({ game, onUpdate, onBack }) {
  const [selectedPageId, setSelectedPageId] = useState(game.pages[0]?.id || null);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [activeSection, setActiveSection]   = useState('blocks');

  const pages       = game.pages;
  const currentPage = pages.find(p => p.id === selectedPageId) || pages[0];

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Helpers pages ──────────────────────────────────────────────────────────
  const patchGame  = (changes) => onUpdate({ ...game, ...changes });
  const patchPages = (updater) => patchGame({ pages: updater(pages) });

  const patchPage = (pageId, changes) =>
    patchPages(ps => ps.map(p => p.id === pageId ? { ...p, ...changes } : p));

  const patchPageContent = (pageId, changes) =>
    patchPage(pageId, { content: { ...(pages.find(p => p.id === pageId)?.content || {}), ...changes } });

  const addPage = (type) => {
    const np = newBlankPage(type);
    patchPages(ps => {
      const vIdx = ps.findIndex(p => p.type === 'victory');
      const arr  = [...ps];
      if (vIdx > -1) arr.splice(vIdx, 0, np);
      else arr.push(np);
      return arr;
    });
    setSelectedPageId(np.id);
  };

  const deletePage = (pageId) => {
    if (!window.confirm('Supprimer cette page ?')) return;
    const remaining = pages.filter(p => p.id !== pageId);
    patchPages(() => remaining);
    setSelectedPageId(remaining[0]?.id || null);
    setEditingBlockId(null);
  };

  const movePage = (pageId, dir) => {
    const idx  = pages.findIndex(p => p.id === pageId);
    const swap = idx + dir;
    if (swap < 0 || swap >= pages.length) return;
    const next = [...pages];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    patchPages(() => next);
  };

  const handlePagesDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = pages.findIndex(p => p.id === active.id);
    const newIdx = pages.findIndex(p => p.id === over.id);
    patchPages(() => arrayMove(pages, oldIdx, newIdx));
  };

  // ── Helpers blocs ──────────────────────────────────────────────────────────
  const getBlocks = () => [...(currentPage?.blocks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const setBlocks = (blocks) => patchPage(currentPage.id, { blocks });

  const addBlock = () => {
    const bs = getBlocks();
    const nb = { id: `b${Date.now()}`, type: 'text', content: 'Nouveau texte', align: 'center', size: 'full', order: bs.length, options: {} };
    setBlocks([...bs, nb]);
    setEditingBlockId(nb.id);
  };

  const removeBlock = (id) => { setBlocks(getBlocks().filter(b => b.id !== id)); if (editingBlockId === id) setEditingBlockId(null); };
  const updateBlock = (id, changes) => setBlocks(getBlocks().map(b => b.id === id ? { ...b, ...changes } : b));

  const moveBlock = (id, dir) => {
    const bs  = getBlocks();
    const idx = bs.findIndex(b => b.id === id);
    const sw  = idx + dir;
    if (sw < 0 || sw >= bs.length) return;
    const nx = [...bs];
    [nx[idx].order, nx[sw].order] = [nx[sw].order, nx[idx].order];
    setBlocks(nx);
  };

  const clearBlocks = () => { if (!window.confirm('Vider les blocs de cette page ?')) return; setBlocks([]); setEditingBlockId(null); };

  const handleBlocksDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const bs = getBlocks();
    const oldIdx = bs.findIndex(b => b.id === active.id);
    const newIdx = bs.findIndex(b => b.id === over.id);
    setBlocks(arrayMove(bs, oldIdx, newIdx).map((b, i) => ({ ...b, order: i })));
  };

  // ── Helpers quiz ──────────────────────────────────────────────────────────
  const patchQuestion = (qId, changes) =>
    patchPage(currentPage.id, {
      questions: (currentPage.questions || []).map(q => q.id === qId ? { ...q, ...changes } : q),
    });

  const patchOption = (qId, idx, val) =>
    patchPage(currentPage.id, {
      questions: (currentPage.questions || []).map(q => {
        if (q.id !== qId) return q;
        const opts = [...(q.options || [])];
        const old  = opts[idx];
        opts[idx]  = val;
        // Sync answer/answers when option text changes
        return {
          ...q,
          options:  opts,
          answer:   q.answer === old ? val : q.answer,
          answers:  (q.answers || []).map(a => a === old ? val : a),
        };
      }),
    });

  const addOption = (qId) =>
    patchPage(currentPage.id, {
      questions: (currentPage.questions || []).map(q =>
        q.id === qId ? { ...q, options: [...(q.options || []), 'Nouveau choix'] } : q
      ),
    });

  const removeOption = (qId, idx) =>
    patchPage(currentPage.id, {
      questions: (currentPage.questions || []).map(q => {
        if (q.id !== qId) return q;
        const removed = q.options?.[idx];
        const opts    = (q.options || []).filter((_, i) => i !== idx);
        return {
          ...q,
          options: opts,
          answer:  q.answer === removed ? (opts[0] || '') : q.answer,
          answers: (q.answers || []).filter(a => a !== removed),
        };
      }),
    });

  const addQuestion = () =>
    patchPage(currentPage.id, {
      questions: [...(currentPage.questions || []), {
        id: Date.now(), type: 'quiz_single', text: 'Nouvelle question ?',
        options: ['Option A', 'Option B'], answer: 'Option A',
      }],
    });

  const removeQuestion = (qId) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    patchPage(currentPage.id, { questions: (currentPage.questions || []).filter(q => q.id !== qId) });
  };

  const changeQuestionType = (q, newType) => {
    const base = { type: newType };
    if (newType === 'true_false') {
      base.options = ['Vrai', 'Faux'];
      base.answer  = 'Vrai';
      base.answers = undefined;
    } else if (newType === 'quiz_multiple') {
      base.options = q.options?.length ? q.options : ['Option A', 'Option B'];
      base.answers = [];
      base.answer  = undefined;
    } else if (newType === 'quiz_single') {
      base.options = q.options?.length ? q.options : ['Option A', 'Option B'];
      base.answer  = q.answer || (q.options?.[0] ?? 'Option A');
      base.answers = undefined;
    } else if (newType === 'text_answer') {
      base.answer  = q.answer || '';
      base.answers = undefined;
    } else if (newType === 'info') {
      base.answer  = undefined;
      base.answers = undefined;
    }
    patchQuestion(q.id, base);
  };

  const blocks    = getBlocks();
  const hasBlocks = blocks.length > 0;

  if (!currentPage) return <p className="admin-hint">Aucune page. Ajoutez-en une.</p>;

  // ── Éditeur d'une question quiz ─────────────────────────────────────────────
  const renderQuestionEditor = (q, qi) => {
    const qType    = q.type || 'quiz_single';
    const isMulti  = qType === 'quiz_multiple';
    const isTF     = qType === 'true_false';
    const isText   = qType === 'text_answer';
    const isInfo   = qType === 'info';
    const hasOpts  = ['quiz_single', 'quiz', 'quiz_multiple'].includes(qType);

    return (
      <div key={q.id} style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '0.6rem', marginBottom: '0.5rem' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <strong style={{ fontSize: '0.8rem', opacity: 0.65 }}>Q{qi + 1}</strong>
          <button type="button" className="builder-btn-del" onClick={() => removeQuestion(q.id)}>✕</button>
        </div>

        {/* Type */}
        <div className="bf-row">
          <label>Type</label>
          <select value={qType} onChange={e => changeQuestionType(q, e.target.value)}>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Texte de la question */}
        <div className="bf-row">
          <label>{isInfo ? 'Titre' : 'Question'}</label>
          <textarea rows="2" value={q.text || ''} onChange={e => patchQuestion(q.id, { text: e.target.value })} />
        </div>

        {/* Corps info */}
        {isInfo && (
          <div className="bf-row">
            <label>Corps du texte</label>
            <textarea rows="3" value={q.body || ''} onChange={e => patchQuestion(q.id, { body: e.target.value })} />
          </div>
        )}

        {/* Choix (quiz_single / quiz_multiple / legacy quiz) */}
        {hasOpts && (
          <div className="bf-row">
            <label>
              Choix{' '}
              <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>
                {isMulti ? '(☑ = bonnes réponses)' : '(● = bonne réponse)'}
              </span>
            </label>
            {(q.options || []).map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                {isMulti ? (
                  <input
                    type="checkbox"
                    checked={(q.answers || []).includes(opt)}
                    onChange={e => {
                      const cur = q.answers || [];
                      patchQuestion(q.id, { answers: e.target.checked ? [...cur, opt] : cur.filter(a => a !== opt) });
                    }}
                  />
                ) : (
                  <input
                    type="radio"
                    name={`q-ans-${q.id}`}
                    checked={q.answer === opt}
                    onChange={() => patchQuestion(q.id, { answer: opt })}
                  />
                )}
                <input type="text" value={opt} onChange={e => patchOption(q.id, idx, e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="builder-btn-del" onClick={() => removeOption(q.id, idx)} disabled={(q.options || []).length <= 1}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-small" style={{ marginTop: '0.25rem' }} onClick={() => addOption(q.id)}>+ Choix</button>
          </div>
        )}

        {/* Vrai/Faux */}
        {isTF && (
          <div className="bf-row">
            <label>Bonne réponse</label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {['Vrai', 'Faux'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`tf-${q.id}`}
                    checked={q.answer === v}
                    onChange={() => patchQuestion(q.id, { answer: v, options: ['Vrai', 'Faux'] })}
                  />
                  {v === 'Vrai' ? '✅ Vrai' : '❌ Faux'}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Réponse texte */}
        {isText && (
          <div className="bf-row">
            <label>Réponse attendue</label>
            <input type="text" value={q.answer || ''} onChange={e => patchQuestion(q.id, { answer: e.target.value })} />
          </div>
        )}

        {/* Explication + phishing (sauf info) */}
        {!isInfo && (
          <>
            <div className="bf-row">
              <label>Explication <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>(optionnel)</span></label>
              <input type="text" value={q.explanation || ''} onChange={e => patchQuestion(q.id, { explanation: e.target.value })} placeholder="Affiché après la réponse" />
            </div>
            <div className="bf-row">
              <label>Message phishing <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>(optionnel)</span></label>
              <textarea rows="2" value={q.fake_message || ''} onChange={e => patchQuestion(q.id, { fake_message: e.target.value })} placeholder="Laisse vide si non utilisé" />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="agb-container">

      {/* ── Colonne gauche ── */}
      <div className="agb-left">

        <button type="button" className="btn-link-danger agb-back" onClick={onBack}>← Retour aux jeux</button>
        <h3 className="agb-game-title">{game.title}</h3>

        {/* Liste des pages — DnD */}
        <div className="agb-section-title">Pages du jeu</div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePagesDragEnd}>
          <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="agb-pages-list">
              {pages.map((p, i) => (
                <SortablePageItem
                  key={p.id}
                  page={p}
                  index={i}
                  isActive={p.id === currentPage.id}
                  pagesCount={pages.length}
                  onSelect={() => { setSelectedPageId(p.id); setEditingBlockId(null); }}
                  onMoveUp={() => movePage(p.id, -1)}
                  onMoveDown={() => movePage(p.id, +1)}
                  onDelete={() => deletePage(p.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Ajouter une page */}
        <div className="agb-add-page">
          <span className="agb-section-title">Ajouter une page</span>
          <div className="agb-add-page-types">
            {Object.entries(PAGE_TYPE_LABELS).map(([type, label]) => (
              <button key={type} type="button" className="agb-add-type-btn" onClick={() => addPage(type)}>{label}</button>
            ))}
          </div>
        </div>

        {/* Onglets d'édition */}
        <div className="agb-section-tabs">
          {[['blocks', '🔲 Blocs'], ['theme', '🎨 Thème'], ['page-meta', '⚙️ Config']].map(([id, label]) => (
            <button key={id} type="button" className={`agb-section-tab ${activeSection === id ? 'agb-section-tab--active' : ''}`} onClick={() => setActiveSection(id)}>{label}</button>
          ))}
        </div>

        {/* ── Section Blocs ── */}
        {activeSection === 'blocks' && (
          <div className="agb-blocks-editor">
            <div className={`builder-status ${hasBlocks ? 'builder-status--active' : ''}`} style={{ margin: '0 0 0.5rem' }}>
              {hasBlocks
                ? `⚠️ ${blocks.length} bloc${blocks.length > 1 ? 's' : ''} actif${blocks.length > 1 ? 's' : ''}. Rendu natif remplacé.`
                : '💡 Rendu natif actif. Ajoutez un bloc pour personnaliser.'}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlocksDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="builder-blocks-list">
                  {blocks.length === 0 && <p className="builder-empty">Aucun bloc</p>}
                  {blocks.map((block, idx) => (
                    <SortableBlockItem
                      key={block.id}
                      block={block}
                      index={idx}
                      blocksCount={blocks.length}
                      isEditing={editingBlockId === block.id}
                      onToggleEdit={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                      onUpdate={(changes) => updateBlock(block.id, changes)}
                      onRemove={() => removeBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, -1)}
                      onMoveDown={() => moveBlock(block.id, +1)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-small builder-add-btn" onClick={addBlock}>+ Ajouter un bloc</button>
              {hasBlocks && <button type="button" className="btn-link-danger" onClick={clearBlocks}>↩ Retour natif</button>}
            </div>
          </div>
        )}

        {/* ── Section Thème ── */}
        {activeSection === 'theme' && (
          <div className="agb-theme-editor">
            <div className="bf-row">
              <label>Preset de couleurs</label>
              <select
                value={currentPage.theme?.preset || ''}
                onChange={e => patchPage(currentPage.id, { theme: { ...(currentPage.theme || {}), preset: e.target.value } })}
              >
                {PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {currentPage.theme?.preset === 'custom' && (
              <div className="theme-custom-fields" style={{ marginTop: '0.5rem' }}>
                {[{ key: 'bg', label: 'Fond', def: '#0f172a' }, { key: 'accent', label: 'Accent', def: '#818cf8' }, { key: 'text', label: 'Texte', def: '#f8fafc' }].map(({ key, label, def }) => (
                  <div key={key} className="theme-custom-row">
                    <label>{label} :</label>
                    <input type="color" value={currentPage.theme?.[key] || def} onChange={e => patchPage(currentPage.id, { theme: { ...currentPage.theme, [key]: e.target.value } })} />
                    <input type="text" className="theme-hex-input" value={currentPage.theme?.[key] || def} onChange={e => patchPage(currentPage.id, { theme: { ...currentPage.theme, [key]: e.target.value } })} maxLength={9} spellCheck={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Section Config page ── */}
        {activeSection === 'page-meta' && (
          <div className="agb-meta-editor">
            <div className="bf-row">
              <label>Titre de la page</label>
              <input type="text" value={currentPage.title || ''} onChange={e => patchPage(currentPage.id, { title: e.target.value })} />
            </div>
            <div className="bf-row">
              <label>Titre affiché (headline)</label>
              <input type="text" value={currentPage.content?.headline || ''} onChange={e => patchPageContent(currentPage.id, { headline: e.target.value })} />
            </div>
            {['info', 'final_code'].includes(currentPage.type) && (
              <div className="bf-row">
                <label>Corps du texte</label>
                <textarea rows="4" value={currentPage.content?.body || ''} onChange={e => patchPageContent(currentPage.id, { body: e.target.value })} />
              </div>
            )}
            {currentPage.type === 'info' && (
              <>
                <div className="bf-row">
                  <label>Label bouton</label>
                  <input type="text" value={currentPage.content?.buttonLabel || ''} onChange={e => patchPageContent(currentPage.id, { buttonLabel: e.target.value })} />
                </div>
                <div className="bf-row">
                  <label><input type="checkbox" checked={!!currentPage.content?.alert} onChange={e => patchPageContent(currentPage.id, { alert: e.target.checked })} /> Style alerte (rouge)</label>
                </div>
              </>
            )}
            {currentPage.type === 'text_answer' && (
              <>
                <div className="bf-row">
                  <label>Séquence affichée</label>
                  <input type="text" value={currentPage.content?.sequence || ''} onChange={e => patchPageContent(currentPage.id, { sequence: e.target.value })} />
                </div>
                <div className="bf-row">
                  <label>Réponse attendue</label>
                  <input type="text" value={currentPage.answer || ''} onChange={e => patchPage(currentPage.id, { answer: e.target.value })} />
                </div>
                <div className="bf-row">
                  <label>Fragment récompensé</label>
                  <input type="text" value={currentPage.fragment || ''} onChange={e => patchPage(currentPage.id, { fragment: e.target.value })} maxLength={3} style={{ maxWidth: 80 }} />
                </div>
                <div className="bf-row">
                  <label>Message de succès</label>
                  <input type="text" value={currentPage.successMessage || ''} onChange={e => patchPage(currentPage.id, { successMessage: e.target.value })} />
                </div>
              </>
            )}
            {currentPage.type === 'nfc' && (
              <>
                <div className="bf-row">
                  <label>UIDs NFC autorisés (un par ligne)</label>
                  <textarea rows="3" value={(currentPage.accepted_uids || []).join('\n')} onChange={e => patchPage(currentPage.id, { accepted_uids: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <div className="bf-row">
                  <label><input type="checkbox" checked={!!currentPage.accept_any_card} onChange={e => patchPage(currentPage.id, { accept_any_card: e.target.checked })} /> Accepter n'importe quelle carte</label>
                </div>
                <div className="bf-row">
                  <label>Fragment récompensé</label>
                  <input type="text" value={currentPage.fragment || ''} onChange={e => patchPage(currentPage.id, { fragment: e.target.value })} maxLength={3} style={{ maxWidth: 80 }} />
                </div>
              </>
            )}
            {currentPage.type === 'quiz' && (
              <>
                <div className="bf-row">
                  <label>Fragment récompensé</label>
                  <input type="text" value={currentPage.fragment || ''} onChange={e => patchPage(currentPage.id, { fragment: e.target.value })} maxLength={3} style={{ maxWidth: 80 }} />
                </div>
                <div className="bf-row">
                  <label>Message de succès</label>
                  <input type="text" value={currentPage.successMessage || ''} onChange={e => patchPage(currentPage.id, { successMessage: e.target.value })} />
                </div>
                <div className="agb-section-title" style={{ marginTop: '0.75rem' }}>Questions du quiz</div>
                {(currentPage.questions || []).map(renderQuestionEditor)}
                <button type="button" className="btn btn-small builder-add-btn" style={{ marginTop: '0.25rem' }} onClick={addQuestion}>+ Question</button>
              </>
            )}
            {currentPage.type === 'final_code' && (
              <div className="bf-row">
                <label>Code attendu</label>
                <input type="text" value={currentPage.answer || ''} onChange={e => patchPage(currentPage.id, { answer: e.target.value })} maxLength={10} style={{ maxWidth: 120 }} />
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Colonne droite : preview ── */}
      <div className="agb-right">
        <div className="builder-preview-label">Aperçu — rendu joueur exact</div>
        <PreviewFrame page={currentPage} style={{ flex: 1, minHeight: 0 }} />
        <p className="builder-preview-hint">Interactions désactivées en aperçu — données de démo.</p>
      </div>

    </div>
  );
}
