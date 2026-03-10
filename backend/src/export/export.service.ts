import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import * as path from 'path';
import { Repository } from 'typeorm';
import {
  ContactLink, Profile, Project, User,
} from '../database/entities';

@Injectable()
export class ExportService {
  private readonly fontRegular = path.join(process.cwd(), 'fonts', 'DejaVuSans.ttf');
  private readonly fontBold = path.join(process.cwd(), 'fonts', 'DejaVuSans-Bold.ttf');

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(ContactLink) private readonly contactRepo: Repository<ContactLink>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  // Скачать резюме профиля (своего полного или публичного чужого)
  async generateProfileResume(targetId: string, currentUserId: string): Promise<Buffer> {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const isOwn = targetId === currentUserId;

    const profile = await this.profileRepo.findOne({ where: { userId: targetId } });
    if (!profile) throw new NotFoundException('Профиль не найден');
    if (!isOwn && !profile.isProfilePublic) throw new ForbiddenException('Профиль недоступен');

    const contacts = await this.contactRepo.find({
      where: isOwn ? { userId: targetId } : { userId: targetId, isPublic: true },
    });

    const projects = await this.projectRepo.find({
      where: isOwn ? { userId: targetId } : { userId: targetId, isPublic: true },
      order: { createdAt: 'DESC' },
    });

    return this.buildResumePdf({ profile, contacts, projects });
  }

  // Скачать пустой шаблон для заполнения вручную
  async generateBlankTemplate(): Promise<Buffer> {
    return this.buildTemplatePdf();
  }

  // --- PDF builders ---

  private buildResumePdf(data: {
    profile: Profile;
    contacts: ContactLink[];
    projects: Project[];
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      this.registerFonts(doc);
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const { profile, contacts, projects } = data;
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
        || profile.nickname;

      // --- Шапка ---
      doc.font('Bold').fontSize(22).text(name, { align: 'center' });
      doc.font('Regular').fontSize(12).fillColor('#555555')
        .text(`@${profile.nickname}`, { align: 'center' });

      if (profile.activityField) {
        doc.moveDown(0.3).fontSize(13).fillColor('#2c7be5')
          .text(profile.activityField, { align: 'center' });
      }

      this.divider(doc);

      // --- О себе ---
      if (profile.bio) {
        this.section(doc, 'О себе');
        doc.font('Regular').fontSize(11).fillColor('#222222').text(profile.bio, { align: 'justify' });
        doc.moveDown();
      }

      // --- Навыки ---
      const hasSkills = profile.hardSkills.length || profile.softSkills.length || profile.tools.length;
      if (hasSkills) {
        this.section(doc, 'Навыки');
        if (profile.hardSkills.length) {
          this.skillRow(doc, 'Hard skills', profile.hardSkills);
        }
        if (profile.softSkills.length) {
          this.skillRow(doc, 'Soft skills', profile.softSkills);
        }
        if (profile.tools.length) {
          this.skillRow(doc, 'Инструменты', profile.tools);
        }
        doc.moveDown();
      }

      // --- Контакты ---
      if (contacts.length) {
        this.section(doc, 'Контакты');
        for (const c of contacts) {
          doc.font('Regular').fontSize(11).fillColor('#222222')
            .text(`${c.type}: `, { continued: true })
            .fillColor('#2c7be5').text(c.url);
        }
        doc.moveDown();
      }

      // --- Проекты ---
      if (projects.length) {
        this.section(doc, 'Проекты');
        for (const p of projects) {
          doc.font('Bold').fontSize(12).fillColor('#222222').text(p.title);
          if (p.description) {
            doc.font('Regular').fontSize(10).fillColor('#444444')
              .text(p.description, { align: 'justify' });
          }
          if (p.stack.length) {
            doc.font('Regular').fontSize(10).fillColor('#888888')
              .text(`Стек: ${p.stack.join(', ')}`);
          }
          if (p.repoUrl) {
            doc.fillColor('#2c7be5').text(p.repoUrl);
          }
          doc.moveDown(0.5);
        }
      }

      doc.end();
    });
  }

  private buildTemplatePdf(): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      this.registerFonts(doc);
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // --- Шапка ---
      doc.font('Bold').fontSize(22).fillColor('#222222')
        .text('[ Имя Фамилия ]', { align: 'center' });
      doc.font('Regular').fontSize(11).fillColor('#888888')
        .text('[ Возраст ]  •  [ Город ]  •  [ Email ]', { align: 'center' });

      this.divider(doc);

      // --- О себе ---
      this.section(doc, 'О себе');
      doc.font('Regular').fontSize(11).fillColor('#888888')
        .text('[ Здесь нейросеть сгенерирует описание вашего профиля ]');
      doc.moveDown(0.5);
      this.blankLines(doc, 3);

      // --- Навыки ---
      this.section(doc, 'Навыки');
      this.templateRow(doc, 'Hard skills');
      this.templateRow(doc, 'Soft skills');
      this.templateRow(doc, 'Инструменты');
      doc.moveDown();

      // --- Опыт работы ---
      this.section(doc, 'Опыт работы');
      this.blankLines(doc, 4);

      // --- Образование ---
      this.section(doc, 'Образование');
      this.blankLines(doc, 3);

      // --- Контакты ---
      this.section(doc, 'Контакты');
      this.templateRow(doc, 'GitHub');
      this.templateRow(doc, 'Telegram');
      this.templateRow(doc, 'LinkedIn');
      doc.moveDown();

      // --- Проекты ---
      this.section(doc, 'Проекты');
      for (let i = 1; i <= 2; i++) {
        doc.font('Bold').fontSize(12).fillColor('#999999')
          .text(`[ Название проекта ${i} ]`);
        doc.font('Regular').fontSize(10).fillColor('#888888')
          .text('[ Здесь нейросеть сгенерирует описание проекта ]');
        this.blankLines(doc, 1);
        doc.moveDown(0.5);
      }

      doc.end();
    });
  }

  // --- Helpers ---

  private registerFonts(doc: InstanceType<typeof PDFDocument>) {
    doc.registerFont('Regular', this.fontRegular);
    doc.registerFont('Bold', this.fontBold);
    doc.font('Regular');
  }

  private divider(doc: InstanceType<typeof PDFDocument>) {
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').lineWidth(1).stroke();
    doc.moveDown(0.5);
  }

  private section(doc: InstanceType<typeof PDFDocument>, title: string) {
    doc.font('Bold').fontSize(13).fillColor('#2c7be5').text(title.toUpperCase());
    doc.moveDown(0.3);
  }

  private skillRow(doc: InstanceType<typeof PDFDocument>, label: string, skills: string[]) {
    doc.font('Bold').fontSize(10).fillColor('#444444')
      .text(`${label}: `, { continued: true })
      .font('Regular').fillColor('#222222').text(skills.join(' • '));
  }

  private templateRow(doc: InstanceType<typeof PDFDocument>, label: string) {
    doc.font('Bold').fontSize(10).fillColor('#444444')
      .text(`${label}: `, { continued: true })
      .font('Regular').fillColor('#cccccc')
      .text('___________________________________________');
  }

  private blankLines(doc: InstanceType<typeof PDFDocument>, count: number) {
    for (let i = 0; i < count; i++) {
      doc.font('Regular').fontSize(11).fillColor('#cccccc')
        .text('_______________________________________________');
    }
  }
}
