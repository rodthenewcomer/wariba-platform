import type { ReactNode } from 'react';

export type VisualTone = 'neutral' | 'cobalt' | 'copper' | 'emerald' | 'amber' | 'coral';

const TONE: Record<VisualTone, { edge: string; wash: string; text: string }> = {
  neutral: {
    edge: 'var(--wariba-color-ink-600)',
    wash: 'var(--wariba-color-ink-900)',
    text: 'var(--wariba-color-ink-100)',
  },
  cobalt: {
    edge: 'var(--wariba-accent-indigo-edge)',
    wash: 'var(--wariba-accent-indigo-wash)',
    text: 'var(--wariba-accent-indigo)',
  },
  copper: {
    edge: 'var(--wariba-accent-copper-edge)',
    wash: 'var(--wariba-accent-copper-wash)',
    text: 'var(--wariba-accent-copper)',
  },
  emerald: {
    edge: 'var(--wariba-accent-emerald-edge)',
    wash: 'var(--wariba-accent-emerald-wash)',
    text: 'var(--wariba-accent-emerald)',
  },
  amber: {
    edge: 'var(--wariba-accent-amber-edge)',
    wash: 'var(--wariba-accent-amber-wash)',
    text: 'var(--wariba-accent-amber)',
  },
  coral: {
    edge: 'var(--wariba-accent-red-edge)',
    wash: 'var(--wariba-accent-red-wash)',
    text: 'var(--wariba-accent-red)',
  },
};

export function VisualFrame({
  id,
  title,
  summary,
  textEquivalent,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  textEquivalent: string;
  children: ReactNode;
}) {
  const titleId = `${id.toLowerCase()}-title`;
  const descriptionId = `${id.toLowerCase()}-description`;
  return (
    <figure
      data-help-visual={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="help-visual relative isolate overflow-hidden rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--wariba-color-cobalt-300),transparent)] opacity-70" />
      <header className="border-b border-[color:var(--wariba-color-ink-700)] px-4 py-4 sm:px-6 sm:py-5">
        <p className="wariba-data text-[length:var(--wariba-font-size-label-sm)] font-semibold tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-cobalt-300)]">
          GUIDE VISUEL
        </p>
        <h3
          id={titleId}
          className="mt-2 text-[length:var(--wariba-font-size-heading-md)] font-semibold leading-tight text-[color:var(--wariba-color-bone-50)]"
        >
          {title}
        </h3>
        <p className="mt-1.5 max-w-[64ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
          {summary}
        </p>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
      <figcaption
        id={descriptionId}
        className="border-t border-[color:var(--wariba-color-ink-700)] px-4 py-3 text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)] sm:px-6"
      >
        {textEquivalent}
      </figcaption>
    </figure>
  );
}

export function VisualPanel({
  tone = 'neutral',
  eyebrow,
  title,
  value,
  children,
  className = '',
}: {
  tone?: VisualTone;
  eyebrow?: string;
  title: string;
  value?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = TONE[tone];
  return (
    <section
      className={`help-visual-node rounded-[var(--wariba-radius-lg)] border p-3.5 sm:p-4 ${className}`}
      style={{ borderColor: style.edge, background: style.wash }}
    >
      {eyebrow ? (
        <p
          className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)]"
          style={{ color: style.text }}
        >
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2 first:mt-0">
        <h4 className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
          {title}
        </h4>
        {value ? (
          <span
            className="wariba-data text-[length:var(--wariba-font-size-body-md)] font-semibold"
            style={{ color: style.text }}
          >
            {value}
          </span>
        ) : null}
      </div>
      {children ? (
        <div className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-100)]">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function StepNode({
  index,
  label,
  detail,
  tone = 'neutral',
}: {
  index: number | string;
  label: string;
  detail?: string;
  tone?: VisualTone;
}) {
  const style = TONE[tone];
  return (
    <li className="help-visual-node relative flex min-w-0 gap-3 md:flex-1 md:flex-col">
      <span
        aria-hidden="true"
        className="wariba-data relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-[length:var(--wariba-font-size-label-sm)] font-semibold"
        style={{ borderColor: style.edge, background: style.wash, color: style.text }}
      >
        {index}
      </span>
      <div className="min-w-0 pt-1 md:pt-0">
        <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
          {label}
        </p>
        {detail ? (
          <p className="mt-1 text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
            {detail}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function Flow({ children }: { children: ReactNode }) {
  return (
    <ol className="help-visual-flow relative flex flex-col gap-4 md:flex-row md:gap-3">
      {children}
    </ol>
  );
}

export function VisualLegend({ items }: { items: readonly { tone: VisualTone; label: string }[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-200)]">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ background: TONE[item.tone].text }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
