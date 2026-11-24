// Use relative URLs so requests are proxied through Vite dev server (same-origin).
// In production, VITE_API_BASE must be set to the deployed backend URL
// e.g. https://sarkarisarthi.onrender.com
const RAW_BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

let _accessToken: string | null = null;

// Initialize token from localStorage
try {
  _accessToken = typeof window !== 'undefined' ? localStorage.getItem('sarkari_token') : null;
} catch {
  _accessToken = null;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('sarkari_token', token);
      } else {
        localStorage.removeItem('sarkari_token');
      }
    }
  } catch {}
}

export function getAccessToken(): string | null {
  if (!_accessToken && typeof window !== 'undefined') {
    try {
      _accessToken = localStorage.getItem('sarkari_token');
    } catch {
      _accessToken = null;
    }
  }
  return _accessToken;
}

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let url = endpoint;
  if (!endpoint.startsWith('http')) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // If BASE_URL already ends with /api and endpoint starts with /api/, avoid duplicate /api/api
    if (BASE_URL.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      url = `${BASE_URL.slice(0, -4)}${cleanEndpoint}`;
    } else {
      url = `${BASE_URL}${cleanEndpoint}`;
    }
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  let data: unknown = null;
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
    const d = data as Record<string, unknown> | null;
    const errorMsg =
      (d && typeof d === 'object' && typeof d['error'] === 'string' && d['error']) ||
      (d && typeof d === 'object' && typeof d['message'] === 'string' && d['message']) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),
};
