import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import type { CreateUserInput, User } from '../../../types';
import { getUserById, SALT_ROUNDS } from './shared/user.shared';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const pool = getDb();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rows[0]) throw new Error('Email already in use');

  const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1', [input.role]);
  if (!roleRow.rows[0]) throw new Error('Invalid role');
  const roleId: string = roleRow.rows[0].role_id;

  const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);

  const inserted = await pool.query(
    `INSERT INTO users
       (name, email, password, role_id, department_id, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [input.name, input.email, hashed, roleId, input.department_id ?? null, input.manager_id ?? null],
  );

  return getUserById(inserted.rows[0].id);
};
