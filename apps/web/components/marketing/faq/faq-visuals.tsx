import type { CSSProperties } from 'react';
import { Icon } from '@wariba/ui';

/**
 * Section 11's seven contextual visuals. Each of the seven uses one of five
 * distinct grammars — ecosystem map, pathway cards, a passport card, a
 * split comparison, a verification gate, dual risk rails, or a readiness
 * checklist — deliberately never the same silhouette twice, so an open
 * answer reads as one of seven real product objects rather than the same
 * dot-and-line component wearing different labels.
 *
 * Pure CSS animation throughout (see the `.faq-*` rules in `globals.css`):
 * every entrance plays once on mount, and these components only ever mount
 * while their row is open, so there is nothing to pause, loop, or clean up.
 * No canonical numbers here — every FAQ answer is conceptual, so nothing in
 * these visuals can drift out of sync with real policy.
 */

function delayStyle(ms: number): CSSProperties {
  return { '--faq-delay': `${ms}ms` } as CSSProperties;
}

function accentStyle(color: string): CSSProperties {
  return { '--faq-accent': color } as CSSProperties;
}

function WariXIcon() {
  return (
    <Icon size="sm">
      <rect x="3.5" y="5" width="17" height="12" rx="1.5" />
      <path d="M7 14l3-4 2.5 2.5L16.5 8" />
    </Icon>
  );
}

function ProgressRingIcon() {
  return (
    <Icon size="sm">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5A7.5 7.5 0 0 1 19.5 12" />
    </Icon>
  );
}

function PerformanceIcon() {
  return (
    <Icon size="sm">
      <path d="M12 3.5 19 6v6c0 4.2-2.8 7.3-7 8.5-4.2-1.2-7-4.3-7-8.5V6l7-2.5Z" />
    </Icon>
  );
}

function WariBaMarkIcon() {
  return (
    <Icon size="sm">
      <path d="M4 6.5 8 17l4-7 4 7 4-10.5" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon size="sm">
      <path d="M5 12.5 9.5 17 19 6.5" />
    </Icon>
  );
}

function ClockIcon() {
  return (
    <Icon size="sm">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </Icon>
  );
}

function DepositIcon() {
  return (
    <Icon size="sm">
      <path d="M4 10.5 12 5l8 5.5" />
      <path d="M5.5 10.5V18h13v-7.5" />
      <path d="M10 18v-4h4v4" />
    </Icon>
  );
}

function SimulatedTokenIcon() {
  return (
    <Icon size="sm">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M9 12.5 11 14.5 15.5 9.5" />
    </Icon>
  );
}

/*
 * FAQ 01 — a hub-and-spoke ecosystem map, not a sequence. WARIBA is the one
 * hub; WariX, Progression and Performance are three things that hang off it
 * at once, which is the actual shape of the product (you don't "finish"
 * WariX before Progression exists) — a linear chain would have implied an
 * order that isn't true.
 */
const ECO_NODES = [
  { id: 'warix', icon: <WariXIcon />, label: 'WariX', top: '14%' },
  { id: 'progression', icon: <ProgressRingIcon />, label: 'Progression', top: '50%' },
  { id: 'performance', icon: <PerformanceIcon />, label: 'Performance', top: '86%' },
] as const;

export function JourneyFlowVisual() {
  return (
    <div>
      <p className="faq-visual-title">L’écosystème WARIBA</p>
      <div className="faq-eco">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="faq-eco-lines"
          aria-hidden="true"
        >
          {ECO_NODES.map((node, index) => (
            <path
              key={node.id}
              d={`M22,50 L78,${node.top.replace('%', '')}`}
              pathLength={100}
              className="faq-eco-line"
              style={delayStyle(index * 140)}
            />
          ))}
        </svg>

        <div className="faq-eco-hub">
          <span className="faq-eco-hub-icon">
            <WariBaMarkIcon />
          </span>
          <span className="faq-eco-hub-label">WARIBA</span>
        </div>

        {ECO_NODES.map((node, index) => (
          <div
            key={node.id}
            className="faq-eco-node"
            style={{ top: node.top, ...delayStyle(index * 140 + 220) }}
          >
            <span className="faq-eco-node-icon">{node.icon}</span>
            <span className="faq-eco-node-label">{node.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** FAQ 02 — three pathway cards, each a small product object of its own. */
export function PathwayBranchVisual() {
  const paths = [
    { id: 'one', label: 'ONE', accent: 'var(--wariba-brand-400)', steps: ['Évaluation'] },
    { id: 'flex', label: 'FLEX', accent: '#B9B2FF', steps: ['Évaluation', 'Activation'] },
    { id: 'instant', label: 'INSTANT', accent: 'var(--wariba-accent-cyan)', steps: [] },
  ] as const;

  return (
    <div>
      <p className="faq-visual-title">Trois parcours, une destination</p>
      <div className="faq-pathway-grid">
        {paths.map((path, pathIndex) => (
          <div
            key={path.id}
            className="faq-pathway-card"
            style={{ ...accentStyle(path.accent), ...delayStyle(pathIndex * 100) }}
          >
            <div className="faq-pathway-header">
              <span className="faq-pathway-token">{path.label}</span>
            </div>
            <div className="faq-pathway-body">
              {path.steps.length === 0 ? (
                <span className="faq-pathway-arrow" aria-hidden="true">
                  →
                </span>
              ) : (
                path.steps.map((step) => (
                  <div key={step}>
                    <div className="faq-pathway-step">
                      <span className="faq-pathway-step-dot" aria-hidden="true" />
                      {step}
                    </div>
                    <span className="faq-pathway-step-connector" aria-hidden="true" />
                  </div>
                ))
              )}
              <span className="faq-pathway-end">Performance</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** FAQ 03 — a Performance account "passport", no fake balance. */
export function PerformanceTokenVisual() {
  return (
    <div className="faq-passport">
      <div className="faq-passport-row">
        <span className="faq-passport-brand">WARIBA</span>
        <span className="faq-passport-badge">Compte simulé</span>
      </div>
      <p className="faq-passport-wordmark">Performance</p>
      <p className="faq-passport-note">Conditions liées aux payouts</p>
      <span className="faq-passport-edge" aria-hidden="true" />
    </div>
  );
}

/** FAQ 04 — simulated size vs. real capital, one lit, one deliberately muted. */
export function SimulatedDistinctionVisual() {
  return (
    <div>
      <p className="faq-visual-title">Ce que le compte représente</p>
      <div className="faq-split">
        <div className="faq-split-card" data-active="true" style={delayStyle(0)}>
          <span className="faq-split-icon" aria-hidden="true">
            <SimulatedTokenIcon />
          </span>
          <p className="faq-split-label">Taille nominale</p>
          <p className="faq-split-value">Compte simulé</p>
        </div>
        <span className="faq-split-sign" aria-hidden="true">
          ≠
        </span>
        <div className="faq-split-card" data-active="false" style={delayStyle(160)}>
          <span className="faq-split-icon" aria-hidden="true">
            <DepositIcon />
          </span>
          <p className="faq-split-label">Capital réel</p>
          <p className="faq-split-value">Dépôt bancaire</p>
        </div>
      </div>
    </div>
  );
}

/*
 * FAQ 05 — a verification gate, not a timeline. "En vérification" is drawn
 * as a checkpoint the state passes through (bracketed, distinct from the
 * plain circles either side of it), and what comes after branches by
 * family instead of continuing as one line — ONE and FLEX diverge exactly
 * where the real product diverges.
 */
export function ValidationTimelineVisual() {
  return (
    <div>
      <p className="faq-visual-title">Après l’objectif</p>
      <div className="faq-gate-row">
        <div className="faq-gate-node" style={delayStyle(0)}>
          <span className="faq-gate-icon">
            <CheckIcon />
          </span>
          <span className="faq-gate-label">Objectif</span>
        </div>
        <span className="faq-gate-connector" style={delayStyle(120)} />
        <div className="faq-gate-node faq-gate-node-gate" style={delayStyle(220)}>
          <span className="faq-gate-bracket faq-gate-bracket-left" aria-hidden="true" />
          <span className="faq-gate-icon">
            <ClockIcon />
          </span>
          <span className="faq-gate-label">Vérification</span>
          <span className="faq-gate-bracket faq-gate-bracket-right" aria-hidden="true" />
        </div>
        <span className="faq-gate-connector" style={delayStyle(340)} />
        <div className="faq-gate-node" style={delayStyle(440)}>
          <span className="faq-gate-icon">
            <CheckIcon />
          </span>
          <span className="faq-gate-label">Validé</span>
        </div>
      </div>

      <div className="faq-gate-branches" style={delayStyle(560)}>
        <div className="faq-gate-branch" style={accentStyle('var(--wariba-brand-400)')}>
          <span className="faq-gate-branch-token">ONE</span>
          <span aria-hidden="true">→</span>
          <span className="faq-gate-branch-end">Performance</span>
        </div>
        <div className="faq-gate-branch" style={accentStyle('#B9B2FF')}>
          <span className="faq-gate-branch-token">FLEX</span>
          <span aria-hidden="true">→</span>
          <span>Activation</span>
          <span aria-hidden="true">→</span>
          <span className="faq-gate-branch-end">Performance</span>
        </div>
      </div>
      <p className="faq-gate-note">INSTANT commence déjà directement sur Performance.</p>
    </div>
  );
}

/** FAQ 06 — two independent risk rails, never merged into one severity. */
export function RiskRailsVisual() {
  return (
    <div className="faq-rails">
      <div>
        <div className="faq-rail-head">
          <span className="faq-rail-label">Limite quotidienne</span>
          <span className="faq-rail-status" style={accentStyle('var(--wariba-brand-400)')}>
            Blocage temporaire
          </span>
        </div>
        <div className="faq-rail-track" style={accentStyle('var(--wariba-brand-400)')}>
          <div className="faq-rail-fill" style={{ width: '58%' }} />
          <span className="faq-rail-marker" style={{ left: '58%' }} />
          <span className="faq-rail-limit" aria-hidden="true" />
        </div>
        <p className="faq-rail-foot">Position actuelle → limite du jour</p>
      </div>

      <div>
        <div className="faq-rail-head">
          <span className="faq-rail-label">Perte maximale</span>
          <span className="faq-rail-status" style={accentStyle('var(--wariba-accent-amber)')}>
            Fin de compte possible
          </span>
        </div>
        <div className="faq-rail-track" style={accentStyle('var(--wariba-accent-amber)')}>
          <div className="faq-rail-fill" style={{ width: '74%' }} />
          <span className="faq-rail-marker" style={{ left: '74%' }} />
          <span className="faq-rail-limit" aria-hidden="true" />
        </div>
        <p className="faq-rail-foot">Position actuelle → limite du compte</p>
      </div>
    </div>
  );
}

/*
 * FAQ 07 — a readiness checklist that resolves into a separate request-state
 * card, not a ladder. "En revue" (not "en examen") matches the Help
 * Center's own payout status table; the request card never shows Approved
 * or Paid — those are real statuses this section deliberately doesn't
 * reach for.
 */
const PAYOUT_CHECKS = ['Conditions du cycle', 'Conditions Performance', 'KYC si requis'] as const;

export function PayoutLadderVisual() {
  return (
    <div>
      <p className="faq-visual-title">Éligibilité au payout</p>
      <ul className="faq-checklist">
        {PAYOUT_CHECKS.map((label, index) => (
          <li key={label} style={delayStyle(index * 140)}>
            <span className="faq-checklist-mark">
              <CheckIcon />
            </span>
            {label}
          </li>
        ))}
      </ul>

      <div className="faq-readiness" style={delayStyle(PAYOUT_CHECKS.length * 140)}>
        <span className="faq-readiness-count">3/3</span>
        <span className="faq-readiness-label">Demande disponible</span>
      </div>

      <div className="faq-request-card" style={delayStyle(PAYOUT_CHECKS.length * 140 + 220)}>
        <p className="faq-request-title">Demande de payout</p>
        <div className="faq-request-status-row">
          <span className="faq-request-status-label">Statut</span>
          <span className="faq-request-status-badge">En revue</span>
        </div>
        <p className="faq-request-note">Selon les règles applicables</p>
      </div>
    </div>
  );
}
