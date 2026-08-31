'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';

/**
 * The public WariX object is a composed product photograph, not a live
 * workstation. Its screen shows illustrative data and is labelled as such;
 * the actual interactive product remains on /warix.
 */
export function WariXProductTeaser() {
  const reduced = useHydratedReducedMotion();

  return (
    <figure
      className="relative m-0"
      data-testid="warix-product-teaser"
      aria-labelledby="warix-product-teaser-caption"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-x-12 -inset-y-10 bg-[radial-gradient(ellipse_at_48%_56%,color-mix(in_srgb,var(--wariba-brand-500)_16%,transparent),transparent_66%)] blur-3xl"
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, x: -28, y: 20, rotateY: -4 }}
        animate={{ opacity: 1, x: 0, y: 0, rotateY: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.78, ease: 'easeOut' }}
        {...(!reduced ? { whileHover: { y: -5, rotateY: 1 } } : {})}
        className="relative origin-center [perspective:1400px]"
      >
        <div
          className="relative aspect-[1.08] overflow-hidden bg-[color:var(--wariba-color-carbon-980)] sm:aspect-[1.12]"
          style={{
            boxShadow:
              'inset 0 0 0 1px color-mix(in srgb, var(--wariba-color-carbon-980) 55%, transparent), inset 0 0 48px -14px var(--wariba-color-carbon-980)',
          }}
        >
          <Image
            src="/images/warix-laptop-teaser.webp"
            alt="Ordinateur portable affichant un aperçu simulé du terminal WariX : graphique, ordre et contexte de risque."
            fill
            sizes="(min-width: 1024px) min(58vw, 760px), 100vw"
            className="object-cover object-[52%_50%]"
          />
        </div>
      </motion.div>
      <figcaption
        id="warix-product-teaser-caption"
        className="mt-3 font-mono text-[0.6rem] font-medium tracking-[0.12em] text-[color:var(--wariba-on-dark-dim)]"
      >
        APERÇU D’INTERFACE · DONNÉES SIMULÉES
      </figcaption>
    </figure>
  );
}
