import bcrypt from 'bcryptjs';
import { initDb, getDb, closeDb } from '../config/database';

const SALT_ROUNDS = 10;

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
  department_name?: string;
  manager_id?: string;
}

const seedRoles: SeedUser['role'][] = ['admin', 'manager', 'gatekeeper', 'employee', 'guest'];
const seedGatepassReasons = ['Lunch', 'unit 2', 'visit to vendor', 'out'];
const seedDepartments = ['Software R&D', 'Hardware R&D', 'Store', 'QA', 'Production'];

const seedUsers: SeedUser[] = [
  {
    name: 'Sarah Johnson',
    email: 'admin@company.com',
    password: 'Admin@123',
    role: 'admin',
    department_name: 'Software R&D',
  },
  {
    name: 'Mike Carter',
    email: 'gatekeeper@company.com',
    password: 'Gate@123',
    role: 'gatekeeper',
    department_name: 'Store',
  },
  {
    name: 'Megan Hall',
    email: 'manager@company.com',
    password: 'Manager@123',
    role: 'manager',
    department_name: 'Software R&D',
  },
  {
    name: 'John Doe',
    email: 'employee@company.com',
    password: 'Emp@123',
    role: 'employee',
    department_name: 'Software R&D',
  },
  {
    name: 'Jane Guest',
    email: 'guest@company.com',
    password: 'Guest@123',
    role: 'guest',
  },
];

export const runSeed = async (): Promise<void> => {
  const pool = getDb();
  console.log('\n🌱 Seeding database...\n');

  for (const role of seedRoles) {
    await pool.query(
      `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [role],
    );
  }
  console.log(`  ✅ Seeded roles: ${seedRoles.join(', ')}`);

  for (const reason of seedGatepassReasons) {
    await pool.query(
      `INSERT INTO gatepass_reasons (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [reason],
    );
  }
  console.log(`  ✅ Seeded gatepass reasons: ${seedGatepassReasons.join(', ')}`);

  for (const dept of seedDepartments) {
    await pool.query(
      `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [dept],
    );
  }
  console.log(`  ✅ Seeded departments: ${seedDepartments.join(', ')}`);

  // Build lookup maps after insertion so we use the actual DB-assigned IDs
  const roleRows = await pool.query(`SELECT name, role_id FROM roles`);
  const roleIdMap: Record<string, string> = {};
  for (const r of roleRows.rows) roleIdMap[r.name] = r.role_id;

  const deptRows = await pool.query(`SELECT name, department_id FROM departments`);
  const deptIdMap: Record<string, string> = {};
  for (const d of deptRows.rows) deptIdMap[d.name] = d.department_id;

  for (const user of seedUsers) {
    const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);
    const roleId = roleIdMap[user.role] ?? null;
    const deptId = user.department_name ? (deptIdMap[user.department_name] ?? null) : null;

    await pool.query(
      `INSERT INTO users
         (name, email, password, role, role_id, department_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, hashed,
       user.role, roleId, deptId, user.manager_id ?? null],
    );
    console.log(`  ✅ Seeded ${user.role}: ${user.email}  (password: ${user.password})`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('Default credentials:');
  console.log('  Admin      → admin@company.com / sarah.johnson  / Admin@123');
  console.log('  Manager    → manager@company.com / megan.hall   / Manager@123');
  console.log('  Gatekeeper → gatekeeper@company.com / mike.carter / Gate@123');
  console.log('  Employee   → employee@company.com / john.doe    / Emp@123');
  console.log('  Guest      → guest@company.com / jane.guest     / Guest@123\n');
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
