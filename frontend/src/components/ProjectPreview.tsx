import { Link } from "react-router-dom";

type ProjectPreviewProps = {
  title: string;
  description: string;
  author: string;
  color: string;
  link: string;
};

function ProjectPreview({ title, description, author, color, link }: ProjectPreviewProps) {
    return (
        <div className="project-preview" style={{ backgroundColor: color }}>
            <div className="project-preview__wrap">
                <h3 className="project-preview__title text">{title}</h3>
                <p className="project-preview__description text">{description}</p>
                <p className="project-preview__author text">{author}</p>
            </div>
            <Link to={link} className="button text">Подробнее</Link>
        </div>
    )
}

export default ProjectPreview;