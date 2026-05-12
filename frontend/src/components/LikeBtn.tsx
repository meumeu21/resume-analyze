import likeEmpty from "../images/icons/heart-empty.svg"
import likeFill from "../images/icons/heart-fill.svg"

type LikeBtnProps = {
  isFavorited: boolean;
  onToggle: (e: React.MouseEvent) => void;
};

function LikeBtn({ isFavorited, onToggle }: LikeBtnProps) {
  return (
    <button className="like-btn" onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer" }}>
      <img src={isFavorited ? likeFill : likeEmpty} alt="Like" className="like-icon" />
    </button>
  );
}

export default LikeBtn;
