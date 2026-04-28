import "./ProfilePage.css";
import "../css/main.css"
import TextField from "../components/TextField";
import ContactProfile from "../components/ContactProfile";

import avatar from "../images/avatar-profile.jpg";

function ProfilePage() {
  return (
    <div className="container">
      <div className="profile-page">
        <div className="prohile-header">
          <div className="profile-avatar">
            <img src={avatar} alt="Avatar" className="avatar-image" />
          </div>
          <div className="profile-header-info">
            <h1 className="profile-username">Профиль пользователя</h1>
            <div></div>
            <div className="profile-header__contacts">
              <ContactProfile type="Telegram" link="https://t.me/ewiwiwii" id="@ewiwiwii" />
              <ContactProfile type="Instagram" link="https://t.me/ewiwiwii" id="@ewiwiwii" />
              <ContactProfile type="LinkedIn" link="https://t.me/ewiwiwii" id="@ewiwiwii" />
            </div>
          </div>
        </div>
        

        <TextField title="Обо мне" text="Я няшка вкусняшка! Я хочу додобоны очень сильно и кофе из кофейни и домой пойти лежать ничего не делать и быть кайфулей" />
      </div>
    </div>
  );
}

export default ProfilePage;