const BASE_URL = 'http://localhost:3001';
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    body,
  });

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errorMsg =
      (data && typeof data === 'object' && data.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string): Promise<T> => apiFetch<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown): Promise<T> =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
};
