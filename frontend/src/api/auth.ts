export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ContactLink {
  id: string;
  type: 'github' | 'telegram' | 'linkedin' | 'website' | 'other';
  url: string;
  isPublic: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  profile: {
    nickname: string;
    avatarUrl: string | null;
    bio: string | null;
    activityField: string | null;
    softSkills: string[];
    hardSkills: { name: string; level: number }[];
    firstName: string | null;
    lastName: string | null;
  };
  contactLinks: ContactLink[];
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function login(email: string, password: string) {
  return request<AuthTokens>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, nickname: string) {
  return request<AuthTokens>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  });
}

export function fetchMe(accessToken: string) {
  return request<MeResponse>('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function refreshTokens(refreshToken: string) {
  return request<AuthTokens>('/api/auth/refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
}

export function logout(accessToken: string) {
  return request<void>('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
