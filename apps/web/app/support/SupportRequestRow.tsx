import type { SupportTone } from '@wariba/application';
import { HubIcon } from '../../components/hub/icons';
import { StatusPill, type PillTone } from '../../components/hub/StatusPill';

/**
 * One request, as a row rather than a card.
 *
 * §7.1 asks for this explicitly, and the reason is geometry: a card grid puts
 * three requests on a phone screen and forces a horizontal scan across
 * padding. A row list puts eight on the same screen, reads top to bottom, and
 * is what every operational surface in this product already uses.
 *
 * The reference is set in the tabular face and comes first, because it is what
 * a trader reads out when they ask about the request. The state is a pill with
 * a dot *and* a word — colour is never the only carrier (§7.3).
 */

const TONE: Record<SupportTone, PillTone> = {
  neutral: 'neutral',
  progress: 'progress',
  attention: 'attention',
  success: 'success',
  muted: 'neutral',
};

export interface SupportRequestRowProps {
  href: string;
  reference: string;
  categoryLabel: string;
  title: string;
  statusLabel: string;
  tone: SupportTone;
  ageLabel: string;
  /** Set when the request carries a formal contestation. */
  contestationReference?: string | null;
  testId?: string;
}

export function SupportRequestRow({
  href,
  reference,
  categoryLabel,
  title,
  statusLabel,
  tone,
  ageLabel,
  contestationReference = null,
  testId,
}: SupportRequestRowProps) {
  return (
    <a
      href={href}
      data-testid={testId ?? 'support-request-row'}
      data-reference={reference}
      className="flex min-h-16 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-secondary)]">
            {reference}
          </span>
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {categoryLabel}
          </span>
          {contestationReference ? (
            <span
              className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-accent-amber)]"
              data-testid="support-row-contestation"
            >
              {contestationReference}
            </span>
          ) : null}
        </div>
        {/* Truncated rather than wrapped: at 320px a three-line subject turns
            a scannable list into a wall. The full text is on the detail. */}
        <p className="mt-1 truncate text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
          {title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusPill tone={TONE[tone]} size="sm">
            {statusLabel}
          </StatusPill>
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {ageLabel}
          </span>
        </div>
      </div>
      <span aria-hidden="true" className="shrink-0 text-[color:var(--wariba-text-tertiary)]">
        <HubIcon role="chevron" size={18} />
      </span>
    </a>
  );
}
