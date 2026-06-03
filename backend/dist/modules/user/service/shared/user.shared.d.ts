import type { User } from '../../../../types';
export declare const SALT_ROUNDS = 10;
export declare const USER_SELECT = "\n  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,\n         d.name AS department, u.department_id,\n         u.manager_id, u.created_at, u.updated_at\n  FROM users u\n  JOIN roles r ON r.id = u.role_id\n  LEFT JOIN departments d ON d.id = u.department_id\n";
export declare const getUserById: (id: string) => Promise<User>;
export declare const resolveDepartmentId: (department?: string) => Promise<string | null>;
export declare const resolveManagerId: (managerEmail?: string) => Promise<string | null>;
//# sourceMappingURL=user.shared.d.ts.map