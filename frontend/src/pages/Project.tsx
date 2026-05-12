import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
import { getUserProfile } from "../api/users";
import { getGithubAccount } from "../api/github";
import type { GithubRepoData } from "../api/github";

import github from "../images/icons/github.svg";
import aiStar from "../images/icons/ai-star.svg";
import likeEmpty from "../images/icons/heart-empty.svg";
import likeFill from "../images/icons/heart-fill.svg";

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

  // shared edit fields
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [stackInput, setStackInput] = useState('');
  const [stackItems, setStackItems] = useState<string[]>([]);
  const [isPublicInput, setIsPublicInput] = useState(false);
  const [demoUrlInput, setDemoUrlInput] = useState('');

  // manual-only edit fields
  const [startedAtInput, setStartedAtInput] = useState('');
  const [finishedAtInput, setFinishedAtInput] = useState('');

  // github tab state
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [githubRepos, setGithubRepos] = useState<GithubRepoData[]>([]);
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [githubReposError, setGithubReposError] = useState('');
  const [githubFetchDone, setGithubFetchDone] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  // files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');

  const [authorNickname, setAuthorNickname] = useState('');

  // favorite
  const [isFavorited, setIsFavorited] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [favLoading, setFavLoading] = useState(false);

  const isOwn = !!user && project?.userId === user.id;

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    getProject(id, accessToken)
      .then((p) => {
        setProject(p);
        setIsFavorited(p.isFavorited);
        setFavCount(p.favoritesCount);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [id, accessToken]);

  useEffect(() => {
    if (!project?.userId) return;
    if (user?.id === project.userId && user.profile?.nickname) {
      setAuthorNickname(user.profile.nickname);
      return;
    }
    getUserProfile(project.userId, accessToken)
      .then((p) => setAuthorNickname(p.nickname))
      .catch(() => {});
  }, [project?.userId, user?.id]);

  function fetchGithubRepos() {
    if (!accessToken) return;
    setGithubReposLoading(true);
    setGithubReposError('');
    getGithubAccount(accessToken)
      .then((account) => {
        const repos = [...account.repos];
        if (project?.githubRepo && project.githubRepoId) {
          const inList = repos.some((r) => r.id === project.githubRepoId);
          if (!inList) {
            repos.push({
              id: project.githubRepoId,
              githubRepoId: 0,
              name: project.title,
              description: project.description,
              url: project.repoUrl ?? '',
              languages: {},
              topics: project.githubRepo.topics,
              starsCount: project.githubRepo.starsCount,
              readmeExcerpt: null,
            });
          }
        }
        setGithubRepos(repos);
      })
      .catch((e: Error) => setGithubReposError(e.message))
      .finally(() => {
        setGithubReposLoading(false);
        setGithubFetchDone(true);
      });
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
    setIsEditing(false);
    setSaveError('');
    if (githubReposError) {
      setGithubFetchDone(false);
      setGithubReposError('');
    }
  }

  async function handleDelete() {
    if (!id || !accessToken) return;
    setDeleting(true);
    try {
      await deleteProject(id, accessToken);
      navigate('/users/me');
    } catch { setDeleting(false); }
  }

  function handleRepoSelect(repoId: string) {
    setSelectedRepoId(repoId || null);
    if (!repoId) return;
    const repo = githubRepos.find((r) => r.id === repoId);
    if (!repo) return;
    setTitleInput(repo.name);
    setDescInput(repo.description ?? '');
    setStackItems(Object.keys(repo.languages));
    setRepoUrlInput(repo.url);
  }

  async function handleSave() {
    if (!id || !accessToken) return;
    setSaving(true);
    setSaveError('');
    try {
      const commonFields = {
        title: titleInput.trim() || undefined,
        description: descInput.trim() || undefined,
        stack: stackItems,
        isPublic: isPublicInput,
        demoUrl: demoUrlInput.trim() || undefined,
      };
      const data = activeTab === 'manual'
        ? {
            ...commonFields,
            startedAt: startedAtInput || undefined,
            finishedAt: finishedAtInput || undefined,
          }
        : {
            ...commonFields,
            repoUrl: repoUrlInput.trim() || undefined,
          };
      await updateProject(id, accessToken, data);
      if (activeTab === 'github' && repoUrlInput.trim()) {
        await fetchProjectGithubData(id, accessToken).catch(() => {});
      }
      const fresh = await getProject(id, accessToken);
      setProject(fresh);
      setIsFavorited(fresh.isFavorited);
      setFavCount(fresh.favoritesCount);
      setIsEditing(false);
    } catch (e: unknown) {
      if (e instanceof Error) setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function commitStackInput() {
    const val = stackInput.trim().replace(/,$/, '');
    if (val && !stackItems.includes(val)) {
      setStackItems((prev) => [...prev, val]);
    }
    setStackInput('');
  }

  function handleStackKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitStackInput();
    } else if (e.key === 'Backspace' && !stackInput) {
      setStackItems((prev) => prev.slice(0, -1));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !accessToken) return;
    setUploading(true);
    setFileError('');
    try {
      const uploaded = await uploadProjectFile(id, accessToken, file);
      setProject((prev) => prev ? { ...prev, files: [...prev.files, uploaded] } : prev);
    } catch (err: unknown) {
      if (err instanceof Error) setFileError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleFileDelete(fileId: string) {
    if (!id || !accessToken) return;
    setFileError('');
    try {
      await deleteProjectFile(id, fileId, accessToken);
      setProject((prev) => prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev);
    } catch (err: unknown) {
      if (err instanceof Error) setFileError(err.message);
    }
  }

  async function handleFavorite() {
    if (!accessToken || !id || favLoading) return;
    setFavLoading(true);

    if (isFavorited) {
      setIsFavorited(false);
      setFavCount((c) => c - 1);
      try {
        await removeFavorite(id, accessToken);
      } catch {
        setIsFavorited(true);
        setFavCount((c) => c + 1);
      }
    } else {
      setIsFavorited(true);
      setFavCount((c) => c + 1);
      try {
        await addFavorite(id, accessToken);
      } catch {
        setIsFavorited(false);
        setFavCount((c) => c - 1);
      }
    }

    setFavLoading(false);
  }

  if (loadError) {
    return (
      <>
        <Header />
        <div className="container page">
          <p className="text">{loadError}</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Header />
        <div className="container page">
          <p className="text">Загрузка...</p>
        </div>
        <Footer />
      </>
    );
  }

  const images = project.files.filter((f) => f.type === 'image');
  const otherFiles = project.files.filter((f) => f.type === 'file');
  const selectedRepo = selectedRepoId ? (githubRepos.find((r) => r.id === selectedRepoId) ?? null) : null;

  return (
    <>
      <Header />

      <div className="container page">

        {/* top nav */}
        <div className="project-nav">
          <Link to="/users/me" className="text link">Назад</Link>
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
          <div className="project-editor">

            <div className="project-tabs">
              <button
                className={`project-tab text${activeTab === 'manual' ? ' project-tab--active' : ''}`}
                onClick={() => setActiveTab('manual')}
              >
                Вручную
              </button>
              <button
                className={`project-tab text${activeTab === 'github' ? ' project-tab--active' : ''}`}
                onClick={() => setActiveTab('github')}
              >
                GitHub
              </button>
            </div>

            {activeTab === 'manual' && (
              <div className="project-edit-form">

                <div className="project-edit-field">
                  <label className="text bold">Название</label>
                  <input
                    className="project-input text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    maxLength={200}
                    placeholder="Название проекта"
                  />
                </div>

                <div className="project-edit-field">
                  <label className="text bold">Описание</label>
                  <textarea
                    className="project-textarea text"
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    rows={5}
                    placeholder="Расскажите о проекте"
                  />
                </div>

                <div className="project-edit-field">
                  <label className="text bold">Стек технологий</label>
                  <div className="stack-chips">
                    {stackItems.map((item) => (
                      <div key={item} className="stack-chip">
                        <span className="text">{item}</span>
                        <button
                          className="stack-chip__remove"
                          onClick={() => setStackItems((prev) => prev.filter((s) => s !== item))}
                        >×</button>
                      </div>
                    ))}
                    <input
                      className="stack-chip-input text"
                      value={stackInput}
                      onChange={(e) => setStackInput(e.target.value)}
                      onKeyDown={handleStackKeyDown}
                      onBlur={commitStackInput}
                      placeholder="Введите и нажмите Enter"
                    />
                  </div>
                </div>

                <div className="project-edit-field project-edit-field--row">
                  <label className="text bold">Публичный проект</label>
                  <input
                    type="checkbox"
                    className="project-checkbox"
                    checked={isPublicInput}
                    onChange={(e) => setIsPublicInput(e.target.checked)}
                  />
                </div>

                <div className="project-edit-field">
                  <label className="text bold">Ссылка на демо</label>
                  <input
                    type="url"
                    className="project-input text"
                    value={demoUrlInput}
                    onChange={(e) => setDemoUrlInput(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="project-edit-field">
                  <label className="text bold">Период работы</label>
                  <div className="project-dates-row">
                    <div className="project-date-field">
                      <span className="text">Начало</span>
                      <input
                        type="date"
                        className="project-input text"
                        value={startedAtInput}
                        onChange={(e) => setStartedAtInput(e.target.value)}
                      />
                    </div>
                    <div className="project-date-field">
                      <span className="text">Конец</span>
                      <input
                        type="date"
                        className="project-input text"
                        value={finishedAtInput}
                        onChange={(e) => setFinishedAtInput(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="project-edit-field">
                  <label className="text bold">Файлы</label>
                  {fileError && <p className="project-error text">{fileError}</p>}
                  <div className="project-files-list">
                    {project.files.map((f) => (
                      <div key={f.id} className="project-file-item">
                        <span className="text">{f.originalName}</span>
                        <button className="project-file-remove text" onClick={() => handleFileDelete(f.id)}>
                          Удалить
                        </button>
                      </div>
                    ))}
                    {project.files.length === 0 && (
                      <p className="text project-files-empty">Нет файлов</p>
                    )}
                  </div>
                  <button
                    className="button-light text project-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : '+ Добавить файл'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>

              </div>
            )}

            {activeTab === 'github' && (
              <div className="project-edit-form">

                {/* Repo selector */}
                <div className="project-edit-field">
                  <label className="text bold">Репозиторий GitHub</label>

                  {(githubReposLoading || !githubFetchDone) && (
                    <p className="text project-github-hint">Загрузка репозиториев...</p>
                  )}

                  {githubFetchDone && githubReposError && !githubReposLoading && (
                    <div className="project-github-error">
                      <p className="text project-github-hint">{githubReposError}</p>
                      <button
                        className="button-light text"
                        onClick={() => { setGithubFetchDone(false); fetchGithubRepos(); }}
                      >
                        Попробовать снова
                      </button>
                    </div>
                  )}

                  {githubFetchDone && !githubReposLoading && !githubReposError && githubRepos.length === 0 && (
                    <p className="text project-github-hint">
                      Нет синхронизированных репозиториев. Привяжите GitHub аккаунт в профиле.
                    </p>
                  )}

                  {githubRepos.length > 0 && (
                    <select
                      className="project-input text"
                      value={selectedRepoId ?? ''}
                      onChange={(e) => handleRepoSelect(e.target.value)}
                    >
                      <option value="">— выберите репозиторий —</option>
                      {githubRepos.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.name}{repo.starsCount > 0 ? ` ★ ${repo.starsCount}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Editable fields — visible once a repo is selected or already linked */}
                {(selectedRepoId || repoUrlInput) && (
                  <>
                    {/* Show repo URL as read-only info */}
                    {repoUrlInput && (
                      <div className="project-edit-field">
                        <label className="text bold">Ссылка на репозиторий</label>
                        <a
                          href={repoUrlInput}
                          target="_blank"
                          rel="noreferrer"
                          className="text link project-github-hint"
                        >
                          {repoUrlInput}
                        </a>
                      </div>
                    )}

                    <div className="project-edit-field">
                      <label className="text bold">Название</label>
                      <input
                        className="project-input text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        maxLength={200}
                      />
                    </div>

                    <div className="project-edit-field">
                      <label className="text bold">Описание</label>
                      <textarea
                        className="project-textarea text"
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        rows={5}
                        placeholder="Расскажите о проекте"
                      />
                      {selectedRepo?.readmeExcerpt && (
                        <details className="project-readme-hint">
                          <summary className="text">README (фрагмент)</summary>
                          <p className="text project-readme-text">{selectedRepo.readmeExcerpt}</p>
                        </details>
                      )}
                    </div>

                    <div className="project-edit-field">
                      <label className="text bold">Стек технологий</label>
                      <div className="stack-chips">
                        {stackItems.map((item) => (
                          <div key={item} className="stack-chip">
                            <span className="text">{item}</span>
                            <button
                              className="stack-chip__remove"
                              onClick={() => setStackItems((prev) => prev.filter((s) => s !== item))}
                            >×</button>
                          </div>
                        ))}
                        <input
                          className="stack-chip-input text"
                          value={stackInput}
                          onChange={(e) => setStackInput(e.target.value)}
                          onKeyDown={handleStackKeyDown}
                          onBlur={commitStackInput}
                          placeholder="Введите и нажмите Enter"
                        />
                      </div>
                      {selectedRepo && Object.keys(selectedRepo.languages).length > 0 && (() => {
                        const total = Object.values(selectedRepo.languages).reduce((a, b) => a + b, 0);
                        return (
                          <p className="text project-langs-hint">
                            {Object.entries(selectedRepo.languages)
                              .sort(([, a], [, b]) => b - a)
                              .map(([lang, bytes]) => `${lang} ${Math.round(bytes / total * 100)}%`)
                              .join(' · ')}
                          </p>
                        );
                      })()}
                    </div>

                    <div className="project-edit-field">
                      <label className="text bold">Ссылка на демо</label>
                      <input
                        type="url"
                        className="project-input text"
                        value={demoUrlInput}
                        onChange={(e) => setDemoUrlInput(e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="project-edit-field project-edit-field--row">
                      <label className="text bold">Публичный проект</label>
                      <input
                        type="checkbox"
                        className="project-checkbox"
                        checked={isPublicInput}
                        onChange={(e) => setIsPublicInput(e.target.checked)}
                      />
                    </div>
                  </>
                )}

              </div>
            )}

          </div>
        ) : (
          <>
            <div className="project-header">
              <div className="project-header__top">
                <div className="project-header__info">
                  <h1 className="project-h1">{project.title}</h1>
                  {project.repoUrl && (
                    <a href={project.repoUrl} target="_blank" rel="noreferrer" className="project-github">
                      <img src={github} alt="GitHub" />
                    </a>
                  )}
                  {project.demoUrl && (
                    <a href={project.demoUrl} target="_blank" rel="noreferrer" className="button text project-demo-link">
                      Демо
                    </a>
                  )}
                  {project.source === 'github' && (
                    <div className="project-aiDescription">
                      <img src={aiStar} alt="AI" />
                      <p className="profile-class__text">GitHub-проект</p>
                    </div>
                  )}
                </div>

                {!isOwn && (
                  <div className="project-favorite">
                    <button
                      className="like-btn"
                      onClick={handleFavorite}
                      disabled={!accessToken || favLoading}
                      style={{ background: 'none', border: 'none', cursor: !accessToken ? 'default' : 'pointer' }}
                    >
                      <img src={isFavorited ? likeFill : likeEmpty} alt="Like" className="like-icon" />
                    </button>
                    {favCount > 0 && <span className="text project-fav-count">{favCount}</span>}
                  </div>
                )}
              </div>

              {project.stack.length > 0 && (
                <div className="project-header__bottom">
                  <p className="text bold">Инструменты:</p>
                  <div className="instruments">
                    {project.stack.map((item) => (
                      <div key={item} className="instruments__item"><p>{item}</p></div>
                    ))}
                  </div>
                </div>
              )}

              {project.githubRepo && (
                <div className="project-github-meta">
                  {project.githubRepo.starsCount > 0 && (
                    <span className="project-github-stars text">★ {project.githubRepo.starsCount}</span>
                  )}
                  {project.githubRepo.isFork && (
                    <span className="project-github-badge text">Fork</span>
                  )}
                  {project.githubRepo.topics.map((t) => (
                    <span key={t} className="project-github-badge text">{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="project-body">

              {project.description && (
                <div className="project-section">
                  <h2 className="project-h2">Описание проекта</h2>
                  <p className="text">{project.description}</p>
                </div>
              )}

              {otherFiles.length > 0 && (
                <div className="project-downloads">
                  {otherFiles.map((f) => (
                    <a key={f.id} href={f.fileUrl} download={f.originalName} className="button text">
                      {f.originalName}
                    </a>
                  ))}
                </div>
              )}

              {images.length > 0 && (
                <div className="project-images">
                  {images.map((f) => (
                    <img key={f.id} src={f.fileUrl} alt={f.originalName} className="project-image" />
                  ))}
                </div>
              )}

              <div className="project-footer">
                <p className="text bold">{authorNickname ? `© ${authorNickname}` : ''}</p>
                {(project.startedAt || project.finishedAt) && (
                  <p className="text">
                    {project.startedAt
                      ? new Date(project.startedAt).toLocaleDateString('ru-RU')
                      : '...'}
                    {' — '}
                    {project.finishedAt
                      ? new Date(project.finishedAt).toLocaleDateString('ru-RU')
                      : 'по настоящее время'}
                  </p>
                )}
                <p className="text">{new Date(project.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>

            </div>
          </>
        )}

      </div>

      <Footer />
    </>
  );
}

export default Project;
