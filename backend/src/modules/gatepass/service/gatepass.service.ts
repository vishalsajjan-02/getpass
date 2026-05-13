import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../config/database';
import type {
  Gatepass,
  GatepassReason,
  GatepassWithProfile,
  GatepassStats,
  CreateGatepassInput,
  UpdateGatepassStatusInput,
  UserRole,
} from '../../../types';

const rowToGatepass = (row: Record<string, unknown>): Gatepass => ({
  ...(row as unknown as Gatepass),
  is_emergency: Boolean(row.is_emergency),
});

const withProfile = (row: Record<string, unknown>): GatepassWithProfile => ({
  ...rowToGatepass(row),
  profiles: row.profile_name
    ? {
        name: row.profile_name as string,
        email: row.profile_email as string,
        department: (row.profile_department as string) || undefined,
        employee_id: (row.profile_employee_id as string) || undefined,
      }
    : undefined,
});

const BASE_QUERY = `
  SELECT g.*,
         u.name  AS profile_name,
         u.email AS profile_email,
         u.department  AS profile_department,
         u.employee_id AS profile_employee_id
  FROM gatepasses g
  LEFT JOIN users u ON g.user_id = u.id
`;

export const getGatepassReasons = async (): Promise<GatepassReason[]> => {
  const result = await getDb().query('SELECT name FROM gatepass_reasons ORDER BY created_at, name');
  return result.rows as GatepassReason[];
};

export const getGatepasses = async (userId: string, role: UserRole): Promise<GatepassWithProfile[]> => {
  const pool = getDb();
  let sql = BASE_QUERY;
  const params: unknown[] = [];

  if (role === 'employee' || role === 'guest') {
    sql += ' WHERE g.user_id = $1';
    params.push(userId);
  } else if (role === 'gatekeeper') {
    sql += " WHERE g.status IN ('approved','active','completed')";
  }

  sql += ' ORDER BY g.created_at DESC';
  const result = await pool.query(sql, params);
  return result.rows.map(withProfile);
};

export const getTodaysGatepasses = async (userId: string, role: UserRole): Promise<GatepassWithProfile[]> => {
  const pool = getDb();
  const today = new Date().toISOString().split('T')[0];
  let sql = `${BASE_QUERY} WHERE g.date = $1`;
  const params: unknown[] = [today];

  if (role === 'employee' || role === 'guest') {
    sql += ' AND g.user_id = $2';
    params.push(userId);
  } else if (role === 'gatekeeper') {
    sql += " AND g.status IN ('approved','active','completed')";
  }

  sql += ' ORDER BY g.created_at DESC';
  const result = await pool.query(sql, params);
  return result.rows.map(withProfile);
};

export const searchGatepasses = async (
  query: string,
  userId: string,
  role: UserRole,
): Promise<GatepassWithProfile[]> => {
  const pool = getDb();
  const like = `%${query}%`;
  let sql = `${BASE_QUERY} WHERE (g.purpose ILIKE $1 OR g.destination ILIKE $2 OR u.name ILIKE $3 OR g.gatepass_id ILIKE $4)`;
  const params: unknown[] = [like, like, like, like];

  if (role === 'employee' || role === 'guest') {
    sql += ` AND g.user_id = $${params.length + 1}`;
    params.push(userId);
  } else if (role === 'gatekeeper') {
    sql += " AND g.status IN ('approved','active','completed')";
  }

  sql += ' ORDER BY g.created_at DESC';
  const result = await pool.query(sql, params);
  return result.rows.map(withProfile);
};

export const getGatepassById = async (id: string): Promise<GatepassWithProfile> => {
  const pool = getDb();
  const result = await pool.query(`${BASE_QUERY} WHERE g.id = $1`, [id]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error('Gatepass not found');
  return withProfile(row);
};

export const getGatepassStats = async (userId?: string): Promise<GatepassStats> => {
  const pool = getDb();
  let sql = 'SELECT status, COUNT(*) as count FROM gatepasses';
  const params: unknown[] = [];

  if (userId) {
    sql += ' WHERE user_id = $1';
    params.push(userId);
  }

  sql += ' GROUP BY status';
  const result = await pool.query(sql, params);

  const stats: GatepassStats = { total: 0, pending: 0, approved: 0, rejected: 0, active: 0, completed: 0 };
  for (const { status, count } of result.rows) {
    const n = parseInt(count as string, 10);
    switch (status) {
      case 'pending':
        stats.pending = n;
        break;
      case 'approved':
        stats.approved = n;
        break;
      case 'rejected':
        stats.rejected = n;
        break;
      case 'active':
        stats.active = n;
        break;
      case 'completed':
        stats.completed = n;
        break;
    }
    stats.total += n;
  }
  return stats;
};

const generateGatepassId = (): string => {
  const d = new Date();
  const dateStr = d.toISOString().slice(2, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `GP${dateStr}${seq}`;
};

export const createGatepass = async (userId: string, input: CreateGatepassInput): Promise<GatepassWithProfile> => {
  const pool = getDb();
  const id = uuidv4();
  const gatepassId = generateGatepassId();
  const now = new Date();
  const date = input.date ?? now.toISOString().split('T')[0];
  const outTime = input.out_time ?? now.toTimeString().slice(0, 5);

  await pool.query(
    `INSERT INTO gatepasses
       (id, gatepass_id, user_id, purpose, destination, date, out_time, expected_return_time, is_emergency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      gatepassId,
      userId,
      input.purpose,
      input.destination ?? null,
      date,
      outTime,
      input.expected_return_time ?? null,
      input.is_emergency ?? false,
    ],
  );

  return getGatepassById(id);
};

export const updateGatepassStatus = async (
  id: string,
  input: UpdateGatepassStatusInput,
): Promise<GatepassWithProfile> => {
  const pool = getDb();
  await getGatepassById(id);

  const updates: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  if (input.approved_by) {
    updates.approved_by = input.approved_by;
    updates.approved_at = new Date().toISOString();
  }
  if (input.rejection_reason) updates.rejection_reason = input.rejection_reason;
  if (input.out_time) updates.out_time = input.out_time;
  if (input.actual_return_time) updates.actual_return_time = input.actual_return_time;

  const entries = Object.entries(updates);
  const setClauses = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = [...entries.map(([, v]) => v), id];

  await pool.query(
    `UPDATE gatepasses SET ${setClauses} WHERE id = $${values.length}`,
    values,
  );

  return getGatepassById(id);
};

export const deleteGatepass = async (id: string): Promise<void> => {
  const pool = getDb();
  await getGatepassById(id);
  await pool.query('DELETE FROM gatepasses WHERE id = $1', [id]);
};
