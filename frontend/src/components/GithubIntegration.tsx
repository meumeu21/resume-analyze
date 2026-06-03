import type { GithubAccountData } from '../api/github';

interface GithubIntegrationProps {
  loading: boolean;
  account: GithubAccountData | null;
  error: string;
  usernameInput: string;
  connecting: boolean;
  syncing: boolean;
  onUsernameChange: (value: string) => void;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}

function GithubIntegration({
  loading, account, error, usernameInput, connecting, syncing,
  onUsernameChange, onConnect, onSync, onDisconnect,
}: GithubIntegrationProps) {
  return (
    <div className="github-integration">
      <h2 className="github-integration__title text bold">GitHub-аккаунт</h2>
      <p className="text github-integration__hint">
        Подключите аккаунт, чтобы импортировать репозитории в проекты
      </p>
      {loading ? (
        <p className="text">Загрузка...</p>
      ) : account ? (
        <div className="github-connected">
          <p className="text">
            Подключён: <span className="bold">{account.githubUsername}</span>
            {' · '}{account.repos.length} репозиториев
          </p>
          {error && <p className="error-text text">{error}</p>}
          <div className="github-connected__actions">
            <button className="button-light text" onClick={onSync} disabled={syncing}>
              {syncing ? 'Синхронизация...' : 'Синхронизировать'}
            </button>
            <button className="button-light text" onClick={onDisconnect}>
              Отключить
            </button>
          </div>
        </div>
      ) : (
        <div className="github-connect-form">
          {error && <p className="error-text text">{error}</p>}
          <div className="github-connect-form__row">
            <input
              className="project-input text github-username-input"
              value={usernameInput}
              onChange={(e) => onUsernameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onConnect()}
              placeholder="GitHub username"
            />
            <button
              className="button text"
              onClick={onConnect}
              disabled={connecting || !usernameInput.trim()}
            >
              {connecting ? 'Подключение...' : 'Подключить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GithubIntegration;
