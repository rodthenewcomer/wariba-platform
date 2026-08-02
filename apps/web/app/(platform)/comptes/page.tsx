import { AccountContext, Text } from '@wariba/ui';

export default function AccountsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Comptes
      </Text>
      <AccountContext
        program="WARIBA ONE"
        nominalFormatted="10 000 USD"
        publicId="DEMO-10K-001"
        statusLabel="Actif"
        statusVariant="success"
      />
      <Text variant="body-sm" color="tertiary">
        Un seul compte DEMO affiché ici — la gestion multi-comptes réelle arrive avec Prompt 03.
      </Text>
    </div>
  );
}
