import type { ComponentType, SVGProps } from 'react';
import {
  AlarmClock,
  BookOpenText,
  CalendarDays,
  CircleQuestionMark,
  ClipboardCheck,
  LayoutList,
  Signal,
  Timeline,
  type LucideProps,
} from 'lucide-react';

export const WARIX_DESTINATION_IDS = [
  'markets',
  'trade',
  'activity',
  'alerts',
  'calendar',
  'journal',
  'help',
] as const;

export type WarixDestinationId = (typeof WARIX_DESTINATION_IDS)[number];
export type WarixSymbolSize = 'rail' | 'nav' | 'destination' | 20 | 22 | 24 | 25 | 26 | 28 | 30;

export interface WarixSymbolProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: WarixSymbolSize;
}

const SYMBOL_SIZES: Record<Exclude<WarixSymbolSize, number>, number> = {
  rail: 28,
  nav: 30,
  destination: 28,
};

function resolveSize(size: WarixSymbolSize): number {
  return typeof size === 'number' ? size : SYMBOL_SIZES[size];
}

/**
 * VX1-F.1 uses one conventional Lucide family for every destination.
 *
 * The WariX wrapper remains the product-facing contract: application code does
 * not know which open-source library draws the mark, while the semantics,
 * optical size and stroke stay reviewable in one place.
 */
function createDestinationIcon(destination: WarixDestinationId, Glyph: ComponentType<LucideProps>) {
  return function WariXDestinationGlyph({
    size = 'rail',
    className = '',
    ...props
  }: WarixSymbolProps) {
    const resolvedSize = resolveSize(size);
    return (
      <Glyph
        {...props}
        aria-hidden="true"
        className={`warix-symbol warix-symbol--${destination} ${className}`.trim()}
        data-warix-symbol={destination}
        focusable="false"
        height={resolvedSize}
        role="presentation"
        strokeWidth={2}
        width={resolvedSize}
      />
    );
  };
}

export const WariXMarketsDestinationIcon = createDestinationIcon('markets', LayoutList);
export const WariXTradeDestinationIcon = createDestinationIcon('trade', ClipboardCheck);
export const WariXActivityDestinationIcon = createDestinationIcon('activity', Timeline);
export const WariXAlertsDestinationIcon = createDestinationIcon('alerts', AlarmClock);
export const WariXCalendarDestinationIcon = createDestinationIcon('calendar', CalendarDays);
export const WariXJournalDestinationIcon = createDestinationIcon('journal', BookOpenText);
export const WariXHelpDestinationIcon = createDestinationIcon('help', CircleQuestionMark);

export const WARIX_DESTINATION_ICONS: Record<
  WarixDestinationId,
  ComponentType<WarixSymbolProps>
> = {
  markets: WariXMarketsDestinationIcon,
  trade: WariXTradeDestinationIcon,
  activity: WariXActivityDestinationIcon,
  alerts: WariXAlertsDestinationIcon,
  calendar: WariXCalendarDestinationIcon,
  journal: WariXJournalDestinationIcon,
  help: WariXHelpDestinationIcon,
};

interface WariXDestinationIconProps extends WarixSymbolProps {
  destination: WarixDestinationId;
}

export function WariXDestinationIcon({ destination, ...props }: WariXDestinationIconProps) {
  const Icon = WARIX_DESTINATION_ICONS[destination];
  return <Icon {...props} />;
}

export type MarketFeedState = 'healthy' | 'degraded' | 'offline';

interface WariXMarketFeedIconProps extends WarixSymbolProps {
  state: MarketFeedState;
}

/** Header-only connectivity state. It is deliberately not a destination. */
export function WariXMarketFeedIcon({
  className = '',
  size = 20,
  state,
  ...props
}: WariXMarketFeedIconProps) {
  const resolvedSize = resolveSize(size);
  return (
    <Signal
      {...props}
      aria-hidden="true"
      className={`warix-market-feed-icon warix-market-feed-icon--${state} ${className}`.trim()}
      data-market-feed-state={state}
      focusable="false"
      height={resolvedSize}
      role="presentation"
      strokeWidth={2}
      width={resolvedSize}
    />
  );
}
