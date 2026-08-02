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
