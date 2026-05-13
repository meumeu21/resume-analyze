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

function Developers() {
  const { accessToken } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activityField, setActivityField] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [users, setUsers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      getUsers(
        { search: searchText || undefined, activityField: activityField || undefined },
        accessToken,
      )
        .then((res) => setUsers(res.data))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, activityField, accessToken]);

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
      </div>
      <Footer />
    </>
  );
}

export default Developers;
