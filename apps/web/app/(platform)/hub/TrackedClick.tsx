'use client';

import type { ReactNode } from 'react';
import { trackEvent, type HubAnalyticsEvent } from '../../../lib/analytics';

export interface TrackedClickProps {
  event: HubAnalyticsEvent;
  context?: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Fires an analytics event on click without owning navigation/behavior —
 * wraps a Link/button via event bubbling (capture phase, so it fires before
 * the child's own navigation). `display: contents` keeps it invisible to
 * layout.
 */
export function TrackedClick({ event, context, children }: TrackedClickProps) {
  return (
    <span className="contents" onClickCapture={() => trackEvent(event, context)}>
      {children}
    </span>
  );
}
