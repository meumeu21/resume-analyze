import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProfilePreview from "../components/ProfilePreview";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { getMyFollowers } from "../api/users";
import type { UserCard } from "../api/users";
import avatar from "../images/avatar-profile.jpg";

function Subscriptors() {
    const { accessToken, isLoading } = useAuth();
    const navigate = useNavigate();
    const [followers, setFollowers] = useState<UserCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !accessToken) {
            navigate('/login', { replace: true });
            return;
        }
        if (!accessToken) return;
        getMyFollowers(accessToken)
            .then(setFollowers)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [accessToken, isLoading, navigate]);

    return (
        <>
            <Header />

            <div className="container page">
                <h1 className="page-h1">Подписчики</h1>

                <Link to={"/users/me"} className="text link">Назад</Link>

                {loading ? (
                    <p className="text">Загрузка...</p>
                ) : followers.length === 0 ? (
                    <p className="text">У вас пока нет подписчиков</p>
                ) : (
                    followers.map((u) => (
                        <ProfilePreview
                            key={u.userId}
                            username={u.nickname}
                            AIdescription={u.activityField ?? ''}
                            linkToAvatar={u.avatarUrl ?? avatar}
                            linkToProfile={`/users/${u.userId}`}
                            numOfSubs={String(u.followersCount)}
                        />
                    ))
                )}
            </div>
            <Footer />
        </>
    );
}

export default Subscriptors;
