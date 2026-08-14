import bcrypt from 'bcryptjs';
import { initDb, getDb, closeDb } from '../config/database';
import { seedAttendanceLast3Months } from './seed-attendance';
import { runSeedLeaveTypes } from './seed-leave-types';
import { runSeedCompanyHolidays } from './seed-company-holidays';

const SALT_ROUNDS = 10;
const EMPLOYEE_COUNT = 150;

type SeedRole = 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';

const seedRoles: SeedRole[] = ['admin', 'manager', 'gatekeeper', 'employee', 'guest'];
const seedGatepassReasons = ['Lunch', 'Out', 'Other'];
const seedDepartments = ['Software R&D', 'Hardware R&D', 'Store', 'QA', 'Production', 'HR'];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Aadhya', 'Diya', 'Pari', 'Myra', 'Anika', 'Sara', 'Aisha', 'Kiara', 'Navya',
  'Rohan', 'Karan', 'Rahul', 'Amit', 'Suresh', 'Vikram', 'Nikhil', 'Pranav', 'Harsh', 'Yash',
  'Neha', 'Pooja', 'Priya', 'Sneha', 'Kavya', 'Meera', 'Riya', 'Shreya', 'Tanvi', 'Isha',
  'Omar', 'Ali', 'Samir', 'Farhan', 'Imran', 'Kabir', 'Dev', 'Jay', 'Ronak', 'Manav',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Joshi', 'Mehta',
  'Shah', 'Verma', 'Malhotra', 'Chopra', 'Kapoor', 'Bansal', 'Agarwal', 'Jain', 'Desai', 'Kulkarni',
];

const slugifyDept = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const pickName = (index: number): string => {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
};

const clearDatabase = async (): Promise<void> => {
  const pool = getDb();
  console.log('  🧹 Clearing all existing data...');
  await pool.query(`
    TRUNCATE TABLE
      gatepass_approval_requests,
      gatepasses,
      user_in_out_time,
      user_day_leaves,
      users,
      departments,
      gatepass_reasons,
      leave_types,
      company_holidays,
      roles
    RESTART IDENTITY CASCADE
  `);
  console.log('  ✅ Database cleared');
};

export const runSeed = async (): Promise<void> => {
  const pool = getDb();
  console.log('\n🌱 Seeding database...\n');

  await clearDatabase();

  for (const role of seedRoles) {
    await pool.query(`INSERT INTO roles (name) VALUES ($1)`, [role]);
  }
  console.log(`  ✅ Seeded roles: ${seedRoles.join(', ')}`);

  for (const reason of seedGatepassReasons) {
    await pool.query(`INSERT INTO gatepass_reasons (name) VALUES ($1)`, [reason]);
  }
  console.log(`  ✅ Seeded gatepass reasons: ${seedGatepassReasons.join(', ')}`);

  for (const dept of seedDepartments) {
    await pool.query(`INSERT INTO departments (name) VALUES ($1)`, [dept]);
  }
  console.log(`  ✅ Seeded departments: ${seedDepartments.join(', ')}`);

  await runSeedLeaveTypes();
  await runSeedCompanyHolidays();

  const roleRows = await pool.query(`SELECT name, id AS role_id FROM roles`);
  const roleIdMap: Record<string, string> = {};
  for (const r of roleRows.rows) roleIdMap[r.name] = r.role_id;

  const deptRows = await pool.query(`SELECT name, id AS department_id FROM departments`);
  const deptIdMap: Record<string, string> = {};
  for (const d of deptRows.rows) deptIdMap[d.name] = d.department_id;

  const [adminHash, gateHash, managerHash, employeeHash] = await Promise.all([
    bcrypt.hash('Admin@123', SALT_ROUNDS),
    bcrypt.hash('Gate@123', SALT_ROUNDS),
    bcrypt.hash('Manager@123', SALT_ROUNDS),
    bcrypt.hash('Emp@123', SALT_ROUNDS),
  ]);

  // ── Admin (1) ──────────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO users (name, email, password, role_id, department_id)
     VALUES ($1, $2, $3, $4, $5)`,
    ['Sarah Johnson', 'admin@company.com', adminHash, roleIdMap.admin, deptIdMap['Software R&D']],
  );
  console.log('  ✅ Seeded admin: admin@company.com / Admin@123');

  // ── Gatekeeper (1) ─────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO users (name, email, password, role_id, department_id)
     VALUES ($1, $2, $3, $4, $5)`,
    ['Mike Carter', 'gatekeeper@company.com', gateHash, roleIdMap.gatekeeper, deptIdMap.Store],
  );
  console.log('  ✅ Seeded gatekeeper: gatekeeper@company.com / Gate@123');

  // ── Guest (1) ──────────────────────────────────────────────────────────────
  const guestHash = await bcrypt.hash('Guest@123', SALT_ROUNDS);
  await pool.query(
    `INSERT INTO users (name, email, password, role_id, department_id)
     VALUES ($1, $2, $3, $4, $5)`,
    ['Guest User', 'guest@company.com', guestHash, roleIdMap.guest, deptIdMap['Software R&D']],
  );
  console.log('  ✅ Seeded guest: guest@company.com (also via guest code login)');

  // ── Managers (1 per department) ────────────────────────────────────────────
  const managerEmailByDept: Record<string, string> = {};
  for (const [index, dept] of seedDepartments.entries()) {
    const email = `manager.${slugifyDept(dept)}@company.com`;
    const name = `${pickName(index + 10)} (Mgr)`;
    await pool.query(
      `INSERT INTO users (name, email, password, role_id, department_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, managerHash, roleIdMap.manager, deptIdMap[dept]],
    );
    managerEmailByDept[dept] = email;
    console.log(`  ✅ Seeded manager (${dept}): ${email} / Manager@123`);
  }

  const managerRows = await pool.query(
    `SELECT u.id, u.email, d.name AS department
     FROM users u
     JOIN roles r ON r.id = u.role_id
     JOIN departments d ON d.id = u.department_id
     WHERE r.name = 'manager'`,
  );
  const managerIdByDept: Record<string, string> = {};
  for (const row of managerRows.rows) {
    managerIdByDept[row.department] = String(row.id);
  }

  // ── Employees (150), spread across departments ─────────────────────────────
  const employeeValues: unknown[] = [];
  const placeholders: string[] = [];
  let param = 1;

  for (let i = 1; i <= EMPLOYEE_COUNT; i += 1) {
    const dept = seedDepartments[(i - 1) % seedDepartments.length];
    const managerId = managerIdByDept[dept];
    const email = `emp${String(i).padStart(3, '0')}@company.com`;
    const name = pickName(i + 20);

    placeholders.push(
      `($${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++})`,
    );
    employeeValues.push(name, email, employeeHash, roleIdMap.employee, deptIdMap[dept], managerId);
  }

  await pool.query(
    `INSERT INTO users (name, email, password, role_id, department_id, manager_id)
     VALUES ${placeholders.join(', ')}`,
    employeeValues,
  );
  console.log(`  ✅ Seeded ${EMPLOYEE_COUNT} employees (password: Emp@123)`);
  console.log('     Examples: emp001@company.com … emp150@company.com');

  const counts = await pool.query(
    `SELECT r.name AS role, COUNT(u.id)::int AS user_count
     FROM roles r
     LEFT JOIN users u ON u.role_id = r.id
     GROUP BY r.name
     ORDER BY r.name`,
  );

  console.log('\n✅ Seeding complete! User counts:');
  for (const row of counts.rows) {
    console.log(`  ${row.role.padEnd(12)} → ${row.user_count}`);
  }

  // Accrue paid leave from Jan of current year through current month (1.75 / month).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthsAccrued = month;
  const leaveBalance = Number((monthsAccrued * 1.75).toFixed(2));
  const accruedThrough = `${year}-${String(month).padStart(2, '0')}`;
  await pool.query(
    `UPDATE users
     SET leave_balance = $1,
         leave_accrued_through = $2`,
    [leaveBalance, accruedThrough],
  );
  console.log(`\n  ✅ Leave balance set to ${leaveBalance} (1.75 × ${monthsAccrued} months through ${accruedThrough})`);

  console.log('\nLogin credentials:');
  console.log('  Admin      → admin@company.com / Admin@123');
  console.log('  Gatekeeper → gatekeeper@company.com / Gate@123');
  console.log('  Managers   → manager.<dept>@company.com / Manager@123');
  for (const dept of seedDepartments) {
    console.log(`               ${managerEmailByDept[dept]}`);
  }
  console.log('  Employees  → emp001@company.com … emp150@company.com / Emp@123\n');

  await seedAttendanceLast3Months();
};

// standalone: tsx src/database/seed.ts
if (require.main === module) {
  (async () => {
    await initDb();
    await runSeed();
    await closeDb();
    process.exit(0);
  })();
}
