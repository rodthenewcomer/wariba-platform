'use client';

import type { ComponentType } from 'react';
import { motion } from 'motion/react';

export interface PhaseVisualProps {
  reduced: boolean;
}

export interface PhaseCardProps {
  number: string;
  label: string;
  title: string;
  copy: string;
  accentColor: string;
  Visual: ComponentType<PhaseVisualProps>;
  started: boolean;
  isActive: boolean;
  reduced: boolean;
}

/**
 * One step of the journey. Timing comes entirely from the parent's shared
 * sequence now — `started` mounts the scene and plays its entrance once,
 * `isActive` is the brief window where this is the phase currently
 * receiving the connector's pulse, which is when the card's own edge and
 * number ring light up before settling back to a quieter, still-legible
 * rest state.
 */
export function PhaseCard({
  number,
  label,
  title,
  copy,
  accentColor,
  Visual,
  started,
  isActive,
  reduced,
}: PhaseCardProps) {
  return (
    <motion.article
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-[var(--wariba-radius-2xl)] bg-[color:var(--wariba-surface-1)] p-5 sm:p-6 lg:flex-1"
      style={{
        border: '1px solid',
        borderColor: isActive
          ? `color-mix(in srgb, ${accentColor} 55%, transparent)`
          : 'var(--wariba-seam)',
        transition: 'border-color 0.5s ease',
      }}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={started || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500"
        style={{
          opacity: isActive ? 1 : 0.55,
          background: `radial-gradient(130% 100% at 12% -10%, color-mix(in srgb, ${accentColor} ${isActive ? 20 : 13}%, transparent), transparent 62%)`,
        }}
      />

      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-full font-mono text-xs font-bold transition-[box-shadow,border-color] duration-500"
          style={{
            border: '1px solid',
            borderColor: `color-mix(in srgb, ${accentColor} 45%, transparent)`,
            color: accentColor,
            boxShadow: isActive
              ? `0 0 0 3px color-mix(in srgb, ${accentColor} 22%, transparent)`
              : '0 0 0 0 transparent',
          }}
        >
          {number}
        </span>
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
          {label}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-[color:var(--wariba-on-dark)] sm:text-xl">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
        {copy}
      </p>

      <div className="relative mt-5 min-h-[11rem] flex-1">
        {started || reduced ? <Visual reduced={reduced} /> : null}
      </div>
    </motion.article>
  );
}
