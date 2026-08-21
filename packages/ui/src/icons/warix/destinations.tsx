import type { ComponentType, CSSProperties, SVGProps } from 'react';

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
export type WarixSymbolSize = 'rail' | 'nav' | 'destination' | 20 | 22 | 24;

export interface WarixSymbolProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: WarixSymbolSize;
}

const SYMBOL_SIZES: Record<Exclude<WarixSymbolSize, number>, number> = {
  rail: 24,
  nav: 22,
  destination: 20,
};

function resolveSize(size: WarixSymbolSize): number {
  return typeof size === 'number' ? size : SYMBOL_SIZES[size];
}

interface GlyphProps extends WarixSymbolProps {
  destination: WarixDestinationId;
}

function Glyph({
  children,
  className = '',
  destination,
  size = 'rail',
  style,
  ...props
}: GlyphProps) {
  const resolvedSize = resolveSize(size);
  const glyphStyle: CSSProperties = {
    ...style,
    '--warix-symbol-optical-size': `${resolvedSize}px`,
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className={`warix-symbol warix-symbol--${destination} ${className}`.trim()}
      data-warix-symbol={destination}
      fill="none"
      focusable="false"
      height={resolvedSize}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="var(--wariba-component-workstation-symbol-stroke, 1.75px)"
      style={glyphStyle}
      viewBox="0 0 24 24"
      width={resolvedSize}
      {...props}
    >
      <g className="warix-symbol__canvas">{children}</g>
    </svg>
  );
}

export function WariXMarketsDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="markets" {...props}>
      <g className="warix-symbol__market-row warix-symbol__market-row--one">
        <path d="M3.5 6.25h8.25" />
        <path d="M14.75 6.25h5.75" />
      </g>
      <g className="warix-symbol__market-row warix-symbol__market-row--two">
        <path d="M3.5 12h5.25" />
        <path d="M11.75 12h8.75" />
      </g>
      <g className="warix-symbol__market-row warix-symbol__market-row--three">
        <path d="M3.5 17.75h10.5" />
        <path d="M17 17.75h3.5" />
      </g>
    </Glyph>
  );
}

export function WariXTradeDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="trade" {...props}>
      <path className="warix-symbol__trade-ticket" d="M4 4.25h12.25L20 8v11.75H4z" />
      <path d="M16.25 4.25V8H20" />
      <path className="warix-symbol__trade-header" d="M7 9h6.5" />
      <path className="warix-symbol__trade-confirm" d="m7.25 14 1.5 1.5 3-3.25" pathLength="1" />
      <path className="warix-symbol__trade-action" d="M14.25 15.5h2.75" pathLength="1" />
    </Glyph>
  );
}

export function WariXActivityDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="activity" {...props}>
      <g className="warix-symbol__activity-flow">
        <path d="M18.9 7.5A8.4 8.4 0 0 0 4.6 6.25" />
        <path d="M5.1 16.5a8.4 8.4 0 0 0 14.3 1.25" />
      </g>
      <g className="warix-symbol__activity-traces">
        <path pathLength="1" d="M5 9.25h5.25" />
        <path pathLength="1" d="M8.25 12h10.5" />
        <path pathLength="1" d="M5 14.75h7.75" />
      </g>
    </Glyph>
  );
}

export function WariXAlertsDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="alerts" {...props}>
      <g className="warix-symbol__alert-level">
        <path pathLength="1" d="M3.5 6.5H9" />
        <path pathLength="1" d="M3.5 12H7" />
        <path pathLength="1" d="M3.5 17.5H9" />
      </g>
      <path className="warix-symbol__alert-trigger" d="m14 7.25 4.75 4.75L14 16.75 9.25 12z" />
      <path className="warix-symbol__alert-tail" d="M18.75 12h1.75" />
      <circle className="warix-symbol__alert-node" cx="14" cy="12" r="1.15" />
    </Glyph>
  );
}

export function WariXCalendarDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="calendar" {...props}>
      <path className="warix-symbol__calendar-frame" d="M4.25 6.25h15.5v13H4.25z" />
      <path d="M4.25 9.25h15.5M8 4.25v4M16 4.25v4" />
      <path className="warix-symbol__calendar-event" d="M8 12.25h3.25v3.25H8z" />
      <path className="warix-symbol__calendar-trace" d="M14 13h2.75M14 15.5h2" />
    </Glyph>
  );
}

export function WariXJournalDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="journal" {...props}>
      <path
        className="warix-symbol__journal-folio"
        d="M3.5 5.25h5.25A3.25 3.25 0 0 1 12 8.5v10.25a3.25 3.25 0 0 0-3.25-2H3.5z"
      />
      <path
        className="warix-symbol__journal-folio"
        d="M20.5 5.25h-5.25A3.25 3.25 0 0 0 12 8.5v10.25a3.25 3.25 0 0 1 3.25-2h5.25z"
      />
      <g className="warix-symbol__journal-rows">
        <path d="M5.75 9h3.5" />
        <path d="M5.75 12h3" />
      </g>
      <path className="warix-symbol__journal-performance" d="m14.75 13.5 1.25-1.25 1.25.75 1.5-2" />
    </Glyph>
  );
}

export function WariXHelpDestinationIcon(props: WarixSymbolProps) {
  return (
    <Glyph destination="help" {...props}>
      <path
        className="warix-symbol__help-orbit warix-symbol__help-orbit--one"
        d="M8.25 4.6A8.2 8.2 0 0 1 19.4 15.75"
      />
      <path
        className="warix-symbol__help-orbit warix-symbol__help-orbit--two"
        d="M15.75 19.4A8.2 8.2 0 0 1 4.6 8.25"
      />
      <path
        className="warix-symbol__help-mark"
        d="M9.25 9a2.9 2.9 0 1 1 4.3 2.55c-1.15.65-1.55 1.15-1.55 2.2"
      />
      <path className="warix-symbol__help-dot" d="M12 17.25h.01" />
    </Glyph>
  );
}

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

/** Header-only live-feed status. This is intentionally not a destination symbol. */
export function WariXMarketFeedIcon({
  className = '',
  size = 20,
  state,
  ...props
}: WariXMarketFeedIconProps) {
  const resolvedSize = resolveSize(size);

  return (
    <svg
      aria-hidden="true"
      className={`warix-market-feed-icon warix-market-feed-icon--${state} ${className}`.trim()}
      data-market-feed-state={state}
      fill="none"
      focusable="false"
      height={resolvedSize}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width={resolvedSize}
      {...props}
    >
      <path
        className="warix-market-feed-icon__bar warix-market-feed-icon__bar--one"
        d="M5.5 15.75v2.75"
      />
      <path
        className="warix-market-feed-icon__bar warix-market-feed-icon__bar--two"
        d="M12 10.5v8"
      />
      <path
        className="warix-market-feed-icon__bar warix-market-feed-icon__bar--three"
        d="M18.5 5.5v13"
      />
    </svg>
  );
}
