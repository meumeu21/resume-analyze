import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import "../css/main.css";
import "../css/Project.css";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  getProject, updateProject, uploadProjectFile, deleteProjectFile,
  addFavorite, removeFavorite,
} from "../api/projects";
import type { ProjectResponse } from "../api/projects";
import { getUserProfile } from "../api/users";

import github from "../images/icons/github.svg";
import aiStar from "../images/icons/ai-star.svg";
import likeEmpty from "../images/icons/heart-empty.svg";
import likeFill from "../images/icons/heart-fill.svg";

type Tab = 'manual' | 'github';

function Project() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // edit fields — manual tab
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [stackInput, setStackInput] = useState('');
  const [stackItems, setStackItems] = useState<string[]>([]);
  const [isPublicInput, setIsPublicInput] = useState(false);

  const [demoUrlInput, setDemoUrlInput] = useState('');
  const [startedAtInput, setStartedAtInput] = useState('');
  const [finishedAtInput, setFinishedAtInput] = useState('');

  // edit fields — github tab
  const [repoUrlInput, setRepoUrlInput] = useState('');

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
    setActiveTab(project.source === 'github' ? 'github' : 'manual');
    setSaveError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError('');
  }

  async function handleSave() {
    if (!id || !accessToken) return;
    setSaving(true);
    setSaveError('');
    try {
      const data = activeTab === 'manual'
        ? {
            title: titleInput.trim() || undefined,
            description: descInput.trim() || undefined,
            stack: stackItems,
            isPublic: isPublicInput,
            demoUrl: demoUrlInput.trim() || undefined,
            startedAt: startedAtInput || undefined,
            finishedAt: finishedAtInput || undefined,
          }
        : { repoUrl: repoUrlInput.trim() || undefined };
      const updated = await updateProject(id, accessToken, data);
      setProject((prev) => prev ? { ...prev, ...updated, files: prev.files } : prev);
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
    try {
      if (isFavorited) {
        await removeFavorite(id, accessToken);
        setIsFavorited(false);
        setFavCount((c) => c - 1);
      } else {
        await addFavorite(id, accessToken);
        setIsFavorited(true);
        setFavCount((c) => c + 1);
      }
    } catch { /* ignore */ } finally {
      setFavLoading(false);
    }
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
              ) : (
                <button className="button text" onClick={startEditing}>Редактировать</button>
              )}
            </div>
          )}
        </div>

        {saveError && <p className="project-error text">{saveError}</p>}

        {isEditing ? (
          /* ── EDIT MODE ─────────────────────────────────────────────── */
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
                <p className="text project-github-hint">
                  Вставьте ссылку на репозиторий GitHub. Автоматическое заполнение данных из репозитория будет доступно позже.
                </p>
                <div className="project-edit-field">
                  <label className="text bold">Ссылка на репозиторий</label>
                  <input
                    className="project-input text"
                    value={repoUrlInput}
                    onChange={(e) => setRepoUrlInput(e.target.value)}
                    placeholder="https://github.com/username/repo"
                  />
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ── VIEW MODE ─────────────────────────────────────────────── */
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
                  <button
                    className="like-btn"
                    onClick={handleFavorite}
                    disabled={!accessToken || favLoading}
                    style={{ background: 'none', border: 'none', cursor: !accessToken ? 'default' : 'pointer' }}
                  >
                    <img src={isFavorited ? likeFill : likeEmpty} alt="Like" className="like-icon" />
                  </button>
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
