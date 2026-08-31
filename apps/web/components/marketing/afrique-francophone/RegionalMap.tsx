import type { CSSProperties } from 'react';
import { NODE_SEQUENCE, REGIONAL_CONNECTORS } from './afrique-francophone-data';
import {
  FOCUS_COUNTRY_PATHS,
  MAP_VIEW_HEIGHT,
  MAP_VIEW_WIDTH,
  NEIGHBOR_COUNTRY_PATHS,
  REGIONAL_NODES,
  type RegionalNode,
} from './afrique-francophone-geo';

/*
 * The lighting narrative, in milliseconds. Not derived from `NODE_SEQUENCE`
 * mechanically — Abidjan is the anchor and then two branches fan out from
 * it at different moments, which a uniform per-index stagger can't express.
 * `CONNECTOR_TIMING` is index-aligned with `REGIONAL_CONNECTORS` (both five
 * long, same order) — keep them in sync if either changes.
 */
const NODE_DELAY_MS: Record<string, number> = {
  'cote-ivoire': 500,
  togo: 1150,
  benin: 1750,
  'burkina-faso': 1950,
  mali: 2550,
  senegal: 3200,
};

const CONNECTOR_TIMING: readonly { delayMs: number; durationMs: number }[] = [
  { delayMs: 700, durationMs: 450 }, // Abidjan → Lomé
  { delayMs: 1300, durationMs: 450 }, // Lomé → Cotonou
  { delayMs: 1450, durationMs: 500 }, // Abidjan → Ouagadougou
  { delayMs: 2100, durationMs: 450 }, // Ouagadougou → Bamako
  { delayMs: 2700, durationMs: 500 }, // Bamako → Dakar
];

const LABEL_OFFSET_MS = 150;

/*
 * At phone widths the map shrinks enough that all six labels collide.
 * Abidjan (the anchor), Dakar and Bamako stay on the map; Ouagadougou, Lomé
 * and Cotonou drop their on-map label below `sm` and are named in the
 * compact line under the map instead — every city stays represented as
 * text, just not all six at once on a canvas that can't fit them.
 */
const COMPACT_ON_MOBILE = new Set(['burkina-faso', 'togo', 'benin']);
const COMPACT_LABEL = 'Ouagadougou · Lomé · Cotonou';

/*
 * Lomé and Cotonou sit ~40 units apart on a 900-wide viewBox — close enough,
 * real geography, that their centered labels collided. Nudging each
 * horizontally and anchoring it away from the other (rather than centered)
 * keeps both readable without moving either node off its true coordinate.
 */
const LABEL_ADJUST: Partial<Record<string, { dx: number; anchor: 'start' | 'end' }>> = {
  togo: { dx: -12, anchor: 'end' },
  benin: { dx: 12, anchor: 'start' },
};

function nodeById(id: string): RegionalNode {
  const node = REGIONAL_NODES.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown regional node "${id}".`);
  return node;
}

/** A gentle quadratic arc between two nodes — never a straight line. */
function arcPath(from: RegionalNode, to: RegionalNode): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const bow = Math.hypot(dx, dy) * 0.16;
  const controlX = midX - dy * (bow / Math.hypot(dx, dy) || 0);
  const controlY = midY + dx * (bow / Math.hypot(dx, dy) || 0);
  return `M${from.x},${from.y} Q${controlX.toFixed(1)},${controlY.toFixed(1)} ${to.x},${to.y}`;
}

/**
 * The section's visual atmosphere — real West African geography (see
 * `afrique-francophone-geo.ts`), not a network diagram. Six market nodes
 * light up along a scripted narrative anchored on Abidjan, connected by
 * gentle arcs a small light travels once as each connects — never straight
 * lines, never a permanently animated mesh.
 *
 * A Server Component: every bit of motion here is CSS, timed with inline
 * custom properties, so none of this needs client JS to render or animate.
 */
export function RegionalMap() {
  const ariaLabel = `Carte des marchés prioritaires WARIBA en Afrique de l’Ouest francophone : ${REGIONAL_NODES.map((node) => `${node.country} (${node.city})`).join(', ')}.`;

  return (
    <div>
      <div className="s09-map-field relative aspect-[900/760] w-full">
        <svg
          viewBox={`0 0 ${MAP_VIEW_WIDTH} ${MAP_VIEW_HEIGHT}`}
          className="relative h-full w-full overflow-visible"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <radialGradient id="s09-anchor-bloom" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--wariba-brand-500)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--wariba-brand-500)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Immediate neighbours — geographic context only, almost invisible. */}
          <g aria-hidden="true" fill="var(--wariba-on-dark)" fillOpacity="0.045">
            {NEIGHBOR_COUNTRY_PATHS.map((country) => (
              <path key={country.id} d={country.d} />
            ))}
          </g>

          {/* A soft cobalt bloom anchored on Côte d’Ivoire, WARIBA's visual anchor market. */}
          <circle
            aria-hidden="true"
            cx={nodeById('cote-ivoire').x}
            cy={nodeById('cote-ivoire').y}
            r={220}
            fill="url(#s09-anchor-bloom)"
          />

          {/* The six focus countries — resolving from darkness together. */}
          <g aria-hidden="true" className="s09-country-appear">
            {FOCUS_COUNTRY_PATHS.map((country) => (
              <path
                key={country.id}
                d={country.d}
                fill="color-mix(in srgb, var(--wariba-surface-2) 70%, transparent)"
                stroke="var(--wariba-brand-edge)"
                strokeWidth="1"
              />
            ))}
          </g>

          <g aria-hidden="true">
            {REGIONAL_CONNECTORS.map(([fromId, toId], index) => {
              const from = nodeById(fromId);
              const to = nodeById(toId);
              const d = arcPath(from, to);
              const length = Math.hypot(to.x - from.x, to.y - from.y) * 1.14;
              const timing = CONNECTOR_TIMING[index]!;

              return (
                <g key={`${fromId}-${toId}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--wariba-brand-400)"
                    strokeOpacity="0.5"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    className="wariba-draw"
                    style={
                      {
                        strokeDasharray: length,
                        '--wariba-draw-length': `${length}`,
                        '--wariba-draw-duration': `${timing.durationMs / 1000}s`,
                        '--wariba-draw-delay': `${timing.delayMs / 1000}s`,
                      } as CSSProperties
                    }
                  />
                  <circle
                    r={9}
                    fill="var(--wariba-brand-400)"
                    className="s09-connector-tail"
                    style={
                      {
                        offsetPath: `path('${d}')`,
                        '--s09-head-delay': `${timing.delayMs}ms`,
                      } as CSSProperties
                    }
                  />
                  <circle
                    r={4.5}
                    fill="var(--wariba-on-dark)"
                    className="s09-connector-head"
                    style={
                      {
                        offsetPath: `path('${d}')`,
                        '--s09-head-delay': `${timing.delayMs}ms`,
                      } as CSSProperties
                    }
                  />
                </g>
              );
            })}
          </g>

          <g aria-hidden="true">
            {NODE_SEQUENCE.map((id, index) => {
              const node = nodeById(id);
              const delay = NODE_DELAY_MS[id] ?? 0;
              const labelDelay = delay + LABEL_OFFSET_MS;
              const rippleDelay = delay + 1100 + index * 260;
              const labelAbove = node.y > MAP_VIEW_HEIGHT * 0.5;
              const isAnchor = id === 'cote-ivoire';
              const labelAdjust = LABEL_ADJUST[id];

              return (
                <g key={id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isAnchor ? 21 : 16}
                    fill="var(--wariba-brand-400)"
                    className="s09-node-appear s09-node-ripple"
                    style={
                      {
                        '--s09-node-delay': `${delay}ms`,
                        '--s09-ripple-delay': `${rippleDelay}ms`,
                        opacity: 0.16,
                      } as CSSProperties
                    }
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isAnchor ? 11 : 8.5}
                    fill="none"
                    stroke="var(--wariba-brand-400)"
                    strokeWidth="1.5"
                    className="s09-node-appear s09-node-pulse"
                    style={
                      {
                        '--s09-node-delay': `${delay}ms`,
                        '--s09-pulse-delay': `${delay}ms`,
                        opacity: 0.55,
                      } as CSSProperties
                    }
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isAnchor ? 5 : 4}
                    fill="var(--wariba-color-cobalt-300)"
                    stroke="var(--wariba-color-carbon-980)"
                    strokeWidth="1.5"
                    className="s09-node-appear"
                    style={{ '--s09-node-delay': `${delay}ms` } as CSSProperties}
                  />

                  <text
                    x={node.x + (labelAdjust?.dx ?? 0)}
                    y={labelAbove ? node.y - (isAnchor ? 26 : 22) : node.y + (isAnchor ? 34 : 30)}
                    textAnchor={labelAdjust?.anchor ?? 'middle'}
                    className={`s09-label-appear font-mono font-bold ${
                      COMPACT_ON_MOBILE.has(id) ? 'hidden sm:inline' : ''
                    }`}
                    style={{ '--s09-node-delay': `${labelDelay}ms` } as CSSProperties}
                    fontSize={isAnchor ? 15 : 13}
                    letterSpacing="0.02em"
                    fill="var(--wariba-on-dark)"
                  >
                    {node.city}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)] sm:hidden">
        {COMPACT_LABEL}
      </p>
    </div>
  );
}
