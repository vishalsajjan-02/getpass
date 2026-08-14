import { initDb, getDb, closeDb } from '../config/database';

const BULK_TAG = '[BULK100]';

type ReasonName = 'Lunch' | 'Out' | 'Other';

type Scenario = {
  reason: ReasonName;
  status: string;
  gatepassType: 'out-in' | 'out';
  approvalFlow: 'admin_only' | 'manager_then_admin';
  rejectionReason?: string;
  /** Lunch duration in minutes (for active/completed lunch). */
  lunchMinutes?: number;
};

const SCENARIOS: Scenario[] = [
  { reason: 'Lunch', status: 'pending_admin_approval', gatepassType: 'out-in', approvalFlow: 'admin_only' },
  { reason: 'Out', status: 'pending_manager_approval', gatepassType: 'out', approvalFlow: 'manager_then_admin' },
  { reason: 'Out', status: 'pending_admin_approval', gatepassType: 'out', approvalFlow: 'manager_then_admin' },
  { reason: 'Other', status: 'approved', gatepassType: 'out-in', approvalFlow: 'admin_only' },
  { reason: 'Lunch', status: 'rejected', gatepassType: 'out-in', approvalFlow: 'admin_only', rejectionReason: 'Not approved' },
  { reason: 'Other', status: 'cancelled', gatepassType: 'out-in', approvalFlow: 'admin_only' },
  { reason: 'Lunch', status: 'active', gatepassType: 'out-in', approvalFlow: 'admin_only', lunchMinutes: 22 },
  { reason: 'Lunch', status: 'completed', gatepassType: 'out-in', approvalFlow: 'admin_only', lunchMinutes: 25 },
  { reason: 'Lunch', status: 'completed', gatepassType: 'out-in', approvalFlow: 'admin_only', lunchMinutes: 48 },
  { reason: 'Out', status: 'completed', gatepassType: 'out', approvalFlow: 'manager_then_admin' },
  { reason: 'Other', status: 'completed', gatepassType: 'out-in', approvalFlow: 'admin_only', lunchMinutes: 40 },
];

const formatDate = (index: number): string => {
  const year = 2024 + (index % 3);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const addMinutes = (base: Date, minutes: number): Date => new Date(base.getTime() + minutes * 60_000);

const run = async (): Promise<void> => {
  await initDb();
  const pool = getDb();
  const client = await pool.connect();

  try {
    const lookup = await client.query<{
      emp_id: string;
      mgr_id: string;
      admin_id: string;
      gate_id: string;
      lunch_id: string;
      out_id: string;
      other_id: string;
    }>(`
      SELECT
        (SELECT id FROM users WHERE email = 'emp001@company.com' AND deleted_at IS NULL) AS emp_id,
        (SELECT id FROM users WHERE email = 'manager.software-r-d@company.com' AND deleted_at IS NULL) AS mgr_id,
        (SELECT id FROM users WHERE email = 'admin@company.com' AND deleted_at IS NULL) AS admin_id,
        (SELECT id FROM users WHERE email = 'gatekeeper@company.com' AND deleted_at IS NULL) AS gate_id,
        (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'lunch' AND deleted_at IS NULL) AS lunch_id,
        (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'out' AND deleted_at IS NULL) AS out_id,
        (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'other' AND deleted_at IS NULL) AS other_id
    `);

    const row = lookup.rows[0];
    if (!row?.emp_id || !row.admin_id || !row.mgr_id || !row.gate_id) {
      throw new Error('Seed users missing. Run: npm run seed');
    }

    const reasonIds: Record<ReasonName, string> = {
      Lunch: row.lunch_id,
      Out: row.out_id,
      Other: row.other_id,
    };

    await client.query('BEGIN');
    await client.query(
      `DELETE FROM gatepass_approval_requests
       WHERE gatepass_id IN (
         SELECT id FROM gatepasses WHERE reason_description LIKE $1
       )`,
      [`${BULK_TAG}%`],
    );
    await client.query(`DELETE FROM gatepasses WHERE reason_description LIKE $1`, [`${BULK_TAG}%`]);

    console.log('\n📦 Inserting 100 bulk gatepass records...\n');

    for (let i = 1; i <= 100; i += 1) {
      const scenario = SCENARIOS[(i - 1) % SCENARIOS.length];
      const date = formatDate(i);
      const reasonId = reasonIds[scenario.reason];
      const description = `${BULK_TAG} #${i} ${scenario.reason} ${scenario.status}`;

      let checkedOutAt: Date | null = null;
      let checkedInAt: Date | null = null;
      let totalMinutesOutside = 0;

      if (scenario.status === 'active' && scenario.lunchMinutes) {
        checkedOutAt = addMinutes(new Date(), -scenario.lunchMinutes);
      }

      if (scenario.status === 'completed') {
        const base = new Date(`${date}T12:00:00`);
        if (scenario.reason === 'Out') {
          checkedOutAt = addMinutes(base, (i % 6) * 10);
          totalMinutesOutside = 0;
        } else {
          const duration = scenario.lunchMinutes ?? 20 + (i % 50);
          checkedOutAt = base;
          checkedInAt = addMinutes(base, duration);
          totalMinutesOutside = duration;
        }
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO gatepasses (
           user_id, reason_id, reason_description, destination, date,
           status, approval_flow, gatepass_type, is_emergency,
           rejection_reason, checked_out_at, checked_out_by,
           checked_in_at, checked_in_by, total_minutes_outside
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [
          row.emp_id,
          reasonId,
          description,
          i % 2 === 0 ? 'Main gate' : 'Cafeteria',
          date,
          scenario.status,
          scenario.approvalFlow,
          scenario.gatepassType,
          i % 17 === 0,
          scenario.rejectionReason ?? null,
          checkedOutAt?.toISOString() ?? null,
          checkedOutAt ? row.gate_id : null,
          checkedInAt?.toISOString() ?? null,
          checkedInAt ? row.gate_id : null,
          totalMinutesOutside,
        ],
      );

      const gatepassId = inserted.rows[0].id;

      if (scenario.approvalFlow === 'manager_then_admin') {
        const managerStatus =
          scenario.status === 'pending_manager_approval'
            ? 'pending'
            : scenario.status === 'pending_admin_approval'
              ? 'approved'
              : ['rejected', 'cancelled'].includes(scenario.status)
                ? 'cancelled'
                : 'approved';

        await client.query(
          `INSERT INTO gatepass_approval_requests (gatepass_id, approver_user_id, approver_role, step, status, acted_at)
           VALUES ($1,$2,'manager',1,$3,$4)
           ON CONFLICT (gatepass_id, step) DO NOTHING`,
          [
            gatepassId,
            row.mgr_id,
            managerStatus,
            managerStatus === 'pending' ? null : new Date().toISOString(),
          ],
        );
      }

      const adminStatus =
        scenario.status === 'pending_admin_approval' || scenario.status === 'pending_manager_approval'
          ? 'pending'
          : scenario.status === 'rejected'
            ? 'rejected'
            : scenario.status === 'cancelled'
              ? 'cancelled'
              : 'approved';

      await client.query(
        `INSERT INTO gatepass_approval_requests (gatepass_id, approver_user_id, approver_role, step, status, remarks, acted_at)
         VALUES ($1,$2,'admin',2,$3,$4,$5)
         ON CONFLICT (gatepass_id, step) DO NOTHING`,
        [
          gatepassId,
          row.admin_id,
          adminStatus,
          scenario.rejectionReason ?? null,
          adminStatus === 'pending' ? null : new Date().toISOString(),
        ],
      );
    }

    await client.query('COMMIT');

    const count = await pool.query(
      `SELECT COUNT(*)::int AS count FROM gatepasses WHERE reason_description LIKE $1`,
      [`${BULK_TAG}%`],
    );

    console.log(`✅ Inserted ${count.rows[0]?.count ?? 0} gatepass rows (${BULK_TAG}).`);
    console.log('   Dates: 2024–2026 · Reasons: Lunch, Out, Other · All statuses covered.\n');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closeDb();
  }
};

run().catch((error: Error) => {
  console.error('❌ Bulk seed failed:', error.message);
  process.exit(1);
});
