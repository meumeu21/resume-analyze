import { Link } from "react-router-dom";

import "../css/ProfilePreview.css";

import starIcon from "../images/icons/ai-star.svg";

type ProfilePreviewProps = {
  username: string;
  AIdescription: string;
  linkToAvatar: string;
  linkToProfile: string;
  numOfSubs: string;
  numOfProjects: string;
};

function ProfilePreview({ username, AIdescription, linkToAvatar, linkToProfile, numOfSubs, numOfProjects }: ProfilePreviewProps) {
    return (
        <div className="profile-preview">
            <div className="profile-preview__data">
                <img src={linkToAvatar} className="profile-preview__avatar"></img>
                <div className="profile-preview__info">
                    <div className="profile-preview__name-data">
                        <h3 className="profile-preview__name"><Link to={linkToProfile} className="link">{username}</Link></h3>
                        <div className="profile-preview__description">
                            <img src={starIcon} alt="Star Icon" className="star-icon" />
                            <p className="profile-preview__class">{AIdescription}</p>
                        </div>
                    </div>
                    <div className="profile-preview__numbers-data">
                        <p className="profile-preview__numbers text">{numOfSubs} подписчиков</p>
                        <p className="profile-preview__numbers text">{numOfProjects} проектов</p>
                    </div>
                </div>
            </div>

            <Link to={linkToProfile} className="button text">Перейти</Link>
        </div>
    )
}

export default ProfilePreview;