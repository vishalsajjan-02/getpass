import { initDb, getDb, closeDb } from '../config/database';

export type SeedLeaveType = {
  name: string;
  is_paid: boolean;
  sort_order: number;
};

/** Only these three leave types are used in the app. */
export const seedLeaveTypes: SeedLeaveType[] = [
  { name: 'Paid Leave', is_paid: true, sort_order: 1 },
  { name: 'Happiness Leave', is_paid: true, sort_order: 2 },
  { name: 'Half-Day Leave', is_paid: true, sort_order: 3 },
];

export const runSeedLeaveTypes = async (): Promise<void> => {
  const pool = getDb();
  console.log('\n📋 Seeding leave types...\n');

  for (const leave of seedLeaveTypes) {
    await pool.query(
      `INSERT INTO leave_types (name, is_paid, is_active, sort_order, deleted_at)
       VALUES ($1, $2, TRUE, $3, NULL)
       ON CONFLICT (name) WHERE deleted_at IS NULL DO UPDATE SET
         is_paid = EXCLUDED.is_paid,
         is_active = TRUE,
         sort_order = EXCLUDED.sort_order,
         deleted_at = NULL,
         updated_at = NOW()`,
      [leave.name, leave.is_paid, leave.sort_order],
    );
    console.log(`  ✅ ${leave.name}`);
  }

  // Soft-delete every leave type that is not in the allowed list
  const allowedNames = seedLeaveTypes.map((l) => l.name);
  const removed = await pool.query(
    `UPDATE leave_types
     SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
     WHERE deleted_at IS NULL
       AND name <> ALL($1::text[])
     RETURNING name`,
    [allowedNames],
  );

  for (const row of removed.rows) {
    console.log(`  🗑️  Removed: ${row.name}`);
  }

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total FROM leave_types WHERE deleted_at IS NULL AND is_active = TRUE`,
  );
  console.log(`\n✅ Leave types ready (${count.rows[0].total} active)\n`);
};

if (require.main === module) {
  (async () => {
    await initDb();
    await runSeedLeaveTypes();
    await closeDb();
    process.exit(0);
  })().catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
}
