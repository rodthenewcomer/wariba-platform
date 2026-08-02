import Link from 'next/link';
import { buttonClassNames, Text } from '@wariba/ui';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Text as="h1" variant="heading-lg">
        Page introuvable
      </Text>
      <Text variant="body-sm" color="secondary">
        Cette page n&apos;existe pas ou plus.
      </Text>
      <Link href="/" className={buttonClassNames()}>
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
