import "../css/ProfilePage.css";
import "../css/main.css"
import TextField from "../components/TextField";
import ContactProfile from "../components/ContactProfile";
import ProfileMetrics from "../components/ProfileMetrics";
import Header from "../components/Header";

import avatar from "../images/avatar-profile.jpg";
import starIcon from "../images/icons/ai-star.svg";

function ProfilePage() {
  return ( 
    <body>
      <Header username="ewiwiwii" />
    
      <div className="container">
        <div className="profile-page">
          <div className="profile-header">
            <div className="profile-avatar">
              <img src={avatar} alt="Avatar" className="avatar-image" />
            </div>
            <div className="profile-header-info">
              <div className="profile-header__top">
                <h1 className="profile-username">Профиль пользователя</h1>
                <div className="profile-class">
                  <img src={starIcon} alt="Star Icon" className="star-icon" />
                  <p className="profile-class__text">Data engeneer</p>
                </div>
              </div>
              <div className="profile-layer-two">
                <div className="profile-header__metrics">
                  <ProfileMetrics type="subs" number={120} />
                  <ProfileMetrics type="subsrciptions" number={80} />
                  <ProfileMetrics type="favourites" number={50} />
                </div>
                <div className="edit-buttons">
                  <button className="button text fc">Редактировать</button>
                  <button className="button-light text fc">Выйти</button>
                </div>
              </div>
              
              <div className="profile-header__contacts">
                <ContactProfile type="Telegram" link="https://t.me/ewiwiwii" id="@ewiwiwii" />
                <ContactProfile type="Instagram" link="https://t.me/ewiwiwii" id="@ewiwiwii" />
                <ContactProfile type="LinkedIn" link="https://t.me/ewiwiwii" id="@ewiwiwii" />
              </div>
              <button className="button text">Подписаться</button>
            </div>
          </div>

          <div className="profile-content">
            <TextField title="Обо мне" text="Я няшка вкусняшка! Я хочу додобоны очень сильно и кофе из кофейни и домой пойти лежать ничего не делать и быть кайфулей" />
            <TextField title="Soft Skills" text="Я няшка вкусняшка! Я хочу додобоны очень сильно и кофе из кофейни и домой пойти лежать ничего не делать и быть кайфулей" />
            <TextField title="Hard Skills" text="Я няшка вкусняшка! Я хочу додобоны очень сильно и кофе из кофейни и домой пойти лежать ничего не делать и быть кайфулей" />
          </div>
        </div>
      </div>
    </body>
  );
}

export default ProfilePage;