import type { Db } from '@wariba/database';

export interface CreateUserProfileParams {
  userId: string;
  firstName: string;
  lastName: string;
  country: string;
  language: string;
}

export async function createUserProfile(db: Db, params: CreateUserProfileParams): Promise<void> {
  await db
    .insertInto('app.user_profiles')
    .values({
      user_id: params.userId,
      first_name: params.firstName,
      last_name: params.lastName,
      country: params.country,
      language: params.language,
    })
    .execute();
}

export interface AcceptSandboxDisclosureParams {
  userId: string;
  locale: string;
  correlationId?: string;
  now?: () => Date;
}

export interface AcceptedSandboxDisclosure {
  policyVersion: string;
  alreadyExisted: boolean;
}

/**
 * Records the current published WARIBA ONE simulated-account disclosure.
 * The server resolves the policy version; the browser cannot consent to an
 * invented or retired version. The unique index makes concurrent retries a
 * no-op while the audit row records only the first acceptance.
 */
export async function acceptSandboxDisclosure(
  db: Db,
  params: AcceptSandboxDisclosureParams,
): Promise<AcceptedSandboxDisclosure> {
  return db.transaction().execute(async (trx) => {
    const policy = await trx
      .selectFrom('app.policy_versions')
      .select('semantic_version')
      .where('program', '=', 'WARIBA_ONE')
      .where('status', '=', 'published')
      .orderBy('effective_from', 'desc')
      .executeTakeFirstOrThrow(() => new Error('No published WARIBA_ONE policy version.'));
    const timestamp = params.now?.() ?? new Date();
    const inserted = await trx
      .insertInto('app.user_consents')
      .values({
        user_id: params.userId,
        consent_type: 'simulated_account_disclosure',
        policy_version_id: policy.semantic_version,
        locale: params.locale,
        accepted_at: timestamp,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'consent_type', 'policy_version_id', 'locale']).doNothing(),
      )
      .returning('id')
      .executeTakeFirst();

    if (inserted) {
      await trx
        .insertInto('audit.audit_events')
        .values({
          actor_type: 'user',
          actor_id: params.userId,
          role: 'trader',
          permission: 'consent.accept',
          action: 'simulated_account_disclosure.accepted',
          target_type: 'user_consent',
          target_id: inserted.id,
          before_json: null,
          after_json: JSON.stringify({
            consentType: 'simulated_account_disclosure',
            policyVersion: policy.semantic_version,
            locale: params.locale,
          }),
          reason: 'checkout',
          source: 'web',
          correlation_id: params.correlationId ?? null,
          occurred_at: timestamp,
          created_at: timestamp,
        })
        .execute();
    }

    return { policyVersion: policy.semantic_version, alreadyExisted: !inserted };
  });
}
