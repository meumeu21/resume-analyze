import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

import { User } from './database/entities/user.entity';
import { Profile } from './database/entities/profile.entity';
import { Project, ProjectSource } from './database/entities/project.entity';
import { ProjectFile } from './database/entities/project-file.entity';
import { Follow } from './database/entities/follow.entity';
import { Favorite } from './database/entities/favorite.entity';
import { AiReport } from './database/entities/ai-report.entity';
import { ContactLink } from './database/entities/contact-link.entity';
import { GithubAccount } from './database/entities/github-account.entity';
import { GithubRepo } from './database/entities/github-repo.entity';
import { PasswordResetToken } from './database/entities/password-reset-token.entity';
import { ProfileView } from './database/entities/profile-view.entity';

dotenv.config();

const db = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User, Profile, Project, ProjectFile, Follow, Favorite,
    AiReport, ContactLink, GithubAccount, GithubRepo,
    PasswordResetToken, ProfileView,
  ],
  synchronize: false,
  logging: false,
});

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  {
    email: 'ivan@example.com',
    nickname: 'ivan_dev',
    firstName: 'Иван',
    lastName: 'Петров',
    activityField: 'Backend-разработчик',
    bio: 'Пишу на Go и Python уже 5 лет. Люблю чистую архитектуру и микросервисы.',
    hardSkills: [
      { name: 'Go', level: 5 },
      { name: 'Python', level: 4 },
      { name: 'PostgreSQL', level: 4 },
      { name: 'Docker', level: 3 },
    ],
    softSkills: ['Командная работа', 'Коммуникация', 'Решение проблем'],
    projects: [
      {
        title: 'Платёжный микросервис',
        description: 'Высоконагруженный сервис обработки платежей на Go. Поддерживает до 10 000 транзакций в секунду с гарантией идемпотентности.',
        stack: ['Go', 'gRPC', 'PostgreSQL', 'Redis', 'Kafka'],
      },
      {
        title: 'CLI для деплоя',
        description: 'Утилита командной строки для автоматизированного деплоя приложений в Kubernetes. Поддерживает rolling update и canary-стратегии.',
        stack: ['Go', 'Kubernetes', 'Helm', 'Docker'],
      },
    ],
  },
  {
    email: 'maria@example.com',
    nickname: 'maria_frontend',
    firstName: 'Мария',
    lastName: 'Соколова',
    activityField: 'Frontend-разработчик',
    bio: 'React-разработчик с опытом в дизайн-системах и производительности интерфейсов.',
    hardSkills: [
      { name: 'React', level: 5 },
      { name: 'TypeScript', level: 5 },
      { name: 'CSS', level: 4 },
      { name: 'Vite', level: 3 },
    ],
    softSkills: ['Внимание к деталям', 'Креативность', 'Командная работа'],
    projects: [
      {
        title: 'UI-библиотека компонентов',
        description: 'Корпоративная библиотека из 60+ переиспользуемых React-компонентов с поддержкой тем и a11y.',
        stack: ['React', 'TypeScript', 'Storybook', 'CSS Modules'],
      },
      {
        title: 'Дашборд аналитики',
        description: 'Интерактивный дашборд для визуализации данных в реальном времени. Графики, таблицы, фильтры.',
        stack: ['React', 'D3.js', 'WebSocket', 'TypeScript'],
      },
      {
        title: 'Портфолио-генератор',
        description: 'Веб-приложение для автоматической генерации красивого портфолио из GitHub-профиля разработчика.',
        stack: ['Next.js', 'TypeScript', 'Tailwind CSS'],
      },
    ],
  },
  {
    email: 'alexei@example.com',
    nickname: 'alexei_ml',
    firstName: 'Алексей',
    lastName: 'Громов',
    activityField: 'ML-инженер',
    bio: 'Занимаюсь компьютерным зрением и NLP. Участник нескольких Kaggle-соревнований.',
    hardSkills: [
      { name: 'Python', level: 5 },
      { name: 'PyTorch', level: 5 },
      { name: 'OpenCV', level: 4 },
      { name: 'FastAPI', level: 3 },
    ],
    softSkills: ['Аналитическое мышление', 'Исследование', 'Документирование'],
    projects: [
      {
        title: 'Детектор дефектов на производстве',
        description: 'Модель компьютерного зрения для обнаружения дефектов на конвейере. Точность 97.3% на тестовой выборке.',
        stack: ['Python', 'PyTorch', 'OpenCV', 'ONNX'],
      },
      {
        title: 'RAG-чатбот для поддержки',
        description: 'Система на базе LLM для автоматизации первой линии поддержки. Интегрируется с корпоративной базой знаний через ChromaDB.',
        stack: ['Python', 'LangChain', 'FastAPI', 'ChromaDB'],
      },
    ],
  },
  {
    email: 'dasha@example.com',
    nickname: 'dasha_fullstack',
    firstName: 'Дарья',
    lastName: 'Лебедева',
    activityField: 'Full-Stack разработчик',
    bio: 'Full-stack на Node.js + React. Строю продукты с нуля — от схемы БД до последнего пикселя.',
    hardSkills: [
      { name: 'Node.js', level: 5 },
      { name: 'React', level: 4 },
      { name: 'TypeScript', level: 4 },
      { name: 'MongoDB', level: 3 },
    ],
    softSkills: ['Инициативность', 'Адаптивность', 'Тайм-менеджмент'],
    projects: [
      {
        title: 'SaaS для управления задачами',
        description: 'Полноценный таск-менеджер с командной работой, канбан-досками и интеграциями со Slack и GitHub.',
        stack: ['Node.js', 'React', 'TypeScript', 'MongoDB', 'Redis'],
      },
      {
        title: 'API агрегатор новостей',
        description: 'Сервис, собирающий новости из 30+ источников, с персонализированной лентой и push-уведомлениями.',
        stack: ['Node.js', 'TypeScript', 'PostgreSQL', 'Bull'],
      },
    ],
  },
  {
    email: 'nikita@example.com',
    nickname: 'nikita_devops',
    firstName: 'Никита',
    lastName: 'Власов',
    activityField: 'DevOps-инженер',
    bio: 'Строю надёжные CI/CD-пайплайны и k8s-кластеры. Фанат IaC и GitOps.',
    hardSkills: [
      { name: 'Kubernetes', level: 5 },
      { name: 'Terraform', level: 5 },
      { name: 'Ansible', level: 4 },
      { name: 'Go', level: 2 },
    ],
    softSkills: ['Надёжность', 'Системное мышление', 'Документирование'],
    projects: [
      {
        title: 'GitOps-платформа для команды',
        description: 'Внутренняя платформа на ArgoCD + Terraform для управления инфраструктурой через pull request-ы.',
        stack: ['Kubernetes', 'ArgoCD', 'Terraform', 'Helm'],
      },
    ],
  },
];

// Матрица подписок: [followerIdx, followingIdx]
const FOLLOWS = [
  [1, 0], [2, 0], [3, 0], [4, 0], // все подписаны на Ивана
  [0, 1], [2, 1], [3, 1], [4, 1], // все подписаны на Марию
  [0, 2], [1, 2],                  // Иван и Мария подписаны на Алексея
  [0, 3], [1, 3],                  // Иван и Мария подписаны на Дарью
];

// Сид ───────────────────────────────────────────────────────────────────────

async function seed() {
  await db.initialize();
  console.log('✓ Connected to database\n');

  const userRepo    = db.getRepository(User);
  const profileRepo = db.getRepository(Profile);
  const projectRepo = db.getRepository(Project);
  const followRepo  = db.getRepository(Follow);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const createdUsers: User[] = [];

  // Пользователи и профили ────────────────────────────────────────────────
  for (const data of SEED_USERS) {
    let user = await userRepo.findOne({ where: { email: data.email } });

    if (user) {
      console.log(`  skip  ${data.email} (already exists)`);
    } else {
      user = await userRepo.save(
        userRepo.create({ email: data.email, passwordHash, isEmailVerified: true }),
      );

      await profileRepo.save(
        profileRepo.create({
          userId: user.id,
          nickname: data.nickname,
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio,
          activityField: data.activityField,
          hardSkills: data.hardSkills,
          softSkills: data.softSkills,
          isProfilePublic: true,
          isFollowersPublic: true,
          isFollowingPublic: true,
          isFavoritesPublic: true,
        }),
      );

      for (const p of data.projects) {
        await projectRepo.save(
          projectRepo.create({
            userId: user.id,
            title: p.title,
            description: p.description,
            stack: p.stack,
            tags: [],
            isPublic: true,
            source: ProjectSource.MANUAL,
          }),
        );
      }

      console.log(`  ✓ created  ${data.email}  (${data.nickname})`);
    }

    createdUsers.push(user);
  }

  // Подписки ─────────────────────────────────────────────────────────────
  console.log('\nCreating follows...');
  let followsCreated = 0;

  for (const [fi, ti] of FOLLOWS) {
    const follower  = createdUsers[fi];
    const following = createdUsers[ti];
    if (!follower || !following) continue;

    const exists = await followRepo.findOne({
      where: { followerId: follower.id, followingId: following.id },
    });

    if (!exists) {
      await followRepo.save(
        followRepo.create({ followerId: follower.id, followingId: following.id }),
      );
      followsCreated++;
    }
  }

  console.log(`  ✓ ${followsCreated} follow(s) created`);

  // Итог ─────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Seed complete!');
  console.log(`Password for all accounts: ${SEED_PASSWORD}`);
  console.log('Accounts:');
  for (const u of SEED_USERS) {
    console.log(`  ${u.email}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await db.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
