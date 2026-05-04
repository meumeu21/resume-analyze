import type { ContactLink } from './auth';

export interface MyProfileResponse {
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  activityField: string | null;
  softSkills: string[];
  hardSkills: { name: string; level: number }[];
  firstName: string | null;
  lastName: string | null;
  followersCount: number;
  followingCount: number;
  favoritesCount: number;
  contacts: ContactLink[];
  isFollowersPublic: boolean;
  isFollowingPublic: boolean;
  isFavoritesPublic: boolean;
}

export interface UserProfileResponse {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  activityField: string | null;
  softSkills: string[];
  hardSkills: { name: string; level: number }[];
  firstName: string | null;
  lastName: string | null;
  followersCount: number | null;
  followingCount: number | null;
  favoritesCount: number | null;
  isFollowing: boolean;
  contacts: ContactLink[];
  publicProjects: unknown[];
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function getMyProfile(accessToken: string) {
  return request<MyProfileResponse>('/api/users/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getUserProfile(userId: string, accessToken?: string | null) {
  return request<UserProfileResponse>(`/api/users/${userId}`, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function updateMyProfile(accessToken: string, data: Partial<{
  isFollowersPublic: boolean;
  isFollowingPublic: boolean;
  isFavoritesPublic: boolean;
}>) {
  return request<void>('/api/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function followUser(userId: string, accessToken: string) {
  return request<void>(`/api/users/${userId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function unfollowUser(userId: string, accessToken: string) {
  return request<void>(`/api/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
