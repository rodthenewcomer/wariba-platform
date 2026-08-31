'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRightIcon } from '@wariba/ui';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';

/**
 * A deliberately non-authoritative demonstration of the risk surface.
 *
 * This is not an account snapshot and it never derives a rule: its purpose is
 * to make the relationship between a current position and its boundary legible
 * before the visitor encounters the WariX product surface below.
 */
export function RiskField() {
  const reduced = useHydratedReducedMotion();

  return (
    <section
      className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)]"
      aria-labelledby="risk-field-title"
    >
      <Image
        src="/images/wariba-trader-abidjan.webp"
        alt=""
        fill
        sizes="(min-width: 1024px) 42vw, 0px"
        className="pointer-events-none -z-20 hidden object-cover object-[78%_center] opacity-45 lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--wariba-color-carbon-980)_0%,var(--wariba-color-carbon-980)_31%,color-mix(in_srgb,var(--wariba-color-carbon-980)_88%,transparent)_59%,color-mix(in_srgb,var(--wariba-color-carbon-980)_48%,transparent)_100%)]"
      />

      <div className="mx-auto grid min-h-[min(108svh,920px)] max-w-[var(--wariba-shell-max)] items-center gap-12 px-[var(--wariba-shell-gutter)] py-20 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(32rem,1.08fr)] lg:py-28">
        <div className="relative z-10 max-w-[31rem]">
          <p className="wariba-eyebrow">Risque en temps réel</p>
          <h2 id="risk-field-title" className="wariba-section-title mt-5 max-w-[10ch]">
            Voyez la limite avant de l’atteindre.
          </h2>
          <p className="wariba-lead mt-6 max-w-[29rem]">
            WARIBA affiche votre marge restante, votre limite quotidienne et votre perte maximale
            pendant que vous tradez.
          </p>
          <p className="mt-4 max-w-[29rem] text-sm leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
            Vous savez où vous en êtes — avant qu’une limite ne devienne un problème.
          </p>
          <Link href="/aide/risque-regles" className="wariba-cta-secondary mt-9">
            Voir comment WARIBA gère le risque
            <ArrowRightIcon size="sm" />
          </Link>
        </div>

        <figure className="relative m-0 min-w-0" aria-labelledby="risk-field-caption">
          <div
            aria-hidden="true"
            className="absolute -inset-x-5 -inset-y-8 bg-[radial-gradient(ellipse_at_50%_52%,color-mix(in_srgb,var(--wariba-color-cobalt-500)_16%,transparent),transparent_66%)] blur-2xl"
          />
          <div className="relative overflow-hidden border-y border-[color:color-mix(in_srgb,var(--wariba-color-ink-100)_18%,transparent)] py-5 sm:border sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-40 [background-image:linear-gradient(color-mix(in_srgb,var(--wariba-color-ink-100)_7%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--wariba-color-ink-100)_7%,transparent)_1px,transparent_1px)] [background-size:28px_28px]"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-4 border-b border-[color:var(--wariba-seam)] pb-4">
                <div>
                  <p className="font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[color:var(--wariba-on-dark-muted)]">
                    RISK FIELD
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--wariba-on-dark-dim)]">
                    Démonstration · données simulées
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[0.65rem] font-semibold tracking-[0.14em] text-[color:var(--wariba-brand-300)]">
                  <motion.span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-[color:var(--wariba-brand-400)]"
                    {...(!reduced
                      ? {
                          animate: { opacity: [1, 0.35, 1] },
                          transition: { duration: 1.6, repeat: Infinity },
                        }
                      : {})}
                  />
                  EN DIRECT
                </div>
              </div>

              <div className="grid gap-7 py-8 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-end">
                <div>
                  <p className="font-mono text-[0.65rem] font-semibold tracking-[0.14em] text-[color:var(--wariba-on-dark-muted)]">
                    MARGE RESTANTE
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <motion.p
                      className="font-mono text-[clamp(4.5rem,9vw,7.5rem)] font-medium leading-[0.78] tracking-[-0.08em] text-[color:var(--wariba-on-dark)] [font-variant-numeric:tabular-nums]"
                      initial={false}
                      {...(!reduced
                        ? {
                            animate: { opacity: [0.82, 1, 0.82] },
                            transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                          }
                        : {})}
                    >
                      72
                    </motion.p>
                    <span className="mb-1.5 font-mono text-xl text-[color:var(--wariba-brand-300)]">
                      %
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-[color:var(--wariba-on-dark-muted)]">
                    Distance confortable jusqu’à la limite.
                  </p>
                </div>
                <div className="border-l border-[color:var(--wariba-seam)] pl-5">
                  <p className="font-mono text-[0.65rem] tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
                    POSITION
                  </p>
                  <p className="mt-2 font-mono text-base font-semibold text-[color:var(--wariba-on-dark)]">
                    ACTUELLE
                  </p>
                  <p className="mt-5 font-mono text-xs text-[color:var(--wariba-brand-300)]">
                    SAFE · 72%
                  </p>
                </div>
              </div>

              <div className="relative py-6">
                <div className="flex justify-between font-mono text-[0.6rem] font-semibold tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
                  <span>ZONE SÛRE</span>
                  <span>LIMITE</span>
                </div>
                <div className="relative mt-4 h-px bg-[color:color-mix(in_srgb,var(--wariba-color-ink-100)_34%,transparent)]">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-[color:var(--wariba-brand-400)]"
                    initial={{ width: 0 }}
                    animate={{ width: '28%' }}
                    transition={{ duration: reduced ? 0 : 1.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.div
                    aria-hidden="true"
                    className="absolute -top-2 left-[28%] size-4 -translate-x-1/2 rounded-full border-2 border-[color:var(--wariba-color-carbon-980)] bg-[color:var(--wariba-color-cobalt-300)] shadow-[0_0_0_5px_color-mix(in_srgb,var(--wariba-color-cobalt-400)_15%,transparent)]"
                    initial={{ x: '-210%' }}
                    animate={{ x: '-50%' }}
                    transition={{ duration: reduced ? 0 : 1.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -top-3 right-0 h-7 w-px bg-[color:var(--wariba-color-amber-400)]"
                  />
                </div>
                <div className="mt-5 flex justify-between font-mono text-[0.6rem] tracking-[0.12em] text-[color:var(--wariba-on-dark-muted)]">
                  <span>POSITION ACTUELLE</span>
                  <span className="text-[color:var(--wariba-color-amber-400)]">SEUIL</span>
                </div>
              </div>

              <div className="grid gap-px border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-seam)] sm:grid-cols-2">
                <Metric label="LIMITE QUOTIDIENNE" value="1,8% restante" tone="cobalt" />
                <Metric label="PERTE MAXIMALE" value="4,1% restante" tone="amber" />
              </div>
            </div>
          </div>
          <figcaption
            id="risk-field-caption"
            className="mt-4 text-xs leading-relaxed text-[color:var(--wariba-on-dark-dim)]"
          >
            Visualisation de démonstration : elle explique la lecture du risque et ne représente pas
            un compte réel.
          </figcaption>
          <div
            aria-hidden="true"
            className="relative mt-8 aspect-[16/9] overflow-hidden border-y border-[color:var(--wariba-seam)] lg:hidden"
          >
            <Image
              src="/images/wariba-trader-abidjan.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-[68%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--wariba-color-carbon-980)_22%,transparent),color-mix(in_srgb,var(--wariba-color-carbon-980)_68%,transparent))]" />
            <div className="absolute inset-x-5 bottom-4 border-l border-[color:var(--wariba-brand-400)] pl-3 font-mono text-[0.6rem] font-semibold tracking-[0.13em] text-[color:var(--wariba-on-dark-muted)]">
              DANS L’ENVIRONNEMENT DE TRADING
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'cobalt' | 'amber';
}) {
  const color = tone === 'cobalt' ? 'var(--wariba-brand-300)' : 'var(--wariba-color-amber-400)';
  return (
    <div className="bg-[color:var(--wariba-color-carbon-980)] px-5 py-5 sm:px-6">
      <p className="font-mono text-[0.6rem] font-semibold tracking-[0.13em] text-[color:var(--wariba-on-dark-dim)]">
        {label}
      </p>
      <p
        className="mt-2 font-mono text-base font-medium [font-variant-numeric:tabular-nums]"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}
