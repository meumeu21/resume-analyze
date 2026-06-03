import React from 'react';
import type { ProjectResponse } from '../api/projects';
import type { AiReport } from '../api/ai';
import type { GithubRepoData } from '../api/github';
import aiStar from '../images/icons/ai-star.svg';

type Tab = 'manual' | 'github';

interface ProjectEditorProps {
  project: ProjectResponse;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  titleInput: string;
  descInput: string;
  stackInput: string;
  stackItems: string[];
  isPublicInput: boolean;
  demoUrlInput: string;
  startedAtInput: string;
  finishedAtInput: string;
  repoUrlInput: string;
  selectedRepoId: string | null;
  githubRepos: GithubRepoData[];
  githubReposLoading: boolean;
  githubReposError: string;
  githubFetchDone: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  fileError: string;
  aiSummary: AiReport | null;
  aiGenerating: boolean;
  aiError: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onStackInputChange: (v: string) => void;
  onStackItemRemove: (item: string) => void;
  onStackKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStackBlur: () => void;
  onIsPublicChange: (v: boolean) => void;
  onDemoUrlChange: (v: string) => void;
  onStartedAtChange: (v: string) => void;
  onFinishedAtChange: (v: string) => void;
  onRepoSelect: (repoId: string) => void;
  onRetryGithubFetch: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDelete: (fileId: string) => void;
  onGenerateAiSummary: () => void;
  onToggleAiVisibility: () => void;
}

function ProjectEditor({
  project, activeTab, onTabChange,
  titleInput, descInput, stackInput, stackItems, isPublicInput,
  demoUrlInput, startedAtInput, finishedAtInput, repoUrlInput,
  selectedRepoId, githubRepos, githubReposLoading, githubReposError, githubFetchDone,
  fileInputRef, uploading, fileError,
  aiSummary, aiGenerating, aiError,
  onTitleChange, onDescChange, onStackInputChange, onStackItemRemove,
  onStackKeyDown, onStackBlur, onIsPublicChange, onDemoUrlChange,
  onStartedAtChange, onFinishedAtChange,
  onRepoSelect, onRetryGithubFetch,
  onFileUpload, onFileDelete,
  onGenerateAiSummary, onToggleAiVisibility,
}: ProjectEditorProps) {
  const selectedRepo = selectedRepoId ? (githubRepos.find((r) => r.id === selectedRepoId) ?? null) : null;

  return (
    <div className="project-editor">
      <div className="project-tabs">
        <button
          className={`project-tab text${activeTab === 'manual' ? ' project-tab--active' : ''}`}
          onClick={() => onTabChange('manual')}
        >
          Вручную
        </button>
        <button
          className={`project-tab text${activeTab === 'github' ? ' project-tab--active' : ''}`}
          onClick={() => onTabChange('github')}
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
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={200}
              placeholder="Название проекта"
            />
          </div>

          <div className="project-edit-field">
            <label className="text bold">Описание</label>
            <textarea
              className="project-textarea text"
              value={descInput}
              onChange={(e) => onDescChange(e.target.value)}
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
                  <button className="stack-chip__remove" onClick={() => onStackItemRemove(item)}>×</button>
                </div>
              ))}
              <input
                className="stack-chip-input text"
                value={stackInput}
                onChange={(e) => onStackInputChange(e.target.value)}
                onKeyDown={onStackKeyDown}
                onBlur={onStackBlur}
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
              onChange={(e) => onIsPublicChange(e.target.checked)}
            />
          </div>

          <div className="project-edit-field">
            <label className="text bold">Ссылка на демо</label>
            <input
              type="url"
              className="project-input text"
              value={demoUrlInput}
              onChange={(e) => onDemoUrlChange(e.target.value)}
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
                  onChange={(e) => onStartedAtChange(e.target.value)}
                />
              </div>
              <div className="project-date-field">
                <span className="text">Конец</span>
                <input
                  type="date"
                  className="project-input text"
                  value={finishedAtInput}
                  onChange={(e) => onFinishedAtChange(e.target.value)}
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
                  <button className="project-file-remove text" onClick={() => onFileDelete(f.id)}>
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
              accept="image/*,application/pdf,text/plain,text/markdown,application/json,application/zip,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.cpp,.c,.cs,.md"
              style={{ display: 'none' }}
              onChange={onFileUpload}
            />
          </div>
        </div>
      )}

      {activeTab === 'github' && (
        <div className="project-edit-form">
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
                  onClick={onRetryGithubFetch}
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
                onChange={(e) => onRepoSelect(e.target.value)}
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

          {(selectedRepoId || repoUrlInput) && (
            <>
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
                  onChange={(e) => onTitleChange(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="project-edit-field">
                <label className="text bold">Описание</label>
                <textarea
                  className="project-textarea text"
                  value={descInput}
                  onChange={(e) => onDescChange(e.target.value)}
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
                        onClick={() => onStackItemRemove(item)}
                      >×</button>
                    </div>
                  ))}
                  <input
                    className="stack-chip-input text"
                    value={stackInput}
                    onChange={(e) => onStackInputChange(e.target.value)}
                    onKeyDown={onStackKeyDown}
                    onBlur={onStackBlur}
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
                  onChange={(e) => onDemoUrlChange(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="project-edit-field project-edit-field--row">
                <label className="text bold">Публичный проект</label>
                <input
                  type="checkbox"
                  className="project-checkbox"
                  checked={isPublicInput}
                  onChange={(e) => onIsPublicChange(e.target.checked)}
                />
              </div>
            </>
          )}
        </div>
      )}

      <div className="project-ai-card">
        <div className="project-ai-card-title">
          <img src={aiStar} alt="AI" className="project-ai-icon" />
          <span className="text bold">Описание от ИИ</span>
          {aiSummary?.status === 'done' && (
            <label className="project-ai-visibility">
              <span className="text">Приватное описание</span>
              <input
                type="checkbox"
                className="project-checkbox"
                checked={!aiSummary.isPublic}
                onChange={onToggleAiVisibility}
              />
            </label>
          )}
        </div>
        {aiSummary?.status === 'pending' && (
          <p className="text project-ai-status">Генерация описания...</p>
        )}
        {aiSummary?.status === 'error' && (
          <p className="text project-ai-error">{aiSummary.errorMessage || 'Ошибка генерации'}</p>
        )}
        {aiSummary?.status === 'done' && aiSummary.summary && (
          <p className="text project-ai-text">{aiSummary.summary}</p>
        )}
        {aiError && <p className="text project-ai-error">{aiError}</p>}
        <button
          className="button-light text"
          onClick={onGenerateAiSummary}
          disabled={aiGenerating || aiSummary?.status === 'pending'}
        >
          {aiGenerating ? 'Запрос...' : aiSummary ? 'Перегенерировать' : 'Сгенерировать описание'}
        </button>
      </div>
    </div>
  );
}

export default ProjectEditor;
