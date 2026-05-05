import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import "../css/main.css";
import TextField from "../components/TextField";
import ContactProfile from "../components/ContactProfile";
import ProfileMetrics from "../components/ProfileMetrics";
import Header from "../components/Header";
import ProjectPreview from "../components/ProjectPreview";
import { useAuth } from "../context/AuthContext";
import { getMyProfile, getUserProfile, followUser, unfollowUser } from "../api/users";
import type { MyProfileResponse, UserProfileResponse } from "../api/users";
import type { ContactLink } from "../api/auth";

import avatar from "../images/avatar-profile.jpg";
import starIcon from "../images/icons/ai-star.svg";
import Footer from "../components/Footer";

function contactHandle(type: string, url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\//, '').split('/').filter(Boolean).pop() ?? '';
    if (type === 'telegram' || type === 'github') return `@${path}`;
    return path || url;
  } catch {
    return url;
  }
}

const CONTACT_LABEL: Record<string, string> = {
  github: 'GitHub',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  website: 'Сайт',
  other: 'Контакт',
};


function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut, accessToken } = useAuth();
  const navigate = useNavigate();

  const isOwn = id === 'me';

  const [myProfile, setMyProfile] = useState<MyProfileResponse | null>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfileResponse | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!isOwn && user?.id && id === user.id) {
      navigate('/users/me', { replace: true });
    }
  }, [id, user?.id, isOwn, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    if (isOwn) {
      getMyProfile(accessToken).then(setMyProfile).catch(() => {});
    } else if (id) {
      getUserProfile(id, accessToken).then((p) => {
        setOtherProfile(p);
        setFollowing(p.isFollowing);
      }).catch(() => {});
    }
  }, [id, accessToken, isOwn]);

  const profile = isOwn ? myProfile : otherProfile;
  const nickname = profile?.nickname ?? (isOwn ? user?.profile?.nickname : undefined) ?? 'Пользователь';
  const avatarSrc = profile?.avatarUrl ?? (isOwn ? user?.profile?.avatarUrl : undefined) ?? avatar;
  const contacts: ContactLink[] = (profile?.contacts ?? []) as ContactLink[];
  const softSkillsText = profile?.softSkills?.length ? profile.softSkills.join(', ') : null;
  const hardSkillsText = profile?.hardSkills?.length
    ? profile.hardSkills.map((s) => s.name).join(', ')
    : null;

  async function handleFollow() {
    if (!accessToken || !id) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(id, accessToken);
        setFollowing(false);
        setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 1) - 1 } : p);
      } else {
        await followUser(id, accessToken);
        setFollowing(true);
        setOtherProfile((p) => p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p);
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }


  return (
    <>
      <Header username={nickname} />

      <div className="container">
        <div className="profile-page">

          <div className="profile-header">

            <div className="profile-avatar">
              <img src={avatarSrc} alt="Avatar" className="avatar-image" />
            </div>

            <div className="profile-header-info">
              <div className="profile-header__top">
                <h1 className="profile-username">{nickname}</h1>
                {profile?.activityField && (
                  <div className="profile-class">
                    <img src={starIcon} alt="Star Icon" className="star-icon" />
                    <p className="profile-class__text">{profile.activityField}</p>
                  </div>
                )}
              </div>

              <div className="profile-layer-two">

                {/* подписчики, подписки и избранное. у другого пользователя показываются только подписчики (пока что) */}
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
                        <ProfileMetrics type="subs" number={otherProfile.followersCount} />
                      )}
                      {otherProfile?.followingCount != null && (
                        <ProfileMetrics type="subsrciptions" number={otherProfile.followingCount} />
                      )}
                      {otherProfile?.favoritesCount != null && (
                        <ProfileMetrics type="favourites" number={otherProfile.favoritesCount} />
                      )}
                    </>
                  )}
                </div>

                <div className="edit-buttons">
                  {isOwn ? (
                    <>
                      <button className="button text fc">Редактировать</button>
                      <button className="button-light text fc" onClick={signOut}>Выйти</button>
                    </>
                  ) : (
                    <button
                      className={following ? 'button-light text fc' : 'button text fc'}
                      onClick={handleFollow}
                      disabled={followLoading || !accessToken}
                    >
                      {following ? 'Отписаться' : 'Подписаться'}
                    </button>
                  )}
                </div>

              </div>

              {contacts.length > 0 && (
                <div className="profile-header__contacts">
                  {contacts.map((c) => (
                    <ContactProfile
                      key={c.id}
                      type={CONTACT_LABEL[c.type] ?? c.type}
                      link={c.url}
                      id={contactHandle(c.type, c.url)}
                    />
                  ))}
                </div>
              )}
            </div>
            
          </div>
          
          {/* делится на isOwn (свой профиль) и профиль другого пользователя */}
          <div className="profile-content">
            {isOwn ? (
              <>
                {(myProfile !== null || user?.profile != null) && (
                  <TextField title="Обо мне" text={(myProfile?.bio ?? user?.profile?.bio ?? '') || 'Расскажите о себе'} />
                )}
                <div className="profile-content__projects-container">
                  <ProjectPreview title="Проект 1" description="Описание проекта 1" author={nickname} color="#FFF" link="/project" />
                  <ProjectPreview title="Проект 1" description="Описание проекта 1" author={nickname} color="#ECEBFF" link="/project" />
                </div>
                {softSkillsText !== undefined && (
                  <TextField title="Soft Skills" text={softSkillsText || 'Расскажите о своих софт-скиллах'} />
                )}
                {hardSkillsText !== undefined && (
                  <TextField title="Hard Skills" text={hardSkillsText || 'Расскажите о своих хард-скиллах'} />
                )}
              </>
            ) : (
              <>
                {otherProfile?.bio && <TextField title="Обо мне" text={otherProfile.bio} />}
                {softSkillsText && <TextField title="Soft Skills" text={softSkillsText} />}
                {hardSkillsText && <TextField title="Hard Skills" text={hardSkillsText} />}
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
