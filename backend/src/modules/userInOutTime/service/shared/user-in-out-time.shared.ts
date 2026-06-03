import { getDb } from '../../../../config/database';

export const isValidDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const todayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const resolveDate = (date?: string): string => {
  if (!date) return todayDate();
  if (!isValidDate(date)) throw new Error('Invalid date. Use YYYY-MM-DD');
  return date;
};

export const ensureUserExists = async (userId: string): Promise<void> => {
  const existing = await getDb().query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!existing.rows[0]) throw new Error('User not found');
};
