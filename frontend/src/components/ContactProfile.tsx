import githubIcon from '../images/icons/github.svg';
import telegramIcon from '../images/icons/telegram.svg';
import linkedinIcon from '../images/icons/linkedin.svg';
import websiteIcon from '../images/icons/website.svg';
import '../css/ProfilePage.css';

const ICONS: Record<string, string> = {
  github: githubIcon,
  telegram: telegramIcon,
  linkedin: linkedinIcon,
  website: websiteIcon,
};

type Props = {
  type: string;
  url: string;
};

function ContactProfile({ type, url }: Props) {
  if (type === 'other') {
    const display = url.length > 38 ? url.slice(0, 35) + '…' : url;
    return (
      <div className="contact-other">
        <span className="contact-other__label text bold">Другое:</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="contact-other__link text"
          title={url}
        >
          {display}
        </a>
      </div>
    );
  }

  const icon = ICONS[type];
  if (!icon) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`contact-icon contact-icon--${type}`}
      title={type}
    >
      <img src={icon} alt={type} className="contact-icon__img" />
    </a>
  );
}

export default ContactProfile;
