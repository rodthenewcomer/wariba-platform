import type { ReactNode } from 'react';

/**
 * The Hub's module surface.
 *
 * Every panel on the dashboard is one of these, which is the whole point: the
 * design-system `Card` renders on `--wariba-background-surface`, the general
 * light-first token, while the Hub runs the graphite ladder the workstation
 * uses. Mixing the two produced panels a shade off from their own shell.
 *
 * A module sits one full step above the chrome around it. The sidebar and the
 * header are the application; these are the content, and content that shares
 * its shell's exact value reads as a page with borders drawn on it.
 *
 * Restrained by decision. A 1px seam, a 12px radius, one inset highlight along
 * the top edge to catch the light, and no drop shadow — depth on this surface
 * comes from the material ladder underneath, not from panels hovering above a
 * page. Big shadows, neon rims and glass are how a trading dashboard starts
 * looking like a crypto landing page.
 */
export function HubModule({
  as: Tag = 'section',
  tone = 'default',
  className = '',
  children,
  ...rest
}: {
  as?: 'section' | 'div' | 'article';
  tone?: 'default' | 'raised';
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'className'>) {
  const surface = tone === 'raised' ? 'var(--warix-surface-raised)' : 'var(--warix-surface)';

  return (
    <Tag
      className={`rounded-[12px] border border-[color:var(--warix-border-subtle)] shadow-[inset_0_1px_0_0_var(--warix-highlight-inner)] ${className}`}
      style={{ background: surface }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A module's title row. Small, uppercase, secondary — it names, it does not shout. */
export function HubModuleTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
        {children}
      </h2>
      {action}
    </div>
  );
}
