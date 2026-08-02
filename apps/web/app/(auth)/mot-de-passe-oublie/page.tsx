'use client';

import { useActionState } from 'react';
import { Alert, Button, Card, Input, Text } from '@wariba/ui';
import { requestPasswordResetAction, type PasswordResetActionResult } from '../actions';

const initialState: PasswordResetActionResult = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <main>
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Mot de passe oublié
          </Text>
          <Text variant="body-sm" color="secondary">
            Nous vous enverrons un lien de réinitialisation si cette adresse correspond à un compte.
          </Text>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Input label="Adresse email" type="email" name="email" autoComplete="email" required />

          {state.error && (
            <Alert level="danger" title="Requête impossible">
              {state.error}
            </Alert>
          )}

          <Button type="submit" size="lg" loading={pending} className="w-full">
            Envoyer le lien
          </Button>
        </form>

        {/* Same message whether or not the account exists — no enumeration signal. */}
        {state.submitted && (
          <Alert level="information" title="Si un compte existe">
            Un email de réinitialisation a été envoyé.
          </Alert>
        )}
      </Card>
    </main>
  );
}
