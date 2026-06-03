import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import "../css/main.css";
import TextField from "../components/TextField";
import HardSkillsEditor from "../components/HardSkillsEditor";
import type { Skill } from "../components/HardSkillsEditor";
import ContactProfile from "../components/ContactProfile";
import ProfileMetrics from "../components/ProfileMetrics";
import Header from "../components/Header";
import ProjectPreview from "../components/ProjectPreview";
import { useAuth } from "../context/AuthContext";
import {
  getMyProfile, getUserProfile, followUser, unfollowUser,
  patchMyProfile, updateContacts, uploadAvatar, deleteCoordinates, deleteSkillMap, deleteNetworkGraph,
} from "../api/users";
import { ApiError } from "../api/client";
import type { MyProfileResponse, UserProfileResponse, ContactType } from "../api/users";
import { createProject, getFavoriteProjects, addFavorite, removeFavorite } from "../api/projects";
import type { ContactLink } from "../api/auth";
import {
  getGithubAccount, connectGithub, syncGithubRepos, disconnectGithub,
} from "../api/github";
import type { GithubAccountData } from "../api/github";
import { generateReport, getReport } from "../api/ai";

import Avatar from "../components/Avatar";
import CoordinatesChart from "../components/CoordinatesChart";
import SkillMapChart from "../components/SkillMapChart";
import NetworkGraphChart from "../components/NetworkGraphChart";
import ActivityChart from "../components/ActivityChart";
import starIcon from "../images/icons/ai-star.svg";
import Footer from "../components/Footer";

const CONTACT_LABEL: Record<string, string> = {
  github: 'GitHub',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  website: 'Сайт',
  other: 'Другое',
};

const DOMAIN_PREFIXES: Record<string, string> = {
  github: 'https://github.com/',
  telegram: 'https://t.me/',
  linkedin: 'https://linkedin.com/in/',
  website: 'https://',
};

const PLACEHOLDERS: Record<string, string> = {
  github: 'https://github.com/username',
  telegram: 'https://t.me/username',
  linkedin: 'https://linkedin.com/in/username',
  website: 'https://example.com',
  other: 'https://example.com',
};

const DOMAIN_CHECKS: Record<string, string> = {
  github: 'github.com',
  telegram: 't.me',
  linkedin: 'linkedin.com/in',
};

const FIXED_TYPES = ['github', 'telegram', 'linkedin', 'website', 'other'] as const;

type ContactsState = Record<typeof FIXED_TYPES[number], string>;
type ContactsErrors = Partial<Record<typeof FIXED_TYPES[number], string>>;

function validateUrl(type: string, url: string): string | null {
  if (!url) return null;
  try {
    new URL(url);
  } catch {
    return 'Некорректная ссылка';
  }
  const domain = DOMAIN_CHECKS[type];
  if (domain && !url.includes(domain)) {
    return `Ссылка должна вести на ${domain}`;
  }
  return null;
}

function contactsToState(contacts: ContactLink[]): ContactsState {
  const state: ContactsState = { github: '', telegram: '', linkedin: '', website: '', other: '' };
  for (const c of contacts) {
    if (c.type in state) state[c.type as keyof ContactsState] = c.url;
  }
  return state;
}

function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut, accessToken, isLoading, updateUser } = useAuth();
  const navigate = useNavigate();

  const isOwn = id === 'me';

  const CARD_COLORS = ['#FFF', '#ECEBFF', '#FAE2FF', '#BEEBFF', '#FFE6BD'];

  const [myProfile, setMyProfile] = useState<MyProfileResponse | null>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfileResponse | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [contactsState, setContactsState] = useState<ContactsState>({
    github: '', telegram: '', linkedin: '', website: '', other: '',
  });
  const [contactsErrors, setContactsErrors] = useState<ContactsErrors>({});

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState('');

  const [coordinatesLoading, setCoordinatesLoading] = useState(false);
  const [coordinatesError, setCoordinatesError] = useState('');

  const [skillMapLoading, setSkillMapLoading] = useState(false);
  const [skillMapError, setSkillMapError] = useState('');

  const [networkGraphLoading, setNetworkGraphLoading] = useState(false);
  const [networkGraphError, setNetworkGraphError] = useState('');

  const [githubAccount, setGithubAccount] = useState<GithubAccountData | null>(null);
  const [githubAccountLoading, setGithubAccountLoading] = useState(false);
  const [githubAccountError, setGithubAccountError] = useState('');
  const [githubUsernameInput, setGithubUsernameInput] = useState('');
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);

  const [chartsOpen, setChartsOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);

  useEffect(() => {
    if (isOwn && !isLoading && !accessToken) {
      navigate('/login', { replace: true });
    }
  }, [isOwn, isLoading, accessToken, navigate]);

  useEffect(() => {
    if (!isOwn && user?.id && id === user.id) {
      navigate('/users/me', { replace: true });
    }
  }, [id, user?.id, isOwn, navigate]);

  useEffect(() => {
    if (isOwn) {
      if (!accessToken) return;
      getMyProfile(accessToken).then(setMyProfile).catch((e: unknown) => {
        if (e instanceof ApiError && e.status >= 500) navigate('/500', { replace: true });
      });
    } else if (id) {
      getUserProfile(id, accessToken).then((p) => {
        setOtherProfile(p);
        setFollowing(p.isFollowing);
      }).catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) navigate('/404', { replace: true });
        else if (e instanceof ApiError && e.status >= 500) navigate('/500', { replace: true });
      });
    }
  }, [id, accessToken, isOwn]);

  useEffect(() => {
    if (isOwn || !accessToken) return;
    getFavoriteProjects(accessToken)
      .then((favs) => setFavoritedIds(new Set(favs.map((f) => f.id))))
      .catch(() => {});
  }, [isOwn, accessToken]);

  useEffect(() => {
    if (!isOwn || !accessToken) return;
    setGithubAccountLoading(true);
    getGithubAccount(accessToken)
      .then(setGithubAccount)
      .catch(() => setGithubAccount(null))
      .finally(() => setGithubAccountLoading(false));
  }, [isOwn, accessToken]);

  const profile = isOwn ? myProfile : otherProfile;
  const nickname = profile?.nickname ?? (isOwn ? user?.profile?.nickname : undefined) ?? 'Пользователь';
  const avatarUrl = profile?.avatarUrl ?? (isOwn ? user?.profile?.avatarUrl : undefined) ?? null;
  const contacts: ContactLink[] = (profile?.contacts ?? []) as ContactLink[];
  const softSkillsText = profile?.softSkills?.length ? profile.softSkills.join(', ') : '';


  async function handleFollow() {
    if (!accessToken) {
      const go = window.confirm('Для подписки на пользователя нужно авторизоваться. Перейти на страницу авторизации?');
      if (go) navigate('/login');
      return;
    }
    if (!id || followLoading) return;
    setFollowLoading(true);

    if (following) {
      setFollowing(false);
      setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 1) - 1 } : p);
      setMyProfile((p) => p ? { ...p, followingCount: (p.followingCount ?? 1) - 1 } : p);
      try {
        await unfollowUser(id, accessToken);
      } catch {
        setFollowing(true);
        setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p);
        setMyProfile((p) => p ? { ...p, followingCount: (p.followingCount ?? 0) + 1 } : p);
      }
    } else {
      setFollowing(true);
      setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p);
      setMyProfile((p) => p ? { ...p, followingCount: (p.followingCount ?? 0) + 1 } : p);
      try {
        await followUser(id, accessToken);
      } catch {
        setFollowing(false);
        setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 1) - 1 } : p);
        setMyProfile((p) => p ? { ...p, followingCount: (p.followingCount ?? 1) - 1 } : p);
      }
    }

    setFollowLoading(false);
  }

  async function handleEdit() {
    if (!isEditing) {
      setNicknameInput(profile?.nickname ?? nickname);
      setNicknameError('');
      setContactsState(contactsToState(contacts));
      setContactsErrors({});
      setIsEditing(true);
    } else {
      await handleSaveAll();
      setIsEditing(false);
    }
  }

  async function handleSaveAll() {
    if (!accessToken) return;

    const errors: ContactsErrors = {};
    for (const type of FIXED_TYPES) {
      const err = validateUrl(type, contactsState[type]);
      if (err) errors[type] = err;
    }
    if (Object.keys(errors).length > 0) {
      setContactsErrors(errors);
      return;
    }

    const currentNickname = profile?.nickname ?? nickname;
    const trimmedNickname = nicknameInput.trim();

    try {
      if (trimmedNickname && trimmedNickname !== currentNickname) {
        await patchMyProfile(accessToken, { nickname: trimmedNickname });
      }

      const contactsList = FIXED_TYPES
        .filter((type) => contactsState[type].trim())
        .map((type) => ({ type: type as ContactType, url: contactsState[type].trim() }));
      await updateContacts(accessToken, contactsList);

      const fresh = await getMyProfile(accessToken);
      setMyProfile(fresh);
    } catch (e: unknown) {
      if (e instanceof Error) setNicknameError(e.message);
    }
  }

  async function handleCreateProject() {
    if (!accessToken) return;
    setCreatingProject(true);
    try {
      const newProject = await createProject(accessToken, 'Новый проект');
      navigate(`/projects/${newProject.id}`);
    } catch {} finally {
      setCreatingProject(false);
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent, projectId: string) {
    e.preventDefault();
    if (!accessToken) return;
    const isFav = favoritedIds.has(projectId);

    if (isFav) {
      setFavoritedIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
      setMyProfile((p) => p ? { ...p, favoritesCount: Math.max(0, (p.favoritesCount ?? 1) - 1) } : p);
      try {
        await removeFavorite(projectId, accessToken);
      } catch {
        setFavoritedIds((prev) => new Set(prev).add(projectId));
        setMyProfile((p) => p ? { ...p, favoritesCount: (p.favoritesCount ?? 0) + 1 } : p);
      }
    } else {
      setFavoritedIds((prev) => new Set(prev).add(projectId));
      setMyProfile((p) => p ? { ...p, favoritesCount: (p.favoritesCount ?? 0) + 1 } : p);
      try {
        await addFavorite(projectId, accessToken);
      } catch {
        setFavoritedIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
        setMyProfile((p) => p ? { ...p, favoritesCount: Math.max(0, (p.favoritesCount ?? 1) - 1) } : p);
      }
    }
  }

  async function handleClassify() {
    if (!accessToken) return;
    setClassifying(true);
    setClassifyError('');
    try {
      const report = await generateReport(accessToken, 'activity_field');
      let reportId = report.id;
      let status = report.status;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status;
        reportId = updated.id;
        polls += 1;
      }
      if (status === 'pending') {
        setClassifyError('Определение класса не завершилось. Попробуйте ещё раз.');
        return;
      }
      if (status === 'error') {
        setClassifyError('Не удалось определить класс. Попробуйте ещё раз.');
        return;
      }
      const fresh = await getMyProfile(accessToken);
      setMyProfile(fresh);
    } catch {
      setClassifyError('Ошибка при определении класса.');
    } finally {
      setClassifying(false);
    }
  }

  async function handleBuildCoordinates() {
    if (!accessToken) return;
    setCoordinatesLoading(true);
    setCoordinatesError('');
    try {
      const report = await generateReport(accessToken, 'coordinates');
      let reportId = report.id;
      let status = report.status;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status;
        reportId = updated.id;
        polls += 1;
      }
      if (status === 'pending') {
        setCoordinatesError('Анализ не завершился. Попробуйте ещё раз.');
        return;
      }
      if (status === 'error') {
        setCoordinatesError('Не удалось построить график. Попробуйте ещё раз.');
        return;
      }
      const fresh = await getMyProfile(accessToken);
      setMyProfile(fresh);
    } catch {
      setCoordinatesError('Ошибка при построении графика.');
    } finally {
      setCoordinatesLoading(false);
    }
  }

  async function handleDeleteCoordinates() {
    if (!accessToken) return;
    try {
      await deleteCoordinates(accessToken);
      setMyProfile((prev) => prev ? { ...prev, coordinates: null } : prev);
    } catch {}
  }

  async function handleBuildSkillMap() {
    if (!accessToken) return;
    setSkillMapLoading(true);
    setSkillMapError('');
    try {
      const report = await generateReport(accessToken, 'skill_map');
      let reportId = report.id;
      let status = report.status;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status;
        reportId = updated.id;
        polls += 1;
      }
      if (status === 'pending') { setSkillMapError('Анализ не завершился. Попробуйте ещё раз.'); return; }
      if (status === 'error') { setSkillMapError('Не удалось построить карту. Попробуйте ещё раз.'); return; }
      const fresh = await getMyProfile(accessToken);
      setMyProfile(fresh);
    } catch {
      setSkillMapError('Ошибка при построении карты навыков.');
    } finally {
      setSkillMapLoading(false);
    }
  }

  async function handleDeleteSkillMap() {
    if (!accessToken) return;
    try {
      await deleteSkillMap(accessToken);
      setMyProfile((prev) => prev ? { ...prev, skillMap: null } : prev);
    } catch {}
  }

  async function handleBuildNetworkGraph() {
    if (!accessToken) return;
    setNetworkGraphLoading(true);
    setNetworkGraphError('');
    try {
      const report = await generateReport(accessToken, 'network_graph');
      let reportId = report.id;
      let status = report.status;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status;
        reportId = updated.id;
        polls += 1;
      }
      if (status === 'pending') { setNetworkGraphError('Анализ не завершился. Попробуйте ещё раз.'); return; }
      if (status === 'error') { setNetworkGraphError('Не удалось построить граф. Попробуйте ещё раз.'); return; }
      const fresh = await getMyProfile(accessToken);
      setMyProfile(fresh);
    } catch {
      setNetworkGraphError('Ошибка при построении графа.');
    } finally {
      setNetworkGraphLoading(false);
    }
  }

  async function handleDeleteNetworkGraph() {
    if (!accessToken) return;
    try {
      await deleteNetworkGraph(accessToken);
      setMyProfile((prev) => prev ? { ...prev, networkGraph: null } : prev);
    } catch {}
  }

  async function handleBioSave(value: string) {
    if (!accessToken) return;
    await patchMyProfile(accessToken, { bio: value });
    setMyProfile((prev) => prev ? { ...prev, bio: value } : prev);
  }

  async function handleSoftSkillsSave(value: string) {
    if (!accessToken) return;
    const skills = value.split(',').map((s) => s.trim()).filter(Boolean);
    await patchMyProfile(accessToken, { softSkills: skills });
    setMyProfile((prev) => prev ? { ...prev, softSkills: skills } : prev);
  }

  async function handleHardSkillsSave(skills: Skill[]) {
    if (!accessToken) return;
    await patchMyProfile(accessToken, { hardSkills: skills });
    setMyProfile((prev) => prev ? { ...prev, hardSkills: skills } : prev);
  }

  function handleContactChange(type: typeof FIXED_TYPES[number], value: string) {
    setContactsState((prev) => ({ ...prev, [type]: value }));
    const err = validateUrl(type, value);
    setContactsErrors((prev) => ({ ...prev, [type]: err ?? undefined }));
  }

  function handleContactFocus(type: typeof FIXED_TYPES[number]) {
    if (!contactsState[type] && type !== 'other') {
      setContactsState((prev) => ({ ...prev, [type]: DOMAIN_PREFIXES[type] ?? '' }));
    }
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 1 * 1024 * 1024) {
      alert('Размер аватарки не должен превышать 1 МБ');
      e.target.value = '';
      return;
    }
    setAvatarUploading(true);
    try {
      const { avatarUrl: newUrl } = await uploadAvatar(accessToken, file);
      setMyProfile((prev) => prev ? { ...prev, avatarUrl: newUrl } : prev);
      updateUser({ avatarUrl: newUrl });
    } catch {} finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  // async function handleAvatarDelete() {
  //   if (!accessToken) return;
  //   setAvatarUploading(true);
  //   try {
  //     await deleteAvatar(accessToken);
  //     setMyProfile((prev) => prev ? { ...prev, avatarUrl: null } : prev);
  //   } catch {} finally {
  //     setAvatarUploading(false);
  //   }
  // }

  async function handleGithubConnect() {
    if (!accessToken || !githubUsernameInput.trim()) return;
    setGithubConnecting(true);
    setGithubAccountError('');
    try {
      const account = await connectGithub(accessToken, githubUsernameInput.trim());
      setGithubAccount(account);
      setGithubUsernameInput('');
    } catch (e: unknown) {
      if (e instanceof Error) setGithubAccountError(e.message);
    } finally {
      setGithubConnecting(false);
    }
  }

  async function handleGithubSync() {
    if (!accessToken) return;
    setGithubSyncing(true);
    setGithubAccountError('');
    try {
      await syncGithubRepos(accessToken);
      const account = await getGithubAccount(accessToken);
      setGithubAccount(account);
    } catch (e: unknown) {
      if (e instanceof Error) setGithubAccountError(e.message);
    } finally {
      setGithubSyncing(false);
    }
  }

  async function handleGithubDisconnect() {
    if (!accessToken) return;
    setGithubAccountError('');
    try {
      await disconnectGithub(accessToken);
      setGithubAccount(null);
    } catch (e: unknown) {
      if (e instanceof Error) setGithubAccountError(e.message);
    }
  }
  const iconContacts = contacts.filter((c) => c.type !== 'other');
  const otherContact = contacts.find((c) => c.type === 'other');

  const ownHasCoords = !!myProfile?.coordinates;
  const ownHasSkill = !!(myProfile?.skillMap && myProfile.skillMap.length > 0);
  const ownHasNetwork = !!(myProfile?.networkGraph && myProfile.networkGraph.nodes.length > 0);
  const ownAiCount = [ownHasCoords, ownHasSkill, ownHasNetwork].filter(Boolean).length;
  const ownGridCount = isEditing ? 3 : ownAiCount;

  const otherHasCoords = !!otherProfile?.coordinates;
  const otherHasSkill = !!(otherProfile?.skillMap && otherProfile.skillMap.length > 0);
  const otherHasNetwork = !!(otherProfile?.networkGraph && otherProfile.networkGraph.nodes.length > 0);
  const otherAiCount = [otherHasCoords, otherHasSkill, otherHasNetwork].filter(Boolean).length;

  return (
    <>
      <Header />

      <div className="container page">
        <div className="profile-page">

          <div className="profile-header">

            <div
              className={`profile-avatar${isOwn && isEditing ? ' profile-avatar--editable' : ''}`}
              onClick={isOwn && isEditing ? () => avatarFileRef.current?.click() : undefined}
            >
              <Avatar avatarUrl={avatarUrl} className="avatar-image" />
              {isOwn && isEditing && (
                <div className="avatar-edit-hint">
                  {avatarUploading ? '...' : 'Изменить'}
                </div>
              )}
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />

            <div className="profile-header-info">
              <div className="profile-header__top">
                {isOwn && isEditing ? (
                  <div className="nickname-edit">
                    <input
                      className="nickname-input"
                      value={nicknameInput}
                      onChange={(e) => { setNicknameInput(e.target.value); setNicknameError(''); }}
                      placeholder="Никнейм"
                      maxLength={30}
                    />
                    {nicknameError && <p className="error-text text">{nicknameError}</p>}
                  </div>
                ) : (
                  <h1 className="profile-username">{nickname}</h1>
                )}
                {profile?.activityField && (
                  <div className="profile-class">
                    <img src={starIcon} alt="Star Icon" className="star-icon" />
                    <p className="profile-class__text">{profile.activityField}</p>
                  </div>
                )}
                {isOwn && isEditing && (
                  <>
                    <button
                      className="button-light text"
                      onClick={handleClassify}
                      disabled={classifying}
                    >
                      {classifying ? 'Анализ...' : profile?.activityField ? 'Переопределить' : 'Определить класс'}
                    </button>
                    {classifyError && <p className="error-text text">{classifyError}</p>}
                  </>
                )}
              </div>

              <div className="profile-layer-two">
                <div className="profile-header__metrics">
                  {isOwn ? (
                    <>
                      <ProfileMetrics type="subs" number={myProfile?.followersCount ?? 0} />
                      <ProfileMetrics type="subsrciptions" number={myProfile?.followingCount ?? 0} />
                      <ProfileMetrics type="favourites" number={myProfile?.favoritesCount ?? 0} />
                    </>
                  ) : (
                    <>
                      {otherProfile?.followersCount != null && (
                        <ProfileMetrics type="subs" number={otherProfile.followersCount} clickable={false} />
                      )}
                      {otherProfile?.followingCount != null && (
                        <ProfileMetrics type="subsrciptions" number={otherProfile.followingCount} clickable={false} />
                      )}
                      {otherProfile?.favoritesCount != null && (
                        <ProfileMetrics type="favourites" number={otherProfile.favoritesCount} clickable={false} />
                      )}
                    </>
                  )}
                </div>

                <div className="edit-buttons">
                  {isOwn ? (
                    <>
                      <button className="button text fc" onClick={handleEdit}>
                        {isEditing ? 'Сохранить' : 'Редактировать'}
                      </button>
                      {isEditing ? (
                        <button className="button-light text fc" onClick={() => setIsEditing(false)}>Назад</button>
                      ) : (
                        <button className="button-light text fc" onClick={signOut}>Выйти</button>
                      )}
                    </>
                  ) : (
                    <button
                      className={following ? 'button-light text fc' : 'button text fc'}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {following ? 'Отписаться' : 'Подписаться'}
                    </button>
                  )}
                </div>
              </div>

              {isOwn && isEditing ? (
                <div className="contacts-editor">
                  {FIXED_TYPES.map((type) => (
                    <div key={type} className="contact-field">
                      <label className="contact-field__label text bold">
                        {CONTACT_LABEL[type]}
                      </label>
                      <input
                        type="url"
                        className={`contact-url-input text${contactsErrors[type] ? ' contact-url-input--error' : ''}`}
                        value={contactsState[type]}
                        placeholder={PLACEHOLDERS[type]}
                        onFocus={() => handleContactFocus(type)}
                        onChange={(e) => handleContactChange(type, e.target.value)}
                      />
                      {contactsErrors[type] && (
                        <span className="error-text text">{contactsErrors[type]}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                (iconContacts.length > 0 || otherContact) && (
                  <div className="profile-header__contacts">
                    {iconContacts.length > 0 && (
                      <div className="contact-icons-row">
                        {iconContacts.map((c) => (
                          <ContactProfile key={c.id} type={c.type} url={c.url} />
                        ))}
                      </div>
                    )}
                    {otherContact && (
                      <ContactProfile type="other" url={otherContact.url} />
                    )}
                  </div>
                )
              )}
            </div>

          </div>

          <div className="profile-content">
            {isOwn ? (
              <>
                {(myProfile !== null || user?.profile != null) && (
                  <TextField
                    title="Обо мне"
                    text={(myProfile?.bio ?? user?.profile?.bio ?? '') || 'Расскажите о себе'}
                    editable={isEditing}
                    onSave={handleBioSave}
                  />
                )}
                <div className="textField">
                  <div className="textField-header">
                    <h2 className="profile-h2">Графики</h2>
                    <div className="textField-actions">
                      <button
                        className={`textField-button ${chartsOpen ? 'open' : ''}`}
                        onClick={() => setChartsOpen((o) => !o)}
                      >▼</button>
                    </div>
                  </div>
                  {chartsOpen && (
                    <div className={`profile-charts-grid profile-charts-grid--${ownGridCount}`}>
                      {(isEditing || ownHasNetwork) && (
                        <div className="profile-chart-cell">
                          {ownHasNetwork && <NetworkGraphChart data={myProfile!.networkGraph!} />}
                          {isEditing && (
                            <div className="coordinates-actions">
                              <button className="button-light text" onClick={handleBuildNetworkGraph} disabled={networkGraphLoading}>
                                {networkGraphLoading ? 'Анализ...' : ownHasNetwork ? 'Перегенерировать граф' : 'Построить граф технологий'}
                              </button>
                              {ownHasNetwork && <button className="button-light text" onClick={handleDeleteNetworkGraph}>Удалить граф</button>}
                              {networkGraphError && <p className="error-text text">{networkGraphError}</p>}
                            </div>
                          )}
                        </div>
                      )}
                      {(isEditing || ownHasSkill) && (
                        <div className="profile-chart-cell">
                          {ownHasSkill && <SkillMapChart skills={myProfile!.skillMap!} />}
                          {isEditing && (
                            <div className="coordinates-actions">
                              <button className="button-light text" onClick={handleBuildSkillMap} disabled={skillMapLoading}>
                                {skillMapLoading ? 'Анализ...' : ownHasSkill ? 'Перегенерировать карту' : 'Построить карту навыков'}
                              </button>
                              {ownHasSkill && <button className="button-light text" onClick={handleDeleteSkillMap}>Удалить карту</button>}
                              {skillMapError && <p className="error-text text">{skillMapError}</p>}
                            </div>
                          )}
                        </div>
                      )}
                      {(isEditing || ownHasCoords) && (
                        <div className="profile-chart-cell">
                          {ownHasCoords && <CoordinatesChart x={myProfile!.coordinates!.x} y={myProfile!.coordinates!.y} />}
                          {isEditing && (
                            <div className="coordinates-actions">
                              <button className="button-light text" onClick={handleBuildCoordinates} disabled={coordinatesLoading}>
                                {coordinatesLoading ? 'Анализ...' : ownHasCoords ? 'Перегенерировать' : 'Построить график'}
                              </button>
                              {ownHasCoords && <button className="button-light text" onClick={handleDeleteCoordinates}>Удалить график</button>}
                              {coordinatesError && <p className="error-text text">{coordinatesError}</p>}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="profile-chart-cell profile-chart-cell--activity">
                        <ActivityChart projects={myProfile?.projects ?? []} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="textField">
                  <div className="textField-header">
                    <h2 className="profile-h2">Проекты</h2>
                    <div className="textField-actions">
                      <button
                        className={`textField-button ${projectsOpen ? 'open' : ''}`}
                        onClick={() => setProjectsOpen((o) => !o)}
                      >▼</button>
                    </div>
                  </div>
                  {projectsOpen && (
                    <div className="profile-content__projects-container">
                      {(myProfile?.projects ?? []).map((p, i) => (
                        <ProjectPreview
                          key={p.id}
                          title={p.title}
                          description={p.description ?? ''}
                          author={nickname}
                          color={CARD_COLORS[i % CARD_COLORS.length]}
                          link={`/projects/${p.id}`}
                        />
                      ))}
                      <button
                        className="button-light text"
                        onClick={handleCreateProject}
                        disabled={creatingProject}
                      >
                        {creatingProject ? 'Создание...' : '+ Добавить новый проект'}
                      </button>
                    </div>
                  )}
                </div>
                <TextField
                  title="Soft Skills"
                  text={softSkillsText || 'Расскажите о своих мягких навыках'}
                  editable={isEditing}
                  onSave={handleSoftSkillsSave}
                />
                <HardSkillsEditor
                  skills={myProfile?.hardSkills ?? []}
                  editable={isEditing}
                  onSave={handleHardSkillsSave}
                />

                <div className="github-integration">
                  <h2 className="github-integration__title text bold">GitHub-аккаунт</h2>
                  <p className="text github-integration__hint">
                    Подключите аккаунт, чтобы импортировать репозитории в проекты
                  </p>
                  {githubAccountLoading ? (
                    <p className="text">Загрузка...</p>
                  ) : githubAccount ? (
                    <div className="github-connected">
                      <p className="text">
                        Подключён: <span className="bold">{githubAccount.githubUsername}</span>
                        {' · '}{githubAccount.repos.length} репозиториев
                      </p>
                      {githubAccountError && <p className="error-text text">{githubAccountError}</p>}
                      <div className="github-connected__actions">
                        <button
                          className="button-light text"
                          onClick={handleGithubSync}
                          disabled={githubSyncing}
                        >
                          {githubSyncing ? 'Синхронизация...' : 'Синхронизировать'}
                        </button>
                        <button className="button-light text" onClick={handleGithubDisconnect}>
                          Отключить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="github-connect-form">
                      {githubAccountError && <p className="error-text text">{githubAccountError}</p>}
                      <div className="github-connect-form__row">
                        <input
                          className="project-input text github-username-input"
                          value={githubUsernameInput}
                          onChange={(e) => setGithubUsernameInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleGithubConnect()}
                          placeholder="GitHub username"
                        />
                        <button
                          className="button text"
                          onClick={handleGithubConnect}
                          disabled={githubConnecting || !githubUsernameInput.trim()}
                        >
                          {githubConnecting ? 'Подключение...' : 'Подключить'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {otherProfile?.bio && <TextField title="Обо мне" text={otherProfile.bio} />}
                <div className="textField">
                  <div className="textField-header">
                    <h2 className="profile-h2">Графики</h2>
                    <div className="textField-actions">
                      <button
                        className={`textField-button ${chartsOpen ? 'open' : ''}`}
                        onClick={() => setChartsOpen((o) => !o)}
                      >▼</button>
                    </div>
                  </div>
                  {chartsOpen && (
                    <div className={`profile-charts-grid profile-charts-grid--${otherAiCount}`}>
                      {otherHasNetwork && (
                        <div className="profile-chart-cell">
                          <NetworkGraphChart data={otherProfile!.networkGraph!} />
                        </div>
                      )}
                      {otherHasSkill && (
                        <div className="profile-chart-cell">
                          <SkillMapChart skills={otherProfile!.skillMap!} />
                        </div>
                      )}
                      {otherHasCoords && (
                        <div className="profile-chart-cell">
                          <CoordinatesChart x={otherProfile!.coordinates!.x} y={otherProfile!.coordinates!.y} />
                        </div>
                      )}
                      <div className="profile-chart-cell profile-chart-cell--activity">
                        <ActivityChart projects={otherProfile?.publicProjects ?? []} />
                      </div>
                    </div>
                  )}
                </div>
                {(otherProfile?.publicProjects ?? []).length > 0 && (
                  <div className="textField">
                    <div className="textField-header">
                      <h2 className="profile-h2">Проекты</h2>
                      <div className="textField-actions">
                        <button
                          className={`textField-button ${projectsOpen ? 'open' : ''}`}
                          onClick={() => setProjectsOpen((o) => !o)}
                        >▼</button>
                      </div>
                    </div>
                    {projectsOpen && (
                      <div className="profile-content__projects-container">
                        {(otherProfile?.publicProjects ?? []).map((p, i) => (
                          <ProjectPreview
                            key={p.id}
                            title={p.title}
                            description={p.description ?? ''}
                            author={otherProfile?.nickname ?? ''}
                            color={CARD_COLORS[i % CARD_COLORS.length]}
                            link={`/projects/${p.id}`}
                            isFavorited={favoritedIds.has(p.id)}
                            onToggleFavorite={accessToken ? (e) => handleToggleFavorite(e, p.id) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {softSkillsText && <TextField title="Soft Skills" text={softSkillsText} />}
                <HardSkillsEditor skills={otherProfile?.hardSkills ?? []} />
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default ProfilePage;
