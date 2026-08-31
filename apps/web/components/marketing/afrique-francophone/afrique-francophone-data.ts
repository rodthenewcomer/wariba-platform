/**
 * Section 09's regional dataset — the six francophone West African markets
 * WARIBA is built with in mind.
 *
 * This is brand cartography, not a geodata set: node positions are a
 * stylised, topologically honest approximation (Dakar west, Bamako/
 * Ouagadougou inland north, Abidjan/Lomé/Cotonou along the coast east of
 * Abidjan) inside a fixed viewBox — not real coordinates, and not a claim of
 * surveying accuracy.
 */

export interface RegionalNode {
  id: string;
  country: string;
  city: string;
  /** Position inside the map's `0 0 440 380` viewBox. */
  x: number;
  y: number;
}

/** Entrance order — the sequence nodes light up in. */
export const REGIONAL_NODES: readonly RegionalNode[] = [
  { id: 'senegal', country: 'Sénégal', city: 'Dakar', x: 42, y: 150 },
  { id: 'cote-ivoire', country: 'Côte d’Ivoire', city: 'Abidjan', x: 176, y: 300 },
  { id: 'burkina-faso', country: 'Burkina Faso', city: 'Ouagadougou', x: 230, y: 128 },
  { id: 'mali', country: 'Mali', city: 'Bamako', x: 150, y: 108 },
  { id: 'togo', country: 'Togo', city: 'Lomé', x: 270, y: 292 },
  { id: 'benin', country: 'Bénin', city: 'Cotonou', x: 312, y: 280 },
] as const;

/** A small connected graph, not a full mesh — five links across six nodes. */
export const REGIONAL_CONNECTORS: readonly [string, string][] = [
  ['senegal', 'mali'],
  ['mali', 'burkina-faso'],
  ['mali', 'cote-ivoire'],
  ['cote-ivoire', 'togo'],
  ['togo', 'benin'],
] as const;

/** Country ribbon — display order, independent of the map's entrance order. */
export const RIBBON_COUNTRIES: readonly string[] = [
  'Côte d’Ivoire',
  'Bénin',
  'Togo',
  'Mali',
  'Burkina Faso',
  'Sénégal',
] as const;
