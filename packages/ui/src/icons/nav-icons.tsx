import { Icon, type IconProps } from '../primitives/Icon';

/**
 * Small hand-drawn nav icon set — Design System §20 (1.5–1.75px stroke,
 * inherits currentColor). Deliberately not pulled from a generic icon library
 * wholesale (§4.1 anti-vibe-code: no icon-in-every-box from an over-used set).
 */

export function HubIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-6h4v6" />
    </Icon>
  );
}

export function TradeIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <path d="M4 18.5 9.5 12l4 3.5L20 7" />
      <path d="M15.5 7H20v4.5" />
    </Icon>
  );
}

export function AccountsIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14.5h4" />
    </Icon>
  );
}

export function PayoutsIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.75a2.25 2.25 0 0 1 2.5-2.25c1.4 0 2.5.9 2.5 2s-1 1.75-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2a2.25 2.25 0 0 0 2.5-2.25" />
    </Icon>
  );
}

export function MoreIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function HelpIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2.9-1.2 1.9" />
      <circle
        cx="12"
        cy="16.7"
        r="0.15"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.2}
      />
    </Icon>
  );
}

export function OverviewIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </Icon>
  );
}

export function UsersIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 8.5a3 3 0 1 1 3.5 3M20.5 20a5.5 5.5 0 0 0-3.7-5.2" />
    </Icon>
  );
}

export function ShieldIcon(props: Omit<IconProps, 'children'>) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 19 6.5v5.3c0 4.4-2.9 7.6-7 8.7-4.1-1.1-7-4.3-7-8.7V6.5Z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  );
}
