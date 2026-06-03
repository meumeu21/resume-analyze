import { Link } from 'react-router-dom';
import type { ProjectResponse } from '../api/projects';
import type { AiReport } from '../api/ai';
import GithubFileBrowser from './GithubFileBrowser';
import github from '../images/icons/github.svg';
import aiStar from '../images/icons/ai-star.svg';
import likeEmpty from '../images/icons/heart-empty.svg';
import likeFill from '../images/icons/heart-fill.svg';

interface ProjectViewProps {
  project: ProjectResponse;
  aiSummary: AiReport | null;
  isOwn: boolean;
  isFavorited: boolean;
  favCount: number;
  favLoading: boolean;
  accessToken: string | null;
  authorNickname: string;
  onFavorite: () => void;
}

function ProjectView({
  project, aiSummary, isOwn,
  isFavorited, favCount, favLoading,
  accessToken, authorNickname, onFavorite,
}: ProjectViewProps) {
  const images = project.files.filter((f) => f.type === 'image');
  const otherFiles = project.files.filter((f) => f.type === 'file');

  return (
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
                onClick={onFavorite}
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

        {aiSummary?.status === 'done' && aiSummary.summary && (isOwn || aiSummary.isPublic) && (
          <div className="project-section">
            <div className="project-ai-view-title">
              <img src={aiStar} alt="AI" className="project-ai-icon" />
              <h2 className="project-h2">Описание от ИИ</h2>
              {isOwn && !aiSummary.isPublic && (
                <span className="project-ai-badge">приватно</span>
              )}
            </div>
            <p className="text project-ai-text">{aiSummary.summary}</p>
          </div>
        )}

        {project.githubRepoId && (
          <div className="project-section">
            <h2 className="project-h2">Файлы репозитория</h2>
            <GithubFileBrowser repoId={project.githubRepoId} />
          </div>
        )}

        {(images.length > 0 || otherFiles.length > 0) && (
          <div className="project-section">
            <h2 className="project-h2">Прикреплённые файлы</h2>
            {images.length > 0 && (
              <div className="project-images">
                {images.map((f) => (
                  <img key={f.id} src={f.fileUrl} alt={f.originalName} className="project-image" />
                ))}
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
          </div>
        )}

        <div className="project-footer">
          {authorNickname && (
            <Link to={`/users/${project.userId}`} className="text bold link">
              © {authorNickname}
            </Link>
          )}
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
  );
}

export default ProjectView;
