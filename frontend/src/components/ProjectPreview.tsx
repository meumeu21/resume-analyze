import { Link } from "react-router-dom";
import LikeBtn from "./LikeBtn";

type ProjectPreviewProps = {
  title: string;
  description: string;
  author: string;
  color: string;
  link: string;
  isFavorited?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
};

function ProjectPreview({ title, description, author, color, link, isFavorited, onToggleFavorite }: ProjectPreviewProps) {
    return (
        <div className="project-preview" style={{ backgroundColor: color }}>
            <div className="project-preview__wrap">
                <h3 className="project-preview__title">{title}</h3>
                <p className="project-preview__description text">{description}</p>
                {author && <p className="project-preview__author text">{author}</p>}
            </div>
            <div className="project-preview__actions">
                {onToggleFavorite !== undefined && (
                    <LikeBtn isFavorited={isFavorited ?? false} onToggle={onToggleFavorite} />
                )}
                <Link to={link} className="button text">Подробнее</Link>
            </div>
        </div>
    )
}

export default ProjectPreview;
