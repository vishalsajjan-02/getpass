import { initDb, getDb, closeDb } from '../config/database';

const TAG = '[SEED10]';

type ReasonName = 'Lunch' | 'Out' | 'Other';
type Cadence = 'daily' | 'weekly' | 'random';

type UserProfile = {
  email: string;
  cadence: Cadence;
  /** Which reasons this user uses (weighted by repetition). */
  reasons: ReasonName[];
  /** Fraction of Lunch/Other that never check back in (0–1). */
  noReturnRate: number;
};

/** 10 employees with different visit patterns over ~5 months. */
const PROFILES: UserProfile[] = [
  { email: 'emp001@company.com', cadence: 'daily', reasons: ['Lunch', 'Lunch', 'Out', 'Other'], noReturnRate: 0.15 },
  { email: 'emp002@company.com', cadence: 'daily', reasons: ['Lunch', 'Out'], noReturnRate: 0.1 },
  { email: 'emp003@company.com', cadence: 'weekly', reasons: ['Out', 'Other'], noReturnRate: 0.2 },
  { email: 'emp004@company.com', cadence: 'weekly', reasons: ['Lunch', 'Other', 'Out'], noReturnRate: 0.25 },
  { email: 'emp005@company.com', cadence: 'random', reasons: ['Out', 'Out', 'Lunch'], noReturnRate: 0.1 },
  { email: 'emp006@company.com', cadence: 'random', reasons: ['Other', 'Lunch', 'Out'], noReturnRate: 0.3 },
  { email: 'emp007@company.com', cadence: 'daily', reasons: ['Lunch'], noReturnRate: 0.2 },
  { email: 'emp008@company.com', cadence: 'weekly', reasons: ['Out'], noReturnRate: 0 },
  { email: 'emp009@company.com', cadence: 'random', reasons: ['Lunch', 'Other'], noReturnRate: 0.35 },
  { email: 'emp010@company.com', cadence: 'random', reasons: ['Out', 'Other', 'Lunch', 'Out'], noReturnRate: 0.15 },
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

const formatDateLocal = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const addMinutes = (base: Date, minutes: number): Date =>
  new Date(base.getTime() + minutes * 60_000);

/** Deterministic pseudo-random 0..1 from seed ints. */
const hash01 = (...parts: number[]): number => {
  let h = 2166136261;
  for (const p of parts) {
    h ^= p;
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
};

/** Duration outside: 30 min … 2 hr, varied. */
const pickDurationMinutes = (userIndex: number, dayIndex: number): number => {
  const buckets = [30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120];
  const i = Math.floor(hash01(userIndex, dayIndex, 7) * buckets.length);
  return buckets[i] ?? 45;
};

/** Checkout hour 10–16, minute 0/15/30/45. */
const pickCheckoutTime = (dateStr: string, userIndex: number, dayIndex: number): Date => {
  const hour = 10 + Math.floor(hash01(userIndex, dayIndex, 3) * 7);
  const minute = [0, 15, 30, 45][Math.floor(hash01(userIndex, dayIndex, 11) * 4)] ?? 0;
  return new Date(`${dateStr}T${pad2(hour)}:${pad2(minute)}:00`);
};

const isWeekend = (d: Date): boolean => {
  const day = d.getDay();
  return day === 0 || day === 6;
};

const collectDates = (cadence: Cadence, start: Date, end: Date, userIndex: number): Date[] => {
  const dates: Date[] = [];
  let cursor = new Date(start);

  if (cadence === 'daily') {
    while (cursor <= end) {
      if (!isWeekend(cursor)) dates.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  if (cadence === 'weekly') {
    // One weekday per week (Mon + userIndex offset).
    const targetDow = 1 + (userIndex % 5); // Mon–Fri
    while (cursor <= end) {
      if (cursor.getDay() === targetDow) dates.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  // random: ~2–4 weekdays per month
  while (cursor <= end) {
    if (!isWeekend(cursor)) {
      const roll = hash01(userIndex, cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      if (roll < 0.18) dates.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
};

const run = async (): Promise<void> => {
  await initDb();
  const pool = getDb();
  const client = await pool.connect();

  try {
    const emails = PROFILES.map((p) => p.email);

    const usersResult = await client.query<{
      id: string;
      email: string;
      manager_id: string | null;
    }>(
      `SELECT id, email, manager_id
       FROM users
       WHERE email = ANY($1::text[])
         AND deleted_at IS NULL`,
      [emails],
    );

    if (usersResult.rows.length < PROFILES.length) {
      const found = new Set(usersResult.rows.map((r) => r.email));
      const missing = emails.filter((e) => !found.has(e));
      throw new Error(`Missing users: ${missing.join(', ')}. Run: npm run seed`);
    }

    const userByEmail = new Map(usersResult.rows.map((r) => [r.email, r]));

    const lookup = await client.query<{
      admin_id: string;
      gate_id: string;
      lunch_id: string;
      out_id: string;
      other_id: string;
    }>(`
      SELECT
        (SELECT id FROM users WHERE email = 'admin@company.com' AND deleted_at IS NULL) AS admin_id,
        (SELECT id FROM users WHERE email = 'gatekeeper@company.com' AND deleted_at IS NULL) AS gate_id,
        (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'lunch' AND deleted_at IS NULL) AS lunch_id,
        (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'out' AND deleted_at IS NULL) AS out_id,
        (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'other' AND deleted_at IS NULL) AS other_id
    `);

    const meta = lookup.rows[0];
    if (!meta?.admin_id || !meta.gate_id || !meta.lunch_id || !meta.out_id || !meta.other_id) {
      throw new Error('Admin/gatekeeper/reasons missing. Run: npm run seed');
    }

    const reasonIds: Record<ReasonName, string> = {
      Lunch: meta.lunch_id,
      Out: meta.out_id,
      Other: meta.other_id,
    };

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = addDays(end, -150); // ~5 months

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM gatepass_approval_requests
       WHERE gatepass_id IN (
         SELECT id FROM gatepasses WHERE reason_description LIKE $1
       )`,
      [`${TAG}%`],
    );
    await client.query(`DELETE FROM gatepasses WHERE reason_description LIKE $1`, [`${TAG}%`]);

    console.log(`\n📦 Seeding gatepasses for ${PROFILES.length} users (${formatDateLocal(start)} → ${formatDateLocal(end)})...\n`);

    let inserted = 0;
    let noReturnCount = 0;

    for (let ui = 0; ui < PROFILES.length; ui += 1) {
      const profile = PROFILES[ui];
      const user = userByEmail.get(profile.email);
      if (!user) continue;

      const dates = collectDates(profile.cadence, start, end, ui);
      let userCount = 0;

      for (let di = 0; di < dates.length; di += 1) {
        const date = dates[di];
        const dateStr = formatDateLocal(date);
        const reason = profile.reasons[di % profile.reasons.length];
        const isOut = reason === 'Out';
        const duration = pickDurationMinutes(ui, di);
        const checkedOutAt = pickCheckoutTime(dateStr, ui, di);

        // Some Lunch/Other never return (no check-in). Out never has check-in.
        const skipCheckIn =
          isOut ||
          (!isOut && hash01(ui, di, 99) < profile.noReturnRate);

        const checkedInAt = skipCheckIn ? null : addMinutes(checkedOutAt, duration);
        const totalMinutesOutside = checkedInAt ? duration : 0;

        // Past days: completed (or active if still out with no return).
        // Today with no return: active.
        const isToday = dateStr === formatDateLocal(end);
        let status: string;
        if (skipCheckIn && isToday) {
          status = 'active';
        } else if (skipCheckIn && !isOut) {
          // Historical Lunch/Other that never came back — still completed for reporting, no check-in.
          status = 'completed';
          noReturnCount += 1;
        } else {
          status = 'completed';
          if (skipCheckIn && isOut) {
            // Out completed without return is normal
          }
        }

        const gatepassType = isOut ? 'out' : 'out-in';
        const approvalFlow = isOut ? 'manager_then_admin' : 'admin_only';
        const destination =
          reason === 'Lunch' ? 'Cafeteria' : reason === 'Out' ? 'Client site' : 'Bank / personal';

        const description = `${TAG} ${profile.email} ${reason} ${profile.cadence} #${di + 1}${
          skipCheckIn && !isOut ? ' (no-in)' : ''
        }`;

        const gp = await client.query<{ id: string }>(
          `INSERT INTO gatepasses (
             user_id, reason_id, reason_description, destination, date,
             status, approval_flow, gatepass_type, is_emergency,
             checked_out_at, checked_out_by,
             checked_in_at, checked_in_by, total_minutes_outside
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,$11,$12,$13)
           RETURNING id`,
          [
            user.id,
            reasonIds[reason],
            description,
            destination,
            dateStr,
            status,
            approvalFlow,
            gatepassType,
            checkedOutAt.toISOString(),
            meta.gate_id,
            checkedInAt?.toISOString() ?? null,
            checkedInAt ? meta.gate_id : null,
            totalMinutesOutside,
          ],
        );

        const gatepassId = gp.rows[0].id;

        if (approvalFlow === 'manager_then_admin') {
          const managerId = user.manager_id;
          if (managerId) {
            await client.query(
              `INSERT INTO gatepass_approval_requests
                 (gatepass_id, approver_user_id, approver_role, step, status, acted_at)
               VALUES ($1,$2,'manager',1,'approved',$3)
               ON CONFLICT (gatepass_id, step) DO NOTHING`,
              [gatepassId, managerId, checkedOutAt.toISOString()],
            );
          }
        }

        await client.query(
          `INSERT INTO gatepass_approval_requests
             (gatepass_id, approver_user_id, approver_role, step, status, acted_at)
           VALUES ($1,$2,'admin',2,'approved',$3)
           ON CONFLICT (gatepass_id, step) DO NOTHING`,
          [gatepassId, meta.admin_id, checkedOutAt.toISOString()],
        );

        inserted += 1;
        userCount += 1;
      }

      console.log(
        `  ✅ ${profile.email.padEnd(22)} ${profile.cadence.padEnd(7)} → ${userCount} gatepasses`,
      );
    }

    await client.query('COMMIT');

    const summary = await pool.query<{ reason: string; count: string }>(
      `SELECT gr.name AS reason, COUNT(*)::text AS count
       FROM gatepasses g
       JOIN gatepass_reasons gr ON gr.id = g.reason_id
       WHERE g.reason_description LIKE $1
       GROUP BY gr.name
       ORDER BY gr.name`,
      [`${TAG}%`],
    );

    console.log(`\n✅ Inserted ${inserted} gatepasses (${TAG}).`);
    console.log(`   Lunch/Other with no check-in: ${noReturnCount}`);
    for (const row of summary.rows) {
      console.log(`   ${row.reason}: ${row.count}`);
    }
    console.log('');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closeDb();
  }
};

run().catch((error: Error) => {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
});
