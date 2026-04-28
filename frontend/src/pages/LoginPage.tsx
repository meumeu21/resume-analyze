import { Link } from "react-router-dom";

import "../css/LoginPage.css";
import Card from "../components/ProjectCard";

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
        <h2>Добро пожаловать в CommIT!</h2>

        <input type="text" placeholder="Логин" />
        <input type="password" placeholder="Пароль" />

        <button className="login-btn">Войти</button>

        <Link to="/register" className="text-btn">
          Вы у нас первый раз?
        </Link>
      </div>
  
      <Card title="Профиль">
        <p>Информация о пользователе</p>
      </Card>
    </div>
  );
}

export default LoginPage;