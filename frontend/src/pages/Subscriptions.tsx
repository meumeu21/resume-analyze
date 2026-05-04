import ProfilePreview from "../components/ProfilePreview";
import Header from "../components/Header";

import { Link } from "react-router-dom";

function Subscriptions() {
    return (
        <body>
            <Header username="ewiwiwii" />

            <div className="container">
                <h1 className="page-h1">Подписки</h1>

                <Link to={"/users/me"} className="text link">Назад</Link>

                <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar="../images/avatar-profile.jpg" linkToProfile="/users/me" numOfSubs="11" numOfProjects="5" color="#FFF"></ProfilePreview>
            </div>
        </body>
    )
}

export default Subscriptions;