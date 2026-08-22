'use client';

import { memo, useEffect, useState } from 'react';
import { WariXToast, type WariXFeedbackTone } from '@wariba/ui';
import type { OrderRejectionDetail } from '../execution/execution-contract';

/**
 * WariX's command feedback surface — VX1-C §8-§11.
 *
 * Every settled command already produces one canonical sentence: the session
 * announces "Ouverture confirmé.", "Modif. SL confirmé.", "Alerte mise à jour."
 * or "Refusé : …" the moment the server answers, and a screen reader has heard
 * them since W1 through the workstation's live region. A sighted trader heard
 * nothing — the only visible confirmation was the position appearing somewhere
 * in the dock, which is confirmation by inference.
 *
 * This is that same channel, drawn. It invents no event, keeps no state of its
 * own about trading, and adds nothing to a message the session did not say:
 * what it decides is tone, dwell and motion.
 *
 * **Deliberately not announced twice.** The live region in TradeClient remains
 * the accessible channel; this surface is `aria-hidden`, so assistive tech hears
 * the sentence once, not once per presentation.
 */

export type FeedbackTone = 'success' | 'rejection' | 'info';

export interface WorkstationFeedbackProps {
  /** The session's canonical announcement, verbatim. */
  announcement: string;
  /** Increments on every announcement, so a repeated sentence still shows. */
  sequence: number;
  /**
   * Present only while the execution panel is holding a rejection of its own.
   * Read as "the reason is already on screen, beside the keys" (§20), never as
   * a source of copy for this surface.
   */
  rejection: OrderRejectionDetail | null;
  compact?: boolean;
}

/**
 * How long a confirmation stays.
 *
 * VX1-D.1.1 §3 shortens the phone's dwell: on a 390px screen the toast shares
 * the plot with the trade objects, and even inside its reserved lane it is the
 * one element that appears *over* the chart rather than beside it. Desktop has
 * room to spare and keeps the longer read.
 */
const DWELL_MS = 2_600;
const COMPACT_DWELL_MS = 1_800;

/**
 * Tone from the sentence itself.
 *
 * The session prefixes every refusal with "Refusé :", which is the one lexical
 * contract this reads. Anything else that settles is a confirmation; anything
 * that merely reports a state change is information.
 */
function toneFor(announcement: string, rejection: OrderRejectionDetail | null): FeedbackTone {
  if (rejection !== null || announcement.startsWith('Refusé')) return 'rejection';
  if (/confirmé|créé|mise à jour|exécuté|annulée/i.test(announcement)) return 'success';
  return 'info';
}

const TONE_TITLE: Record<FeedbackTone, string> = {
  success: 'Confirmé',
  rejection: 'Refusé',
  info: 'Information',
};

const TOAST_TONE: Record<FeedbackTone, WariXFeedbackTone> = {
  success: 'success',
  rejection: 'danger',
  info: 'information',
};

export const WorkstationFeedback = memo(function WorkstationFeedback({
  announcement,
  sequence,
  rejection,
  compact = false,
}: WorkstationFeedbackProps) {
  const [shown, setShown] = useState<{ message: string; tone: FeedbackTone; key: number } | null>(
    null,
  );

  useEffect(() => {
    if (sequence === 0 || announcement.trim().length === 0) return;
    setShown({ message: announcement, tone: toneFor(announcement, rejection), key: sequence });
    const timer = setTimeout(() => setShown(null), compact ? COMPACT_DWELL_MS : DWELL_MS);
    return () => clearTimeout(timer);
    // Keyed on the sequence: the same sentence twice is two events, and both
    // deserve their own confirmation.
  }, [sequence]);

  if (!shown) return null;
  /*
   * VX1-C.1 §20 — the authoritative refusal is stated once, where it happened.
   *
   * When the execution panel holds a rejection it prints the server's full
   * reason beside the keys that were pressed, which is the only place a trader
   * can act on it. This surface was repeating that whole paragraph a few
   * hundred pixels away, so a refused order arrived as two identical walls of
   * text and neither read as authoritative.
   *
   * So the global channel steps back to what only it can do — say, anywhere on
   * screen, that the command did not go through — and hands the explaining to
   * the panel. With no local rejection to defer to (an alert, a close, a
   * modification), it keeps the session's own sentence, because then it is the
   * only thing that will ever say why.
   */
  const deferredToPanel = shown.tone === 'rejection' && rejection !== null;

  return (
    <div
      aria-hidden="true"
      data-testid="workstation-feedback"
      data-feedback-tone={shown.tone}
      className={`pointer-events-none fixed z-[var(--wariba-z-toast)] motion-safe:animate-[wariba-feedback-enter_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-settle)] ${
        /* §8 — clear of the decision keys. On desktop it sits above the dock on
           the chart's left, where nothing is ever pressed in a hurry; the Buy
           and Sell keys are the one place a confirmation must never cover. */
        /*
         * §3 — one reserved lane, and the chips are kept out of it.
         *
         * `bottom-16` places the toast inside the same 64px band the overlay
         * excludes from `BOTTOM_CHIP_SAFE_BOUNDARY`, above the mobile action
         * rail and below every trade object — so a confirmation can no longer
         * land on an entry, a stop, a target or the current-price plate. The
         * phone toast is also narrower than the desktop one, because the lane
         * is the full width of the screen and a full-width card reads as a
         * banner rather than as feedback.
         */
        compact
          ? 'bottom-16 left-1/2 max-w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2'
          : 'bottom-24 left-28 max-w-[min(22rem,calc(100vw-2rem))]'
      }`}
    >
      <WariXToast
        title={deferredToPanel ? 'Ordre refusé' : TONE_TITLE[shown.tone]}
        description={deferredToPanel ? null : shown.message.replace(/^Refusé\s*:\s*/, '')}
        tone={TOAST_TONE[shown.tone]}
      />
    </div>
  );
});
