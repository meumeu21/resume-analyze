import Header from "../components/Header";
import Footer from "../components/Footer";
import ProjectPreview from "../components/ProjectPreview";
import TextField from "../components/TextField";
import ProfilePreview from "../components/ProfilePreview";

import "../css/main.css"
import "../css/Home.css"

import avatar from "../images/avatar-profile.jpg";

function Home() {
    return (
        <body>
            <Header username="ewiwiwii"/>

            <div className="home__banner">
                <div className="container home__banner-inner">
                    <h1 className="home-banner__h1">AI-помощник в развитии цифрового бренда</h1>
                    <div className="home-banner__texts">
                        <p className="text">Ваши проекты - ваши возможности</p>
                        <p className="text">&copy; hgghhggh & stw4t</p>
                    </div>
                </div>
            </div>

            <div className="container">
                <section>
                    <h2>Проект дня</h2>
                    <ProjectPreview title="Проект 1" description="Описание проекта 1" author="user" color="#FFF" link="/project" />
                    <TextField title="О проекте" text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." />
                    <h2>Описание от AI</h2>
                    <p className="text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </section>
                <section>
                    <h2>Интересные профили</h2>
                    <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar={avatar} linkToProfile="/users/me" numOfSubs="11" numOfProjects="5"></ProfilePreview>
                    <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar={avatar} linkToProfile="/users/me" numOfSubs="11" numOfProjects="5"></ProfilePreview>
                    <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar={avatar} linkToProfile="/users/me" numOfSubs="11" numOfProjects="5"></ProfilePreview>
                </section>
                
            </div>

            <Footer />
        </body>
    );
}

export default Home;