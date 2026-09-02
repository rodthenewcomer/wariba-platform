'use client';

import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';

export interface FaqItem {
  id: string;
  number: string;
  category: string;
  question: string;
  answer: string;
  /** Omit for a text-only row — see the panel's inline style below for why. */
  visual?: ReactNode;
}

export interface FaqKnowledgeStackProps {
  items: readonly FaqItem[];
  defaultOpenId?: string;
}

/**
 * The "Knowledge Stack" — full-width editorial rows instead of seven boxed
 * cards, one open at a time. Opening a row is real conditional rendering
 * (`AnimatePresence` keyed by id inside each row, not all seven answers
 * sitting in the DOM at `opacity: 0`), so a closed section costs almost
 * nothing and the page never reserves height for six answers nobody asked
 * to read.
 */
export function FaqKnowledgeStack({ items, defaultOpenId }: FaqKnowledgeStackProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const reduced = useHydratedReducedMotion();
  const baseId = useId();

  return (
    <div className="divide-y divide-[color:var(--wariba-seam)] border-y border-[color:var(--wariba-seam)]">
      {items.map((item) => {
        const isOpen = item.id === openId;
        const headerId = `${baseId}-header-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        return (
          <div key={item.id} className="faq-row" data-open={isOpen}>
            <h3 className="m-0">
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="faq-row-trigger"
              >
                <span className="faq-row-index">
                  <span aria-hidden="true" className="faq-row-number">
                    {item.number}
                  </span>
                  <span className="faq-row-category">{item.category}</span>
                </span>
                <span className="faq-row-question">{item.question}</span>
                <span aria-hidden="true" className="faq-row-toggle">
                  <span className="faq-row-toggle-bar faq-row-toggle-bar-h" />
                  <span className="faq-row-toggle-bar faq-row-toggle-bar-v" />
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="faq-row-panel"
                    // No visual → one column even at the breakpoint where
                    // `.faq-row-panel` normally splits in two, so the answer
                    // takes the full width instead of leaving the other
                    // track empty next to it.
                    style={item.visual ? undefined : { gridTemplateColumns: '1fr' }}
                  >
                    <p className="faq-row-answer">{item.answer}</p>
                    {item.visual ? <div className="faq-row-visual">{item.visual}</div> : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
