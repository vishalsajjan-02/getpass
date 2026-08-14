import { initDb, getDb, closeDb } from '../config/database';

const MONTHS_BACK = 3;
const BATCH_SIZE = 500;

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const atLocalTime = (dateKey: string, hour: number, minute: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const local = new Date(y, m - 1, d, hour, minute, 0, 0);
  return local.toISOString();
};

/** Deterministic 0–99 score from user index + date. */
const dayScore = (userIndex: number, dateKey: string): number => {
  let hash = 0;
  const key = `${userIndex}:${dateKey}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
};

const listWeekdays = (from: Date, to: Date): string[] => {
  const dates: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  while (cursor <= end) {
    const day = cursor.getDay(); // 0 Sun … 6 Sat
    if (day !== 0 && day !== 6) {
      dates.push(toDateKey(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

/**
 * Seeds attendance for the last 3 months for all non-guest users.
 * - ~12% of weekday rows: absent (no record)
 * - ~18% of present rows: In only (no Out)
 * - remaining: In + Out
 */
export const seedAttendanceLast3Months = async (): Promise<void> => {
  const pool = getDb();
  console.log('\n📅 Seeding attendance (last 3 months)...\n');

  await pool.query('TRUNCATE TABLE user_in_out_time RESTART IDENTITY CASCADE');

  const usersResult = await pool.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name <> 'guest'
     ORDER BY u.created_at ASC, u.email ASC`,
  );
  const userIds = usersResult.rows.map((row) => String(row.id));
  if (userIds.length === 0) {
    throw new Error('No users found. Run npm run seed first.');
  }

  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - MONTHS_BACK);
  const dates = listWeekdays(start, today);

  console.log(`  Users : ${userIds.length}`);
  console.log(`  Days  : ${dates.length} weekdays (${toDateKey(start)} → ${toDateKey(today)})`);

  const rows: Array<{ userId: string; date: string; inTime: string; outTime: string | null }> = [];
  let absentDays = 0;
  let inOnlyDays = 0;
  let fullDays = 0;

  for (let userIndex = 0; userIndex < userIds.length; userIndex += 1) {
    const userId = userIds[userIndex];

    for (const dateKey of dates) {
      const score = dayScore(userIndex, dateKey);

      // Absent — no row
      if (score < 12) {
        absentDays += 1;
        continue;
      }

      const inHour = 9 + (score % 2); // 9 or 10
      const inMinute = (score * 7) % 50; // 0–49
      const inTime = atLocalTime(dateKey, inHour, inMinute);

      // In only (no Out) — ~18% of remaining, and prefer today for "still in"
      const isToday = dateKey === toDateKey(today);
      const inOnly = score < 30 || (isToday && score % 3 === 0);

      if (inOnly) {
        rows.push({ userId, date: dateKey, inTime, outTime: null });
        inOnlyDays += 1;
        continue;
      }

      const outHour = 17 + (score % 3); // 17–19
      const outMinute = (score * 11) % 55;
      const outTime = atLocalTime(dateKey, outHour, outMinute);
      rows.push({ userId, date: dateKey, inTime, outTime });
      fullDays += 1;
    }
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let param = 1;

    for (const row of batch) {
      placeholders.push(`($${param++}, $${param++}, $${param++}, $${param++})`);
      values.push(row.userId, row.date, row.inTime, row.outTime);
    }

    await pool.query(
      `INSERT INTO user_in_out_time (user_id, date, in_time, out_time)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (user_id, date) DO UPDATE SET
         in_time = EXCLUDED.in_time,
         out_time = EXCLUDED.out_time,
         updated_at = NOW()`,
      values,
    );
  }

  console.log(`  ✅ Inserted ${rows.length} attendance rows`);
  console.log(`     Present (In+Out) : ${fullDays}`);
  console.log(`     In only (no Out) : ${inOnlyDays}`);
  console.log(`     Absent (no row)  : ${absentDays}`);
  console.log('');
};

if (require.main === module) {
  (async () => {
    await initDb();
    await seedAttendanceLast3Months();
    await closeDb();
    process.exit(0);
  })().catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
}
