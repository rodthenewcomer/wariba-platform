'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Input, Text } from '@wariba/ui';
import { signInAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <main>
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Connexion
          </Text>
          <Text variant="body-sm" color="secondary">
            Accédez à votre compte WARIBA.
          </Text>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Input label="Adresse email" type="email" name="email" autoComplete="email" required />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />

          {state.error && (
            <Alert level="danger" title="Connexion impossible">
              {state.error}
            </Alert>
          )}

          <Button type="submit" size="lg" loading={pending} className="w-full">
            Se connecter
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <Text variant="body-sm" color="secondary">
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="underline">
              Créer un compte
            </Link>
          </Text>
          <Text variant="body-sm" color="secondary">
            <Link href="/mot-de-passe-oublie" className="underline">
              Mot de passe oublié ?
            </Link>
          </Text>
        </div>
      </Card>
    </main>
  );
}
