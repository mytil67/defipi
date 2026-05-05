import React, { useState } from 'react';
import { BlockRenderer } from './BlockRenderer';

const STEP_LABELS = {
  briefing: 'Briefing',
  step1:    'Défi 1 — Suite logique',
  step2:    'Défi 2 — Scan NFC',
  step3:    'Défi 3 — Mot de passe',
  step4:    'Défi 4 — Phishing',
  final:    'Final — Code',
  victory:  'Victoire',
};

const BLOCK_TYPES = {
  text:     '📝 Texte',
  image:    '🖼️ Image',
  question: '❓ Question',
  choices:  '🔘 Choix / Réponses',
  button:   '🔲 Bouton',
  fragment: '🧩 Fragments gagnés',
};

// Données factices pour la prévisualisation des blocs interactifs
const PREVIEW_DATA = {
  questionText: 'Exemple de question affichée ici',
  options: ['Réponse A', 'Réponse B', 'Réponse C', 'Réponse D'],
  onAnswer: () => {},
  onAction: () => {},
  fragments: ['3', '2'],
};

export default function AdminBuilder({ config, setConfig }) {
  const [selectedStep, setSelectedStep] = useState('briefing');
  const [editingId, setEditingId]       = useState(null);

  // ── Accesseurs layout ──────────────────────────────────────────────────────
  const getBlocks = () =>
    [...(config?.step_layouts?.[selectedStep]?.blocks || [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const setBlocks = (blocks) =>
    setConfig(prev => ({
      ...prev,
      step_layouts: {
        ...(prev.step_layouts || {}),
        [selectedStep]: { ...(prev.step_layouts?.[selectedStep] || {}), blocks },
      },
    }));

  // ── Actions sur les blocs ──────────────────────────────────────────────────
  const addBlock = () => {
    const blocks = getBlocks();
    const nb = { id: `b${Date.now()}`, type: 'text', content: 'Nouveau texte', align: 'center', size: 'full', order: blocks.length, options: {} };
    setBlocks([...blocks, nb]);
    setEditingId(nb.id);
  };

  const removeBlock = (id) => {
    setBlocks(getBlocks().filter(b => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateBlock = (id, changes) =>
    setBlocks(getBlocks().map(b => b.id === id ? { ...b, ...changes } : b));

  const moveBlock = (id, dir) => {
    const blocks = getBlocks();
    const idx = blocks.findIndex(b => b.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= blocks.length) return;
    const next = [...blocks];
    [next[idx].order, next[swap].order] = [next[swap].order, next[idx].order];
    setBlocks(next);
  };

  const clearLayout = () => {
    if (!window.confirm('Supprimer le layout de cette étape et revenir au rendu natif ?')) return;
    setConfig(prev => {
      const layouts = { ...(prev.step_layouts || {}) };
      delete layouts[selectedStep];
      return { ...prev, step_layouts: layouts };
    });
    setEditingId(null);
  };

  const blocks = getBlocks();
  const hasLayout = blocks.length > 0;

  return (
    <div className="builder-container">

      {/* ── Panneau gauche : éditeur ── */}
      <div className="builder-panel builder-editor">

        <div className="builder-step-select">
          <label>Étape à éditer :</label>
          <select value={selectedStep} onChange={e => { setSelectedStep(e.target.value); setEditingId(null); }}>
            {Object.entries(STEP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasLayout && (
            <button type="button" className="btn-link-danger" onClick={clearLayout}>↩ Retour natif</button>
          )}
        </div>

        <div className={`builder-status ${hasLayout ? 'builder-status--active' : ''}`}>
          {hasLayout
            ? `⚠️ Layout actif (${blocks.length} bloc${blocks.length > 1 ? 's' : ''}). Le rendu natif est remplacé.`
            : '💡 Rendu natif actif. Ajoutez un bloc pour personnaliser.'}
        </div>

        <div className="builder-blocks-list">
          {blocks.length === 0 && (
            <p className="builder-empty">Aucun bloc — cliquez sur "Ajouter un bloc"</p>
          )}

          {blocks.map((block, idx) => (
            <div key={block.id} className={`builder-block${editingId === block.id ? ' builder-block--active' : ''}`}>

              {/* En-tête cliquable */}
              <div className="builder-block-header" onClick={() => setEditingId(editingId === block.id ? null : block.id)}>
                <span className="builder-block-icon">{BLOCK_TYPES[block.type] || block.type}</span>
                <span className="builder-block-preview">{block.content?.slice(0, 38) || '—'}</span>
                <div className="builder-block-btns" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} title="Monter">↑</button>
                  <button type="button" onClick={() => moveBlock(block.id, +1)} disabled={idx === blocks.length - 1} title="Descendre">↓</button>
                  <button type="button" className="builder-btn-del" onClick={() => removeBlock(block.id)} title="Supprimer">✕</button>
                </div>
              </div>

              {/* Formulaire d'édition */}
              {editingId === block.id && (
                <div className="builder-block-form">

                  <div className="bf-row">
                    <label>Type</label>
                    <select value={block.type} onChange={e => updateBlock(block.id, { type: e.target.value })}>
                      {Object.entries(BLOCK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>

                  {!['choices', 'fragment'].includes(block.type) && (
                    <div className="bf-row">
                      <label>Contenu</label>
                      <textarea rows="3" value={block.content || ''} onChange={e => updateBlock(block.id, { content: e.target.value })} />
                    </div>
                  )}

                  {block.type === 'image' && (
                    <div className="bf-row">
                      <label>URL image</label>
                      <input
                        type="url"
                        value={block.options?.url || ''}
                        onChange={e => updateBlock(block.id, { options: { ...block.options, url: e.target.value } })}
                        placeholder="https://exemple.com/image.png"
                      />
                    </div>
                  )}

                  <div className="bf-row bf-row-2">
                    <div>
                      <label>Position</label>
                      <select value={block.align || 'center'} onChange={e => updateBlock(block.id, { align: e.target.value })}>
                        <option value="left">Gauche</option>
                        <option value="center">Centre</option>
                        <option value="right">Droite</option>
                      </select>
                    </div>
                    <div>
                      <label>Largeur</label>
                      <select value={block.size || 'full'} onChange={e => updateBlock(block.id, { size: e.target.value })}>
                        <option value="small">Petit (25%)</option>
                        <option value="medium">Moyen (50%)</option>
                        <option value="large">Grand (75%)</option>
                        <option value="full">Plein (100%)</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-small builder-add-btn" onClick={addBlock}>
          + Ajouter un bloc
        </button>
      </div>

      {/* ── Panneau droit : prévisualisation ── */}
      <div className="builder-panel builder-preview-panel">
        <div className="builder-preview-label">Aperçu</div>
        <div className="builder-preview-frame">
          {blocks.length === 0 ? (
            <p className="builder-preview-empty">Ajoutez des blocs pour voir l'aperçu</p>
          ) : (
            <BlockRenderer blocks={blocks} stepData={PREVIEW_DATA} />
          )}
        </div>
        <p className="builder-preview-hint">
          Les choix et boutons utilisent des données de démo pour l'aperçu.
        </p>
      </div>

    </div>
  );
}
