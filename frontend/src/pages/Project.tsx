import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../css/main.css";
import "../css/Project.css";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  getProject, updateProject, uploadProjectFile, deleteProjectFile,
  addFavorite, removeFavorite, fetchProjectGithubData, deleteProject,
} from "../api/projects";
import type { ProjectResponse } from "../api/projects";
import { ApiError } from "../api/client";
import { getUserProfile } from "../api/users";
import { getGithubAccount } from "../api/github";
import type { GithubRepoData } from "../api/github";
import {
  generateReport, getReport, getProjectSummaryReport,
  getPublicProjectSummary, toggleReportVisibility,
} from "../api/ai";
import type { AiReport } from "../api/ai";
import ProjectEditor from "../components/ProjectEditor";
import ProjectView from "../components/ProjectView";

type Tab = 'manual' | 'github';

function Project() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [stackInput, setStackInput] = useState('');
  const [stackItems, setStackItems] = useState<string[]>([]);
  const [isPublicInput, setIsPublicInput] = useState(false);
  const [demoUrlInput, setDemoUrlInput] = useState('');
  const [startedAtInput, setStartedAtInput] = useState('');
  const [finishedAtInput, setFinishedAtInput] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [githubRepos, setGithubRepos] = useState<GithubRepoData[]>([]);
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [githubReposError, setGithubReposError] = useState('');
  const [githubFetchDone, setGithubFetchDone] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');

  const [authorNickname, setAuthorNickname] = useState('');

  const [aiSummary, setAiSummary] = useState<AiReport | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const [isFavorited, setIsFavorited] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [favLoading, setFavLoading] = useState(false);

  const isOwn = !!user && project?.userId === user.id;

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    getProject(id, accessToken)
      .then((p) => { setProject(p); setIsFavorited(p.isFavorited); setFavCount(p.favoritesCount); })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) navigate('/404', { replace: true });
        else if (e instanceof ApiError && e.status >= 500) navigate('/500', { replace: true });
        else setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки');
      });
  }, [id, accessToken]);

  useEffect(() => {
    if (!project?.userId) return;
    if (user?.id === project.userId && user.profile?.nickname) {
      setAuthorNickname(user.profile.nickname); return;
    }
    getUserProfile(project.userId, accessToken).then((p) => setAuthorNickname(p.nickname)).catch(() => {});
  }, [project?.userId, user?.id]);

  useEffect(() => {
    if (!id || !project) return;
    if (isOwn && accessToken) {
      getProjectSummaryReport(accessToken, id).then(setAiSummary).catch(() => {});
    } else {
      getPublicProjectSummary(id).then(setAiSummary).catch(() => {});
    }
  }, [id, project?.userId, isOwn, accessToken]);

  useEffect(() => {
    if (!aiSummary || aiSummary.status !== 'pending' || !accessToken) return;
    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount += 1;
      if (pollCount > 40) { clearInterval(interval); setAiSummary(null); setAiError('Генерация не завершилась. Попробуйте ещё раз.'); return; }
      try {
        const updated = await getReport(accessToken, aiSummary.id);
        setAiSummary(updated);
        if (updated.status !== 'pending') clearInterval(interval);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [aiSummary?.id, aiSummary?.status, accessToken]);

  function fetchGithubRepos() {
    if (!accessToken) return;
    setGithubReposLoading(true); setGithubReposError('');
    getGithubAccount(accessToken)
      .then((account) => {
        const repos = [...account.repos];
        if (project?.githubRepo && project.githubRepoId) {
          const inList = repos.some((r) => r.id === project.githubRepoId);
          if (!inList) {
            repos.push({
              id: project.githubRepoId, githubRepoId: 0, name: project.title,
              description: project.description, url: project.repoUrl ?? '',
              languages: {}, topics: project.githubRepo.topics,
              starsCount: project.githubRepo.starsCount, readmeExcerpt: null,
            });
          }
        }
        setGithubRepos(repos);
      })
      .catch((e: Error) => setGithubReposError(e.message))
      .finally(() => { setGithubReposLoading(false); setGithubFetchDone(true); });
  }

  useEffect(() => {
    if (!isEditing || !isOwn || !accessToken) return;
    if (githubRepos.length > 0 || githubReposLoading || githubFetchDone) return;
    fetchGithubRepos();
  }, [isEditing, isOwn, accessToken]);

  function startEditing() {
    if (!project) return;
    setTitleInput(project.title);
    setDescInput(project.description ?? '');
    setStackItems([...project.stack]);
    setStackInput('');
    setIsPublicInput(project.isPublic);
    setDemoUrlInput(project.demoUrl ?? '');
    setStartedAtInput(project.startedAt ? project.startedAt.slice(0, 10) : '');
    setFinishedAtInput(project.finishedAt ? project.finishedAt.slice(0, 10) : '');
    setRepoUrlInput(project.repoUrl ?? '');
    setSelectedRepoId(project.source === 'github' ? project.githubRepoId : null);
    setActiveTab(project.source === 'github' ? 'github' : 'manual');
    setSaveError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false); setSaveError('');
    if (githubReposError) { setGithubFetchDone(false); setGithubReposError(''); }
  }

  async function handleDelete() {
    if (!id || !accessToken) return;
    setDeleting(true);
    try { await deleteProject(id, accessToken); navigate('/users/me'); }
    catch { setDeleting(false); }
  }

  async function handleRepoSelect(repoId: string) {
    setSelectedRepoId(repoId || null);
    if (!repoId || !id || !accessToken) return;
    const repo = githubRepos.find((r) => r.id === repoId);
    if (!repo) return;
    setTitleInput(repo.name); setDescInput(repo.description ?? '');
    setStackItems(Object.keys(repo.languages)); setRepoUrlInput(repo.url);
    setSaving(true); setSaveError('');
    try {
      await updateProject(id, accessToken, {
        title: repo.name || undefined, description: repo.description || undefined,
        stack: Object.keys(repo.languages), repoUrl: repo.url || undefined,
        isPublic: isPublicInput, demoUrl: demoUrlInput.trim() || undefined,
      });
      await fetchProjectGithubData(id, accessToken).catch(() => {});
      const fresh = await getProject(id, accessToken);
      setProject(fresh); setIsFavorited(fresh.isFavorited); setFavCount(fresh.favoritesCount);
    } catch (e: unknown) {
      if (e instanceof Error) setSaveError(e.message);
    } finally { setSaving(false); }
  }

  async function saveCurrentData(): Promise<boolean> {
    if (!id || !accessToken) return false;
    setSaving(true); setSaveError('');
    try {
      const commonFields = {
        title: titleInput.trim() || undefined, description: descInput.trim() || undefined,
        stack: stackItems, isPublic: isPublicInput, demoUrl: demoUrlInput.trim() || undefined,
      };
      const data = activeTab === 'manual'
        ? { ...commonFields, startedAt: startedAtInput || undefined, finishedAt: finishedAtInput || undefined }
        : { ...commonFields, repoUrl: repoUrlInput.trim() || undefined };
      await updateProject(id, accessToken, data);
      if (activeTab === 'github' && repoUrlInput.trim()) {
        await fetchProjectGithubData(id, accessToken).catch(() => {});
      }
      const fresh = await getProject(id, accessToken);
      setProject(fresh); setIsFavorited(fresh.isFavorited); setFavCount(fresh.favoritesCount);
      return true;
    } catch (e: unknown) {
      if (e instanceof Error) setSaveError(e.message);
      return false;
    } finally { setSaving(false); }
  }

  async function handleSave() {
    const ok = await saveCurrentData();
    if (ok) setIsEditing(false);
  }

  function commitStackInput() {
    const val = stackInput.trim().replace(/,$/, '');
    if (val && !stackItems.includes(val)) setStackItems((prev) => [...prev, val]);
    setStackInput('');
  }

  function handleStackKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitStackInput(); }
    else if (e.key === 'Backspace' && !stackInput) setStackItems((prev) => prev.slice(0, -1));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !accessToken) return;
    if (file.size > 1 * 1024 * 1024) {
      setFileError('Размер файла не должен превышать 1 МБ');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true); setFileError('');
    try {
      const uploaded = await uploadProjectFile(id, accessToken, file);
      setProject((prev) => prev ? { ...prev, files: [...prev.files, uploaded] } : prev);
    } catch (err: unknown) {
      if (err instanceof Error) setFileError(err.message);
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function handleFileDelete(fileId: string) {
    if (!id || !accessToken) return;
    setFileError('');
    try {
      await deleteProjectFile(id, fileId, accessToken);
      setProject((prev) => prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev);
    } catch (err: unknown) { if (err instanceof Error) setFileError(err.message); }
  }

  async function handleGenerateAiSummary() {
    if (!id || !accessToken) return;
    setAiGenerating(true); setAiError('');
    try {
      if (isEditing) await saveCurrentData();
      setAiSummary(await generateReport(accessToken, 'project_summary', id));
    } catch (e) { setAiError(e instanceof Error ? e.message : 'Ошибка генерации'); }
    finally { setAiGenerating(false); }
  }

  async function handleToggleAiVisibility() {
    if (!aiSummary || !accessToken) return;
    try { setAiSummary(await toggleReportVisibility(accessToken, aiSummary.id)); } catch {}
  }

  async function handleFavorite() {
    if (!accessToken || !id || favLoading) return;
    setFavLoading(true);
    if (isFavorited) {
      setIsFavorited(false); setFavCount((c) => c - 1);
      try { await removeFavorite(id, accessToken); } catch { setIsFavorited(true); setFavCount((c) => c + 1); }
    } else {
      setIsFavorited(true); setFavCount((c) => c + 1);
      try { await addFavorite(id, accessToken); } catch { setIsFavorited(false); setFavCount((c) => c - 1); }
    }
    setFavLoading(false);
  }

  if (loadError) {
    return (<><Header /><div className="container page"><p className="text">{loadError}</p></div><Footer /></>);
  }

  if (!project) {
    return (<><Header /><div className="container page"><p className="text">Загрузка...</p></div><Footer /></>);
  }

  return (
    <>
      <Header />
      <div className="container page">

        <div className="project-nav">
          <button onClick={() => navigate(-1)} className="text link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Назад</button>
          {isOwn && (
            <div className="project-edit-buttons">
              {isEditing ? (
                <>
                  <button className="button text" onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button className="button-light text" onClick={cancelEditing}>Отмена</button>
                </>
              ) : confirmDelete ? (
                <>
                  <span className="text">Удалить проект?</span>
                  <button className="button text" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Удаление...' : 'Да'}
                  </button>
                  <button className="button-light text" onClick={() => setConfirmDelete(false)}>Нет</button>
                </>
              ) : (
                <>
                  <button className="button text" onClick={startEditing}>Редактировать</button>
                  <button className="button-light text" onClick={() => setConfirmDelete(true)}>Удалить</button>
                </>
              )}
            </div>
          )}
        </div>

        {saveError && <p className="project-error text">{saveError}</p>}

        {isEditing ? (
          <ProjectEditor
            project={project}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            titleInput={titleInput}
            descInput={descInput}
            stackInput={stackInput}
            stackItems={stackItems}
            isPublicInput={isPublicInput}
            demoUrlInput={demoUrlInput}
            startedAtInput={startedAtInput}
            finishedAtInput={finishedAtInput}
            repoUrlInput={repoUrlInput}
            selectedRepoId={selectedRepoId}
            githubRepos={githubRepos}
            githubReposLoading={githubReposLoading}
            githubReposError={githubReposError}
            githubFetchDone={githubFetchDone}
            fileInputRef={fileInputRef}
            uploading={uploading}
            fileError={fileError}
            aiSummary={aiSummary}
            aiGenerating={aiGenerating}
            aiError={aiError}
            onTitleChange={setTitleInput}
            onDescChange={setDescInput}
            onStackInputChange={setStackInput}
            onStackItemRemove={(item) => setStackItems((prev) => prev.filter((s) => s !== item))}
            onStackKeyDown={handleStackKeyDown}
            onStackBlur={commitStackInput}
            onIsPublicChange={setIsPublicInput}
            onDemoUrlChange={setDemoUrlInput}
            onStartedAtChange={setStartedAtInput}
            onFinishedAtChange={setFinishedAtInput}
            onRepoSelect={handleRepoSelect}
            onRetryGithubFetch={() => { setGithubFetchDone(false); fetchGithubRepos(); }}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            onGenerateAiSummary={handleGenerateAiSummary}
            onToggleAiVisibility={handleToggleAiVisibility}
          />
        ) : (
          <ProjectView
            project={project}
            aiSummary={aiSummary}
            isOwn={isOwn}
            isFavorited={isFavorited}
            favCount={favCount}
            favLoading={favLoading}
            accessToken={accessToken}
            authorNickname={authorNickname}
            onFavorite={handleFavorite}
          />
        )}

      </div>
      <Footer />
    </>
  );
}

export default Project;
