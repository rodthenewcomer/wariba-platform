import { Alert, Button, Card, Input, Text } from '@wariba/ui';

export default function LoginPage() {
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

        <form className="flex flex-col gap-4">
          <Input label="Adresse email" type="email" name="email" autoComplete="email" required />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
          <Button type="submit" size="lg" disabled className="w-full">
            Se connecter
          </Button>
        </form>

        <Alert level="information" title="Authentification en préparation">
          Ce formulaire est un shell visuel — la connexion Supabase réelle arrive avec Prompt 03
          (Identity, Commerce &amp; Activation).
        </Alert>
      </Card>
    </main>
  );
}
