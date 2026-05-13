import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, getDb, closeDb } from '../config/database';

const SALT_ROUNDS = 10;

interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
  department?: string;
  employee_id?: string;
  phone?: string;
  address?: string;
}

const seedRoles: SeedUser['role'][] = ['admin', 'manager', 'gatekeeper', 'employee', 'guest'];
const seedGatepassReasons = ['Lunch', 'unit 2', 'visit to vendor', 'out'];

const seedUsers: SeedUser[] = [
  {
    id: uuidv4(),
    name: 'Sarah Johnson',
    email: 'admin@company.com',
    password: 'Admin@123',
    role: 'admin',
    department: 'Human Resources',
    employee_id: 'ADM001',
    phone: '+1-555-0101',
    address: '123 Corporate Ave, Suite 100',
  },
  {
    id: uuidv4(),
    name: 'Mike Carter',
    email: 'gatekeeper@company.com',
    password: 'Gate@123',
    role: 'gatekeeper',
    department: 'Security',
    employee_id: 'GKP001',
    phone: '+1-555-0102',
    address: '456 Guard Station Blvd',
  },
  {
    id: uuidv4(),
    name: 'Megan Hall',
    email: 'manager@company.com',
    password: 'Manager@123',
    role: 'manager',
    department: 'Operations',
    employee_id: 'MGR001',
    phone: '+1-555-0104',
    address: '101 Operations Park',
  },
  {
    id: uuidv4(),
    name: 'John Doe',
    email: 'employee@company.com',
    password: 'Emp@123',
    role: 'employee',
    department: 'Engineering',
    employee_id: 'EMP001',
    phone: '+1-555-0103',
    address: '789 Developer Lane',
  },
  {
    id: uuidv4(),
    name: 'Jane Guest',
    email: 'guest@company.com',
    password: 'Guest@123',
    role: 'guest',
    department: 'Visitor',
    phone: '+1-555-0199',
  },
];

export const runSeed = async (): Promise<void> => {
  const pool = getDb();
  console.log('\n🌱 Seeding database...\n');

  for (const role of seedRoles) {
    await pool.query(
      `INSERT INTO roles (name)
       VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      [role],
    );
  }
  console.log(`  ✅ Seeded roles: ${seedRoles.join(', ')}`);

  for (const reason of seedGatepassReasons) {
    await pool.query(
      `INSERT INTO gatepass_reasons (name)
       VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      [reason],
    );
  }
  console.log(`  ✅ Seeded gatepass reasons: ${seedGatepassReasons.join(', ')}`);

  for (const user of seedUsers) {
    const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users (id, name, email, password, role, department, employee_id, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        user.id,
        user.name,
        user.email,
        hashed,
        user.role,
        user.department ?? null,
        user.employee_id ?? null,
        user.phone ?? null,
        user.address ?? null,
      ],
    );
    console.log(`  ✅ Seeded ${user.role}: ${user.email}  (password: ${user.password})`);
  }
  console.log('\n✅ Seeding complete!');
  console.log('Default credentials:');
  console.log('  Admin      → admin@company.com      / Admin@123');
  console.log('  Manager    → manager@company.com    / Manager@123');
  console.log('  Gatekeeper → gatekeeper@company.com / Gate@123');
  console.log('  Employee   → employee@company.com   / Emp@123');
  console.log('  Guest      → GUEST123 (guest code)  or guest@company.com / Guest@123\n');
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
