import { Pool, Client, types } from 'pg';
import { env } from './env';
import { schema } from '../database/schema';

// Return timestamps as strings to keep compatibility with existing string-typed fields
types.setTypeParser(types.builtins.TIMESTAMP, (val: string) => val);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val: string) => val);

let _pool: Pool | null = null;
let _initialized = false;

const ensureDatabase = async (): Promise<void> => {
  const url = new URL(env.DATABASE_URL);
  const dbName = url.pathname.slice(1);
  url.pathname = '/postgres';

  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const res = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if ((res.rowCount ?? 0) === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created`);
    }
  } finally {
    await admin.end();
  }
};

const runSchema = async (pool: Pool): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const stmt of schema) {
      await client.query(stmt);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const initDb = async (): Promise<void> => {
  if (_initialized) return;
  await ensureDatabase();
  _pool = new Pool({ connectionString: env.DATABASE_URL });
  await runSchema(_pool);
  _initialized = true;
  console.log('✅ Database ready');
};

export const getDb = (): Pool => {
  if (!_pool) throw new Error('Database not initialized. Call initDb() first.');
  return _pool;
};

export const closeDb = async (): Promise<void> => {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _initialized = false;
  }
};

export default getDb;
