import { getDb } from '../../../config/database';
import type { CompanyHoliday } from '../../../types';
import { normalizeDateKey } from '../../userInOutTime/service/shared/user-in-out-time.shared';

const mapHoliday = (row: Record<string, unknown>): CompanyHoliday => ({
  id: String(row.id),
  name: String(row.name),
  description: String(row.description ?? ''),
  holiday_date: normalizeDateKey(row.holiday_date as string | Date | null) ?? String(row.holiday_date).slice(0, 10),
  year: Number(row.year),
  is_fixed: Boolean(row.is_fixed),
  is_paid: Boolean(row.is_paid),
  is_active: Boolean(row.is_active),
  sort_order: Number(row.sort_order),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const getCompanyHolidays = async (year?: number): Promise<CompanyHoliday[]> => {
  const params: number[] = [];
  let where = 'WHERE is_active = TRUE AND deleted_at IS NULL';

  if (typeof year === 'number' && Number.isFinite(year)) {
    params.push(year);
    where += ` AND year = $${params.length}`;
  }

  const result = await getDb().query(
    `SELECT id, name, description, holiday_date, year, is_fixed, is_paid, is_active, sort_order, created_at, updated_at
     FROM company_holidays
     ${where}
     ORDER BY holiday_date ASC, sort_order ASC, name ASC`,
    params,
  );

  return result.rows.map(mapHoliday);
};
