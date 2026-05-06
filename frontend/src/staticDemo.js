// ─── Mode démo statique (Vercel / hébergement sans backend) ──────────────────
// Actif si le hostname contient "vercel.app" ou si VITE_STATIC_DEMO=1 au build.
export const isStaticDemo =
  window.location.hostname.includes('vercel.app') ||
  import.meta.env.VITE_STATIC_DEMO === '1';

// ── Config embarquée de secours (si /config.json est aussi absent) ────────────
const FALLBACK_CONFIG = {
  games: [
    {
      id: 'mission-404',
      title: 'Mission 404 — Panique au serveur',
      description: "Sauvez le serveur scolaire bloqué par le virus BUG-404 !",
      age: '8–12 ans',
      duration: '~10 min (démo)',
      active: true,
      pages: [
        {
          id: 'briefing', type: 'info', title: 'Briefing',
          theme: { preset: 'alerte' }, blocks: [],
          content: {
            headline: 'Mission 404 — Panique au serveur !',
            body: "ALERTE ROUGE ! Le serveur de l'école est infecté !\nLe virus BUG-404 a tout verrouillé.\nRéunis les fragments pour le relancer.\nBonne chance, Agent !",
            alert: true,
            buttonLabel: '⚡ Accepter la mission !',
          },
        },
        {
          id: 'step1', type: 'text_answer', title: "Code d'accès",
          theme: { preset: 'sombre' }, blocks: [],
          content: {
            headline: "Défi 1 — Code d'accès",
            body: "Le serveur exige un code secret.\nComplète la suite de nombres pour l'obtenir !",
            sequence: '2 — 4 — 8 — 16',
            hint: "💡 Comment passe-t-on d'un nombre au suivant ?",
            inputMode: 'numeric', maxLength: 4,
          },
          answer: '32', fragment: '3',
          successMessage: "⚡ Code d'accès correct ! Fragment 3 récupéré !",
        },
        {
          id: 'step3', type: 'quiz', title: 'Mot de passe',
          theme: { preset: 'mystere' }, blocks: [],
          content: { headline: 'Défi 2 — Mot de passe sécurisé' },
          questions: [
            {
              id: 1, text: 'Quel est le mot de passe le plus sécurisé ?',
              type: 'quiz_single',
              options: ['123456', 'motdepasse', 'Tr0ub4dor&3', 'azerty'],
              answer: 'Tr0ub4dor&3',
            },
            {
              id: 2, text: 'Qu\'est-ce qu\'un bon mot de passe ?',
              type: 'quiz_multiple',
              options: ['Long (12+ caractères)', 'Mon prénom', 'Mélange chiffres et symboles', 'Le même partout'],
              answers: ['Long (12+ caractères)', 'Mélange chiffres et symboles'],
            },
          ],
          fragment: '4',
          successMessage: '⚡ Mot de passe sécurisé ! Fragment 4 récupéré !',
        },
        {
          id: 'final', type: 'final_code', title: 'Redémarrage',
          theme: { preset: 'neutre' }, blocks: [],
          content: {
            headline: 'Redémarrage du serveur !',
            body: "Tu as réuni les fragments.\nEntre-les dans l'ordre où tu les as collectés !",
            hint: '💡 Quel défi as-tu réussi en premier ?',
            buttonLabel: '🔄 REDÉMARRER LE SERVEUR',
          },
          answer: '34',
        },
        {
          id: 'victory', type: 'victory', title: 'Victoire',
          theme: { preset: 'victoire' }, blocks: [],
          content: {
            headline: 'SERVEUR SAUVÉ !',
            badge: '🎖️ Brigade Anti-Bug — Niveau 1',
            body: "Félicitations, Agents !\nVous avez vaincu le virus BUG-404 !",
          },
        },
      ],
    },
  ],
};

// ── Helpers localStorage ───────────────────────────────────────────────────────
function readLocalStorage() {
  try {
    const raw = localStorage.getItem('defipi_config');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── loadConfig ─────────────────────────────────────────────────────────────────
// Raspberry  : GET /api/config (backend FastAPI)
// Démo Vercel: localStorage → /config.json → FALLBACK_CONFIG embarqué
export async function loadConfig() {
  if (!isStaticDemo) {
    return fetch('/api/config').then(r => r.json());
  }
  const local = readLocalStorage();
  if (local) return local;
  try {
    const r = await fetch('/config.json');
    if (!r.ok) throw new Error('not ok');
    return await r.json();
  } catch {
    return FALLBACK_CONFIG;
  }
}

// ── saveConfig ─────────────────────────────────────────────────────────────────
// Raspberry  : POST /api/config (backend FastAPI)
// Démo Vercel: localStorage uniquement
export async function saveConfig(config) {
  if (!isStaticDemo) {
    return fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then(r => r.json());
  }
  localStorage.setItem('defipi_config', JSON.stringify(config));
  return { ok: true, demo: true };
}
