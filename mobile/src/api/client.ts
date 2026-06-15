import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '../config/api';

const TOKEN_KEY = 'gatepass_token';
const isWeb = Platform.OS === 'web';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export const getToken = async (): Promise<string | null> => {
  if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const setToken = async (token: string): Promise<void> => {
  if (isWeb) {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const clearToken = async (): Promise<void> => {
  if (isWeb) {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

const getHeaders = async (): Promise<HeadersInit> => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async <T>(res: Response): Promise<T> => {
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json.data as T;
};

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, { headers: await getHeaders() });
    return handleResponse<T>(res);
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  delete: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    return handleResponse<T>(res);
  },
};
