import type { User } from '../../../types';
export declare const loginWithCredentials: (email: string, password: string) => Promise<{
    token: string;
    user: User;
}>;
export declare const guestLogin: (code: string) => Promise<{
    token: string;
    user: User;
}>;
export declare const getMe: (userId: string) => Promise<User>;
//# sourceMappingURL=auth.service.d.ts.map