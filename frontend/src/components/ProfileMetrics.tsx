import { Link } from "react-router-dom"

type MericProps = {
    type: "subs" | "subsrciptions" | "favourites" | "profile_visits",
    number: number
}

function ProfileMetrics({ type, number }: MericProps) {
    if (type === "subs") {
        return (
            <Link to="/subscriptors" className="profile-metric__wrap">
                <div className="profile-metric">
                    <p className="profile-metric__number">{number}</p>
                    <p className="profile-metric__type text">подписчики</p>
                </div>
            </Link>
        )
    } else if (type === "subsrciptions") {
        return (
            <Link to="/subscriptions" className="profile-metric__wrap">
                <div className="profile-metric">
                    <p className="profile-metric__number">{number}</p>
                    <p className="profile-metric__type text">подписки</p>
                </div>
            </Link>
        )
    } else if (type === "favourites") {
        return (
            <Link to="/favourites" className="profile-metric__wrap">
                <div className="profile-metric">
                    <p className="profile-metric__number">{number}</p>
                    <p className="profile-metric__type text">избранное</p>
                </div>
            </Link>
        )
    }
}

export default ProfileMetrics;