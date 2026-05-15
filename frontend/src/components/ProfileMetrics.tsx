import { Link } from "react-router-dom"

type MericProps = {
    type: "subs" | "subsrciptions" | "favourites" | "profile_visits",
    number: number,
    clickable?: boolean,
}

const METRIC_ROUTES: Record<string, string> = {
    subs: "/subscriptors",
    subsrciptions: "/subscriptions",
    favourites: "/favourites",
};

const METRIC_LABELS: Record<string, string> = {
    subs: "подписчики",
    subsrciptions: "подписки",
    favourites: "избранное",
};

function ProfileMetrics({ type, number, clickable = true }: MericProps) {
    const label = METRIC_LABELS[type];
    const to = METRIC_ROUTES[type];

    if (!label) return null;

    const inner = (
        <div className="profile-metric">
            <p className="profile-metric__number">{number}</p>
            <p className="profile-metric__type text">{label}</p>
        </div>
    );

    if (clickable && to) {
        return <Link to={to} className="profile-metric__wrap">{inner}</Link>;
    }
    return <div className="profile-metric__wrap">{inner}</div>;
}

export default ProfileMetrics;