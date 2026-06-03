"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const SALT_ROUNDS = 10;
const seedRoles = ['admin', 'manager', 'gatekeeper', 'employee', 'guest'];
const seedGatepassReasons = [
    'Lunch',
    'Out',
    'Other',
];
const seedDepartments = ['Software R&D', 'Hardware R&D', 'Store', 'QA', 'Production', 'HR'];
const seedUsers = [
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
        manager_email: 'manager@company.com',
    },
    {
        name: 'Jane Guest',
        email: 'guest@company.com',
        password: 'Guest@123',
        role: 'guest',
    },
];
const runSeed = async () => {
    const pool = (0, database_1.getDb)();
    console.log('\n🌱 Seeding database...\n');
    for (const role of seedRoles) {
        await pool.query(`INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [role]);
    }
    console.log(`  ✅ Seeded roles: ${seedRoles.join(', ')}`);
    for (const reason of seedGatepassReasons) {
        await pool.query(`INSERT INTO gatepass_reasons (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [reason]);
    }
    console.log(`  ✅ Seeded gatepass reasons: ${seedGatepassReasons.join(', ')}`);
    for (const dept of seedDepartments) {
        await pool.query(`INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [dept]);
    }
    console.log(`  ✅ Seeded departments: ${seedDepartments.join(', ')}`);
    // Build lookup maps after insertion so we use the actual DB-assigned IDs
    const roleRows = await pool.query(`SELECT name, id AS role_id FROM roles`);
    const roleIdMap = {};
    for (const r of roleRows.rows)
        roleIdMap[r.name] = r.role_id;
    const deptRows = await pool.query(`SELECT name, id AS department_id FROM departments`);
    const deptIdMap = {};
    for (const d of deptRows.rows)
        deptIdMap[d.name] = d.department_id;
    for (const user of seedUsers) {
        const hashed = await bcryptjs_1.default.hash(user.password, SALT_ROUNDS);
        const roleId = roleIdMap[user.role] ?? null;
        const deptId = user.department_name ? (deptIdMap[user.department_name] ?? null) : null;
        await pool.query(`INSERT INTO users
         (name, email, password, role_id, department_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         role_id = EXCLUDED.role_id,
         department_id = EXCLUDED.department_id,
         updated_at = NOW()`, [user.name, user.email, hashed, roleId, deptId, null]);
        console.log(`  ✅ Seeded ${user.role}: ${user.email}  (password: ${user.password})`);
    }
    const userRows = await pool.query(`SELECT id, email FROM users`);
    const userIdMap = {};
    for (const row of userRows.rows)
        userIdMap[row.email] = row.id;
    for (const user of seedUsers) {
        if (!user.manager_email)
            continue;
        const managerId = userIdMap[user.manager_email];
        if (!managerId)
            throw new Error(`Manager not found for ${user.email}`);
        await pool.query(`UPDATE users
       SET manager_id = $1,
           updated_at = NOW()
       WHERE email = $2`, [managerId, user.email]);
    }
    console.log('  ✅ Seeded reporting relationships');
    console.log('\n✅ Seeding complete!');
    console.log('Default credentials:');
    console.log('  Admin      → admin@company.com / sarah.johnson  / Admin@123');
    console.log('  Manager    → manager@company.com / megan.hall   / Manager@123');
    console.log('  Gatekeeper → gatekeeper@company.com / mike.carter / Gate@123');
    console.log('  Employee   → employee@company.com / john.doe    / Emp@123');
    console.log('  Guest      → guest@company.com / jane.guest     / Guest@123\n');
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