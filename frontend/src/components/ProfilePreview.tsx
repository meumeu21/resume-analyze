import { Link } from "react-router-dom";

import starIcon from "../images/icons/ai-star.svg";

type ProfilePreviewProps = {
  username: string;
  AIdescription: string;
  linkToAvatar: string;
  linkToProfile: string;
  numOfSubs: string;
  numOfProjects: string;
  color: string
};

function ProfilePreview({ username, AIdescription, linkToAvatar, linkToProfile, numOfSubs, numOfProjects, color }: ProfilePreviewProps) {
    return (
        <div className="project-preview profile-preview" style={{ backgroundColor: color }}>
            <div className="profile-preview__data">
                <img src={linkToAvatar} className="profile-preview__avatar"></img>
                <div className="profile-preview__info">
                    <div className="profile-preview__name-data">
                        <h3 className="profile-preview__name">{username}</h3>
                        <div className="profile-preview__description container">
                            <img src={starIcon} alt="Star Icon" className="star-icon" />
                            <p className="profile-class__text">{AIdescription}</p>
                        </div>
                    </div>
                    <div className="profile-preview__numbers-data">
                        <p className="profile-preview__numbers">{numOfSubs} подписчиков</p>
                        <p className="profile-preview__numbers">{numOfProjects} проектов</p>
                    </div>
                </div>
            </div>

            <Link to={linkToProfile} className="button text">Перейти</Link>
        </div>
    )
}

export default ProfilePreview;