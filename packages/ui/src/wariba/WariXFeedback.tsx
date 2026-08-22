'use client';

import { useEffect, useId, useRef, type ComponentType, type ReactNode } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CircleMinus,
  Info,
  TriangleAlert,
  X,
  type LucideProps,
} from 'lucide-react';
import { cx } from '../lib/cx';

export type WariXFeedbackTone = 'neutral' | 'information' | 'success' | 'warning' | 'danger';

const TONE: Record<
  WariXFeedbackTone,
  { border: string; wash: string; text: string; icon: typeof Info }
> = {
  neutral: {
    border: 'border-[color:var(--wariba-component-workstation-seam-strong)]',
    wash: 'bg-[color:var(--wariba-component-workstation-wash-neutral)]',
    text: 'text-[color:var(--wariba-component-workstation-text-secondary)]',
    icon: CircleMinus,
  },
  information: {
    border: 'border-[color:var(--wariba-component-workstation-seam-active)]',
    wash: 'bg-[color:var(--wariba-component-workstation-wash-selected)]',
    text: 'text-[color:var(--wariba-component-workstation-interaction-selected-text)]',
    icon: Info,
  },
  success: {
    border: 'border-[color:var(--wariba-status-success-border)]',
    wash: 'bg-[color:var(--wariba-component-workstation-wash-buy)]',
    text: 'text-[color:var(--wariba-component-workstation-trading-buy)]',
    icon: CircleCheck,
  },
  warning: {
    border: 'border-[color:var(--wariba-status-warning-border)]',
    wash: 'bg-[color:var(--wariba-component-workstation-wash-warning)]',
    text: 'text-[color:var(--wariba-component-workstation-trading-warning)]',
    icon: TriangleAlert,
  },
  danger: {
    border: 'border-[color:var(--wariba-status-danger-border)]',
    wash: 'bg-[color:var(--wariba-component-workstation-wash-sell)]',
    text: 'text-[color:var(--wariba-component-workstation-trading-sell)]',
    icon: CircleAlert,
  },
};

function ToneIcon({
  tone,
  size = 18,
  className,
}: {
  tone: WariXFeedbackTone;
  size?: number;
  className?: string;
}) {
  const Icon = TONE[tone].icon as ComponentType<LucideProps>;
  return (
    <Icon
      aria-hidden="true"
      className={cx('shrink-0', className)}
      focusable="false"
      size={size}
      strokeWidth={2}
    />
  );
}

export interface WariXInlineStatusProps {
  title: string;
  description?: ReactNode;
  tone?: WariXFeedbackTone;
  compact?: boolean;
  className?: string;
  testId?: string;
}

export function WariXInlineStatus({
  title,
  description = null,
  tone = 'neutral',
  compact = false,
  className,
  testId,
}: WariXInlineStatusProps) {
  const style = TONE[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid={testId}
      className={cx(
        'flex items-start border shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]',
        compact
          ? 'gap-1.5 rounded-[7px] px-2 py-1'
          : 'gap-2 rounded-[var(--wariba-component-workstation-radius-panel)] px-3 py-2.5',
        style.border,
        style.wash,
        className,
      )}
    >
      <ToneIcon tone={tone} size={compact ? 15 : 18} className={style.text} />
      <div className="min-w-0">
        <p
          className={cx(
            'font-semibold leading-tight',
            compact
              ? 'text-[length:var(--wariba-component-workstation-type-label)]'
              : 'text-[length:var(--wariba-component-workstation-type-data-strong)]',
            style.text,
          )}
        >
          {title}
        </p>
        {description ? (
          <div className="mt-1 text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-secondary)]">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface WariXToastProps extends WariXInlineStatusProps {
  action?: ReactNode;
  onDismiss?: () => void;
}

export function WariXToast({
  title,
  description,
  tone = 'neutral',
  action,
  onDismiss,
  className,
}: WariXToastProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex w-full max-w-sm items-start gap-2 rounded-[var(--wariba-component-workstation-radius-panel)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] p-3 shadow-[var(--wariba-component-workstation-elevation-popover),inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)]',
        className,
      )}
    >
      <ToneIcon tone={tone} className={TONE[tone].text} />
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--wariba-component-workstation-type-data-strong)] font-semibold text-[color:var(--wariba-component-workstation-text-primary)]">
          {title}
        </p>
        {description ? (
          <div className="mt-0.5 text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-secondary)]">
            {description}
          </div>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Fermer"
          onClick={onDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[color:var(--wariba-component-workstation-text-tertiary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
        >
          <X aria-hidden="true" size={18} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

export function WariXPopover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-[var(--wariba-component-workstation-radius-panel)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] shadow-[var(--wariba-component-workstation-elevation-popover),inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface WariXEmptyStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  tone?: WariXFeedbackTone;
  className?: string;
}

export function WariXEmptyState({
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: WariXEmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-[var(--wariba-component-workstation-radius-panel)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-6 py-8 text-center shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]',
        className,
      )}
    >
      <span
        className={cx(
          'mb-3 flex h-10 w-10 items-center justify-center rounded-[10px]',
          TONE[tone].wash,
          TONE[tone].text,
        )}
      >
        <ToneIcon tone={tone} size={22} />
      </span>
      <p className="text-[length:var(--wariba-component-workstation-type-module-title)] font-semibold text-[color:var(--wariba-component-workstation-text-primary)]">
        {title}
      </p>
      <div className="mt-1 max-w-sm text-[length:var(--wariba-component-workstation-type-data)] leading-relaxed text-[color:var(--wariba-component-workstation-text-secondary)]">
        {description}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export interface WariXDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: WariXFeedbackTone;
  children: ReactNode;
  footer?: ReactNode;
}

const DIALOG_WIDTH: Record<NonNullable<WariXDialogProps['size']>, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

export function WariXDialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  tone = 'neutral',
  children,
  footer,
}: WariXDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
      className={cx(
        'w-[calc(100%-2rem)] rounded-[var(--wariba-component-workstation-radius-panel)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] p-0 text-[color:var(--wariba-component-workstation-text-primary)] shadow-[var(--wariba-component-workstation-elevation-popover),inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] backdrop:bg-[color:var(--wariba-component-workstation-surface-overlay-backdrop)] backdrop:backdrop-blur-[2px] motion-safe:animate-[wariba-modal-enter_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-enter)] backdrop:motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-enter)]',
        DIALOG_WIDTH[size],
      )}
    >
      <div className="flex items-start gap-3 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-4 py-3">
        <span
          className={cx(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]',
            TONE[tone].wash,
            TONE[tone].text,
          )}
        >
          <ToneIcon tone={tone} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="text-[length:var(--wariba-component-workstation-type-module-title)] font-semibold text-[color:var(--wariba-component-workstation-text-primary)]"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-0.5 text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-secondary)]"
            >
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Fermer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[color:var(--wariba-component-workstation-text-tertiary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
        >
          <X aria-hidden="true" size={19} strokeWidth={2} />
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
      {footer ? (
        <div className="flex justify-end gap-2 border-t border-[color:var(--wariba-component-workstation-border-hairline)] px-4 py-3">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
