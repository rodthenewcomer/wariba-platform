import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertLocalDataPlane,
  REMOTE_DATA_PLANE_OVERRIDE,
  type Environment,
} from '../../config/src/index.ts';
import { bootstrapPlatformOwner } from '../src/owner-bootstrap.ts';
import { createDbClient } from '../src/client.ts';

const rootEnvFile = fileURLToPath(new URL('../../../.env.local', import.meta.url));
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required runtime environment variable: ${name}.`);
  return value;
}

const environment = requireEnv('APP_ENV');
if (!['local', 'preview', 'staging', 'production'].includes(environment)) {
  throw new Error('APP_ENV must be local, preview, staging, or production.');
}

const config = {
  APP_ENV: environment as Environment,
  DATABASE_URL: requireEnv('DATABASE_URL'),
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  WARIBA_OWNER_EMAIL: requireEnv('WARIBA_OWNER_EMAIL'),
  WARIBA_OWNER_PASSWORD: requireEnv('WARIBA_OWNER_PASSWORD'),
  WARIBA_OWNER_FIRST_NAME: process.env.WARIBA_OWNER_FIRST_NAME?.trim() || 'WARIBA',
  WARIBA_OWNER_LAST_NAME: process.env.WARIBA_OWNER_LAST_NAME?.trim() || 'Owner',
  WARIBA_OWNER_COUNTRY: process.env.WARIBA_OWNER_COUNTRY?.trim() || 'CI',
  WARIBA_OWNER_LANGUAGE: process.env.WARIBA_OWNER_LANGUAGE?.trim() || 'fr',
};

if (!/^\S+@\S+\.\S+$/.test(config.WARIBA_OWNER_EMAIL)) {
  throw new Error('WARIBA_OWNER_EMAIL must be a valid email address.');
}
if (config.WARIBA_OWNER_PASSWORD.length < 12) {
  throw new Error('WARIBA_OWNER_PASSWORD must contain at least 12 characters.');
}
assertLocalDataPlane({
  environment: config.APP_ENV,
  endpoints: { DATABASE_URL: config.DATABASE_URL, SUPABASE_URL: config.SUPABASE_URL },
  override: process.env[REMOTE_DATA_PLANE_OVERRIDE],
});

const db = createDbClient(config.DATABASE_URL);

try {
  const result = await bootstrapPlatformOwner(
    db,
    {
      async createUser({ email, password, emailConfirm }) {
        const response = await fetch(`${config.SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            apikey: config.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, email_confirm: emailConfirm }),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(`Supabase Auth owner creation failed with HTTP ${response.status}.`);
        }
        if (
          typeof body !== 'object' ||
          body === null ||
          !('id' in body) ||
          typeof body.id !== 'string'
        ) {
          throw new Error('Supabase Auth owner creation returned no user id.');
        }
        return { id: body.id };
      },
    },
    {
      email: config.WARIBA_OWNER_EMAIL,
      password: config.WARIBA_OWNER_PASSWORD,
      profile: {
        firstName: config.WARIBA_OWNER_FIRST_NAME,
        lastName: config.WARIBA_OWNER_LAST_NAME,
        country: config.WARIBA_OWNER_COUNTRY,
        language: config.WARIBA_OWNER_LANGUAGE,
      },
    },
  );

  process.stdout.write(
    [
      `OWNER_EMAIL=${config.WARIBA_OWNER_EMAIL.toLowerCase()}`,
      `AUTH_USER_CREATED_OR_REUSED=${result.authUser}`,
      `PROFILE_CREATED_OR_REUSED=${result.profile}`,
      `MEMBERSHIP_CREATED_PROMOTED_OR_REUSED=${result.membership}`,
      `CANONICAL_OWNER_ROLE=${result.role}`,
      `EFFECTIVE_PERMISSION_COUNT=${result.effectivePermissions.length}`,
      `MISSING_PERMISSIONS_IF_ANY=${result.missingPermissions.join(',') || 'none'}`,
      `AUDIT_ACCESS=${result.effectivePermissions.includes('audit_evidence.view')}`,
      `PAYOUT_APPROVAL_AUTHORITY=${result.effectivePermissions.includes('payout.approve')}`,
      `TREASURY_AUTHORITY=${result.effectivePermissions.includes('treasury.modify')}`,
      `TEAM_RBAC_AUTHORITY=${result.effectivePermissions.includes('staff_directory.view') ? 'read_only' : 'none'}`,
      'SECRET_COMMITTED=false',
    ].join('\n') + '\n',
  );
} finally {
  await db.destroy();
}
