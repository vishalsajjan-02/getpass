import { initDb, getDb, closeDb } from '../config/database';

export type SeedCompanyHoliday = {
  name: string;
  description: string;
  /** MM-DD for the target year */
  monthDay: string;
  is_fixed: boolean;
  sort_order: number;
};

/** Company paid holidays for a calendar year (festival dates as provided for 2026). */
export const seedCompanyHolidaysForYear = (year: number): Array<SeedCompanyHoliday & { holiday_date: string }> => {
  const base: SeedCompanyHoliday[] = [
    {
      name: "New Year's Day",
      description: 'Beginning of the New Year.',
      monthDay: '01-01',
      is_fixed: true,
      sort_order: 1,
    },
    {
      name: 'Republic Day',
      description: 'India adopted its Constitution in 1950.',
      monthDay: '01-26',
      is_fixed: true,
      sort_order: 2,
    },
    {
      name: 'Chhatrapati Shivaji Maharaj Jayanti',
      description: 'Birth anniversary of Chhatrapati Shivaji Maharaj.',
      monthDay: '02-19',
      is_fixed: true,
      sort_order: 3,
    },
    {
      name: 'Holi',
      description: 'Festival of Colors.',
      monthDay: '03-14',
      is_fixed: false,
      sort_order: 4,
    },
    {
      name: 'Gudi Padwa',
      description: 'Marathi New Year.',
      monthDay: '03-30',
      is_fixed: false,
      sort_order: 5,
    },
    {
      name: 'Dr. B. R. Ambedkar Jayanti',
      description: 'Birth anniversary of Dr. B. R. Ambedkar.',
      monthDay: '04-14',
      is_fixed: true,
      sort_order: 6,
    },
    {
      name: 'Maharashtra Day / Labour Day',
      description: 'Formation Day of Maharashtra and International Workers\' Day.',
      monthDay: '05-01',
      is_fixed: true,
      sort_order: 7,
    },
    {
      name: 'Buddha Purnima',
      description: 'Celebrates the birth of Gautama Buddha.',
      monthDay: '05-12',
      is_fixed: false,
      sort_order: 8,
    },
    {
      name: 'Independence Day',
      description: 'India gained independence in 1947.',
      monthDay: '08-15',
      is_fixed: true,
      sort_order: 9,
    },
    {
      name: 'Ganesh Chaturthi',
      description: 'Celebrates the birth of Lord Ganesha.',
      monthDay: '08-27',
      is_fixed: false,
      sort_order: 10,
    },
    {
      name: 'Gandhi Jayanti',
      description: 'Birth anniversary of Mahatma Gandhi.',
      monthDay: '10-02',
      is_fixed: true,
      sort_order: 11,
    },
    {
      name: 'Dussehra (Vijayadashami)',
      description: 'Victory of good over evil.',
      monthDay: '10-20',
      is_fixed: false,
      sort_order: 12,
    },
    {
      name: 'Diwali (Lakshmi Puja)',
      description: 'Festival of Lights.',
      monthDay: '10-21',
      is_fixed: false,
      sort_order: 13,
    },
    {
      name: 'Diwali Balipratipada',
      description: 'Day after Lakshmi Puja, celebrated in Maharashtra.',
      monthDay: '10-22',
      is_fixed: false,
      sort_order: 14,
    },
    {
      name: 'Christmas',
      description: 'Celebrates the birth of Jesus Christ.',
      monthDay: '12-25',
      is_fixed: true,
      sort_order: 15,
    },
  ];

  return base.map((holiday) => ({
    ...holiday,
    holiday_date: `${year}-${holiday.monthDay}`,
  }));
};

export const runSeedCompanyHolidays = async (year: number = new Date().getFullYear()): Promise<void> => {
  const pool = getDb();
  console.log(`\n🎉 Seeding company holidays for ${year}...\n`);

  const holidays = seedCompanyHolidaysForYear(year);

  for (const holiday of holidays) {
    await pool.query(
      `INSERT INTO company_holidays
         (name, description, holiday_date, year, is_fixed, is_paid, is_active, sort_order, deleted_at)
       VALUES ($1, $2, $3::date, $4, $5, TRUE, TRUE, $6, NULL)
       ON CONFLICT (holiday_date, name) WHERE deleted_at IS NULL DO UPDATE SET
         description = EXCLUDED.description,
         year = EXCLUDED.year,
         is_fixed = EXCLUDED.is_fixed,
         is_paid = TRUE,
         is_active = TRUE,
         sort_order = EXCLUDED.sort_order,
         deleted_at = NULL,
         updated_at = NOW()`,
      [
        holiday.name,
        holiday.description,
        holiday.holiday_date,
        year,
        holiday.is_fixed,
        holiday.sort_order,
      ],
    );
    console.log(
      `  ✅ ${String(holiday.sort_order).padStart(2, '0')}. ${holiday.holiday_date} — ${holiday.name}${
        holiday.is_fixed ? '' : ' (varies by year)'
      }`,
    );
  }

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total FROM company_holidays WHERE year = $1`,
    [year],
  );
  console.log(`\n✅ Company holidays ready (${count.rows[0].total} rows for ${year})\n`);
};

if (require.main === module) {
  (async () => {
    await initDb();
    await runSeedCompanyHolidays();
    await closeDb();
    process.exit(0);
  })().catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
}
