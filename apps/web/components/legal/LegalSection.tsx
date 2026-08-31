import type { ReactNode } from 'react';

export interface LegalSectionProps {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}

/** One numbered chapter inside a legal page's "Texte complet". Body text uses `legal-body-text` spacing via Tailwind prose utilities on children. */
export function LegalSection({ id, number, title, children }: LegalSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-[color:var(--wariba-seam)] pt-8 first:border-t-0 first:pt-0"
    >
      <h2 className="flex items-baseline gap-3 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-on-dark)]">
        <span className="shrink-0 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)]">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-3 grid gap-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)] [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-[color:var(--wariba-on-dark)]">
        {children}
      </div>
    </section>
  );
}
