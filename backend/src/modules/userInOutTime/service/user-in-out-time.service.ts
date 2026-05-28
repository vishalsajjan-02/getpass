import { getDb } from '../../../config/database';
import type {
  UserInOutTime,
  UserInOutTimeReportRow,
} from '../../../types';

const isValidDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const todayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveDate = (date?: string): string => {
  if (!date) return todayDate();
  if (!isValidDate(date)) throw new Error('Invalid date. Use YYYY-MM-DD');
  return date;
};

/**
 * Returns one row per user (excluding admin) joined with their in/out
 * entry for the requested date. Users with no entry yet appear with
 * NULL in_time/out_time so the gatekeeper can create one with a click.
 */
export const getDailyReport = async (date?: string): Promise<UserInOutTimeReportRow[]> => {
  const targetDate = resolveDate(date);

  const result = await getDb().query(
    `
    SELECT
      u.id                  AS user_id,
      u.name                AS user_name,
      u.email               AS email,
      r.name                AS role,
      d.name                AS department,
      $1::date              AS date,
      t.id                  AS entry_id,
      t.in_time             AS in_time,
      t.out_time            AS out_time,
      t.updated_at          AS updated_at
    FROM users u
    JOIN roles r            ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN user_in_out_time t
      ON t.user_id = u.id AND t.date = $1::date
    WHERE r.name <> 'admin'
    ORDER BY r.name, u.name
    `,
    [targetDate],
  );

  return result.rows as UserInOutTimeReportRow[];
};

const ensureUserExists = async (userId: string): Promise<void> => {
  const existing = await getDb().query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!existing.rows[0]) throw new Error('User not found');
};

export const checkIn = async (userId: string): Promise<UserInOutTime> => {
  await ensureUserExists(userId);
  const date = todayDate();

  const result = await getDb().query(
    `
    INSERT INTO user_in_out_time (user_id, date, in_time)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      in_time    = COALESCE(user_in_out_time.in_time, EXCLUDED.in_time),
      updated_at = NOW()
    RETURNING id, user_id, date, in_time, out_time, created_at, updated_at
    `,
    [userId, date],
  );

  return result.rows[0] as UserInOutTime;
};

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
