import { useState } from "react";

import "../css/TextFiels.css";

type TextFieldProps = {
  title: string;
  text: string;
};

function TextField({ title, text }: TextFieldProps) {
  const [isOpen, setisOpen] = useState(false);

  const toggleOpen = () => {
    setisOpen(!isOpen);
  }
  
  return (
    <div className="textField">
        <div className="textField-header">
            <h2>{title}</h2>
            <button className={`textField-button ${isOpen ? "open" : ""}`} onClick={toggleOpen}>▼</button>
        </div>

        {isOpen && (
            <div className="textField-content">
                <p className="textField-text">{text}</p>
            </div>
            )
        }
    </div>
  );
}

export default TextField;