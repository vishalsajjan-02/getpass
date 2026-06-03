import { getDb } from '../../../config/database';
import type { UserInOutTime } from '../../../types';
import { ensureUserExists, todayDate } from './shared/user-in-out-time.shared';

export const checkOut = async (userId: string): Promise<UserInOutTime> => {
  await ensureUserExists(userId);
  const date = todayDate();

  const result = await getDb().query(
    `
    INSERT INTO user_in_out_time (user_id, date, out_time)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      out_time   = NOW(),
      updated_at = NOW()
    RETURNING id, user_id, date, in_time, out_time, created_at, updated_at
    `,
    [userId, date],
  );

  return result.rows[0] as UserInOutTime;
};
