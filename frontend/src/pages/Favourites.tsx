import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProjectPreview from "../components/ProjectPreview";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { getFavoriteProjects, removeFavorite } from "../api/projects";
import type { ProjectResponse } from "../api/projects";

import "../css/main.css";

const CARD_COLORS = ['#FFF', '#ECEBFF', '#FAE2FF', '#BEEBFF', '#FFE6BD'];

function Favourites() {
    const { accessToken, isLoading } = useAuth();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<ProjectResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !accessToken) {
            navigate('/login', { replace: true });
            return;
        }
        if (!accessToken) return;
        getFavoriteProjects(accessToken)
            .then(setFavorites)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [accessToken, isLoading, navigate]);

    async function handleRemoveFavorite(e: React.MouseEvent, projectId: string) {
        e.preventDefault();
        if (!accessToken) return;
        try {
            await removeFavorite(projectId, accessToken);
            setFavorites((prev) => prev.filter((p) => p.id !== projectId));
        } catch {}
    }

    return (
        <>
            <Header />

            <div className="container page">
                <h1 className="page-h1">Избранное</h1>

                <Link to={"/users/me"} className="text link">Назад</Link>

                {loading ? (
                    <p className="text">Загрузка...</p>
                ) : favorites.length === 0 ? (
                    <p className="text">Нет избранных проектов</p>
                ) : (
                    favorites.map((p, i) => (
                        <ProjectPreview
                            key={p.id}
                            title={p.title}
                            description={p.description ?? ''}
                            author=""
                            color={CARD_COLORS[i % CARD_COLORS.length]}
                            link={`/projects/${p.id}`}
                            isFavorited={true}
                            onToggleFavorite={(e) => handleRemoveFavorite(e, p.id)}
                        />
                    ))
                )}
            </div>

            <Footer />
        </>
    );
}

export default Favourites;
