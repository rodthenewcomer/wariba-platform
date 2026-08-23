import type { ReactNode } from 'react';
import { HubIcon, type HubIconRole } from './icons';
import { Surface } from './Surface';

/**
 * Nothing here yet — said in a way that is useful.
 *
 * An empty state is not a failure message, and it is not a giant grey box with
 * a shrug in it. It has one job: say what is absent, in the trader's words,
 * and offer the thing that would fill it. §25's examples are all one short
 * sentence and one action, which is the right shape.
 *
 * Compact on purpose. Absence should occupy the space of absence, not reserve
 * the footprint of the content it stands in for — which is the mistake the
 * dashboard's empty chart made before Phase 1.1 removed it.
 */
export function HubEmptyState({
  icon = 'dashboard',
  title,
  description,
  action,
  compact = false,
}: {
  icon?: HubIconRole;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Surface
      data-testid="hub-empty-state"
      className={`flex flex-col items-start gap-3 ${compact ? 'p-5' : 'p-6 sm:p-8'}`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--warix-surface-raised)] text-[color:var(--wariba-text-tertiary)]"
      >
        <HubIcon role={icon} size={22} />
      </span>
      <div>
        <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          {title}
        </p>
        {description ? (
          <p className="mt-1.5 max-w-[46ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </Surface>
  );
}
