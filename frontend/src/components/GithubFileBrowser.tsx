import { useEffect, useState } from "react";
import { getRepoContents } from "../api/github";
import type { GithubContentItem } from "../api/github";
import "../css/GithubFileBrowser.css";

interface Props {
  repoId: string;
}

function fileIcon(item: GithubContentItem): string {
  if (item.type === 'dir') return '📁';
  const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼';
  if (['md', 'mdx'].includes(ext)) return '📝';
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return '⚙';
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'cs', 'rb', 'php', 'swift', 'kt'].includes(ext)) return '📄';
  return '📄';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function GithubFileBrowser({ repoId }: Props) {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<GithubContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getRepoContents(repoId, currentPath)
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
        setItems(sorted);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoId, currentPath]);

  const pathParts = currentPath ? currentPath.split('/') : [];

  function navigateTo(path: string) {
    setCurrentPath(path);
  }

  function handleItemClick(item: GithubContentItem) {
    if (item.type === 'dir') {
      navigateTo(item.path);
    } else if (item.download_url) {
      window.open(item.download_url, '_blank', 'noreferrer');
    }
  }

  return (
    <div className="gfb">
      <div className="gfb-breadcrumb">
        <button className="gfb-crumb text" onClick={() => navigateTo('')}>root</button>
        {pathParts.map((part, i) => {
          const partPath = pathParts.slice(0, i + 1).join('/');
          return (
            <span key={partPath} className="gfb-crumb-row">
              <span className="gfb-crumb-sep">/</span>
              <button
                className="gfb-crumb text"
                onClick={() => navigateTo(partPath)}
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      {loading && <p className="text gfb-status">Загрузка...</p>}
      {error && <p className="text gfb-error">{error}</p>}

      {!loading && !error && (
        <div className="gfb-list">
          {currentPath && (
            <div
              className="gfb-item gfb-item--dir"
              onClick={() => {
                const parent = pathParts.slice(0, -1).join('/');
                navigateTo(parent);
              }}
            >
              <span className="gfb-icon">📁</span>
              <span className="text gfb-name">..</span>
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.path}
              className={`gfb-item${item.type === 'dir' ? ' gfb-item--dir' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className="gfb-icon">{fileIcon(item)}</span>
              <span className="text gfb-name">{item.name}</span>
              {item.type === 'file' && item.size > 0 && (
                <span className="text gfb-size">{formatSize(item.size)}</span>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text gfb-status">Папка пуста</p>
          )}
        </div>
      )}
    </div>
  );
}
