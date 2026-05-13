export interface GithubRepoData {
  id: string;
  githubRepoId: number;
  name: string;
  description: string | null;
  url: string;
  languages: Record<string, number>;
  topics: string[];
  starsCount: number;
  readmeExcerpt: string | null;
}

export interface GithubAccountData {
  id: string;
  githubUsername: string;
  cachedAt: string | null;
  repos: GithubRepoData[];
}

async function githubRequest<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getGithubAccount(accessToken: string) {
  return githubRequest<GithubAccountData>('/api/github/account', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function connectGithub(accessToken: string, username: string) {
  return githubRequest<GithubAccountData>('/api/github/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ username }),
  });
}

export function syncGithubRepos(accessToken: string) {
  return githubRequest<GithubRepoData[]>('/api/github/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface GithubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'submodule' | 'symlink';
  size: number;
  download_url: string | null;
}

export function getRepoContents(repoId: string, path = '') {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return githubRequest<GithubContentItem[]>(`/api/github/public/repos/${repoId}/contents${query}`, {});
}

export function disconnectGithub(accessToken: string) {
  return githubRequest<void>('/api/github/disconnect', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
