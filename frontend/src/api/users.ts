import type { ContactLink } from './auth';

export interface ProjectSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  stack: string[];
  source: 'manual' | 'github';
  createdAt: string;
}

export interface TopFollowedUser {
  userId: string;
  nickname: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  activityField: string | null;
  followersCount: number;
  projectsCount: number;
}

export interface UserCard {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  activityField: string | null;
  softSkills: string[];
  hardSkills: { name: string; level: number }[];
  followersCount: number;
  isFollowing: boolean;
}

export interface UsersPage {
  data: UserCard[];
  total: number;
  page: number;
  limit: number;
}

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
  projects: ProjectSummary[];
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
  publicProjects: ProjectSummary[];
}

import { apiFetch } from './client';

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await apiFetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
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

export type ContactType = 'github' | 'telegram' | 'linkedin' | 'website' | 'other';

export interface ContactInput {
  type: ContactType;
  url: string;
  isPublic?: boolean;
}

export function patchMyProfile(
  accessToken: string,
  data: Partial<{
    nickname: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    bio: string;
    softSkills: string[];
    hardSkills: { name: string; level: number }[];
    isFollowersPublic: boolean;
    isFollowingPublic: boolean;
    isFavoritesPublic: boolean;
  }>,
) {
  return request<void>('/api/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function updateContacts(accessToken: string, contacts: ContactInput[]) {
  return request<void>('/api/users/me/contacts', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ contacts }),
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

export async function uploadAvatar(accessToken: string, file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('avatar', file);
  const res = await apiFetch('/api/users/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteAvatar(accessToken: string): Promise<void> {
  const res = await apiFetch('/api/users/me/avatar', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export function getUsers(
  params: { search?: string; activityField?: string; page?: number; limit?: number },
  accessToken?: string | null,
) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.activityField) qs.set('activityField', params.activityField);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  return request<UsersPage>(`/api/users?${qs}`, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function getMyFollowers(accessToken: string) {
  return request<UserCard[]>('/api/users/me/followers', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMyFollowing(accessToken: string) {
  return request<UserCard[]>('/api/users/me/following', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getTopFollowedUsers() {
  return request<TopFollowedUser[]>('/api/users/top-followed', {
    method: 'GET',
  });
}

export function updateProfileInfo(
  accessToken: string,
  data: Partial<{
    bio: string;
    softSkills: string[];
    hardSkills: string[];
  }>
) {
  return request<void>('/api/users/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
}

