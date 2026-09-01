'use client';

import { motion } from 'motion/react';

export interface MonolithSpec {
  family: 'ONE' | 'FLEX' | 'INSTANT';
  color: string;
  lifecycle: string;
  /** Tailwind width/height classes and a positioning className — the compositional-only depth ("not a ranking," per the brief). */
  className: string;
  bodyHeightClass: string;
  floatDuration: number;
  floatDelay: number;
  floatAmplitude: number;
  reduced: boolean;
}

const SEAM_COUNT = 6;

/**
 * One WARIBA product monolith.
 *
 * The first pass read as a bar chart: discrete horizontal bars, increasing
 * opacity bottom-to-top, no real object underneath the labels. This one is
 * a single tilted product object — a thick illuminated cap with a neutral
 * WARIBA signal mark, a continuous extruded body with vertical ribs, and a
 * darker right-edge strip standing in for a visible side face. The family
 * names remain semantic only: this is a product sculpture, not a second
 * comparison UI or a borrowed competitor mark.
 * The tilt is one constant `rotateY`/`rotateX` on the whole object, not a
 * per-face 3D construction — legible at any size, still reads as turned in
 * space rather than flat-on. DOM + CSS + Motion only, no Three.js/WebGL.
 */
export function PathMonolith({
  family,
  color,
  lifecycle,
  className,
  bodyHeightClass,
  floatDuration,
  floatDelay,
  floatAmplitude,
  reduced,
}: MonolithSpec) {
  return (
    <motion.div
      {...(!reduced
        ? {
            animate: { y: [0, -floatAmplitude, 0] },
            transition: {
              duration: floatDuration,
              delay: floatDelay,
              repeat: Infinity,
              repeatType: 'mirror' as const,
              ease: 'easeInOut' as const,
            },
          }
        : {})}
      className={`group absolute ${className}`}
      style={{ perspective: '700px' }}
    >
      <div
        className="relative h-full w-full"
        style={{ transform: 'rotateY(-20deg) rotateX(6deg)', transformStyle: 'preserve-3d' }}
        tabIndex={0}
        role="group"
        aria-label={`${family} — ${lifecycle}`}
      >
        {/* Ambient family glow, clipped by the hero section's own overflow-hidden. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -inset-y-10 -z-10 blur-3xl"
          style={{
            background: `radial-gradient(ellipse at 50% 35%, color-mix(in srgb, ${color} 34%, transparent), transparent 68%)`,
          }}
        />

        {/* Top cap — no product copy or third-party logo inside the sculpture. */}
        <div
          className="relative flex aspect-[1.3] items-center justify-center overflow-hidden rounded-[var(--wariba-radius-xl)] border"
          style={{
            borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
            background: `linear-gradient(155deg, color-mix(in srgb, ${color} 30%, #0a0a0d) 0%, color-mix(in srgb, ${color} 10%, #0a0a0d) 55%, #08080a 100%)`,
            boxShadow: `inset 0 1px 0 color-mix(in srgb, ${color} 60%, transparent), 0 18px 40px -18px color-mix(in srgb, ${color} 45%, transparent)`,
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-60"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 35%, transparent), transparent)`,
            }}
          />
          <svg
            aria-hidden="true"
            className="relative h-9 w-12 sm:h-11 sm:w-14"
            viewBox="0 0 56 40"
            fill="none"
          >
            <path d="M5 29.5 19 21l10 5.75L51 12" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
            <path d="M37 12h14v14" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
          </svg>
        </div>

        {/* Extruded body — one continuous surface, never a filled bar. */}
        <div
          className={`relative -mt-1 overflow-hidden rounded-b-[var(--wariba-radius-lg)] border border-t-0 ${bodyHeightClass}`}
          style={{
            borderColor: `color-mix(in srgb, ${color} 28%, transparent)`,
            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 16%, #050506) 0%, #050506 70%)`,
          }}
        >
          {/* Faint vertical ribs: material texture, never a performance chart. */}
          {Array.from({ length: SEAM_COUNT }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-white/[0.06]"
              style={{ left: `${((index + 1) / (SEAM_COUNT + 1)) * 100}%` }}
            />
          ))}

          {/* Right edge — a darker strip standing in for a visible side face. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-2.5"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 30%, transparent), transparent)`,
              opacity: 0.5,
            }}
          />
          {/* Left edge — a faint highlight, as if catching ambient light. */}
          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-white/10" />

          {/* Lifecycle — desktop hover/focus, integrated into the object itself. */}
          <div className="pointer-events-none absolute inset-x-2 bottom-3 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <p className="text-[10px] font-medium leading-tight text-[color:var(--wariba-on-dark-muted)]">
              {lifecycle}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
