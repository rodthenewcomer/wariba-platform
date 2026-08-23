import type { HTMLAttributes, ReactNode } from 'react';

/**
 * The Hub's material.
 *
 * Every panel is one of these. The design-system `Card` paints
 * `--wariba-background-surface`, the general light-first token; the Hub runs
 * the graphite ladder the workstation uses, and mixing the two produced panels
 * a shade off from their own shell.
 *
 * ## Tones carry information class, not decoration
 *
 * §6 asks that cards stop all looking identical, and the honest way to do that
 * is to let the tone mean something. `default` is the ordinary module.
 * `raised` is a control region inside one. `accent` is the surface the page's
 * decision sits on — used once per screen, never twice, or it stops meaning
 * "this one". The semantic tones are for state, and a state tone is only ever
 * applied to something that is actually in that state.
 *
 * Depth stays restrained: a 1px seam, a 12px radius, one inset highlight along
 * the top edge, and a shadow only on `accent`. Big shadows and neon rims are
 * how a trading dashboard starts looking like a crypto landing page.
 */

export type SurfaceTone = 'default' | 'raised' | 'accent' | 'emerald' | 'amber' | 'red' | 'cyan';

const TONE: Record<SurfaceTone, { background: string; border: string; shadow: string }> = {
  default: {
    background: 'var(--warix-surface)',
    border: 'var(--warix-border-subtle)',
    shadow: 'inset 0 1px 0 0 var(--warix-highlight-inner)',
  },
  raised: {
    background: 'var(--warix-surface-raised)',
    border: 'var(--warix-border-subtle)',
    shadow: 'inset 0 1px 0 0 var(--warix-highlight-inner)',
  },
  accent: {
    /* A cobalt lift from the top-left, fading into the ordinary module colour.
       Enough to make the page's decision the first surface the eye lands on,
       faint enough that nobody reads it as a coloured card. */
    background:
      'radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--wariba-accent-indigo) 14%, transparent) 0%, transparent 60%), var(--warix-surface)',
    border: 'var(--wariba-accent-indigo-edge)',
    shadow:
      'inset 0 1px 0 0 var(--warix-highlight-inner-strong), 0 18px 44px -30px color-mix(in srgb, var(--wariba-accent-indigo) 70%, transparent)',
  },
  emerald: {
    background:
      'radial-gradient(120% 140% at 0% 0%, var(--wariba-accent-emerald-wash) 0%, transparent 62%), var(--warix-surface)',
    border: 'var(--wariba-accent-emerald-edge)',
    shadow: 'inset 0 1px 0 0 var(--warix-highlight-inner)',
  },
  amber: {
    background:
      'radial-gradient(120% 140% at 0% 0%, var(--wariba-accent-amber-wash) 0%, transparent 62%), var(--warix-surface)',
    border: 'var(--wariba-accent-amber-edge)',
    shadow: 'inset 0 1px 0 0 var(--warix-highlight-inner)',
  },
  red: {
    background:
      'radial-gradient(120% 140% at 0% 0%, var(--wariba-accent-red-wash) 0%, transparent 62%), var(--warix-surface)',
    border: 'var(--wariba-accent-red-edge)',
    shadow: 'inset 0 1px 0 0 var(--warix-highlight-inner)',
  },
  cyan: {
    background:
      'radial-gradient(120% 140% at 0% 0%, var(--wariba-accent-cyan-wash) 0%, transparent 62%), var(--warix-surface)',
    border: 'var(--wariba-accent-cyan-edge)',
    shadow: 'inset 0 1px 0 0 var(--warix-highlight-inner)',
  },
};

export interface SurfaceProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'> {
  as?: 'section' | 'div' | 'article' | 'li';
  tone?: SurfaceTone;
  className?: string;
  children: ReactNode;
}

export function Surface({
  as: Tag = 'section',
  tone = 'default',
  className = '',
  children,
  ...rest
}: SurfaceProps) {
  const style = TONE[tone];
  return (
    <Tag
      className={`rounded-[12px] border ${className}`}
      style={{ background: style.background, borderColor: style.border, boxShadow: style.shadow }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A module's title row. Small, uppercase, secondary — it names, it does not shout. */
export function SurfaceTitle({
  children,
  action,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Tag className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
        {children}
      </Tag>
      {action}
    </div>
  );
}
