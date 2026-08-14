import { getDb } from '../../../config/database';
import type { CompanyHoliday } from '../../../types';
import { normalizeDateKey } from '../../userInOutTime/service/shared/user-in-out-time.shared';
import { getCompanyHolidays } from './get-company-holidays.service';

export type CreateCompanyHolidayInput = {
  name: string;
  description?: string;
  holiday_date: string;
  is_fixed?: boolean;
  is_paid?: boolean;
  sort_order?: number;
};

export const createCompanyHoliday = async (input: CreateCompanyHolidayInput): Promise<CompanyHoliday> => {
  const name = input.name?.trim();
  const holidayDate = normalizeDateKey(input.holiday_date) ?? input.holiday_date?.trim();

  if (!name) throw new Error('name is required');
  if (!holidayDate || !/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) {
    throw new Error('holiday_date must be YYYY-MM-DD');
  }

  const year = Number(holidayDate.slice(0, 4));
  const description = (input.description ?? '').trim();
  const isFixed = input.is_fixed !== false;
  const isPaid = input.is_paid !== false;
  const sortOrder = Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0;

  const result = await getDb().query(
    `INSERT INTO company_holidays
       (name, description, holiday_date, year, is_fixed, is_paid, is_active, sort_order)
     VALUES ($1, $2, $3::date, $4, $5, $6, TRUE, $7)
     RETURNING id`,
    [name, description, holidayDate, year, isFixed, isPaid, sortOrder],
  );

  const holidays = await getCompanyHolidays(year);
  const created = holidays.find((row) => row.id === String(result.rows[0].id));
  if (!created) throw new Error('Failed to load created holiday');
  return created;
};
