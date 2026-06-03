import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import "../css/main.css";
import TextField from "../components/TextField";
import HardSkillsEditor from "../components/HardSkillsEditor";
import type { Skill } from "../components/HardSkillsEditor";
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
import { getGithubAccount, connectGithub, syncGithubRepos, disconnectGithub } from "../api/github";
import type { GithubAccountData } from "../api/github";
import { generateReport, getReport } from "../api/ai";
import Footer from "../components/Footer";
import ProfileHeader, {
  FIXED_TYPES, validateUrl, contactsToState,
} from "../components/ProfileHeader";
import type { ContactsState, ContactsErrors } from "../components/ProfileHeader";
import ProfileChartsSection from "../components/ProfileChartsSection";
import GithubIntegration from "../components/GithubIntegration";

const CARD_COLORS = ['#FFF', '#ECEBFF', '#FAE2FF', '#BEEBFF', '#FFE6BD'];

function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut, accessToken, isLoading, updateUser } = useAuth();
  const navigate = useNavigate();

  const isOwn = id === 'me';

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
    if (isOwn && !isLoading && !accessToken) navigate('/login', { replace: true });
  }, [isOwn, isLoading, accessToken, navigate]);

  useEffect(() => {
    if (!isOwn && user?.id && id === user.id) navigate('/users/me', { replace: true });
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
      try {
        await unfollowUser(id, accessToken);
      } catch {
        setFollowing(true);
        setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p);
      }
    } else {
      setFollowing(true);
      setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p);
      try {
        await followUser(id, accessToken);
      } catch {
        setFollowing(false);
        setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 1) - 1 } : p);
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
    if (Object.keys(errors).length > 0) { setContactsErrors(errors); return; }

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
    } catch {} finally { setCreatingProject(false); }
  }

  async function handleToggleFavorite(e: React.MouseEvent, projectId: string) {
    e.preventDefault();
    if (!accessToken) return;
    const isFav = favoritedIds.has(projectId);
    if (isFav) {
      setFavoritedIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
      setMyProfile((p) => p ? { ...p, favoritesCount: Math.max(0, (p.favoritesCount ?? 1) - 1) } : p);
      try { await removeFavorite(projectId, accessToken); } catch {
        setFavoritedIds((prev) => new Set(prev).add(projectId));
        setMyProfile((p) => p ? { ...p, favoritesCount: (p.favoritesCount ?? 0) + 1 } : p);
      }
    } else {
      setFavoritedIds((prev) => new Set(prev).add(projectId));
      setMyProfile((p) => p ? { ...p, favoritesCount: (p.favoritesCount ?? 0) + 1 } : p);
      try { await addFavorite(projectId, accessToken); } catch {
        setFavoritedIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
        setMyProfile((p) => p ? { ...p, favoritesCount: Math.max(0, (p.favoritesCount ?? 1) - 1) } : p);
      }
    }
  }

  async function handleClassify() {
    if (!accessToken) return;
    setClassifying(true); setClassifyError('');
    try {
      const report = await generateReport(accessToken, 'activity_field');
      let { id: reportId, status } = report;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status; reportId = updated.id; polls += 1;
      }
      if (status === 'pending') { setClassifyError('Определение класса не завершилось. Попробуйте ещё раз.'); return; }
      if (status === 'error') { setClassifyError('Не удалось определить класс. Попробуйте ещё раз.'); return; }
      setMyProfile(await getMyProfile(accessToken));
    } catch { setClassifyError('Ошибка при определении класса.'); }
    finally { setClassifying(false); }
  }

  async function handleBuildCoordinates() {
    if (!accessToken) return;
    setCoordinatesLoading(true); setCoordinatesError('');
    try {
      const report = await generateReport(accessToken, 'coordinates');
      let { id: reportId, status } = report;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status; reportId = updated.id; polls += 1;
      }
      if (status === 'pending') { setCoordinatesError('Анализ не завершился. Попробуйте ещё раз.'); return; }
      if (status === 'error') { setCoordinatesError('Не удалось построить график. Попробуйте ещё раз.'); return; }
      setMyProfile(await getMyProfile(accessToken));
    } catch { setCoordinatesError('Ошибка при построении графика.'); }
    finally { setCoordinatesLoading(false); }
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
    setSkillMapLoading(true); setSkillMapError('');
    try {
      const report = await generateReport(accessToken, 'skill_map');
      let { id: reportId, status } = report;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status; reportId = updated.id; polls += 1;
      }
      if (status === 'pending') { setSkillMapError('Анализ не завершился. Попробуйте ещё раз.'); return; }
      if (status === 'error') { setSkillMapError('Не удалось построить карту. Попробуйте ещё раз.'); return; }
      setMyProfile(await getMyProfile(accessToken));
    } catch { setSkillMapError('Ошибка при построении карты навыков.'); }
    finally { setSkillMapLoading(false); }
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
    setNetworkGraphLoading(true); setNetworkGraphError('');
    try {
      const report = await generateReport(accessToken, 'network_graph');
      let { id: reportId, status } = report;
      let polls = 0;
      while (status === 'pending' && polls < 70) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await getReport(accessToken, reportId);
        status = updated.status; reportId = updated.id; polls += 1;
      }
      if (status === 'pending') { setNetworkGraphError('Анализ не завершился. Попробуйте ещё раз.'); return; }
      if (status === 'error') { setNetworkGraphError('Не удалось построить граф. Попробуйте ещё раз.'); return; }
      setMyProfile(await getMyProfile(accessToken));
    } catch { setNetworkGraphError('Ошибка при построении графа.'); }
    finally { setNetworkGraphLoading(false); }
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
      const prefixes: Record<string, string> = {
        github: 'https://github.com/', telegram: 'https://t.me/',
        linkedin: 'https://linkedin.com/in/', website: 'https://',
      };
      setContactsState((prev) => ({ ...prev, [type]: prefixes[type] ?? '' }));
    }
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 1 * 1024 * 1024) { alert('Размер аватарки не должен превышать 1 МБ'); e.target.value = ''; return; }
    setAvatarUploading(true);
    try {
      const { avatarUrl: newUrl } = await uploadAvatar(accessToken, file);
      setMyProfile((prev) => prev ? { ...prev, avatarUrl: newUrl } : prev);
      updateUser({ avatarUrl: newUrl });
    } catch {} finally { setAvatarUploading(false); e.target.value = ''; }
  }

  async function handleGithubConnect() {
    if (!accessToken || !githubUsernameInput.trim()) return;
    setGithubConnecting(true); setGithubAccountError('');
    try {
      const account = await connectGithub(accessToken, githubUsernameInput.trim());
      setGithubAccount(account); setGithubUsernameInput('');
    } catch (e: unknown) {
      if (e instanceof Error) setGithubAccountError(e.message);
    } finally { setGithubConnecting(false); }
  }

  async function handleGithubSync() {
    if (!accessToken) return;
    setGithubSyncing(true); setGithubAccountError('');
    try {
      await syncGithubRepos(accessToken);
      setGithubAccount(await getGithubAccount(accessToken));
    } catch (e: unknown) {
      if (e instanceof Error) setGithubAccountError(e.message);
    } finally { setGithubSyncing(false); }
  }

  async function handleGithubDisconnect() {
    if (!accessToken) return;
    setGithubAccountError('');
    try { await disconnectGithub(accessToken); setGithubAccount(null); }
    catch (e: unknown) { if (e instanceof Error) setGithubAccountError(e.message); }
  }

  return (
    <>
      <Header />
      <div className="container page">
        <div className="profile-page">

          <ProfileHeader
            isOwn={isOwn}
            isEditing={isEditing}
            avatarUrl={avatarUrl}
            nickname={nickname}
            myProfile={myProfile}
            otherProfile={otherProfile}
            following={following}
            followLoading={followLoading}
            nicknameInput={nicknameInput}
            nicknameError={nicknameError}
            contactsState={contactsState}
            contactsErrors={contactsErrors}
            avatarUploading={avatarUploading}
            classifying={classifying}
            classifyError={classifyError}
            contacts={contacts}
            avatarFileRef={avatarFileRef}
            onAvatarClick={() => avatarFileRef.current?.click()}
            onAvatarFileChange={handleAvatarFileChange}
            onNicknameChange={(v) => { setNicknameInput(v); setNicknameError(''); }}
            onEdit={handleEdit}
            onBackFromEdit={() => setIsEditing(false)}
            onSignOut={signOut}
            onFollow={handleFollow}
            onClassify={handleClassify}
            onContactChange={handleContactChange}
            onContactFocus={handleContactFocus}
          />

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

                <ProfileChartsSection
                  isOwn={true}
                  isEditing={isEditing}
                  open={chartsOpen}
                  onToggle={() => setChartsOpen((o) => !o)}
                  myProfile={myProfile}
                  otherProfile={null}
                  networkGraphLoading={networkGraphLoading}
                  networkGraphError={networkGraphError}
                  skillMapLoading={skillMapLoading}
                  skillMapError={skillMapError}
                  coordinatesLoading={coordinatesLoading}
                  coordinatesError={coordinatesError}
                  onBuildNetworkGraph={handleBuildNetworkGraph}
                  onDeleteNetworkGraph={handleDeleteNetworkGraph}
                  onBuildSkillMap={handleBuildSkillMap}
                  onDeleteSkillMap={handleDeleteSkillMap}
                  onBuildCoordinates={handleBuildCoordinates}
                  onDeleteCoordinates={handleDeleteCoordinates}
                />

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
                      <button className="button-light text" onClick={handleCreateProject} disabled={creatingProject}>
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

                <GithubIntegration
                  loading={githubAccountLoading}
                  account={githubAccount}
                  error={githubAccountError}
                  usernameInput={githubUsernameInput}
                  connecting={githubConnecting}
                  syncing={githubSyncing}
                  onUsernameChange={setGithubUsernameInput}
                  onConnect={handleGithubConnect}
                  onSync={handleGithubSync}
                  onDisconnect={handleGithubDisconnect}
                />
              </>
            ) : (
              <>
                {otherProfile?.bio && <TextField title="Обо мне" text={otherProfile.bio} />}

                <ProfileChartsSection
                  isOwn={false}
                  isEditing={false}
                  open={chartsOpen}
                  onToggle={() => setChartsOpen((o) => !o)}
                  myProfile={null}
                  otherProfile={otherProfile}
                  networkGraphLoading={false}
                  networkGraphError=""
                  skillMapLoading={false}
                  skillMapError=""
                  coordinatesLoading={false}
                  coordinatesError=""
                  onBuildNetworkGraph={() => {}}
                  onDeleteNetworkGraph={() => {}}
                  onBuildSkillMap={() => {}}
                  onDeleteSkillMap={() => {}}
                  onBuildCoordinates={() => {}}
                  onDeleteCoordinates={() => {}}
                />

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
