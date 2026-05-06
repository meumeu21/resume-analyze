import { Link } from "react-router-dom";

import "../css/main.css"
import "../css/Project.css"

import Header from "../components/Header";
import LikeBtn from "../components/LikeBtn";
import TextField from "../components/TextField";

import github from "../images/icons/github.svg";
import aiStar from "../images/icons/ai-star.svg";
import Footer from "../components/Footer";

import avatar from "../images/avatar-profile.jpg";

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

                    <div className="project-header__bottom">
                        <p className="text bold">Инструменты:</p>
                        <div className="instruments">
                            <div className="instruments__item"><p>React</p></div>
                            <div className="instruments__item"><p>Python</p></div>
                            <div className="instruments__item"><p>Go</p></div>
                        </div>
                    </div>
                    
                </div>

                <div className="project-body">
                    <TextField title="Описание проекта" text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor, nisl eget ultricies lacinia, nunc nisl aliquam nisl, eget aliquam nunc nisl eget nunc. Donec auctor, nisl eget ultricies lacinia, nunc nisl aliquam nisl, eget aliquam nunc nisl eget nunc." />
                    
                    <div className="project-ai-description">
                        <h2>Анализ нейросети</h2>
                        <p className="text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor, nisl eget ultricies lacinia, nunc nisl aliquam nisl, eget aliquam nunc nisl eget nunc. Donec auctor, nisl eget ultricies lacinia, nunc nisl aliquam nisl, eget aliquam nunc nisl eget nunc</p>
                    </div>

                    <div className="project-files">
                        <button className="button text">Скачать</button>
                    </div>

                    <div className="project-images">
                        <img src={avatar} alt="Project Image" className="project-image"/>
                        <img src={avatar} alt="Project Image" className="project-image"/>
                        <img src={avatar} alt="Project Image" className="project-image"/>
                    </div>
                    
                    <div className="project-footer">
                        <p className="text bold">Author's name</p>
                        <p className="text">12/02/2025</p>
                    </div>
                </div>

            </div>
            <Footer />
        </body>
    )
}

export default Project;