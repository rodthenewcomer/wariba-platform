'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Input, Select, Text } from '@wariba/ui';
import { signUpAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <main>
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Créer un compte
          </Text>
          <Text variant="body-sm" color="secondary">
            Quelques informations, puis choisissez votre évaluation.
          </Text>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" name="firstName" autoComplete="given-name" required />
            <Input label="Nom" name="lastName" autoComplete="family-name" required />
          </div>
          <Input label="Adresse email" type="email" name="email" autoComplete="email" required />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            autoComplete="new-password"
            helperText="Au moins 12 caractères."
            required
          />
          <Select label="Pays" name="country" defaultValue="CI" required>
            <option value="CI">Côte d&apos;Ivoire</option>
            <option value="SN">Sénégal</option>
            <option value="ML">Mali</option>
            <option value="BF">Burkina Faso</option>
            <option value="TG">Togo</option>
            <option value="BJ">Bénin</option>
          </Select>
          <input type="hidden" name="language" value="fr" />

          {state.error && (
            <Alert level="danger" title="Impossible de continuer">
              {state.error}
            </Alert>
          )}

          <Button type="submit" size="lg" loading={pending} className="w-full">
            Créer mon compte
          </Button>
        </form>

        <Text variant="body-sm" color="secondary">
          Déjà un compte ?{' '}
          <Link href="/login" className="underline">
            Se connecter
          </Link>
        </Text>
      </Card>
    </main>
  );
}
