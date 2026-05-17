export interface ImprovementRecommendation {
  title: string;
  description: string;
}

export interface ProjectIdea {
  title: string;
  description: string;
  stack: string[];
  benefit: string;
}

export interface ImprovementsData {
  recommendations: ImprovementRecommendation[];
  project_ideas: ProjectIdea[];
}

export interface AiReport {
  id: string;
  userId: string;
  projectId: string | null;
  reportType: 'activity_field' | 'improvements' | 'project_summary' | 'resume';
  status: 'pending' | 'done' | 'error';
  summary: string | null;
  rawResponse: Record<string, unknown> | null;
  isPublic: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

import { apiFetch } from './client';

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await apiFetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error('Нейросеть не доступна');
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function generateReport(
  accessToken: string,
  reportType: AiReport['reportType'],
  projectId?: string,
) {
  return request<AiReport>('/api/ai/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reportType, ...(projectId ? { projectId } : {}) }),
  });
}

export function getMyReports(accessToken: string, page = 1, limit = 50) {
  return request<PagedResult<AiReport>>(`/api/ai/reports?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getReport(accessToken: string, id: string) {
  return request<AiReport>(`/api/ai/reports/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getProjectSummaryReport(accessToken: string, projectId: string) {
  return request<AiReport | null>(`/api/ai/reports/project/${projectId}/summary`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getPublicProjectSummary(projectId: string) {
  return request<AiReport | null>(`/api/ai/public/projects/${projectId}/summary`, {
    method: 'GET',
  });
}

export function ensurePublicProjectSummary(projectId: string) {
  return request<AiReport>(`/api/ai/public/projects/${projectId}/summary/ensure`, {
    method: 'GET',
  });
}

export function toggleReportVisibility(accessToken: string, reportId: string) {
  return request<AiReport>(`/api/ai/reports/${reportId}/visibility`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function triggerBlobDownload(res: Response, fallbackName: string): Promise<void> {
  const disposition = res.headers.get('Content-Disposition');
  let filename = fallbackName;
  if (disposition) {
    const match = /filename="([^"]+)"/.exec(disposition);
    if (match) filename = match[1];
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function downloadResumeDocx(accessToken: string, reportId: string): Promise<void> {
  const res = await apiFetch(`/api/export/docx/${reportId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error('Нейросеть не доступна');
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? 'Ошибка скачивания');
  }
  await triggerBlobDownload(res, 'resume.docx');
}

export async function downloadTextDocx(accessToken: string, reportId: string): Promise<void> {
  const res = await apiFetch(`/api/export/text/${reportId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? 'Ошибка скачивания');
  }
  await triggerBlobDownload(res, 'resume-text.docx');
}
