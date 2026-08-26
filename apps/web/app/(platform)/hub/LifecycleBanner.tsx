import type { AccountLifecycleView } from '@wariba/application';
import { HubIcon, type HubIconRole } from '../../../components/hub/icons';
import { Surface, type SurfaceTone } from '../../../components/hub/Surface';
import { ActionLink } from '../../../components/hub/Action';

/**
 * The band that appears when the account is doing something other than
 * ordinary trading.
 *
 * ## Why a banner and not a status pill
 *
 * Four moments in an account's life change what the trader should do next, and
 * a pill in a corner is not enough for any of them:
 *
 * - **Objectif atteint** — they have hit the target and must not now relax.
 *   Every rule still applies until the session closes. This is the single most
 *   expensive misunderstanding available in a prop product.
 * - **Vérification en cours** — the session has closed and nothing is required
 *   of them. Without this they refresh, and eventually they email support.
 * - **Évaluation réussie** — worth marking properly, once.
 * - **Compte échoué** — must be impossible to miss, and must say which rule,
 *   when, and what can be done now.
 *
 * ## Restraint
 *
 * The success case gets a check mark and a colour. It does not get confetti, a
 * full-screen takeover or a sound. A trader who has just passed an evaluation
 * is about to be given money to manage; a product that throws a party at that
 * moment has told them something about its seriousness.
 */

const TONE_SURFACE: Record<AccountLifecycleView['tone'], SurfaceTone> = {
  neutral: 'default',
  progress: 'cyan',
  attention: 'amber',
  success: 'emerald',
  danger: 'red',
};

const TONE_ICON: Record<AccountLifecycleView['tone'], HubIconRole> = {
  neutral: 'pending',
  progress: 'pending',
  attention: 'warning',
  success: 'success',
  danger: 'warning',
};

const TONE_COLOR: Record<AccountLifecycleView['tone'], string> = {
  neutral: 'var(--wariba-text-secondary)',
  progress: 'var(--wariba-accent-cyan)',
  attention: 'var(--wariba-accent-amber)',
  success: 'var(--wariba-accent-emerald)',
  danger: 'var(--wariba-accent-red)',
};

export interface LifecycleBannerProps {
  lifecycle: AccountLifecycleView;
  /** Rule, threshold, time — only ever supplied for a real recorded breach. */
  evidence?: readonly { label: string; value: string }[];
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  /**
   * A third way out, for the one state that needs three.
   *
   * A breached account offers: buy another, contest the decision, read the
   * detail. Two of those are decisions and the third is just navigation, so it
   * renders as a quiet link rather than a third button — three equal-weight
   * buttons on one banner is the same as none.
   */
  tertiaryAction?: { label: string; href: string };
}

/** States that warrant taking over a band of the dashboard. */
const BANNER_STATES = new Set([
  'objective_reached',
  'under_review',
  'passed',
  'funded_preparing',
  'breached',
  'evaluation_locked',
  'inactive',
  'pending_activation',
]);

export function shouldShowLifecycleBanner(lifecycle: AccountLifecycleView): boolean {
  return BANNER_STATES.has(lifecycle.state);
}

export function LifecycleBanner({
  lifecycle,
  evidence = [],
  action,
  secondaryAction,
  tertiaryAction,
}: LifecycleBannerProps) {
  return (
    <Surface
      tone={TONE_SURFACE[lifecycle.tone]}
      data-testid="lifecycle-banner"
      data-state={lifecycle.state}
      className="p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: `color-mix(in srgb, ${TONE_COLOR[lifecycle.tone]} 16%, transparent)`,
              color: TONE_COLOR[lifecycle.tone],
            }}
          >
            <HubIcon role={TONE_ICON[lifecycle.tone]} size={20} active />
          </span>
          <div className="min-w-0">
            <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {lifecycle.label}
            </p>
            <p className="mt-1 max-w-[56ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {lifecycle.description}
            </p>

            {evidence.length > 0 ? (
              <dl className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2">
                {evidence.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                      {item.label}
                    </dt>
                    <dd className="wariba-data mt-0.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        {action || secondaryAction || tertiaryAction ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action ? (
              <ActionLink
                href={action.href}
                variant={lifecycle.tone === 'danger' ? 'danger' : 'primary'}
                size="sm"
              >
                {action.label}
              </ActionLink>
            ) : null}
            {secondaryAction ? (
              <ActionLink href={secondaryAction.href} variant="secondary" size="sm">
                {secondaryAction.label}
              </ActionLink>
            ) : null}
            {tertiaryAction ? (
              <ActionLink href={tertiaryAction.href} variant="ghost" size="sm">
                {tertiaryAction.label}
              </ActionLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
