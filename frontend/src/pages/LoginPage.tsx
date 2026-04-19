import "./LoginPage.css";

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

        <button className="secondary-btn">
          Вы у нас первый раз?
        </button>
      </div>
    </div>
  );
}

export default LoginPage;