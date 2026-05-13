const API_BASE = '/api';

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async <T>(res: globalThis.Response): Promise<T> => {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json.data as T;
};

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${API_BASE}${path}`, { headers: getHeaders() }).then(r => handleResponse<T>(r)),

  post: <T>(path: string, body?: unknown): Promise<T> =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(r => handleResponse<T>(r)),

  put: <T>(path: string, body?: unknown): Promise<T> =>
    fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(r => handleResponse<T>(r)),

  delete: <T>(path: string): Promise<T> =>
    fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: getHeaders() }).then(r =>
      handleResponse<T>(r),
    ),
};
