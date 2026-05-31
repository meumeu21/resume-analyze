import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfilePreview from "../components/ProfilePreview";

import "../css/main.css";
import "../css/Home.css";

import aiStar from "../images/icons/ai-star.svg";

import { getDailyProject, type DailyProjectResponse } from "../api/projects";
import { ensurePublicProjectSummary, getPublicProjectSummary, type AiReport } from "../api/ai";
import { getTopFollowedUsers, type TopFollowedUser } from "../api/users";

function Home() {
    const [dailyProject, setDailyProject] = useState<DailyProjectResponse | null>(null);
    const [aiSummary, setAiSummary] = useState<AiReport | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);

    const [topUsers, setTopUsers] = useState<TopFollowedUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);

    useEffect(() => {
        getDailyProject()
            .then(project => {
                setDailyProject(project);
                if (project) {
                    setAiLoading(true);
                    getPublicProjectSummary(project.id)
                        .then(summary => {
                            if (summary) return summary;
                            return ensurePublicProjectSummary(project.id);
                        })
                        .then(summary => setAiSummary(summary))
                        .catch((e: unknown) => {
                            const msg = e instanceof Error ? e.message : '';
                            if (msg === 'Нейросеть не доступна') setAiError(msg);
                        })
                        .finally(() => setAiLoading(false));
                }
            })
            .catch(() => {})
            .finally(() => setProjectLoading(false));

        getTopFollowedUsers()
            .then(setTopUsers)
            .catch(() => {})
            .finally(() => setUsersLoading(false));
    }, []);

    const profile = dailyProject?.user?.profile;
    const authorName = profile
        ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.nickname
        : '';

    return (
        <body>
            <Header />

            <div className="home__banner">
                <div className="container home__banner-inner">
                    <h1 className="home-banner__h1">AI-помощник в развитии цифрового бренда</h1>
                    <div className="home-banner__texts">
                        <p className="text">Ваши проекты - ваши возможности</p>
                        <p className="text">&copy; hgghhggh & stw4t</p>
                    </div>
                </div>
            </div>

            <div className="container home__sections">
                <section>
                    <p className="home__section-title">Проект дня</p>
                    {projectLoading ? (
                        <p className="text">Загрузка...</p>
                    ) : dailyProject ? (
                        <div className="daily-project">
                            <div className="daily-project__top">
                                <div className="daily-project__tags">
                                    {dailyProject.stack.slice(0, 4).map(tag => (
                                        <span key={tag} className="daily-project__tag">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            <h3 className="daily-project__title">{dailyProject.title}</h3>

                            <Link to={`/users/${dailyProject.userId}`} className="daily-project__author">
                                © {authorName}
                            </Link>

                            {dailyProject.description && (
                                <div className="daily-project__section">
                                    <p className="daily-project__section-label">О проекте</p>
                                    <p className="daily-project__desc">{dailyProject.description}</p>
                                </div>
                            )}

                            <div className="daily-project__ai">
                                <div className="daily-project__ai-header">
                                    <img src={aiStar} alt="AI" className="daily-project__ai-icon" />
                                    <p className="daily-project__section-label">Описание от AI</p>
                                </div>
                                {aiLoading ? (
                                    <p className="daily-project__ai-text">Генерируем описание...</p>
                                ) : aiSummary?.summary ? (
                                    <p className="daily-project__ai-text">{aiSummary.summary}</p>
                                ) : (
                                    <p className="daily-project__ai-text daily-project__ai-text--empty">
                                        {aiError ?? 'Описание недоступно'}
                                    </p>
                                )}
                            </div>
                            <Link to={`/projects/${dailyProject.id}`} className="daily-project__link button text">
                                Открыть проект
                            </Link>
                        </div>
                    ) : (
                        <p className="text">Публичных проектов пока нет</p>
                    )}
                </section>
                <section>
                    <p className="home__section-title">Интересные профили</p>
                    {usersLoading ? (
                        <p className="text">Загрузка...</p>
                    ) : topUsers.length > 0 ? (
                        topUsers.map(u => (
                            <ProfilePreview
                                key={u.userId}
                                username={[u.firstName, u.lastName].filter(Boolean).join(' ') || u.nickname}
                                AIdescription={u.activityField ?? ''}
                                avatarUrl={u.avatarUrl}
                                linkToProfile={`/users/${u.userId}`}
                                numOfSubs={String(u.followersCount)}
                                numOfProjects={String(u.projectsCount)}
                            />
                        ))
                    ) : (
                        <p className="text">Пока нет публичных профилей</p>
                    )}
                </section>
            </div>

            <Footer />
        </body>
    );
}

export default Home;
