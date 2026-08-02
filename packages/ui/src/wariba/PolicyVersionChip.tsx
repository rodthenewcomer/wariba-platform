import { cx } from '../lib/cx';

export interface PolicyVersionChipProps {
  /** e.g. "1.0.0" */
  version: string;
  status: 'draft' | 'published' | 'retired';
  effectiveDateLabel?: string;
  href?: string;
}

const STATUS_LABEL = { draft: 'Brouillon', published: 'Publiée', retired: 'Retirée' } as const;

/** Design System §25.8 — "Règles 1.0.0", always linking to the actual rule text (UX Architecture §21.4). */
export function PolicyVersionChip({
  version,
  status,
  effectiveDateLabel,
  href,
}: PolicyVersionChipProps) {
  const Tag = href ? 'a' : 'span';
  return (
    <Tag
      href={href}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-[var(--wariba-radius-full)] border border-[color:var(--wariba-border-default)]',
        'px-[var(--wariba-space-2)] py-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]',
        href &&
          'hover:border-[color:var(--wariba-border-strong)] hover:text-[color:var(--wariba-text-primary)]',
      )}
    >
      <span className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
        Règles {version}
      </span>
      <span aria-hidden="true">·</span>
      <span>{STATUS_LABEL[status]}</span>
      {effectiveDateLabel ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{effectiveDateLabel}</span>
        </>
      ) : null}
    </Tag>
  );
}
