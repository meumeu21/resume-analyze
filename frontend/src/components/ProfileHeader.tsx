import React from 'react';
import Avatar from './Avatar';
import ContactProfile from './ContactProfile';
import ProfileMetrics from './ProfileMetrics';
import type { MyProfileResponse, UserProfileResponse } from '../api/users';
import type { ContactLink } from '../api/auth';
import starIcon from '../images/icons/ai-star.svg';

export const CONTACT_LABEL: Record<string, string> = {
  github: 'GitHub', telegram: 'Telegram', linkedin: 'LinkedIn', website: 'Сайт', other: 'Другое',
};

export const DOMAIN_PREFIXES: Record<string, string> = {
  github: 'https://github.com/', telegram: 'https://t.me/',
  linkedin: 'https://linkedin.com/in/', website: 'https://',
};

export const PLACEHOLDERS: Record<string, string> = {
  github: 'https://github.com/username', telegram: 'https://t.me/username',
  linkedin: 'https://linkedin.com/in/username', website: 'https://example.com', other: 'https://example.com',
};

export const DOMAIN_CHECKS: Record<string, string> = {
  github: 'github.com', telegram: 't.me', linkedin: 'linkedin.com/in',
};

export const FIXED_TYPES = ['github', 'telegram', 'linkedin', 'website', 'other'] as const;

export type ContactsState = Record<typeof FIXED_TYPES[number], string>;
export type ContactsErrors = Partial<Record<typeof FIXED_TYPES[number], string>>;

export function validateUrl(type: string, url: string): string | null {
  if (!url) return null;
  try { new URL(url); } catch { return 'Некорректная ссылка'; }
  const domain = DOMAIN_CHECKS[type];
  if (domain && !url.includes(domain)) return `Ссылка должна вести на ${domain}`;
  return null;
}

export function contactsToState(contacts: ContactLink[]): ContactsState {
  const state: ContactsState = { github: '', telegram: '', linkedin: '', website: '', other: '' };
  for (const c of contacts) {
    if (c.type in state) state[c.type as keyof ContactsState] = c.url;
  }
  return state;
}

interface ProfileHeaderProps {
  isOwn: boolean;
  isEditing: boolean;
  avatarUrl: string | null;
  nickname: string;
  myProfile: MyProfileResponse | null;
  otherProfile: UserProfileResponse | null;
  following: boolean;
  followLoading: boolean;
  nicknameInput: string;
  nicknameError: string;
  contactsState: ContactsState;
  contactsErrors: ContactsErrors;
  avatarUploading: boolean;
  classifying: boolean;
  classifyError: string;
  contacts: ContactLink[];
  avatarFileRef: React.RefObject<HTMLInputElement | null>;
  onAvatarClick: () => void;
  onAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNicknameChange: (value: string) => void;
  onEdit: () => void;
  onBackFromEdit: () => void;
  onSignOut: () => void;
  onFollow: () => void;
  onClassify: () => void;
  onContactChange: (type: typeof FIXED_TYPES[number], value: string) => void;
  onContactFocus: (type: typeof FIXED_TYPES[number]) => void;
}

function ProfileHeader({
  isOwn, isEditing,
  avatarUrl, nickname,
  myProfile, otherProfile,
  following, followLoading,
  nicknameInput, nicknameError,
  contactsState, contactsErrors,
  avatarUploading, classifying, classifyError,
  contacts, avatarFileRef,
  onAvatarClick, onAvatarFileChange, onNicknameChange,
  onEdit, onBackFromEdit, onSignOut, onFollow,
  onClassify, onContactChange, onContactFocus,
}: ProfileHeaderProps) {
  const activityField = isOwn ? myProfile?.activityField : otherProfile?.activityField;
  const iconContacts = contacts.filter((c) => c.type !== 'other');
  const otherContact = contacts.find((c) => c.type === 'other');

  return (
    <div className="profile-header">
      <div
        className={`profile-avatar${isOwn && isEditing ? ' profile-avatar--editable' : ''}`}
        onClick={isOwn && isEditing ? onAvatarClick : undefined}
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
        onChange={onAvatarFileChange}
      />

      <div className="profile-header-info">
        <div className="profile-header__top">
          {isOwn && isEditing ? (
            <div className="nickname-edit">
              <input
                className="nickname-input"
                value={nicknameInput}
                onChange={(e) => { onNicknameChange(e.target.value); }}
                placeholder="Никнейм"
                maxLength={30}
              />
              {nicknameError && <p className="error-text text">{nicknameError}</p>}
            </div>
          ) : (
            <h1 className="profile-username">{nickname}</h1>
          )}
          {activityField && (
            <div className="profile-class">
              <img src={starIcon} alt="Star Icon" className="star-icon" />
              <p className="profile-class__text">{activityField}</p>
            </div>
          )}
          {isOwn && isEditing && (
            <>
              <button className="button-light text" onClick={onClassify} disabled={classifying}>
                {classifying ? 'Анализ...' : activityField ? 'Переопределить' : 'Определить класс'}
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
                <button className="button text fc" onClick={onEdit}>
                  {isEditing ? 'Сохранить' : 'Редактировать'}
                </button>
                {isEditing ? (
                  <button className="button-light text fc" onClick={onBackFromEdit}>Назад</button>
                ) : (
                  <button className="button-light text fc" onClick={onSignOut}>Выйти</button>
                )}
              </>
            ) : (
              <button
                className={following ? 'button-light text fc' : 'button text fc'}
                onClick={onFollow}
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
                <label className="contact-field__label text bold">{CONTACT_LABEL[type]}</label>
                <input
                  type="url"
                  className={`contact-url-input text${contactsErrors[type] ? ' contact-url-input--error' : ''}`}
                  value={contactsState[type]}
                  placeholder={PLACEHOLDERS[type]}
                  onFocus={() => onContactFocus(type)}
                  onChange={(e) => onContactChange(type, e.target.value)}
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
              {otherContact && <ContactProfile type="other" url={otherContact.url} />}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default ProfileHeader;
