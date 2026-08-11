'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  accountOrdersChannel,
  accountStateChannel,
  type AccountSnapshot,
  type PayoutResultMessage,
} from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../../../lib/realtime-client';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import {
  applyPayoutResult,
  requestPayoutCommand,
  type PayoutSessionEffects,
} from '../../../lib/payout-session';

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export interface PayoutAccountSession {
  connectionOk: boolean;
  isResyncing: boolean;
  snapshot: AccountSnapshot | null;
  pending: boolean;
  payoutAmountError: string | null;
  statusAnnouncement: string;
  requestPayout(amount: string): void;
}

/**
 * The narrow realtime seam `/payouts` needs, and nothing more.
 *
 * W2 §16 relocated the Payout Center out of the execution dock. Mounting the
 * whole `useTradeSession` here would have worked, but it would also have
 * subscribed this page to five market channels, a tick store, fills, alerts
 * and every order-entry command — none of which a payout surface can use, and
 * all of which would then be live on a page that never draws a price.
 *
 * So this hook subscribes to exactly one channel — the account state channel —
 * and handles exactly the three messages payout depends on: `account.snapshot`
 * (which carries `performanceProgress` and `payoutRequests`), `payout_result`,
 * and the transport `error` frame.
 *
 * Critically, it does **not** re-implement payout. The command and the result
 * handling are the same canonical functions WariX calls
 * (`lib/payout-session.ts`), so there is one `requestPayout`, one reading of
 * `payout_result`, and one `account.snapshot` resync — on both surfaces. What
 * differs here is only which channels are open.
 *
 * Because no market channel is subscribed, market ticks cannot reach this page
 * at all: there is no subscription to re-render from, rather than a
 * subscription that is ignored.
 */
export function usePayoutAccountSession({
  accountId,
  wsUrl,
}: {
  accountId: string;
  wsUrl: string;
}): PayoutAccountSession {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [payoutAmountError, setPayoutAmountError] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const effectsRef = useRef<PayoutSessionEffects>({
    setPending,
    setPayoutAmountError,
    announce: setStatusAnnouncement,
    // This surface has no second command channel to clear — payout is the
    // only command it can issue.
    clearCommandError: () => {},
  });

  useEffect(() => {
    const client = new RealtimeClient(wsUrl, getAccessToken);
    clientRef.current = client;

    const offState = client.onStateChange(setConnectionState);
    const offMessage = client.onMessage((envelope) => {
      if (envelope.type === 'account.snapshot') {
        setSnapshot(envelope.payload as AccountSnapshot);
      } else if (envelope.type === 'payout_result') {
        applyPayoutResult(
          client,
          accountId,
          envelope.payload as PayoutResultMessage,
          effectsRef.current,
        );
      } else if (envelope.type === 'error') {
        setPending(false);
        const payload = envelope.payload as { code: string; message: string };
        setPayoutAmountError(payload.message);
      }
    });

    void client.connect().then(() => {
      // Two account channels, and deliberately no more.
      //
      // The state channel answers a subscribe with a full account.snapshot —
      // the only payload payout reads. The orders channel is required because
      // `broadcastPayoutResult` publishes `payout_result` there
      // (services/realtime/src/websocket.ts), alongside order results; a
      // state-channel-only subscription receives the snapshot but never the
      // command's own reply, leaving the request permanently in flight.
      //
      // Still no market channel and no notifications channel, so no tick and
      // no alert can reach this page at all.
      client.subscribe([accountStateChannel(accountId), accountOrdersChannel(accountId)]);
    });

    return () => {
      offState();
      offMessage();
      client.close();
    };
  }, [accountId, wsUrl]);

  const requestPayout = useCallback(
    (amount: string) => {
      requestPayoutCommand(clientRef.current, accountId, amount, effectsRef.current);
    },
    [accountId],
  );

  return useMemo(
    () => ({
      connectionOk: connectionState === 'open',
      isResyncing: connectionState === 'resyncing',
      snapshot,
      pending,
      payoutAmountError,
      statusAnnouncement,
      requestPayout,
    }),
    [connectionState, snapshot, pending, payoutAmountError, statusAnnouncement, requestPayout],
  );
}
