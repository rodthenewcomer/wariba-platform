'use client';

import { useState } from 'react';
import { Alert, Text } from '@wariba/ui';
import { PayoutCenterPanel } from './PayoutCenterPanel';
import { usePayoutAccountSession } from './payout-account-session';

export interface PayoutCenterClientProps {
  /** Server-validated: this account belongs to the authenticated user and is WARIBA_PERFORMANCE. */
  accountId: string;
  wsUrl: string;
}

/**
 * The live Payout Center, relocated from the WariX execution dock in W2 §16.
 *
 * This is the *same* `PayoutCenterPanel` the dock rendered, driven by the same
 * `account.snapshot` fields (`performanceProgress`, `payoutRequests`) and the
 * same `requestPayout` command. Only the transport is narrowed: this page
 * subscribes to the account **state** channel (for `account.snapshot`) and the
 * account **orders** channel (where `payout_result` is broadcast), and to no
 * market channel at all — see `payout-account-session.ts`.
 *
 * No eligibility, cap, split or amount logic exists on this page; every one of
 * those is server-authoritative and arrives in the snapshot.
 */
export function PayoutCenterClient({ accountId, wsUrl }: PayoutCenterClientProps) {
  const session = usePayoutAccountSession({ accountId, wsUrl });
  const [amount, setAmount] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="sr-only">
        {session.statusAnnouncement}
      </div>

      {!session.connectionOk && (
        <Alert
          level="information"
          title={session.isResyncing ? 'Resynchronisation en cours' : 'Connexion au serveur'}
        >
          Les montants et l&apos;état du cycle proviennent du serveur. Ils s&apos;affichent dès que
          la connexion est établie.
        </Alert>
      )}

      {session.snapshot ? (
        <PayoutCenterPanel
          performanceProgress={session.snapshot.performanceProgress}
          payoutRequests={session.snapshot.payoutRequests}
          requestedAmount={amount}
          onRequestedAmountChange={setAmount}
          onSubmit={() => session.requestPayout(amount)}
          pending={session.pending}
          amountError={session.payoutAmountError}
        />
      ) : (
        <Text variant="body-sm" color="secondary">
          Chargement de votre cycle Performance…
        </Text>
      )}
    </div>
  );
}
