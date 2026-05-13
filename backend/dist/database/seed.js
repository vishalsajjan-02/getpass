"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const SALT_ROUNDS = 10;
const seedRoles = ['admin', 'manager', 'gatekeeper', 'employee', 'guest'];
const seedGatepassReasons = ['Lunch', 'unit 2', 'visit to vendor', 'out'];
const seedUsers = [
    {
        id: (0, uuid_1.v4)(),
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
        id: (0, uuid_1.v4)(),
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
        id: (0, uuid_1.v4)(),
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
        id: (0, uuid_1.v4)(),
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
        id: (0, uuid_1.v4)(),
        name: 'Jane Guest',
        email: 'guest@company.com',
        password: 'Guest@123',
        role: 'guest',
        department: 'Visitor',
        phone: '+1-555-0199',
    },
];
const runSeed = async () => {
    const pool = (0, database_1.getDb)();
    console.log('\n🌱 Seeding database...\n');
    for (const role of seedRoles) {
        await pool.query(`INSERT INTO roles (name)
       VALUES ($1)
       ON CONFLICT (name) DO NOTHING`, [role]);
    }
    console.log(`  ✅ Seeded roles: ${seedRoles.join(', ')}`);
    for (const reason of seedGatepassReasons) {
        await pool.query(`INSERT INTO gatepass_reasons (name)
       VALUES ($1)
       ON CONFLICT (name) DO NOTHING`, [reason]);
    }
    console.log(`  ✅ Seeded gatepass reasons: ${seedGatepassReasons.join(', ')}`);
    for (const user of seedUsers) {
        const hashed = await bcryptjs_1.default.hash(user.password, SALT_ROUNDS);
        await pool.query(`INSERT INTO users (id, name, email, password, role, department, employee_id, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`, [
            user.id,
            user.name,
            user.email,
            hashed,
            user.role,
            user.department ?? null,
            user.employee_id ?? null,
            user.phone ?? null,
            user.address ?? null,
        ]);
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
exports.runSeed = runSeed;
// standalone: tsx src/database/seed.ts
if (require.main === module) {
    (async () => {
        await (0, database_1.initDb)();
        await (0, exports.runSeed)();
        await (0, database_1.closeDb)();
        process.exit(0);
    })();
}
//# sourceMappingURL=seed.js.map