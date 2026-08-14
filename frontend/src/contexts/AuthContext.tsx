import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export type UserRole = 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  department_id?: string;
  manager_id?: string;
  can_self_punch?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  guestLogin: (code: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { token, user: u } = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', token);
      setUser(u);
      return {};
    } catch (err) {
      return { error: (err as Error).message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const guestLogin = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const { token, user: u } = await api.post<{ token: string; user: User }>(
        '/auth/guest-login',
        { code },
      );
      localStorage.setItem('token', token);
      setUser(u);
      return {};
    } catch (err) {
      return { error: (err as Error).message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, guestLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const useMockAuth = useAuth;
export const MockAuthProvider = AuthProvider;
