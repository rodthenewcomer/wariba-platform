import { Icon, type IconProps } from '../primitives/Icon';

/**
 * The global shell's icon set — Phase 3.4.5A §17.
 *
 * Small, drawn to the same 24-box and 1.75px stroke as the nav set, and
 * deliberately the *only* source of glyphs the header, mega-menu, drawer and
 * footer are allowed to use.
 *
 * The rule exists because the alternative had already started: the rebuilt
 * homepage was shipping `◆`, `▲`, `⬤`, `▸`, `✓` and `✕` as literal text.
 * Unicode glyphs are a different weight from the real icons beside them, they
 * render differently on Android and iOS, some are emoji-presented without
 * warning, and a screen reader reads "black diamond suit". One set, one stroke,
 * `currentColor`.
 */

type Props = Omit<IconProps, 'children'>;

/** Mega-menu and select disclosure. */
export function ChevronDownIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 9.5 12 15.5 18 9.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M9.5 6 15.5 12 9.5 18" />
    </Icon>
  );
}

/** Tertiary actions and "read more" affordances. */
export function ArrowRightIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h15" />
      <path d="M13.5 6l6 6-6 6" />
    </Icon>
  );
}

export function MenuIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </Icon>
  );
}

export function CloseIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function CheckIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" />
    </Icon>
  );
}

/** A link that leaves WARIBA. Never used decoratively on an internal link. */
export function ExternalIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4" />
    </Icon>
  );
}

/** Reserved for facts and guarantees. Not a decoration. */
export function ShieldCheckIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 19 6v6c0 4.2-2.8 7.3-7 8.5-4.2-1.2-7-4.3-7-8.5V6l7-2.5Z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </Icon>
  );
}
