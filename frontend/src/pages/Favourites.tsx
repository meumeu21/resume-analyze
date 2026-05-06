import { Link } from "react-router-dom";
import Header from "../components/Header";
import ProjectPreview from "../components/ProjectPreview";

import "../css/main.css"
import Footer from "../components/Footer";

function Favourites() {
    return (
        <body>
            <Header username="ewiwiwii" />

            <div className="container page">
                <h1 className="page-h1">Избранное</h1>

                <Link to={"/users/me"} className="text link">Назад</Link>

                <ProjectPreview title="Проект 1" description="Описание проекта 1" author="ewiwiwii" color="#FFF" link="/project" />
                <ProjectPreview title="Проект 1" description="Описание проекта 1" author="ewiwiwii" color="#ECEBFF" link="/project" />
                <ProjectPreview title="Проект 1" description="Описание проекта 1" author="ewiwiwii" color="#FFF" link="/project" />
                <ProjectPreview title="Проект 1" description="Описание проекта 1" author="ewiwiwii" color="#FFE6BD" link="/project" />
            </div>

            <Footer />
        </body>
    )
}

export default Favourites;