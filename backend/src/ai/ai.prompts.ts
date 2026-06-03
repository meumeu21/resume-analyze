import { Profile, Project, ReportType } from '../database/entities';
import { GithubRepo } from '../database/entities/github-repo.entity';
import { DEVELOPER_CATEGORIES } from './ai.constants';

export function systemPrompt(): string {
  return `Ты опытный технический рекрутер и карьерный консультант для IT-специалистов.
            Отвечай только на русском языке. Будь конкретным и практичным.
            Не добавляй вступлений вроде "Конечно!" или "Отличный вопрос!". Сразу переходи к делу.`;
}

export function resumeSystemPrompt(): string {
  return `Ты профессиональный HR-копирайтер для IT-специалистов.
Твоя задача — не просто скопировать данные, а превратить их в сильный, живой текст резюме.
Интерпретируй навыки и опыт выгодно: покажи сильные стороны, раскрой ценность каждого умения.
Пиши по-русски, профессионально, без клише. Без воды, но убедительно.
Отвечай ТОЛЬКО JSON-объектом без markdown, без пояснений, без лишнего текста.
Если данных нет — оставь поле пустой строкой.`;
}

export function buildPrompt(
  type: ReportType,
  profile: Profile,
  project: Project | null,
  githubRepo: GithubRepo | null,
  allProjects: Project[],
): string {
  const skillNames = profile.hardSkills.map((s) => s.name);
  const profileBase = [
    skillNames.length ? `Навыки: ${skillNames.join(', ')}` : null,
    profile.bio ? `О себе: ${profile.bio}` : null,
  ].filter(Boolean).join('\n');

  if (type === ReportType.ACTIVITY_FIELD) {
    const projectsInfo = allProjects.length
      ? allProjects.map((p) => [
          `— ${p.title}`,
          p.description ? `  Описание: ${p.description}` : null,
          p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
          p.role ? `  Роль: ${p.role}` : null,
        ].filter(Boolean).join('\n')).join('\n\n')
      : 'Проекты не указаны';

    const categoriesList = DEVELOPER_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n');

    return `Определи категорию разработчика на основе его данных.

ВАЖНО: проекты — главный критерий, они отражают реальную специализацию лучше любых слов.

=== ПРОЕКТЫ (анализируй в первую очередь) ===
${projectsInfo}

=== ПРОФИЛЬ ===
${profileBase || 'Данные профиля не заполнены'}

=== ДОПУСТИМЫЕ КАТЕГОРИИ ===
${categoriesList}

Выбери ОДНУ категорию из списка выше, которая точнее всего описывает специализацию этого разработчика.
Верни ТОЛЬКО название категории — без номера, без кавычек, без пояснений. Ровно одну строку.`;
  }

  if (type === ReportType.IMPROVEMENTS) {
    const projectsStack = [...new Set(allProjects.flatMap((p) => p.stack))];
    const allSkills = [...new Set([...profile.hardSkills.map((s) => s.name), ...projectsStack])];

    return `Разработчик со следующими навыками и технологиями: ${allSkills.length ? allSkills.join(', ') : 'навыки не указаны'}
              ${profile.activityField ? `Направление: ${profile.activityField}` : ''}
              Составь список рекомендаций "Что изучить дальше":
              1. Назови 3-5 конкретных технологий или языков, которые логично освоить следующими
              2. Для каждой технологии — одно предложение почему она важна для этого специалиста
              3. Укажи один бесплатный ресурс для изучения каждой технологии
              Формат: нумерованный список.`;
  }

  if (type === ReportType.PROJECT_SUMMARY && project) {
    const projectInfo = [
      `Название: ${project.title}`,
      project.description ? `Описание: ${project.description}` : null,
      project.role ? `Роль разработчика: ${project.role}` : null,
      project.stack.length ? `Стек: ${project.stack.join(', ')}` : null,
      project.tags.length ? `Теги: ${project.tags.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const githubInfo = githubRepo ? [
      Object.keys(githubRepo.languages).length
        ? `Языки в репозитории: ${Object.entries(githubRepo.languages)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([l]) => l).join(', ')}`
        : null,
      githubRepo.topics.length ? `Топики GitHub: ${githubRepo.topics.join(', ')}` : null,
      githubRepo.readmeExcerpt ? `README:\n${githubRepo.readmeExcerpt}` : null,
    ].filter(Boolean).join('\n') : null;

    return `Проект разработчика:
              ${projectInfo}
              ${githubInfo ? `\nДанные из GitHub:\n${githubInfo}` : ''}
              Напиши профессиональное резюме этого проекта для портфолио (3-4 предложения).
              Опиши: что это за проект, какие технические решения применялись, в чём ценность проекта.
              Пиши в третьем лице, как будто описываешь чужой проект. Без заголовков.`;
  }

  return profileBase;
}

export function buildResumePrompt(profile: Profile, publicProjects: Project[]): string {
  const skillNames = profile.hardSkills.map((s) => `${s.name} (уровень ${s.level}/5)`);

  const projectsText = publicProjects.length
    ? publicProjects.map((p) => [
        `- ${p.title}${p.role ? ` (роль: ${p.role})` : ''}`,
        p.description ? `  Описание: ${p.description}` : null,
        p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
        p.tags.length ? `  Теги: ${p.tags.join(', ')}` : null,
      ].filter(Boolean).join('\n')).join('\n\n')
    : 'Публичные проекты не указаны';

  return `Вот сырые данные разработчика. На их основе создай текст для резюме — не просто форматируй, а осмысли и улучши.

=== ДАННЫЕ ПРОФИЛЯ ===
Имя: ${profile.firstName || '(не указано)'}
Фамилия: ${profile.lastName || '(не указано)'}
Сфера деятельности: ${profile.activityField || 'не указана'}
О себе (черновик): ${profile.bio || 'не указано'}
Технические навыки: ${skillNames.length ? skillNames.join(', ') : 'не указаны'}
Soft skills: ${profile.softSkills.length ? profile.softSkills.join(', ') : 'не указаны'}

=== ПУБЛИЧНЫЕ ПРОЕКТЫ ===
${projectsText}

=== ИНСТРУКЦИИ ===
Создай JSON со следующими полями. В каждом поле пиши связный, живой текст — не просто копируй данные:

- "first_name": имя (берёшь как есть)
- "last_name": фамилия (берёшь как есть)
- "job_title": определи точную должность на английском (например: Frontend Developer, Full-Stack Engineer, Python Developer)
- "about": 2-3 предложения — профессиональный summary. Расскажи кто этот разработчик, что умеет, чем ценен. Опирайся на навыки и проекты.
- "hard_skills": 1-2 предложения про технические компетенции. Выдели главную экспертизу, покажи как навыки дополняют друг друга. Конкретные названия технологий оборачивай в **...** (например: "Уверенное владение **Python** как основным языком, дополненное знанием **Java**.")
- "soft_skills": 1-2 предложения, раскрывающие личные качества через их практическую ценность. Не просто перечисляй — объясняй зачем они важны. Ключевые качества оборачивай в **...** (например: "**Системное мышление** помогает декомпозировать сложные задачи.").
- "projects": массив объектов для каждого публичного проекта. Каждый объект содержит: "title" — название проекта, "description" — 1-2 предложения что сделано, какую задачу решает и почему это интересно, "stack" — технологии через запятую. Если проектов нет — пустой массив.

Верни ТОЛЬКО JSON:
{
  "first_name": "...",
  "last_name": "...",
  "job_title": "...",
  "about": "...",
  "hard_skills": "...",
  "soft_skills": "...",
  "projects": [{"title": "...", "description": "...", "stack": "..."}]
}`;
}

export function buildImprovementsPrompt(profile: Profile, allProjects: Project[]): string {
  const skillNames = profile.hardSkills.map((s) => `${s.name} (уровень ${s.level}/5)`);
  const projectsStack = [...new Set(allProjects.flatMap((p) => p.stack))];

  const projectsInfo = allProjects.length
    ? allProjects.map((p) => [
        `— ${p.title}`,
        p.description ? `  Описание: ${p.description}` : null,
        p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
        p.role ? `  Роль: ${p.role}` : null,
      ].filter(Boolean).join('\n')).join('\n\n')
    : 'Проекты не указаны';

  return `Ты анализируешь профиль разработчика и даёшь персонализированные рекомендации.

=== ПРОФИЛЬ ===
Класс разработчика: ${profile.activityField || 'не определён'}
Навыки: ${skillNames.length ? skillNames.join(', ') : 'не указаны'}
Soft skills: ${profile.softSkills.length ? profile.softSkills.join(', ') : 'не указаны'}
О себе: ${profile.bio || 'не заполнено'}

=== ПРОЕКТЫ (анализируй в первую очередь) ===
${projectsInfo}

Весь технологический стек из проектов: ${projectsStack.length ? projectsStack.join(', ') : 'не указан'}

=== ЗАДАЧА ===
На основе этих данных дай разработчику конкретные, персонализированные рекомендации.
Используй реальные данные — не пиши общих фраз.

Верни ТОЛЬКО JSON (без markdown, без пояснений):
{
  "recommendations": [
    {
      "title": "Краткое название аспекта (3-6 слов)",
      "description": "1-3 предложения: что конкретно улучшить и почему это важно для этого разработчика"
    }
  ],
  "project_ideas": [
    {
      "title": "Название проекта",
      "description": "2-3 предложения: что это за проект и какую задачу решает",
      "stack": ["Технология1", "Технология2"],
      "benefit": "1 предложение: что конкретно даст реализация этого проекта данному разработчику"
    }
  ]
}

Требования:
- recommendations: от 3 до 5 пунктов, конкретных и применимых
- project_ideas: от 1 до 3 идей
- stack в project_ideas: массив строк (названия технологий)
- Всё на русском языке`;
}

export function buildCoordinatesPrompt(profile: Profile, allProjects: Project[]): string {
  const skillNames = profile.hardSkills.map((s) => s.name);
  const projectsInfo = allProjects.length
    ? allProjects.map((p) => [
        `— ${p.title}`,
        p.description ? `  Описание: ${p.description}` : null,
        p.stack.length ? `  Стек: ${p.stack.join(', ')}` : null,
        p.role ? `  Роль: ${p.role}` : null,
      ].filter(Boolean).join('\n')).join('\n\n')
    : 'Проекты не указаны';

  return `Определи координаты разработчика на 2D-плоскости по его проектам и навыкам.

Ось X: от -5 (низкоуровневое программирование: embedded, ядро ОС, драйверы, asm, C)
        до +5 (высокоуровневое: веб, мобайл, бизнес-логика, SaaS, скрипты)

Ось Y: от -5 (продуктовый подход: UX, фичи для пользователя, бизнес-результат, метрики)
        до +5 (инженерный подход: архитектура, надёжность, производительность, инфраструктура)

=== ПРОЕКТЫ ===
${projectsInfo}

=== НАВЫКИ ===
${skillNames.length ? skillNames.join(', ') : 'не указаны'}
${profile.activityField ? `Специализация: ${profile.activityField}` : ''}

Верни ТОЛЬКО JSON с двумя числами (дробные допустимы):
{"x": 0.0, "y": 0.0}`;
}

export function buildInterestGraphPrompt(projectsInfo: string): string {
  return `Проанализируй проекты разработчика и построй граф его интересов.

=== ПРОЕКТЫ (название + описание/README) ===
${projectsInfo}

=== ПРАВИЛА ===
1. ОБЛАСТИ (type "domain", weight 3-5): широкие тематические области из проектов (например: "Веб-разработка", "Автоматизация", "Геймдев", "Data Science"). Только реально присутствующие.
2. ИНТЕРЕСЫ (type "technology", weight 1-4): конкретная тема каждого проекта, выведенная из его названия и описания. Одно короткое существительное или словосочетание (2-3 слова).
3. РЁБРА: интерес → область к которой относится; область ↔ область если тематически связаны.
4. ОГРАНИЧЕНИЯ: 8-16 узлов, нет изолированных узлов, id — строчный латинский без пробелов.

Верни ТОЛЬКО компактный JSON одной строкой:
{"nodes":[{"id":"web","label":"Веб-разработка","type":"domain","weight":5},{"id":"resume_analyzer","label":"Анализ резюме","type":"technology","weight":3}],"edges":[{"source":"resume_analyzer","target":"web"}]}`;
}
