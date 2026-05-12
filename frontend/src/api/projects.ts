export interface ProjectFile {
  id: string;
  projectId: string;
  fileUrl: string;
  originalName: string;
  type: 'image' | 'file';
  sortOrder: number;
  createdAt: string;
}

export interface ProjectResponse {
  id: string;
  userId: string;
  githubRepoId: string | null;
  title: string;
  description: string | null;
  role: string | null;
  stack: string[];
  tags: string[];
  demoUrl: string | null;
  repoUrl: string | null;
  source: 'manual' | 'github';
  isPublic: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  files: ProjectFile[];
  isFavorited: boolean;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  role?: string;
  stack?: string[];
  tags?: string[];
  demoUrl?: string;
  repoUrl?: string;
  isPublic?: boolean;
  startedAt?: string;
  finishedAt?: string;
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, {
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

export function createProject(accessToken: string, title: string) {
  return request<ProjectResponse>('/api/projects', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ title }),
  });
}

export function getProject(id: string, accessToken?: string | null) {
  return request<ProjectResponse>(`/api/projects/${id}`, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function updateProject(id: string, accessToken: string, data: UpdateProjectData) {
  return request<ProjectResponse>(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export async function uploadProjectFile(id: string, accessToken: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/projects/${id}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProjectFile>;
}

export function deleteProjectFile(id: string, fileId: string, accessToken: string) {
  return request<void>(`/api/projects/${id}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function addFavorite(id: string, accessToken: string) {
  return request<void>(`/api/projects/${id}/favorite`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function removeFavorite(id: string, accessToken: string) {
  return request<void>(`/api/projects/${id}/favorite`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
