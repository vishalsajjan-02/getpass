import { getDb } from '../../../config/database';
import type { UserInOutTime } from '../../../types';
import { ensureUserExists, isValidDate } from './shared/user-in-out-time.shared';

export const getUserHistory = async (
  userId: string,
  fromDate?: string,
  toDate?: string,
): Promise<UserInOutTime[]> => {
  await ensureUserExists(userId);

  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];

  if (fromDate) {
    if (!isValidDate(fromDate)) throw new Error('Invalid fromDate. Use YYYY-MM-DD');
    params.push(fromDate);
    conditions.push(`date >= $${params.length}::date`);
  }
  if (toDate) {
    if (!isValidDate(toDate)) throw new Error('Invalid toDate. Use YYYY-MM-DD');
    params.push(toDate);
    conditions.push(`date <= $${params.length}::date`);
  }

  const result = await getDb().query(
    `
    SELECT id, user_id, date, in_time, out_time, created_at, updated_at
    FROM user_in_out_time
    WHERE ${conditions.join(' AND ')}
    ORDER BY date DESC
    `,
    params,
  );

  return result.rows as UserInOutTime[];
};
