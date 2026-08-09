export interface SupabaseAuthFixtureConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

interface CreateAuthFixtureUserParams extends SupabaseAuthFixtureConfig {
  email: string;
  password: string;
}

function parseResponseBody(responseText: string): unknown {
  if (!responseText) return null;
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function responseDetail(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body);
}

export async function createAuthFixtureUser(params: CreateAuthFixtureUserParams): Promise<string> {
  const response = await fetch(`${params.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: params.serviceRoleKey,
      Authorization: `Bearer ${params.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      email_confirm: true,
    }),
  });
  const responseText = await response.text();
  const body = parseResponseBody(responseText);
  if (!response.ok) {
    throw new Error(
      `Supabase Auth fixture creation failed for ${params.email}: HTTP ${response.status} ${responseDetail(body)}`,
    );
  }
  if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'string') {
    throw new Error(
      `Supabase Auth fixture creation returned no user id for ${params.email}: ${responseDetail(body)}`,
    );
  }
  return body.id;
}

export async function deleteAuthFixtureUser(
  params: SupabaseAuthFixtureConfig & { userId: string },
): Promise<void> {
  const response = await fetch(`${params.supabaseUrl}/auth/v1/admin/users/${params.userId}`, {
    method: 'DELETE',
    headers: {
      apikey: params.serviceRoleKey,
      Authorization: `Bearer ${params.serviceRoleKey}`,
    },
  });
  if (response.ok || response.status === 404) return;
  const responseText = await response.text();
  throw new Error(
    `Supabase Auth fixture cleanup failed for ${params.userId}: HTTP ${response.status} ${responseDetail(parseResponseBody(responseText))}`,
  );
}
