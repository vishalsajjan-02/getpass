import type { User } from '../../../../types';
export declare const SALT_ROUNDS = 10;
export declare const USER_SELECT = "\n  SELECT u.id, u.name, u.email, u.employee_id, r.name AS role, u.role_id,\n         d.name AS department, u.department_id,\n         u.manager_id, u.leave_balance, u.can_self_punch,\n         u.face_image_path, u.face_registered_at,\n         u.created_at, u.updated_at\n  FROM users u\n  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL\n  LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL\n";
export declare const normalizeEmployeeId: (value?: string | null) => string | null;
export declare const assertEmployeeIdAvailable: (employeeId: string | null, excludeUserId?: string) => Promise<void>;
export declare const mapUserRow: (row: Record<string, unknown>) => User;
export declare const getUserById: (id: string) => Promise<User>;
export declare const resolveDepartmentId: (department?: string) => Promise<string | null>;
export declare const resolveManagerId: (managerEmail?: string) => Promise<string | null>;
//# sourceMappingURL=user.shared.d.ts.map