import type { CSSProperties } from 'react';
import { REGIONAL_CONNECTORS, REGIONAL_NODES, type RegionalNode } from './afrique-francophone-data';

const VIEW_WIDTH = 440;
const VIEW_HEIGHT = 380;

/* Stagger constants — node lighting first, labels a beat behind each node,
   connector traces only once every node has already appeared, per the
   "emergence" sequence: field → nodes → labels → connectors → ambient. */
const NODE_BASE_MS = 300;
const NODE_STEP_MS = 220;
const LABEL_OFFSET_MS = 160;
const CONNECTOR_BASE_MS = NODE_BASE_MS + REGIONAL_NODES.length * NODE_STEP_MS + 500;
const CONNECTOR_STEP_MS = 180;
const RIPPLE_BASE_MS = 2600;
const RIPPLE_STEP_MS = 900;

function nodeById(id: string): RegionalNode {
  const node = REGIONAL_NODES.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown regional node "${id}".`);
  return node;
}

/**
 * The section's visual hero — a stylised, non-literal West Africa: six
 * glowing market nodes over a dotted cartographic field, connected by a
 * sparse network rather than a full mesh. Brand cartography, not a survey —
 * see `afrique-francophone-data.ts` for what the node positions do and don't
 * claim.
 *
 * All motion here is pure CSS (`app/globals.css`, `.s09-*` rules), timed
 * with inline custom properties rather than driven by React state: it plays
 * once on mount, identically to `Reveal`, and never depends on an
 * IntersectionObserver — a full-page screenshot capture never scrolls, so a
 * scroll-gated entrance would be evidence that cannot be photographed.
 */
export function RegionalMap() {
  const ariaLabel = `Carte des marchés prioritaires WARIBA : ${REGIONAL_NODES.map((node) => `${node.country} (${node.city})`).join(', ')}.`;

  return (
    <div
      className="s09-map-field wariba-visual-card relative aspect-[440/380] w-full overflow-hidden"
      data-variant="panel"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_35%,color-mix(in_srgb,var(--wariba-brand-700)_22%,transparent),transparent_60%)]"
      />

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="relative h-full w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <g aria-hidden="true">
          {REGIONAL_CONNECTORS.map(([fromId, toId], index) => {
            const from = nodeById(fromId);
            const to = nodeById(toId);
            const length = Math.hypot(to.x - from.x, to.y - from.y);
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--wariba-brand-400)"
                strokeOpacity="0.4"
                strokeWidth="1.25"
                className="wariba-draw"
                style={
                  {
                    strokeDasharray: length,
                    '--wariba-draw-length': `${length}`,
                    '--wariba-draw-delay': `${(CONNECTOR_BASE_MS + index * CONNECTOR_STEP_MS) / 1000}s`,
                  } as CSSProperties
                }
              />
            );
          })}
        </g>

        <g aria-hidden="true">
          {REGIONAL_NODES.map((node, index) => {
            const delay = NODE_BASE_MS + index * NODE_STEP_MS;
            const labelDelay = delay + LABEL_OFFSET_MS;
            const rippleDelay = RIPPLE_BASE_MS + index * RIPPLE_STEP_MS;
            const labelAbove = node.y > VIEW_HEIGHT * 0.55;

            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={13}
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
                  r={7}
                  fill="var(--wariba-brand-400)"
                  className="s09-node-appear s09-node-pulse"
                  style={
                    {
                      '--s09-node-delay': `${delay}ms`,
                      '--s09-pulse-delay': `${delay}ms`,
                      opacity: 0.32,
                    } as CSSProperties
                  }
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={3.25}
                  fill="var(--wariba-color-cobalt-300)"
                  stroke="var(--wariba-color-carbon-980)"
                  strokeWidth="1.5"
                  className="s09-node-appear"
                  style={{ '--s09-node-delay': `${delay}ms` } as CSSProperties}
                />

                <text
                  x={node.x}
                  y={labelAbove ? node.y - 16 : node.y + 24}
                  textAnchor="middle"
                  className="s09-label-appear font-mono font-bold"
                  style={{ '--s09-node-delay': `${labelDelay}ms` } as CSSProperties}
                  fontSize="10.5"
                  letterSpacing="0.02em"
                  fill="var(--wariba-on-dark)"
                >
                  {node.city}
                </text>
                <text
                  x={node.x}
                  y={labelAbove ? node.y - 5 : node.y + 35}
                  textAnchor="middle"
                  className="s09-label-appear font-mono"
                  style={{ '--s09-node-delay': `${labelDelay}ms` } as CSSProperties}
                  fontSize="8"
                  letterSpacing="0.04em"
                  fill="var(--wariba-on-dark-dim)"
                >
                  {node.country.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
