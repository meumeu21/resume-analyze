"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DB_URL = 'postgresql://resume_user:resume_pass_local@localhost:5433/resume_analyze';
const DEMO_PASSWORD = 'Demo2024!';
const users = [
    {
        email: 'kirill@commit.demo',
        nickname: 'kirill_backend',
        firstName: 'Кирилл',
        lastName: 'Алексеев',
        bio: 'Пишу backend-сервисы на Python и Go уже 3 года. Люблю чистую архитектуру, REST API и автоматизацию рутины. Открыт к новым задачам.',
        activityField: 'Backend-разработчик',
        hardSkills: [
            { name: 'Python', level: 5 },
            { name: 'FastAPI', level: 4 },
            { name: 'PostgreSQL', level: 4 },
            { name: 'Docker', level: 3 },
            { name: 'Redis', level: 3 },
            { name: 'Linux', level: 4 },
        ],
        softSkills: ['Ответственность', 'Внимательность к деталям', 'Коммуникабельность', 'Самостоятельность'],
        projects: [
            {
                title: 'Task Manager API',
                description: 'REST API для управления задачами и проектами. Реализована система ролей, JWT-аутентификация, уведомления по email.',
                role: 'Fullstack-разработчик',
                stack: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
                tags: ['api', 'backend', 'pet-project'],
                repoUrl: 'https://github.com/encode/starlette',
                isPublic: true,
                startedAt: '2023-09-01',
                finishedAt: '2023-12-15',
            },
            {
                title: 'Telegram-бот для напоминаний',
                description: 'Бот на aiogram 3 с планировщиком задач, хранением напоминаний в PostgreSQL и поддержкой часовых поясов.',
                role: 'Разработчик',
                stack: ['Python', 'aiogram', 'PostgreSQL', 'APScheduler'],
                tags: ['telegram', 'bot', 'python'],
                repoUrl: 'https://github.com/aiogram/aiogram',
                isPublic: true,
                startedAt: '2024-02-01',
                finishedAt: '2024-04-20',
            },
            {
                title: 'URL Shortener Service',
                description: 'Сервис сокращения ссылок с аналитикой переходов, Redis-кешированием и rate limiting.',
                role: 'Backend-разработчик',
                stack: ['Python', 'FastAPI', 'Redis', 'PostgreSQL'],
                tags: ['backend', 'microservice'],
                repoUrl: null,
                isPublic: false,
                startedAt: '2024-06-01',
                finishedAt: null,
            },
        ],
    },
    {
        email: 'natalia@commit.demo',
        nickname: 'natalia_frontend',
        firstName: 'Наталья',
        lastName: 'Смирнова',
        bio: 'Верстаю и пишу интерфейсы уже 4 года. Слежу за UX-трендами, люблю анимации и продуманные дизайн-системы.',
        activityField: 'Frontend-разработчик',
        hardSkills: [
            { name: 'React', level: 5 },
            { name: 'TypeScript', level: 4 },
            { name: 'CSS / SCSS', level: 5 },
            { name: 'Figma', level: 4 },
            { name: 'Next.js', level: 3 },
            { name: 'Redux Toolkit', level: 3 },
        ],
        softSkills: ['Креативность', 'Внимательность к деталям', 'Работа в команде', 'Тайм-менеджмент'],
        projects: [
            {
                title: 'Portfolio Website',
                description: 'Личный сайт-портфолио с анимациями на Framer Motion, тёмной темой и адаптивной версткой под все устройства.',
                role: 'Разработчик / дизайнер',
                stack: ['React', 'TypeScript', 'Framer Motion', 'SCSS'],
                tags: ['portfolio', 'design', 'animation'],
                repoUrl: 'https://github.com/framer/motion',
                isPublic: true,
                startedAt: '2023-07-01',
                finishedAt: '2023-08-30',
            },
            {
                title: 'UI Kit для E-commerce',
                description: 'Библиотека компонентов для интернет-магазинов: карточки товаров, корзина, фильтры, пагинация. Storybook-документация.',
                role: 'Frontend-разработчик',
                stack: ['React', 'TypeScript', 'Storybook', 'CSS Modules'],
                tags: ['ui-kit', 'components', 'e-commerce'],
                repoUrl: null,
                isPublic: true,
                startedAt: '2023-11-01',
                finishedAt: '2024-02-28',
            },
            {
                title: 'Дашборд аналитики',
                description: 'Административный дашборд с интерактивными графиками (Recharts), таблицами с сортировкой и экспортом в CSV.',
                role: 'Frontend-разработчик',
                stack: ['React', 'TypeScript', 'Recharts', 'React Query'],
                tags: ['dashboard', 'analytics'],
                repoUrl: null,
                isPublic: false,
                startedAt: '2024-03-01',
                finishedAt: '2024-06-15',
            },
        ],
    },
    {
        email: 'vlad@commit.demo',
        nickname: 'vlad_devops',
        firstName: 'Владислав',
        lastName: 'Орлов',
        bio: 'Строю инфраструктуру и настраиваю CI/CD пайплайны. Kubernetes-энтузиаст. 5 лет в DevOps/SRE.',
        activityField: 'DevOps-инженер',
        hardSkills: [
            { name: 'Docker', level: 5 },
            { name: 'Kubernetes', level: 5 },
            { name: 'Terraform', level: 4 },
            { name: 'Ansible', level: 4 },
            { name: 'GitHub Actions', level: 4 },
            { name: 'Linux', level: 5 },
            { name: 'AWS', level: 3 },
            { name: 'Prometheus / Grafana', level: 3 },
        ],
        softSkills: ['Системное мышление', 'Стрессоустойчивость', 'Педантичность', 'Документирование'],
        projects: [
            {
                title: 'Kubernetes Cluster Setup',
                description: 'Полный стек для развертывания production-ready k8s кластера: Helm-чарты, Ingress Nginx, cert-manager, мониторинг через Prometheus+Grafana.',
                role: 'DevOps-инженер',
                stack: ['Kubernetes', 'Helm', 'Terraform', 'Prometheus', 'Grafana'],
                tags: ['k8s', 'infrastructure', 'monitoring'],
                repoUrl: 'https://github.com/prometheus/prometheus',
                isPublic: true,
                startedAt: '2023-04-01',
                finishedAt: '2023-07-01',
            },
            {
                title: 'CI/CD Pipeline Template',
                description: 'Переиспользуемые GitHub Actions workflow-шаблоны: build, test, lint, Docker-сборка, push в registry, деплой на сервер.',
                role: 'DevOps-инженер',
                stack: ['GitHub Actions', 'Docker', 'Shell', 'YAML'],
                tags: ['ci-cd', 'automation', 'github-actions'],
                repoUrl: null,
                isPublic: true,
                startedAt: '2024-01-10',
                finishedAt: '2024-03-01',
            },
            {
                title: 'Infrastructure as Code — AWS',
                description: 'Terraform-конфигурация для AWS: VPC, ECS, RDS, S3, CloudFront, IAM-роли. Окружения dev/staging/prod через workspace.',
                role: 'Cloud/DevOps-инженер',
                stack: ['Terraform', 'AWS', 'Python', 'Ansible'],
                tags: ['iac', 'aws', 'terraform'],
                repoUrl: 'https://github.com/hashicorp/terraform',
                isPublic: false,
                startedAt: '2024-04-01',
                finishedAt: null,
            },
        ],
    },
    {
        email: 'ksenia@commit.demo',
        nickname: 'ksenia_ml',
        firstName: 'Ксения',
        lastName: 'Горева',
        bio: 'Занимаюсь анализом данных и машинным обучением. Строю модели предсказания и NLP-системы. PhD-студент по CS.',
        activityField: 'ML-инженер',
        hardSkills: [
            { name: 'Python', level: 5 },
            { name: 'pandas', level: 5 },
            { name: 'scikit-learn', level: 5 },
            { name: 'TensorFlow', level: 4 },
            { name: 'PyTorch', level: 3 },
            { name: 'SQL', level: 4 },
            { name: 'Jupyter', level: 5 },
        ],
        softSkills: ['Аналитическое мышление', 'Любопытство', 'Терпение', 'Работа с документацией'],
        projects: [
            {
                title: 'Customer Churn Prediction',
                description: 'ML-модель для предсказания оттока клиентов телеком-компании. Точность 89%. Feature engineering, SHAP-объяснения, дашборд в Streamlit.',
                role: 'Data Scientist',
                stack: ['Python', 'scikit-learn', 'pandas', 'XGBoost', 'SHAP', 'Streamlit'],
                tags: ['ml', 'classification', 'business-analytics'],
                repoUrl: 'https://github.com/scikit-learn/scikit-learn',
                isPublic: true,
                startedAt: '2023-10-01',
                finishedAt: '2024-01-15',
            },
            {
                title: 'NLP Sentiment Analysis',
                description: 'Анализ тональности отзывов на русском языке. Fine-tuning RuBERT, REST API на FastAPI для инференса, метрики F1=0.91.',
                role: 'ML-инженер',
                stack: ['Python', 'PyTorch', 'HuggingFace Transformers', 'FastAPI'],
                tags: ['nlp', 'bert', 'sentiment', 'deep-learning'],
                repoUrl: 'https://github.com/huggingface/transformers',
                isPublic: true,
                startedAt: '2024-03-01',
                finishedAt: '2024-06-30',
            },
            {
                title: 'Рекомендательная система',
                description: 'Гибридная рекомендательная система (collaborative filtering + content-based) для e-commerce. A/B-тест показал +12% CTR.',
                role: 'Data Scientist / ML-инженер',
                stack: ['Python', 'pandas', 'scipy', 'FastAPI', 'Redis'],
                tags: ['recommender-system', 'ml', 'e-commerce'],
                repoUrl: null,
                isPublic: false,
                startedAt: '2024-07-01',
                finishedAt: null,
            },
        ],
    },
    {
        email: 'roman@commit.demo',
        nickname: 'roman_fullstack',
        firstName: 'Роман',
        lastName: 'Степанов',
        bio: 'Разрабатываю веб-приложения от идеи до деплоя. Предпочитаю TypeScript-стек. 2 года опыта в командной разработке.',
        activityField: 'Full-Stack разработчик',
        hardSkills: [
            { name: 'TypeScript', level: 5 },
            { name: 'Node.js', level: 4 },
            { name: 'NestJS', level: 4 },
            { name: 'React', level: 4 },
            { name: 'PostgreSQL', level: 4 },
            { name: 'Docker', level: 3 },
            { name: 'GraphQL', level: 3 },
        ],
        softSkills: ['Самостоятельность', 'Быстрое обучение', 'Работа в команде', 'Инициативность'],
        projects: [
            {
                title: 'Social Network App',
                description: 'Социальная сеть для разработчиков: профили, посты с markdown, теги, подписки, лайки. NestJS + React + PostgreSQL.',
                role: 'Full-Stack разработчик',
                stack: ['NestJS', 'React', 'TypeScript', 'PostgreSQL', 'JWT', 'Docker'],
                tags: ['social-network', 'fullstack', 'typescript'],
                repoUrl: 'https://github.com/nestjs/nest',
                isPublic: true,
                startedAt: '2023-06-01',
                finishedAt: '2024-01-20',
            },
            {
                title: 'Real-time Chat',
                description: 'Мессенджер с WebSocket-комнатами, историей сообщений, статусом онлайн и шифрованием сообщений.',
                role: 'Full-Stack разработчик',
                stack: ['Node.js', 'Socket.io', 'React', 'Redis', 'PostgreSQL'],
                tags: ['chat', 'websocket', 'real-time'],
                repoUrl: null,
                isPublic: true,
                startedAt: '2024-02-01',
                finishedAt: '2024-05-10',
            },
            {
                title: 'GraphQL API Gateway',
                description: 'API-шлюз с GraphQL-схемой, объединяющий несколько микросервисов. DataLoader для N+1, subscriptions через WebSocket.',
                role: 'Backend-разработчик',
                stack: ['Node.js', 'GraphQL', 'Apollo Server', 'TypeScript', 'Docker'],
                tags: ['graphql', 'microservices', 'api-gateway'],
                repoUrl: null,
                isPublic: false,
                startedAt: '2024-05-01',
                finishedAt: null,
            },
        ],
    },
];
function pgArr(arr) {
    return `'{${arr.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}'`;
}
function pgJsonb(obj) {
    return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}
async function main() {
    const client = new pg_1.Client({ connectionString: DB_URL });
    await client.connect();
    console.log('✅ Подключено к базе данных\n');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    console.log(`🔑 Пароль для всех аккаунтов: ${DEMO_PASSWORD}\n`);
    const credentials = [];
    for (const u of users) {
        const exists = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
        if (exists.rows.length > 0) {
            console.log(`⚠️  Пользователь ${u.email} уже существует, пропускаю.`);
            continue;
        }
        const userId = (0, crypto_1.randomUUID)();
        await client.query(`INSERT INTO users (id, email, password_hash, is_email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())`, [userId, u.email, passwordHash]);
        const profileId = (0, crypto_1.randomUUID)();
        await client.query(`INSERT INTO profiles (
         id, user_id, nickname, first_name, last_name, bio,
         activity_field, skill_levels, soft_skills,
         is_profile_public, is_followers_public, is_following_public, is_favorites_public,
         updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, ${pgJsonb(u.hardSkills)}, ${pgArr(u.softSkills)},
         true, true, true, true, NOW()
       )`, [profileId, userId, u.nickname, u.firstName, u.lastName, u.bio, u.activityField]);
        for (const p of u.projects) {
            const projectId = (0, crypto_1.randomUUID)();
            await client.query(`INSERT INTO projects (
           id, user_id, title, description, role,
           stack, tags, demo_url, repo_url, source,
           is_public, started_at, finished_at, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5,
           ${pgArr(p.stack)}, ${pgArr(p.tags)}, NULL, $6, 'manual',
           $7, $8, $9, NOW(), NOW()
         )`, [
                projectId, userId, p.title, p.description, p.role,
                p.repoUrl,
                p.isPublic,
                p.startedAt ?? null,
                p.finishedAt ?? null,
            ]);
        }
        credentials.push({ email: u.email, nickname: u.nickname, name: `${u.firstName} ${u.lastName}` });
        console.log(`✅ Создан пользователь: ${u.firstName} ${u.lastName} (@${u.nickname})`);
    }
    await client.end();
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║              ДАННЫЕ ДЛЯ ВХОДА В ДЕМО-АККАУНТЫ                           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Пароль для всех:  ${DEMO_PASSWORD.padEnd(52)}║`);
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    for (const c of credentials) {
        const line = `${c.name} (@${c.nickname}) — ${c.email}`;
        console.log(`║  ${line.padEnd(72)}║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log('\nЭти данные также сохранены в: backend/scripts/DEMO_ACCOUNTS.md\n');
    const md = [
        '# Демо-аккаунты для защиты проекта',
        '',
        `**Пароль для всех аккаунтов:** \`${DEMO_PASSWORD}\``,
        '',
        '| Имя | Никнейм | Email | Специализация |',
        '|-----|---------|-------|---------------|',
        ...users.map((u) => `| ${u.firstName} ${u.lastName} | @${u.nickname} | \`${u.email}\` | ${u.activityField} |`),
        '',
        '## Как войти',
        '1. Открой приложение',
        '2. Нажми "Войти"',
        '3. Введи email и пароль из таблицы выше',
        '',
        '_Файл сгенерирован автоматически скриптом `scripts/seed.ts`_',
    ].join('\n');
    fs.writeFileSync(path.join(__dirname, 'DEMO_ACCOUNTS.md'), md);
}
main().catch((err) => {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map