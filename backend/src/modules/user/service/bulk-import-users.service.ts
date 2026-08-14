import type {
  BulkImportUserInput,
  BulkImportUsersResult,
  UserRole,
} from '../../../types';
import { createUser } from './create-user.service';
import { resolveDepartmentId, resolveManagerId } from './shared/user.shared';

const parseLeaveBalance = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new Error('leave_balance must be a number');
  }
  return Math.round(parsed * 100) / 100;
};

export const bulkImportUsers = async (rows: BulkImportUserInput[]): Promise<BulkImportUsersResult> => {
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
      const department_id = await resolveDepartmentId(row.department);
      const manager_id =
        role === 'employee' ? await resolveManagerId(row.manager_email) : null;

      if (role === 'employee' && row.manager_email?.trim() && !manager_id) {
        throw new Error(`Manager not found for email: ${row.manager_email}`);
      }

      const leave_balance = parseLeaveBalance(row.leave_balance);

      await createUser({
        name,
        email,
        password,
        role,
        department_id: department_id ?? undefined,
        manager_id: manager_id ?? undefined,
        employee_id: row.employee_id?.trim() || undefined,
        leave_balance,
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
