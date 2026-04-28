type MericProps = {
    type: "subs" | "subsrciptions" | "favourites" | "profile_visits",
    number: number
}

function ProfileMetrics({ type, number }: MericProps) {
    if (type === "subs") {
        return (
            <div className="profile-metric">
                
            </div>
        )
    }
}

export default ProfileMetrics;