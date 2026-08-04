'use client';

import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

export interface AnimatedAmountProps {
  value: number;
  format: (value: number) => string;
  className?: string;
}

/**
 * Animates a numeric value's on-screen transition instead of letting it jump
 * — used for balance/risk figures in WariXTerminal so the demo reads as
 * alive rather than a static readout.
 */
export function AnimatedAmount({ value, format, className }: AnimatedAmountProps) {
  const spring = useSpring(value, { stiffness: 120, damping: 22, mass: 0.6 });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
