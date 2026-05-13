import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../config/database';
import type { User, CreateUserInput, UpdateUserInput, RoleOption } from '../../../types';

const SALT_ROUNDS = 10;

const PUBLIC_COLS = 'id,name,email,role,department,employee_id,phone,address,created_at,updated_at';

export const getAllUsers = async (): Promise<User[]> => {
  const result = await getDb().query(
    `SELECT ${PUBLIC_COLS} FROM users ORDER BY role, name`,
  );
  return result.rows as User[];
};

export const getRoles = async (): Promise<RoleOption[]> => {
  const result = await getDb().query(
    'SELECT name FROM roles ORDER BY CASE name WHEN \'admin\' THEN 1 WHEN \'manager\' THEN 2 WHEN \'gatekeeper\' THEN 3 WHEN \'employee\' THEN 4 WHEN \'guest\' THEN 5 ELSE 6 END',
  );
  return result.rows as RoleOption[];
};

export const getUserById = async (id: string): Promise<User> => {
  const result = await getDb().query(
    `SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`,
    [id],
  );
  const row = result.rows[0] as User | undefined;
  if (!row) throw new Error('User not found');
  return row;
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const pool = getDb();
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rows[0]) throw new Error('Email already in use');

  const roleExists = await pool.query('SELECT 1 FROM roles WHERE name = $1', [input.role]);
  if (!roleExists.rows[0]) throw new Error('Invalid role');

  const id = uuidv4();
  const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);

  await pool.query(
    `INSERT INTO users (id, name, email, password, role, department, employee_id, phone, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, input.name, input.email, hashed, input.role,
     input.department ?? null, input.employee_id ?? null,
     input.phone ?? null, input.address ?? null],
  );

  return getUserById(id);
};

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const pool = getDb();
  await getUserById(id);

  if (input.role) {
    const roleExists = await pool.query('SELECT 1 FROM roles WHERE name = $1', [input.role]);
    if (!roleExists.rows[0]) throw new Error('Invalid role');
  }

  const entries = Object.entries(input).filter(([, v]) => v !== undefined);
  if (!entries.length) return getUserById(id);

  const fields = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = [...entries.map(([, v]) => v), id];

  await pool.query(
    `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length}`,
    values,
  );

  return getUserById(id);
};

export const deleteUser = async (id: string): Promise<void> => {
  const pool = getDb();
  await getUserById(id);
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
};
