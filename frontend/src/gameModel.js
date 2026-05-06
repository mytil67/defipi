// ─── Modèle multi-jeux + migration douce ─────────────────────────────────────

// ── Templates de pages vierges ─────────────────────────────────────────────
export const BLANK_PAGE_TEMPLATES = {
  info: (id) => ({
    id, type: 'info', title: 'Nouvelle page',
    theme: { preset: '' }, blocks: [],
    content: { headline: 'Titre de la page', body: 'Texte de présentation.', alert: false, buttonLabel: 'Continuer →' },
  }),
  text_answer: (id) => ({
    id, type: 'text_answer', title: 'Réponse texte',
    theme: { preset: '' }, blocks: [],
    content: { headline: 'Question', body: '', sequence: '', hint: '', inputMode: 'text', maxLength: 10 },
    answer: '', fragment: '', successMessage: '⚡ Bonne réponse !',
  }),
  nfc: (id) => ({
    id, type: 'nfc', title: 'Scan NFC',
    theme: { preset: '' }, blocks: [],
    content: { headline: 'Défi NFC', body: 'Pose la carte sur le lecteur.' },
    accepted_uids: [], accept_any_card: false,
    fragment: '', successMessage: '⚡ Carte validée !',
  }),
  quiz: (id) => ({
    id, type: 'quiz', title: 'Quiz',
    theme: { preset: '' }, blocks: [],
    content: { headline: 'Quiz' },
    questions: [{ id: Date.now(), text: 'Question ?', type: 'quiz_single', options: ['A', 'B', 'C', 'D'], answer: 'A' }],
    fragment: '', successMessage: '⚡ Bravo !',
  }),
  final_code: (id) => ({
    id, type: 'final_code', title: 'Code final',
    theme: { preset: '' }, blocks: [],
    content: {
      headline: 'Code de redémarrage',
      body: 'Entre le code formé par les fragments collectés.',
      hint: '💡 Dans quel ordre les as-tu collectés ?',
      buttonLabel: '🔄 Valider le code',
    },
    answer: '0000',
  }),
  victory: (id) => ({
    id, type: 'victory', title: 'Victoire',
    theme: { preset: '' }, blocks: [],
    content: { headline: 'Mission accomplie !', badge: '🎖️ Félicitations !', body: 'Vous avez réussi !' },
  }),
};

export const QUESTION_TYPE_LABELS = {
  quiz_single:   '🔘 Choix unique',
  quiz_multiple: '☑️ Choix multiples',
  true_false:    '✅ Vrai / Faux',
  text_answer:   '✏️ Réponse texte',
  info:          '📢 Info (pas de réponse)',
};

export const PAGE_TYPE_LABELS = {
  info:         '📋 Info / Briefing',
  text_answer:  '✏️ Réponse texte',
  nfc:          '📡 Scan NFC',
  quiz:         '❓ Quiz',
  final_code:   '🔑 Code final',
  victory:      '🏆 Victoire',
};

// ── Migration : ancien format plat → nouveau format multi-jeux ────────────────
function migrateLegacyConfig(raw) {
  const themes  = raw.step_themes  || {};
  const layouts = raw.step_layouts || {};
  const mkTheme  = (id) => themes[id]  || { preset: '' };
  const mkBlocks = (id) => layouts[id]?.blocks || [];

  return {
    games: [
      {
        id: 'mission-404',
        title: 'Mission 404 — Panique au serveur',
        description: "Sauvez le serveur scolaire bloqué par le virus BUG-404 !",
        age: '8–12 ans',
        duration: '20 min',
        active: true,
        pages: [
          {
            id: 'briefing', type: 'info', title: 'Briefing',
            theme: mkTheme('briefing'), blocks: mkBlocks('briefing'),
            content: {
              headline: 'Mission 404 — Panique au serveur !',
              body: "ALERTE ROUGE ! Le serveur de l'école est infecté !\nLe virus BUG-404 a tout verrouillé.\nPour le relancer, tu dois réunir 4 fragments secrets.\nChaque défi accompli te donnera un fragment.\nBonne chance, Agent !",
              alert: true,
              buttonLabel: '⚡ Accepter la mission !',
            },
          },
          {
            id: 'step1', type: 'text_answer', title: "Code d'accès",
            theme: mkTheme('step1'), blocks: mkBlocks('step1'),
            content: {
              headline: "Défi 1 — Code d'accès",
              body: "Le serveur exige un code secret.\nComplète la suite de nombres pour l'obtenir !",
              sequence: raw.step1_sequence || '2 — 4 — 8 — 16',
              hint: "💡 Comment passe-t-on d'un nombre au suivant ?",
              inputMode: 'numeric', maxLength: 4,
            },
            answer: raw.step1_answer || '32',
            fragment: '3',
            successMessage: "⚡ Code d'accès correct ! Fragment 3 récupéré !",
          },
          {
            id: 'step2', type: 'nfc', title: 'Clé serveur',
            theme: mkTheme('step2'), blocks: mkBlocks('step2'),
            content: {
              headline: 'Défi 2 — Clé serveur',
              body: 'Trouve la carte "CLÉ SERVEUR"\net pose-la sur le lecteur NFC.',
            },
            accepted_uids: raw.step2_nfc_uids || [],
            accept_any_card: false,
            fragment: '2',
            successMessage: '⚡ Clé serveur validée ! Fragment 2 récupéré !',
          },
          {
            id: 'step3', type: 'quiz', title: 'Mot de passe',
            theme: mkTheme('step3'), blocks: mkBlocks('step3'),
            content: { headline: 'Défi 3 — Mot de passe sécurisé' },
            questions: raw.step3_questions || [],
            fragment: '4',
            successMessage: '⚡ Mot de passe sécurisé ! Fragment 4 récupéré !',
          },
          {
            id: 'step4', type: 'quiz', title: 'Phishing',
            theme: mkTheme('step4'), blocks: mkBlocks('step4'),
            content: { headline: 'Défi 4 — Message suspect !' },
            questions: raw.step4_questions || [],
            fragment: '1',
            successMessage: '⚡ Piège déjoué ! Fragment 1 récupéré !',
          },
          {
            id: 'final', type: 'final_code', title: 'Redémarrage',
            theme: mkTheme('final'), blocks: mkBlocks('final'),
            content: {
              headline: 'Redémarrage du serveur !',
              body: "Tu as réuni les 4 fragments.\nEntre-les dans l'ordre où tu les as collectés\npour former le code de redémarrage !",
              hint: '💡 Quel défi as-tu réussi en premier ? En deuxième ?…',
              buttonLabel: '🔄 REDÉMARRER LE SERVEUR',
            },
            answer: raw.final_code || '3241',
          },
          {
            id: 'victory', type: 'victory', title: 'Victoire',
            theme: mkTheme('victory'), blocks: mkBlocks('victory'),
            content: {
              headline: 'SERVEUR SAUVÉ !',
              badge: '🎖️ Brigade Anti-Bug — Niveau 1',
              body: "Félicitations, Agents !\nVous avez vaincu le virus BUG-404\net sauvé le serveur de l'école !",
            },
          },
        ],
      },
    ],
  };
}

export function migrateConfig(raw) {
  if (!raw) return { games: [] };
  if (Array.isArray(raw.games) && raw.games.length > 0) return raw;
  return migrateLegacyConfig(raw);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export function getActiveGames(config) {
  return (config.games || []).filter((g) => g.active !== false);
}

export function getGameById(config, id) {
  return (config.games || []).find((g) => g.id === id) || null;
}

export function createBlankGame() {
  const now = Date.now();
  return {
    id: `game-${now}`,
    title: 'Nouvelle Mission',
    description: 'Décris ta mission ici.',
    age: 'tous âges',
    duration: '15 min',
    active: false,
    pages: [
      BLANK_PAGE_TEMPLATES.info(`p-info-${now}`),
      BLANK_PAGE_TEMPLATES.quiz(`p-quiz-${now}`),
      BLANK_PAGE_TEMPLATES.victory(`p-victory-${now}`),
    ],
  };
}

export function duplicateGame(game) {
  const copy = JSON.parse(JSON.stringify(game));
  copy.id    = `${game.id}-copie-${Date.now()}`;
  copy.title = `Copie de ${game.title}`;
  copy.active = false;
  // Ensure unique page ids
  copy.pages = copy.pages.map((p) => ({ ...p, id: `${p.id}-${Date.now()}` }));
  return copy;
}

export function newBlankPage(type) {
  const id = `page-${Date.now()}`;
  return (BLANK_PAGE_TEMPLATES[type] || BLANK_PAGE_TEMPLATES.info)(id);
}

// ── Theme presets (shared) ─────────────────────────────────────────────────────
export const THEME_PRESETS = {
  sombre:   { '--card-bg': '#0f172a', '--primary-color': '#818cf8', '--text-color': '#f8fafc' },
  alerte:   { '--card-bg': '#450a0a', '--primary-color': '#f87171', '--text-color': '#fff1f2' },
  mystere:  { '--card-bg': '#1a0533', '--primary-color': '#a855f7', '--text-color': '#faf5ff' },
  neutre:   { '--card-bg': '#0c1a2e', '--primary-color': '#38bdf8', '--text-color': '#f0f9ff' },
  victoire: { '--card-bg': '#052e16', '--primary-color': '#4ade80', '--text-color': '#f0fdf4' },
};

export function getThemeStyle(theme) {
  if (!theme?.preset) return {};
  if (theme.preset === 'custom') {
    const bg = theme.bg || '#0f172a';
    return { '--card-bg': bg, '--primary-color': theme.accent || '#818cf8', '--text-color': theme.text || '#f8fafc', background: bg };
  }
  const preset = THEME_PRESETS[theme.preset];
  if (!preset) return {};
  return { ...preset, background: preset['--card-bg'] };
}
