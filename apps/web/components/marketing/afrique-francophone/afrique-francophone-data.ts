/**
 * Section 09's hand-authored regional constants. The geography itself —
 * country shapes, capital coordinates — lives in `afrique-francophone-geo.ts`
 * and is generated, never edited by hand; this file is everything about
 * *how* that geography is told as a story: the order the network lights up
 * in, and the copy-adjacent lists that don't need real coordinates.
 */

/**
 * The lighting sequence — Abidjan first, as WARIBA's anchor market, then two
 * branches fanning out from it: east along the coast (Lomé, Cotonou), then
 * inland and north (Ouagadougou, Bamako, Dakar).
 */
export const NODE_SEQUENCE: readonly string[] = [
  'cote-ivoire',
  'togo',
  'benin',
  'burkina-faso',
  'mali',
  'senegal',
] as const;

/** Connector arcs, drawn in this order — each pair lights its target node on arrival. */
export const REGIONAL_CONNECTORS: readonly [string, string][] = [
  ['cote-ivoire', 'togo'],
  ['togo', 'benin'],
  ['cote-ivoire', 'burkina-faso'],
  ['burkina-faso', 'mali'],
  ['mali', 'senegal'],
] as const;

/** The country line beneath the copy — display order, not the map's lighting order. */
export const RIBBON_COUNTRIES: readonly string[] = [
  'Côte d’Ivoire',
  'Sénégal',
  'Mali',
  'Burkina Faso',
  'Togo',
  'Bénin',
] as const;
