import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@wariba/ui';

/**
 * Section 11's seven contextual visuals, rebuilt around five reusable
 * object types — a vertical stepper, a pathway card, a "passport" card, a
 * split comparison, and a dual risk rail — so an open answer reads as a
 * real product object, not a row of dots and mono labels. Pure CSS
 * animation (see the `.faq-*` rules in `globals.css`): every entrance plays
 * once on mount, and these components only ever mount while their row is
 * open, so there is nothing to pause, loop, or clean up.
 *
 * No canonical numbers here — every FAQ answer is conceptual, so nothing
 * in these visuals can drift out of sync with real policy.
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

interface StepDef {
  icon: ReactNode;
  label: string;
  caption?: string;
  callout?: string;
}

/** The vertical stepper shared by FAQ 01, 05 and 07 — one icon chip per milestone. */
function VerticalStepper({ steps, accent }: { steps: readonly StepDef[]; accent: string }) {
  return (
    <div className="faq-stepper" style={accentStyle(accent)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const delay = index * 160;
        return (
          <div key={step.label} className="faq-vstep">
            <div className="faq-vstep-rail">
              <span className="faq-vstep-chip" style={delayStyle(delay)}>
                {step.icon}
              </span>
              {!isLast ? <span className="faq-vstep-line" style={delayStyle(delay + 120)} /> : null}
            </div>
            <div className="faq-vstep-body" style={delayStyle(delay + 80)}>
              <p className="faq-vstep-label">{step.label}</p>
              {step.caption ? <p className="faq-vstep-caption">{step.caption}</p> : null}
              {step.callout ? <p className="faq-vstep-callout">{step.callout}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** FAQ 01 — the product ecosystem, as four connected objects. */
export function JourneyFlowVisual() {
  return (
    <div>
      <p className="faq-visual-title">Le parcours produit</p>
      <VerticalStepper
        accent="var(--wariba-brand-400)"
        steps={[
          { icon: <WariBaMarkIcon />, label: 'WARIBA', caption: 'Votre point de départ' },
          { icon: <WariXIcon />, label: 'WariX', caption: 'Où vous tradez' },
          { icon: <ProgressRingIcon />, label: 'Progression', caption: 'Suivie en direct' },
          { icon: <PerformanceIcon />, label: 'Performance', caption: 'Selon votre formule' },
        ]}
      />
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

/** FAQ 05 — reaching the objective still goes through verification. */
export function ValidationTimelineVisual() {
  return (
    <div>
      <p className="faq-visual-title">Après l’objectif</p>
      <VerticalStepper
        accent="var(--wariba-brand-400)"
        steps={[
          { icon: <CheckIcon />, label: 'Objectif atteint' },
          { icon: <ClockIcon />, label: 'En vérification' },
          {
            icon: <CheckIcon />,
            label: 'Validé',
            callout: 'FLEX · une étape Activation s’ajoute ici avant Performance',
          },
          { icon: <PerformanceIcon />, label: 'Étape suivante' },
        ]}
      />
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
            Limite du compte
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

/** FAQ 07 — payout eligibility as a ladder that stops at Review, never Approved. */
export function PayoutLadderVisual() {
  return (
    <div>
      <p className="faq-visual-title">Éligibilité au payout</p>
      <VerticalStepper
        accent="var(--wariba-brand-400)"
        steps={[
          { icon: <CheckIcon />, label: 'Conditions' },
          { icon: <CheckIcon />, label: 'KYC si requis' },
          { icon: <CheckIcon />, label: 'Prêt à demander' },
          { icon: <WariBaMarkIcon />, label: 'Demande' },
          { icon: <ClockIcon />, label: 'Review', caption: 'Jamais garanti à l’avance' },
        ]}
      />
    </div>
  );
}
