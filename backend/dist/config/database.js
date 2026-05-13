"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDb = exports.getDb = exports.initDb = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
const schema_1 = require("../database/schema");
// Return timestamps as strings to keep compatibility with existing string-typed fields
pg_1.types.setTypeParser(pg_1.types.builtins.TIMESTAMP, (val) => val);
pg_1.types.setTypeParser(pg_1.types.builtins.TIMESTAMPTZ, (val) => val);
let _pool = null;
let _initialized = false;
const ensureDatabase = async () => {
    const url = new URL(env_1.env.DATABASE_URL);
    const dbName = url.pathname.slice(1);
    url.pathname = '/postgres';
    const admin = new pg_1.Client({ connectionString: url.toString() });
    await admin.connect();
    try {
        const res = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if ((res.rowCount ?? 0) === 0) {
            await admin.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Database "${dbName}" created`);
        }
    }
    finally {
        await admin.end();
    }
};
const runSchema = async (pool) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const stmt of schema_1.schema) {
            await client.query(stmt);
        }
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
};
const initDb = async () => {
    if (_initialized)
        return;
    await ensureDatabase();
    _pool = new pg_1.Pool({ connectionString: env_1.env.DATABASE_URL });
    await runSchema(_pool);
    _initialized = true;
    console.log('✅ Database ready');
};
exports.initDb = initDb;
const getDb = () => {
    if (!_pool)
        throw new Error('Database not initialized. Call initDb() first.');
    return _pool;
};
exports.getDb = getDb;
const closeDb = async () => {
    if (_pool) {
        await _pool.end();
        _pool = null;
        _initialized = false;
    }
};
exports.closeDb = closeDb;
exports.default = exports.getDb;
//# sourceMappingURL=database.js.map