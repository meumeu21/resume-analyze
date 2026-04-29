import { Link } from "react-router-dom";

import "../css/Header.css"

type HeaderProps = {
    username: string
};

function Header({ username }: HeaderProps) {
    return(
        <nav>
            <div className="header container">
                <div className="header__left">
                    <Link to="/" className="header__logo">CommIT</Link>
                    <Link to="/" className="header__menu-item text">Главная</Link>
                    <Link to="/" className="header__menu-item special text">Нейросеть</Link>
                    <Link to="/" className="header__menu-item text">Разработчики</Link>
                </div>
                <Link to="/profile" className="header__menu-item text">{username}</Link>
            </div>
        </nav>
    )
}

export default Header;