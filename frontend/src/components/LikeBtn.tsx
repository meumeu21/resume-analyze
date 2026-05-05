import { useState } from "react";

import likeEmpty from "../images/icons/heart-empty.svg"
import likeFill from "../images/icons/heart-fill.svg"

function LikeBtn() {
  const [isLiked, setisLiked] = useState(false);

  const toggleLike = () => {
    setisLiked(!isLiked);
  }
  
  return (
    <button className="like-btn" onClick={toggleLike} style={{ background: "none", border: "none", cursor: "pointer" }}>
        <img src={isLiked ? likeFill : likeEmpty} alt="Like" className="like-icon" />
    </button>
  );
}

export default LikeBtn;