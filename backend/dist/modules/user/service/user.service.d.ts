import type { User, CreateUserInput, UpdateUserInput, RoleOption } from '../../../types';
export declare const getAllUsers: () => Promise<User[]>;
export declare const getRoles: () => Promise<RoleOption[]>;
export declare const getUserById: (id: string) => Promise<User>;
export declare const createUser: (input: CreateUserInput) => Promise<User>;
export declare const updateUser: (id: string, input: UpdateUserInput) => Promise<User>;
export declare const deleteUser: (id: string) => Promise<void>;
//# sourceMappingURL=user.service.d.ts.map