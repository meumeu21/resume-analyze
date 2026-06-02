import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "../css/Header.css"

function Header() {
    const { user, accessToken } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const close = () => setMenuOpen(false);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    return(
        <nav>
            <div className="header">
                <button
                    className={`header__burger${menuOpen ? ' open' : ''}`}
                    onClick={() => setMenuOpen(v => !v)}
                    aria-label="Меню"
                >
                    <span /><span /><span />
                </button>

                <Link to="/" className="header__logo" onClick={close}>CommIT</Link>

                <div className={`header__nav${menuOpen ? ' open' : ''}`}>
                    <Link to="/" className="header__menu-item text" onClick={close}>Главная</Link>
                    <Link to="/neuro" className="header__menu-item special text" onClick={close}>Нейросеть</Link>
                    <Link to="/developers" className="header__menu-item text" onClick={close}>Разработчики</Link>
                </div>

                {accessToken
                    ? <Link to="/users/me" className="header__menu-item header__profile text" onClick={close}>{user?.profile?.nickname ?? '...'}</Link>
                    : <Link to="/login" className="header__menu-item header__profile text" onClick={close}>Войти</Link>
                }
            </div>
        </nav>
    )
}

export default Header;
