import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  RoleOption,
  DepartmentOption,
  BulkImportUserInput,
  BulkImportUsersResult,
  UserRole,
} from '../../../types';

const SALT_ROUNDS = 10;

const USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;

export const getAllUsers = async (): Promise<User[]> => {
  const result = await getDb().query(`${USER_SELECT} ORDER BY r.name, u.name`);
  return result.rows as User[];
};

export const getDepartments = async (): Promise<DepartmentOption[]> => {
  const result = await getDb().query(
    `SELECT id AS department_id, name FROM departments ORDER BY name`,
  );
  return result.rows as DepartmentOption[];
};

export const getManagers = async (): Promise<Pick<User, 'id' | 'name'>[]> => {
  const result = await getDb().query(
    `SELECT u.id, u.name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'manager'
     ORDER BY u.name`,
  );
  return result.rows as Pick<User, 'id' | 'name'>[];
};

export const getRoles = async (): Promise<RoleOption[]> => {
  const result = await getDb().query(
    `SELECT id AS role_id, name FROM roles
     ORDER BY CASE name
       WHEN 'admin'      THEN 1
       WHEN 'manager'    THEN 2
       WHEN 'gatekeeper' THEN 3
       WHEN 'employee'   THEN 4
       WHEN 'guest'      THEN 5
       ELSE 6
     END`,
  );
  return result.rows as RoleOption[];
};

export const getUserById = async (id: string): Promise<User> => {
  const result = await getDb().query(
    `${USER_SELECT} WHERE u.id = $1`,
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

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const pool = getDb();
  await getUserById(id);

  const extra: Record<string, unknown> = {};

  if (input.role) {
    const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1', [input.role]);
    if (!roleRow.rows[0]) throw new Error('Invalid role');
    extra.role_id = roleRow.rows[0].role_id;
  }

  if (input.password) {
    extra.password = await bcrypt.hash(input.password, SALT_ROUNDS);
  }

  const { password: _pw, ...inputWithoutPassword } = input;
  const merged = { ...inputWithoutPassword, ...extra };
  const entries = Object.entries(merged).filter(([, v]) => v !== undefined);
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

const resolveDepartmentId = async (
  pool: ReturnType<typeof getDb>,
  department?: string,
): Promise<string | null> => {
  if (!department?.trim()) return null;

  const byId = await pool.query('SELECT id FROM departments WHERE id::text = $1', [department.trim()]);
  if (byId.rows[0]?.id) return byId.rows[0].id as string;

  const byName = await pool.query(
    'SELECT id FROM departments WHERE LOWER(name) = LOWER($1)',
    [department.trim()],
  );
  return (byName.rows[0]?.id as string | undefined) ?? null;
};

const resolveManagerId = async (
  pool: ReturnType<typeof getDb>,
  managerEmail?: string,
): Promise<string | null> => {
  if (!managerEmail?.trim()) return null;

  const result = await pool.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1) AND r.name = 'manager'`,
    [managerEmail.trim()],
  );
  return (result.rows[0]?.id as string | undefined) ?? null;
};

export const bulkImportUsers = async (rows: BulkImportUserInput[]): Promise<BulkImportUsersResult> => {
  const pool = getDb();
  const result: BulkImportUsersResult = { created: 0, failed: 0, errors: [] };

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    const name = row.name?.trim();
    const password = row.password?.trim();
    const role = row.role?.trim().toLowerCase() as UserRole;

    if (!name || !email || !password || !role) {
      result.failed += 1;
      result.errors.push({
        email: email || row.email || 'unknown',
        message: 'name, email, password, and role are required',
      });
      continue;
    }

    try {
      const department_id = await resolveDepartmentId(pool, row.department);
      const manager_id =
        role === 'employee'
          ? await resolveManagerId(pool, row.manager_email)
          : null;

      if (role === 'employee' && row.manager_email?.trim() && !manager_id) {
        throw new Error(`Manager not found for email: ${row.manager_email}`);
      }

      await createUser({
        name,
        email,
        password,
        role,
        department_id: department_id ?? undefined,
        manager_id: manager_id ?? undefined,
      });
      result.created += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({
        email,
        message: (err as Error).message,
      });
    }
  }

  return result;
};
