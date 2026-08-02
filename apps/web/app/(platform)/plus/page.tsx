import { Text } from '@wariba/ui';
import Link from 'next/link';

const LINKS = [
  { href: '/aide', label: 'Aide' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/profil', label: 'Profil' },
] as const;

/** UX Architecture §12.2 — mobile-only overflow menu (Aide, Notifications, Profil, Paramètres). */
export default function PlusPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-2">
      <Text as="h1" variant="heading-lg" className="mb-4">
        Plus
      </Text>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex h-12 items-center rounded-[var(--wariba-radius-md)] px-3 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)] hover:bg-[color:var(--wariba-background-subtle)]"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
