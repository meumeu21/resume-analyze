import { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ProfilePreview from "../components/ProfilePreview";
import { getUsers, type UserCard } from "../api/users";
import { useAuth } from "../context/AuthContext";

import "../css/main.css";
import "../css/Developers.css";

import searchIcon from "../images/icons/search.svg";
import filterIcon from "../images/icons/filter.svg";

const ACTIVITY_FILTERS = [
  { label: 'Все', value: '' },
  { label: 'Frontend-разработчик', value: 'Frontend-разработчик' },
  { label: 'Backend-разработчик', value: 'Backend-разработчик' },
  { label: 'Full-Stack разработчик', value: 'Full-Stack разработчик' },
  { label: 'Мобильный разработчик', value: 'Мобильный разработчик' },
  { label: 'Data Scientist', value: 'Data Scientist' },
  { label: 'ML-инженер', value: 'ML-инженер' },
  { label: 'DevOps-инженер', value: 'DevOps-инженер' },
  { label: 'QA-инженер', value: 'QA-инженер' },
  { label: 'Разработчик игр', value: 'Разработчик игр' },
  { label: 'Blockchain-разработчик', value: 'Blockchain-разработчик' },
  { label: 'Embedded-разработчик', value: 'Embedded-разработчик' },
];

const PAGE_LIMIT = 10;

function Developers() {
  const { accessToken } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activityField, setActivityField] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [users, setUsers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  useEffect(() => {
    setPage(1);
  }, [searchText, activityField]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      getUsers(
        {
          search: searchText || undefined,
          activityField: activityField || undefined,
          page,
          limit: PAGE_LIMIT,
        },
        accessToken,
      )
        .then((res) => {
          setUsers(res.data);
          setTotal(res.total);
        })
        .catch(() => {
          setUsers([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, activityField, page, accessToken]);

  return (
    <>
      <Header />
      <div className="container page">
        <h1 className="developers-heading">Разработчики</h1>

        <div className="developers-search">
          <div className="developers-search__bar">
            <div className="developers-search__input-wrap">
              <input
                className="developers-search__input"
                type="text"
                placeholder="Поиск по имени или никнейму"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <button
                className="developers-search__search-btn"
                type="button"
                tabIndex={-1}
              >
                <img src={searchIcon} alt="Поиск" />
              </button>
            </div>

            <button
              className={`developers-search__filter-btn${filtersOpen ? ' active' : ''}`}
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <img src={filterIcon} alt="Фильтры" />
              Фильтры
            </button>
          </div>

          <div className={`developers-filters-wrap${filtersOpen ? ' open' : ''}`}>
            <div className="developers-filters">
              {ACTIVITY_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  className={`developers-filters__chip${activityField === value ? ' selected' : ''}`}
                  type="button"
                  onClick={() => setActivityField(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <p className="developers-loading">Загрузка...</p>
        )}

        {!loading && users.length === 0 && (
          <p className="developers-empty">Пользователи не найдены</p>
        )}

        {!loading && users.length > 0 && (
          <div className="developers-grid">
            {users.map((u) => (
              <ProfilePreview
                key={u.userId}
                username={u.nickname}
                AIdescription={u.activityField ?? ''}
                avatarUrl={u.avatarUrl}
                linkToProfile={`/users/${u.userId}`}
                numOfSubs={String(u.followersCount)}
              />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="developers-pagination">
            <button
              className="button-light text"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ←
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '…' ? (
                  <span key={`ellipsis-${idx}`} className="developers-pagination__ellipsis">…</span>
                ) : (
                  <button
                    key={item}
                    className={page === item ? 'button text' : 'button-light text'}
                    onClick={() => setPage(item as number)}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              className="button-light text"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              →
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default Developers;
