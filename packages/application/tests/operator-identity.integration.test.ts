import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createDbClient,
  loadIdentityReviewDetail,
  loadLatestIdentityReviewForTrader,
  requestIdentityReview,
  type Db,
} from '@wariba/database';
import {
  deletePayoutAccount,
  deleteStaffFixtureUser,
  seedPayoutAccount,
  seedStaffUser,
  type PayoutAccountFixture,
  type StaffFixtureUser,
} from '@wariba/test-utils';
import { assignIdentityReview, updateIdentityReview } from '../src/control-identity';

const environment = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};
const describeIfDb = Object.values(environment).every(Boolean) ? describe : describe.skip;

describeIfDb('Phase 3.3 identity operations', () => {
  let db: Db;
  let fixture: PayoutAccountFixture;
  let compliance: StaffFixtureUser;

  beforeAll(async () => {
    db = createDbClient(environment.databaseUrl);
    fixture = await seedPayoutAccount(environment, { kycVerified: false });
    compliance = await seedStaffUser(db, 'compliance');
  }, 60_000);

  afterAll(async () => {
    await deletePayoutAccount(environment, fixture);
    await deleteStaffFixtureUser(db, compliance);
    await db.destroy();
  });

  it('opens one real payout-gated case and isolates trader reads', async () => {
    const first = await requestIdentityReview(db, {
      userId: fixture.userId,
      accountId: fixture.accountId,
      correlationId: randomUUID(),
      now: new Date(),
    });
    const retry = await requestIdentityReview(db, {
      userId: fixture.userId,
      accountId: fixture.accountId,
      correlationId: randomUUID(),
      now: new Date(),
    });
    expect(first.created).toBe(true);
    expect(retry).toEqual({ publicId: first.publicId, created: false });
    expect(
      (await loadLatestIdentityReviewForTrader(db, { userId: fixture.userId }))?.publicId,
    ).toBe(first.publicId);
    expect(await loadLatestIdentityReviewForTrader(db, { userId: compliance.userId })).toBeNull();
  });

  it('audits ownership and decision, rejects a stale operator, and stores no document', async () => {
    const caseRow = await db
      .selectFrom('app.identity_review_cases')
      .select(['public_id', 'version'])
      .where('account_id', '=', fixture.accountId)
      .executeTakeFirstOrThrow();
    await assignIdentityReview(db, {
      publicId: caseRow.public_id,
      staffUserId: compliance.userId,
      staffRole: 'compliance',
      expectedVersion: caseRow.version,
      correlationId: randomUUID(),
    });
    await updateIdentityReview(db, {
      publicId: caseRow.public_id,
      staffUserId: compliance.userId,
      staffRole: 'compliance',
      expectedVersion: 2,
      nextStatus: 'needs_information',
      decisionReason: 'Une référence externe complémentaire est nécessaire.',
      traderMessage:
        'Nous avons besoin d’une information supplémentaire pour terminer la vérification.',
      correlationId: randomUUID(),
    });
    await expect(
      updateIdentityReview(db, {
        publicId: caseRow.public_id,
        staffUserId: compliance.userId,
        staffRole: 'compliance',
        expectedVersion: 2,
        nextStatus: 'verified',
        decisionReason: 'Tentative fondée sur un écran devenu obsolète.',
        traderMessage: 'Votre vérification est terminée.',
        evidenceReference: 'OUT-OF-BAND-STALE',
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ name: 'OperatorCaseStaleError' });

    await expect(
      updateIdentityReview(db, {
        publicId: caseRow.public_id,
        staffUserId: compliance.userId,
        staffRole: 'compliance',
        expectedVersion: 3,
        nextStatus: 'verified',
        decisionReason: 'Cette tentative contient une URL au lieu d’une référence opaque.',
        traderMessage: 'Votre vérification est terminée.',
        evidenceReference: 'https://documents.invalid/passport.jpg',
        correlationId: randomUUID(),
      }),
    ).rejects.toThrow('sans URL ni contenu de document');

    await updateIdentityReview(db, {
      publicId: caseRow.public_id,
      staffUserId: compliance.userId,
      staffRole: 'compliance',
      expectedVersion: 3,
      nextStatus: 'verified',
      decisionReason: 'La vérification manuelle hors plateforme est concluante.',
      traderMessage: 'Votre identité est vérifiée. Vous pouvez poursuivre votre demande de payout.',
      evidenceReference: 'MANUAL-BETA-REF-001',
      correlationId: randomUUID(),
    });

    const detail = await loadIdentityReviewDetail(db, { publicId: caseRow.public_id });
    expect(detail).toMatchObject({
      status: 'verified',
      version: 4,
      evidenceReference: 'MANUAL-BETA-REF-001',
    });
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('kyc_sandbox_verified')
      .where('id', '=', fixture.accountId)
      .executeTakeFirstOrThrow();
    expect(account.kyc_sandbox_verified).toBe(true);
    const audits = await db
      .selectFrom('audit.audit_events')
      .select(['action', 'before_json', 'after_json'])
      .where('target_id', '=', detail?.id ?? '')
      .orderBy('occurred_at', 'asc')
      .execute();
    expect(audits.map((event) => event.action)).toEqual([
      'identity_review.requested',
      'identity_review.assigned',
      'identity_review.updated',
      'identity_review.decision_recorded',
    ]);
    expect(JSON.stringify(audits)).not.toMatch(/passport|selfie|biometric/i);
  });
});
