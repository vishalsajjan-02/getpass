import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  guestLogin: (code: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await api.get<User>('/auth/me');
    setUser(me);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } catch {
        await clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { token, user: u } = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      await setToken(token);
      setUser(u);
      return {};
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, []);

  const guestLogin = useCallback(async (code: string) => {
    try {
      const { token, user: u } = await api.post<{ token: string; user: User }>('/auth/guest-login', {
        code,
      });
      await setToken(token);
      setUser(u);
      return {};
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, guestLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
