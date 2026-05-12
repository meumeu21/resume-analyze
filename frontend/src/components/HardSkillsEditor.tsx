import { useEffect, useState } from 'react';
import '../css/TextField.css';
import '../css/HardSkills.css';

export type Skill = { name: string; level: number };

const LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'Начинающий' },
  { value: 2, label: 'Базовый' },
  { value: 3, label: 'Средний' },
  { value: 4, label: 'Продвинутый' },
  { value: 5, label: 'Эксперт' },
];

function levelLabel(level: number): string {
  return LEVELS.find((l) => l.value === level)?.label ?? '';
}

type Props = {
  skills: Skill[];
  editable?: boolean;
  onSave?: (skills: Skill[]) => Promise<void>;
};

function HardSkillsEditor({ skills, editable = false, onSave }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [localSkills, setLocalSkills] = useState<Skill[]>(skills);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalSkills(skills);
  }, [skills]);

  function addSkill() {
    const name = newName.trim();
    if (!name) return;
    if (localSkills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    setLocalSkills((prev) => [...prev, { name, level: newLevel }]);
    setNewName('');
    setNewLevel(3);
  }

  function removeSkill(index: number) {
    setLocalSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLevel(index: number, level: number) {
    setLocalSkills((prev) => prev.map((s, i) => (i === index ? { ...s, level } : s)));
  }

  async function handleSave() {
    if (!onSave) return;
    setLoading(true);
    try {
      await onSave(localSkills);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setLocalSkills(skills);
    setNewName('');
    setNewLevel(3);
    setIsEditing(false);
  }

  return (
    <div className="textField">
      <div className="textField-header">
        <h2 className="profile-h2">Hard Skills</h2>
        <div className="textField-actions">
          {editable && (
            <button
              className="textField-editButton"
              onClick={() => (isEditing ? handleCancel() : setIsEditing(true))}
            >
              {isEditing ? 'Отмена' : 'Редактировать'}
            </button>
          )}
          <button
            className={`textField-button ${isOpen ? 'open' : ''}`}
            onClick={() => setIsOpen((o) => !o)}
          >
            ▼
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="textField-content">
          {isEditing ? (
            <div className="hardskills-editor">
              {localSkills.length > 0 && (
                <div className="hardskills-list">
                  {localSkills.map((skill, i) => (
                    <div key={i} className="hardskill-row">
                      <span className="hardskill-row__name text bold">{skill.name}</span>
                      <select
                        className="hardskill-select text"
                        value={skill.level}
                        onChange={(e) => updateLevel(i, Number(e.target.value))}
                      >
                        {LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      <button className="contact-delete-btn" onClick={() => removeSkill(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="hardskill-add-form">
                <input
                  type="text"
                  className="hardskill-name-input text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Название технологии"
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                />
                <select
                  className="hardskill-select text"
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <button className="button-light text fc" onClick={addSkill}>Добавить</button>
              </div>

              <button className="button text" onClick={handleSave} disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          ) : (
            <div className="hardskills-view">
              {skills.length === 0 ? (
                <p className="textField-text text">Перечислите технологии</p>
              ) : (
                skills.map((skill, i) => (
                  <div key={i} className="hardskill-tag">
                    <span className="hardskill-tag__name text bold">{skill.name}</span>
                    <span className="hardskill-tag__level text">{levelLabel(skill.level)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HardSkillsEditor;
