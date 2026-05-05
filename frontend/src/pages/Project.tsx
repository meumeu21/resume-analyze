import { Link } from "react-router-dom";

import "../css/main.css"
import "../css/Project.css"

import Header from "../components/Header";
import LikeBtn from "../components/LikeBtn";

import github from "../images/icons/github.svg";
import aiStar from "../images/icons/ai-star.svg";
import Footer from "../components/Footer";

function Project() {
    return (
        <body>
            <Header username="ewiwiwii"/>

            
            <div className="container">
                <Link to={"/users/me"} className="text link">Назад</Link>

                <div className="project-header">
                    <div className="project-header__top">
                        <div className="project-header__info">
                            <h1 className="project-h1">Проект</h1>
                            <Link to={"https://github.com"} target="_blank" className="project-github">
                                <img src={github} alt="GitHub"/>
                            </Link>
                            <div className="project-aiDescription">
                                <img src={aiStar} alt="AI Star"/>
                                <p className="profile-class__text">Fullstack-проект</p>
                            </div>
                        </div>

                        <LikeBtn />
                    </div>
                    
                </div>
                
            </div>
            <Footer />
        </body>
    )
}

export default Project;