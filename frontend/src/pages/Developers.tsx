import { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ProfilePreview from "../components/ProfilePreview";
import { getUsers, type UserCard } from "../api/users";
import { useAuth } from "../context/AuthContext";

import "../css/main.css";

import searchIcon from "../images/icons/search.svg";

const ACTIVITY_FILTERS = [
  { label: 'Все', value: '' },
  { label: 'Frontend', value: 'Frontend' },
  { label: 'Backend', value: 'Backend' },
  { label: 'Fullstack', value: 'Fullstack' },
];

function Developers() {
  const { accessToken } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activityField, setActivityField] = useState('');
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
        <div className="search-field">
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              id="name"
              name="user_name"
              placeholder="Введите имя"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button type="submit"><img src={searchIcon} alt="Search" /></button>
          </form>
        </div>

        <div className="filters">
          {ACTIVITY_FILTERS.map(({ label, value }) => (
            <label key={value}>
              <input
                type="radio"
                name="developerFilter"
                value={value}
                checked={activityField === value}
                onChange={() => setActivityField(value)}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="developers-search__result">
          {loading && <p className="text">Загрузка...</p>}
          {!loading && users.length === 0 && (
            <p className="text">Пользователи не найдены</p>
          )}
          {!loading && users.map((u) => (
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
      </div>
      <Footer />
    </>
  );
}

export default Developers;
