import "../css/LoginPage.css";
import { Link } from "react-router-dom";

function LoginPage() {
  return (
    <div className="login-page">
      {/* Шарики */}
      <div className="bubble bubble1" />
      <div className="bubble bubble2" />
      <div className="bubble bubble3" />
      <div className="bubble bubble4" />
      <div className="bubble bubble5" />

      {/* Карточка */}
      <div className="card">
        <h2>Присоединяйтесь к CommIT!</h2>

        <input type="text" placeholder="Логин" />
        <input type="password" placeholder="Пароль" />

        <button className="login-btn">Зарегистрироваться</button>

        <Link to="/" className="text-btn">
          Вы уже зарегистрированы?
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;