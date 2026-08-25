import { describe, expect, it } from 'vitest';
import { HELP_P0_VISUAL_IDS } from '@wariba/ui';
import { publishedArticles, type HelpArticle, type HelpBlock } from '../content/help';

/**
 * Le contrôle éditorial du corpus public.
 *
 * `docs/01-product/WARIBA_HELP_FRENCH_EDITORIAL_STANDARD.md` §13 fixe le
 * périmètre : ce test vérifie ce qui se vérifie sans jugement. Le naturel
 * d'une phrase se relit à l'œil ; aucun test n'a jamais su dire si une
 * tournure sonne français.
 *
 * Ce qu'il ne fait **pas**, délibérément : bannir les mots anglais. Buy, Sell,
 * Stop Loss, Take Profit, WariX, payout, spread et equity sont du vocabulaire
 * trader légitime. Une expression régulière qui les refuserait ferait plus de
 * dégâts que la faute qu'elle cherche.
 */

/** Le texte qu'un lecteur voit réellement, bloc par bloc. */
function readerFacingStrings(article: HelpArticle): string[] {
  const fromBlock = (block: HelpBlock): string[] => {
    switch (block.kind) {
      case 'paragraph':
      case 'heading':
        return [block.text];
      case 'list':
        return [...block.items];
      case 'table':
        return [block.caption ?? '', ...block.columns, ...block.rows.flat()];
      case 'ruleTable':
        return [block.caption ?? ''];
      case 'formula':
        return [block.expression, block.caption ?? ''];
      case 'example':
        return [block.title, ...block.lines, block.conclusion ?? ''];
      case 'callout':
        return [block.title, block.text];
      case 'visual':
        return [];
    }
  };
  return [article.title, article.summary, ...article.body.flatMap(fromBlock)].filter(Boolean);
}

/**
 * Les termes du §3 du standard.
 *
 * Chacun décrit comment WARIBA est construit, pas ce que le trader vit. Les
 * limites de mot comptent : « produit » ne doit pas déclencher « UI », et
 * « poli » ne doit pas déclencher « policy ».
 */
const INTERNAL_TERMS: readonly [string, RegExp][] = [
  ['policy', /\bpolic(y|ies)\b/i],
  ['serveur', /\bserveurs?\b/i],
  ['côté serveur', /côté serveur/i],
  ['moteur', /\bmoteur\b/i],
  ['autoritatif', /\bautoritati(f|ve|fs|ves)\b/i],
  ['source de vérité', /source de vérité/i],
  ['données fraîches', /données fraîches/i],
  ['state machine', /(machine d’états|state machine)/i],
  ['reason code', /(reason code|code de raison)/i],
  ['RLS / RBAC', /\b(rls|rbac)\b/i],
  ['append-only', /(append-only|ajout seul)/i],
  ['idempotence', /\bidempot/i],
  ['webhook', /\bwebhook\b/i],
  ['snapshot / instantané', /(\bsnapshot\b|instantané autoritatif)/i],
  ['projection', /\bprojection\b/i],
  ['ledger', /\bledger\b/i],
  ['fill', /\bfills?\b/i],
  ['correlation ID', /correlation/i],
  ['sandbox', /\bsandbox\b/i],
  ['tradable', /\btradable\b/i],
  ['endpoint', /\bendpoints?\b/i],
  ['enum', /\benums?\b/i],
  ['EOD trailing', /(eod trailing|trailing eod)/i],
  ['domain code', /domain code/i],
];

/**
 * Les seules exceptions, chacune justifiée.
 *
 * Un article *sur* la référence technique doit pouvoir en parler ; interdire le
 * mot dans l'article qui l'explique serait absurde. La liste est courte et
 * nominative par construction : ajouter une exception demande de nommer
 * l'article et le terme.
 */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  // Vide, et c'est le résultat recherché. L'article qui explique la référence
  // technique y est arrivé sans écrire « correlation » une seule fois : la
  // dernière exception a disparu quand le texte a cessé d'en avoir besoin.
};

describe('vocabulaire public', () => {
  it('n’expose aucun terme d’implémentation', () => {
    const leaks: string[] = [];
    for (const article of publishedArticles()) {
      const allowed = ALLOWED[article.slug] ?? [];
      for (const text of readerFacingStrings(article)) {
        for (const [name, pattern] of INTERNAL_TERMS) {
          if (allowed.includes(name)) continue;
          if (pattern.test(text)) {
            leaks.push(`${article.id} [${name}] « ${text.slice(0, 90)} »`);
          }
        }
      }
    }
    expect(leaks, leaks.join('\n')).toHaveLength(0);
  });

  it('n’affiche jamais DLL ni MLL — ce sont des mots de recherche, pas de lecture', () => {
    for (const article of publishedArticles()) {
      for (const text of readerFacingStrings(article)) {
        expect(text, `${article.id} affiche un acronyme interne`).not.toMatch(/\b(DLL|MLL)\b/);
      }
    }
  });

  it('n’écrit jamais « perte maximale journalière » — cette règle n’existe pas', () => {
    for (const article of publishedArticles()) {
      for (const text of readerFacingStrings(article)) {
        expect(text.toLocaleLowerCase('fr')).not.toContain('perte maximale journalière');
        expect(text.toLocaleLowerCase('fr')).not.toContain('perte maximale quotidienne');
      }
    }
  });

  it('n’emploie pas le vocabulaire « compte financé »', () => {
    // BRAND-005 / PROD-003 LOCKED — WARIBA V1 est simulé.
    for (const article of publishedArticles()) {
      for (const text of readerFacingStrings(article)) {
        const lower = text.toLocaleLowerCase('fr');
        expect(lower, `${article.id}`).not.toContain('compte financé');
        expect(lower, `${article.id}`).not.toContain('capital financé');
        expect(lower, `${article.id}`).not.toContain('funded account');
      }
    }
  });
});

describe('forme des articles', () => {
  /**
   * §10 — un titre est une question, à deux exceptions près.
   *
   * L'article épinglé porte une affirmation parce qu'il est une consigne, et
   * un article de dépannage porte les mots du trader lui-même (« Mon paiement
   * a échoué »). Les deux sont nommés ici plutôt que devinés par une heuristique.
   */
  const STATEMENT_TITLES_ALLOWED = new Set([
    'regles-essentielles',
    'glossaire',
    'paiement-en-attente',
    'paiement-echoue',
  ]);

  it('pose une question dans chaque titre, sauf exception nommée', () => {
    const offenders = publishedArticles()
      .filter((article) => !STATEMENT_TITLES_ALLOWED.has(article.slug))
      .filter((article) => !article.title.trimEnd().endsWith('?'))
      .map((article) => `${article.id} « ${article.title} »`);
    expect(offenders, offenders.join('\n')).toHaveLength(0);
  });

  it('ne répète pas deux fois le même titre de section dans un article', () => {
    // §9 — la soupe de cartes. Deux sections identiques sur un écran, c'est un
    // gabarit appliqué mécaniquement plutôt qu'une explication.
    for (const article of publishedArticles()) {
      const headings = article.body
        .filter(
          (block): block is Extract<HelpBlock, { kind: 'heading' }> => block.kind === 'heading',
        )
        .map((block) => block.text);
      expect(new Set(headings).size, `${article.id} répète un titre de section`).toBe(
        headings.length,
      );
    }
  });

  it('garde chaque résumé lisible sur un téléphone', () => {
    // Deux phrases, pas un paragraphe : le résumé est ce qui s'affiche dans
    // une liste de résultats, souvent sur 320 px.
    for (const article of publishedArticles()) {
      expect(article.summary.length, `${article.id} a un résumé trop long`).toBeLessThanOrEqual(
        180,
      );
    }
  });

  it('n’ouvre aucun article par un bloc décoratif', () => {
    // Le premier bloc doit répondre. Un titre de section ou un encadré en
    // ouverture, c'est une page qui se présente avant de servir.
    for (const article of publishedArticles()) {
      const first = article.body[0]?.kind;
      expect(
        ['paragraph', 'list', 'table', 'ruleTable', 'formula', 'callout'],
        `${article.id} ouvre sur « ${first} »`,
      ).toContain(first);
    }
  });
});

describe('système visuel P0', () => {
  it('intègre chacun des 25 visuels du gate une seule fois', () => {
    const placements = publishedArticles().flatMap((article) =>
      article.body
        .filter((block): block is Extract<HelpBlock, { kind: 'visual' }> => block.kind === 'visual')
        .map((block) => ({ article: article.id, id: block.id })),
    );

    expect(placements).toHaveLength(HELP_P0_VISUAL_IDS.length);
    expect(new Set(placements.map(({ id }) => id))).toEqual(new Set(HELP_P0_VISUAL_IDS));
  });

  it('place le visuel après la réponse directe, jamais en ouverture', () => {
    for (const article of publishedArticles()) {
      const index = article.body.findIndex((block) => block.kind === 'visual');
      if (index === -1) continue;
      expect(index, `${article.id} ouvre trop tôt sur son visuel`).toBeGreaterThan(0);
      expect(article.body.slice(0, index).some((block) => block.kind === 'paragraph')).toBe(true);
    }
  });
});
