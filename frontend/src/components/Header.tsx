import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "../css/Header.css"

function Header() {
    const { user, accessToken } = useAuth();

    return(
        <nav>
            <div className="header container">
                <div className="header__left">
                    <Link to="/" className="header__logo">CommIT</Link>
                    <Link to="/" className="header__menu-item text">Главная</Link>
                    <Link to="/" className="header__menu-item special text">Нейросеть</Link>
                    <Link to="/developers" className="header__menu-item text">Разработчики</Link>
                </div>
                {accessToken
                    ? <Link to="/users/me" className="header__menu-item text">{user?.profile?.nickname ?? '...'}</Link>
                    : <Link to="/login" className="header__menu-item text">Войти</Link>
                }
            </div>
        </nav>
    )
}

export default Header;