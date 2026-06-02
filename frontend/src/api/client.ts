export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

let isRefreshing = false;
let pendingCallbacks: Array<(token: string | null) => void> = [];

function settle(token: string | null) {
  pendingCallbacks.forEach(cb => cb(token));
  pendingCallbacks = [];
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    window.dispatchEvent(new CustomEvent('auth:signed-out'));
    return null;
  }

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new CustomEvent('auth:signed-out'));
    return null;
  }

  const tokens: AuthTokens = await res.json();
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  window.dispatchEvent(new CustomEvent('auth:tokens-refreshed', { detail: tokens }));
  return tokens.accessToken;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status !== 401 || url.includes('/api/auth/')) {
    return res;
  }

  if (isRefreshing) {
    const newToken = await new Promise<string | null>(resolve => {
      pendingCallbacks.push(resolve);
    });
    if (!newToken) return res;
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${newToken}`);
    return fetch(url, { ...options, headers });
  }

  isRefreshing = true;
  let newToken: string | null = null;
  try {
    newToken = await doRefresh();
    settle(newToken);
  } finally {
    isRefreshing = false;
  }

  if (!newToken) return res;
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${newToken}`);
  return fetch(url, { ...options, headers });
}
