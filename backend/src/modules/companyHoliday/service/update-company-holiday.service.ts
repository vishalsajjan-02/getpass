import { getDb } from '../../../config/database';
import type { CompanyHoliday } from '../../../types';
import { normalizeDateKey } from '../../userInOutTime/service/shared/user-in-out-time.shared';
import { getCompanyHolidays } from './get-company-holidays.service';

export type UpdateCompanyHolidayInput = {
  id: string;
  name?: string;
  description?: string;
  holiday_date?: string;
  is_fixed?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export const updateCompanyHoliday = async (input: UpdateCompanyHolidayInput): Promise<CompanyHoliday> => {
  if (!input.id) throw new Error('id is required');

  const existing = await getDb().query(
    `SELECT id, year FROM company_holidays WHERE id = $1`,
    [input.id],
  );
  if (existing.rowCount === 0) throw new Error('Holiday not found');

  const name = input.name?.trim();
  const holidayDate =
    input.holiday_date !== undefined
      ? normalizeDateKey(input.holiday_date) ?? input.holiday_date.trim()
      : undefined;

  if (holidayDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) {
    throw new Error('holiday_date must be YYYY-MM-DD');
  }

  const year = holidayDate ? Number(holidayDate.slice(0, 4)) : Number(existing.rows[0].year);

  await getDb().query(
    `UPDATE company_holidays SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       holiday_date = COALESCE($4::date, holiday_date),
       year = $5,
       is_fixed = COALESCE($6, is_fixed),
       is_paid = COALESCE($7, is_paid),
       is_active = COALESCE($8, is_active),
       sort_order = COALESCE($9, sort_order),
       updated_at = NOW()
     WHERE id = $1`,
    [
      input.id,
      name ?? null,
      input.description !== undefined ? input.description.trim() : null,
      holidayDate ?? null,
      year,
      input.is_fixed ?? null,
      input.is_paid ?? null,
      input.is_active ?? null,
      input.sort_order ?? null,
    ],
  );

  const holidays = await getCompanyHolidays(year);
  const updated = holidays.find((row) => row.id === input.id);
  if (updated) return updated;

  // May be inactive after update — fetch directly.
  const result = await getDb().query(
    `SELECT id, name, description, holiday_date, year, is_fixed, is_paid, is_active, sort_order, created_at, updated_at
     FROM company_holidays WHERE id = $1`,
    [input.id],
  );
  const row = result.rows[0];
  return {
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
  };
};
