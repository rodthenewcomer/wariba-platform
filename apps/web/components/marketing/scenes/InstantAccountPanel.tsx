import { cx } from '@wariba/ui';

export interface InstantAccountPanelProps {
  sizeLabel: string;
  balanceLabel: string;
  dailyLossLabel: string;
  maximumLossLabel: string;
  exposureLabel: string;
  className?: string;
}

/**
 * INSTANT's visual hook — Phase 3.4.5B.3R2.
 *
 * No portal. INSTANT's entire argument is that the Performance account is
 * already the starting point, so the visual is that account — a dark product
 * UI showing it active, with the rules that actually apply. Every figure is
 * canonical; "ÉVALUATION · AUCUNE" is true by construction, since INSTANT's
 * offer carries no evaluation ruleset at all.
 */
export function InstantAccountPanel({
  sizeLabel,
  balanceLabel,
  dailyLossLabel,
  maximumLossLabel,
  exposureLabel,
  className,
}: InstantAccountPanelProps) {
  return (
    <div
      className={cx(
        'overflow-hidden rounded-[20px] border border-white/10 bg-[#0a0b0f] p-5 sm:p-8',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            WARIBA INSTANT
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">{sizeLabel} · Performance</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-accent-emerald)]">
          <span className="size-1.5 rounded-full bg-[color:var(--wariba-accent-emerald)]" />
          Actif · Simulé
        </span>
      </div>

      <p className="commerce-rule-figure mt-6 text-white">{balanceLabel}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Solde</p>

      <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/10 pt-6 sm:gap-3">
        <Stat label="Limite quotidienne" value={dailyLossLabel} />
        <Stat label="Perte maximale" value={maximumLossLabel} />
        <Stat label="Exposition" value={exposureLabel} tone="cyan" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
          Évaluation
        </p>
        <p className="text-sm font-bold uppercase tracking-[0.1em] text-white/85">Aucune</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'cyan';
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-white/60 sm:text-[10px] sm:tracking-[0.14em]">
        {label}
      </p>
      <p
        className={cx(
          'wariba-figure mt-1.5 whitespace-nowrap text-base font-bold tracking-[-0.02em] sm:text-lg',
          tone === 'cyan' ? 'text-[color:var(--wariba-accent-cyan)]' : 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  );
}
