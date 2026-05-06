import React, { useState } from 'react';
import { createBlankGame, duplicateGame } from './gameModel';
import AdminGameBuilder from './AdminGameBuilder';

// ─── AdminGames ───────────────────────────────────────────────────────────────
export default function AdminGames({ config, setConfig }) {
  const [editingGameId, setEditingGameId] = useState(null);

  const games = config?.games || [];

  // ── Helpers ──
  const patchGames = (updater) =>
    setConfig(prev => ({ ...prev, games: updater(prev.games || []) }));

  const addGame = () => {
    const g = createBlankGame();
    patchGames(gs => [...gs, g]);
    setEditingGameId(g.id);
  };

  const dupGame = (game) => {
    const copy = duplicateGame(game);
    patchGames(gs => [...gs, copy]);
  };

  const deleteGame = (id) => {
    if (!window.confirm('Supprimer ce jeu définitivement ?')) return;
    patchGames(gs => gs.filter(g => g.id !== id));
    if (editingGameId === id) setEditingGameId(null);
  };

  const patchMeta = (id, field, value) =>
    patchGames(gs => gs.map(g => g.id === id ? { ...g, [field]: value } : g));

  // ── Si on édite un jeu, afficher le builder ──
  const editingGame = games.find(g => g.id === editingGameId);
  if (editingGame) {
    return (
      <AdminGameBuilder
        game={editingGame}
        onUpdate={(updated) => patchGames(gs => gs.map(g => g.id === updated.id ? updated : g))}
        onBack={() => setEditingGameId(null)}
      />
    );
  }

  // ── Liste des jeux ──
  return (
    <div className="admin-games">

      <div className="admin-games-toolbar">
        <button type="button" className="btn btn-primary btn-small" onClick={addGame}>+ Nouveau jeu</button>
        <p className="admin-hint" style={{ margin: 0 }}>
          {games.length === 0 ? 'Aucun jeu. Créez-en un !' : `${games.length} jeu${games.length > 1 ? 'x' : ''}`}
        </p>
      </div>

      <div className="games-list">
        {games.map(game => (
          <div key={game.id} className={`game-list-item ${game.active ? 'game-list-item--active' : ''}`}>

            <div className="game-list-info">
              <div className="game-list-row1">
                <span className={`game-status-dot ${game.active ? 'active' : ''}`} title={game.active ? 'Actif' : 'Inactif'} />
                <input
                  className="game-title-input"
                  value={game.title}
                  onChange={e => patchMeta(game.id, 'title', e.target.value)}
                  title="Titre du jeu"
                />
              </div>
              <div className="game-list-row2">
                <input
                  className="game-desc-input"
                  value={game.description || ''}
                  onChange={e => patchMeta(game.id, 'description', e.target.value)}
                  placeholder="Description…"
                />
              </div>
              <div className="game-list-row3">
                <input className="game-meta-input" value={game.age || ''} onChange={e => patchMeta(game.id, 'age', e.target.value)} placeholder="Âge" title="Âge conseillé" />
                <input className="game-meta-input" value={game.duration || ''} onChange={e => patchMeta(game.id, 'duration', e.target.value)} placeholder="Durée" title="Durée estimée" />
                <label className="game-active-label">
                  <input type="checkbox" checked={!!game.active} onChange={e => patchMeta(game.id, 'active', e.target.checked)} />
                  Actif
                </label>
              </div>
            </div>

            <div className="game-list-actions">
              <button type="button" className="btn btn-primary btn-small" onClick={() => setEditingGameId(game.id)}>✏️ Modifier</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => dupGame(game)}>⎘ Dupliquer</button>
              <button type="button" className="btn-small btn-danger" onClick={() => deleteGame(game.id)}>🗑 Supprimer</button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
