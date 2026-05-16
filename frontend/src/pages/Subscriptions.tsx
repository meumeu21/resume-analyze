import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePreview from "../components/ProfilePreview";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { getMyFollowing } from "../api/users";
import type { UserCard } from "../api/users";

function Subscriptions() {
    const { accessToken, isLoading } = useAuth();
    const navigate = useNavigate();
    const [following, setFollowing] = useState<UserCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !accessToken) {
            navigate('/login', { replace: true });
            return;
        }
        if (!accessToken) return;
        getMyFollowing(accessToken)
            .then(setFollowing)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [accessToken, isLoading, navigate]);

    return (
        <>
            <Header />

            <div className="container page">
                <h1 className="page-h1">Подписки</h1>

                <button onClick={() => navigate(-1)} className="text link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Назад</button>

                {loading ? (
                    <p className="text no-data-text">Загрузка...</p>
                ) : following.length === 0 ? (
                    <p className="text no-data-text">Вы ни на кого не подписаны</p>
                ) : (
                    following.map((u) => (
                        <ProfilePreview
                            key={u.userId}
                            username={u.nickname}
                            AIdescription={u.activityField ?? ''}
                            avatarUrl={u.avatarUrl}
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

export default Subscriptions;
