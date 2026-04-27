import "./ProfilePage.css";
import TextField from "../components/TextField";

function ProfilePage() {
  return (
    <div className="profile-page">
      <div className="prohile-header">
        <div className="profile-avatar">
        </div>
        <div className="profile-header-info">
          <h1 className="profile-username">Профиль пользователя</h1>
        </div>
      </div>
      

      <TextField title="Обо мне" text="Я няшка вкусняшка! Я хочу додобоны очень сильно и кофе из кофейни и домой пойти лежать ничего не делать и быть кайфулей" />
    </div>
  );
}

export default ProfilePage;