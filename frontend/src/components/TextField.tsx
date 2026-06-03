import { useEffect, useState } from "react";

import "../css/TextField.css";

type TextFieldProps = {
  title: string;
  text: string;
  editable?: boolean;
  onSave?: (value: string) => Promise<void> | void;
};

function TextField({
  title,
  text,
  editable = false,
  onSave,
}: TextFieldProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValue(text);
  }, [text]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  async function handleSave() {
    try {
      setLoading(true);

      if (onSave) {
        await onSave(value);
      }

      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="textField">
      <div className="textField-header">
        <h2 className="profile-h2">{title}</h2>

        <div className="textField-actions">
          {editable && (
            <button
              className="textField-editButton"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Отмена" : "Редактировать"}
            </button>
          )}

          <button
            className={`textField-button ${isOpen ? "open" : ""}`}
            onClick={toggleOpen}
          >
            ▼
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="textField-content">
          {isEditing ? (
            <>
              <textarea
                className="textField-textarea text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />

              <button
                className="button text"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Сохранение..." : "Сохранить"}
              </button>
            </>
          ) : (
            <p className="textField-text text">{value}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default TextField;