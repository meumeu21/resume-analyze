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

type Doc = InstanceType<typeof PDFDocument>;

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

  async generateProfileResume(targetId: string, currentUserId: string): Promise<Buffer> {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const isOwn = targetId === currentUserId;

    const profile = await this.profileRepo.findOne({ where: { userId: targetId } });
    if (!profile) throw new NotFoundException('Профиль не найден');
    if (!isOwn && !profile.isProfilePublic) throw new ForbiddenException('Профиль недоступен');

    const [contacts, projects] = await Promise.all([
      this.contactRepo.find({
        where: isOwn ? { userId: targetId } : { userId: targetId, isPublic: true },
      }),
      this.projectRepo.find({
        where: isOwn ? { userId: targetId } : { userId: targetId, isPublic: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return this.buildResumePdf({ profile, contacts, projects });
  }

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
      doc.font('Bold').fontSize(22).fillColor('#222222').text(name, { align: 'center' });
      doc.font('Regular').fontSize(12).fillColor('#777777')
        .text(`@${profile.nickname}`, { align: 'center' });

      if (profile.activityField) {
        doc.moveDown(0.3).font('Bold').fontSize(13).fillColor('#2c7be5')
          .text(profile.activityField, { align: 'center' });
      }

      this.divider(doc);

      // --- Bio ---
      if (profile.bio) {
        this.section(doc, 'О себе');
        doc.font('Regular').fontSize(11).fillColor('#333333')
          .text(profile.bio, { align: 'justify' });
        doc.moveDown(0.8);
      }

      // --- Soft skills ---
      if (profile.softSkills.length) {
        this.section(doc, 'Soft skills');
        doc.font('Regular').fontSize(10).fillColor('#333333')
          .text(profile.softSkills.join('  •  '));
        doc.moveDown(0.8);
      }

      // --- Radar chart (hard skills) ---
      if (profile.hardSkills.length >= 3) {
        this.section(doc, 'Hard skills');
        const chartY = doc.y + 10;
        const cx = 297; // центр A4 по горизонтали
        this.drawRadarChart(doc, profile.hardSkills, cx, chartY + 110, 90);
        doc.y = chartY + 230;
        doc.moveDown(0.5);
      } else if (profile.hardSkills.length > 0) {
        // Меньше 3 навыков — просто список
        this.section(doc, 'Hard skills');
        for (const s of profile.hardSkills) {
          doc.font('Regular').fontSize(10).fillColor('#333333')
            .text(`${s.name}  —  ${'★'.repeat(s.level)}${'☆'.repeat(5 - s.level)}`);
        }
        doc.moveDown(0.8);
      }

      // --- Coordinates graph ---
      if (profile.coordinates) {
        this.section(doc, 'Позиционирование разработчика');
        const cx = 297;
        const cy = doc.y + 80;
        this.drawCoordinatesGraph(doc, profile.coordinates, cx, cy, 70);
        doc.y = cy + 90;
        doc.moveDown(0.5);
      }

      // --- Граф интересов (облако из проектов) ---
      const interests = this.buildInterestCloud(projects);
      if (interests.length) {
        this.section(doc, 'Сфера интересов');
        this.drawInterestCloud(doc, interests);
        doc.moveDown(0.8);
      }

      // --- Контакты ---
      if (contacts.length) {
        this.section(doc, 'Контакты');
        for (const c of contacts) {
          doc.font('Regular').fontSize(10).fillColor('#333333')
            .text(`${c.type}: `, { continued: true })
            .fillColor('#2c7be5').text(c.url);
        }
        doc.moveDown(0.8);
      }

      this.divider(doc);

      // --- Проекты ---
      if (projects.length) {
        this.section(doc, 'Проекты');
        for (const p of projects) {
          doc.font('Bold').fontSize(12).fillColor('#222222').text(p.title);

          if (p.description) {
            doc.font('Regular').fontSize(10).fillColor('#444444')
              .text(p.description, { align: 'justify' });
          }

          const meta: string[] = [];
          if (p.role) meta.push(`Роль: ${p.role}`);
          if (meta.length) {
            doc.font('Regular').fontSize(9).fillColor('#888888').text(meta.join('  •  '));
          }

          if (p.stack.length) {
            doc.font('Regular').fontSize(9).fillColor('#2c7be5')
              .text(`Стек: ${p.stack.join(', ')}`);
          }

          if (p.tags.length) {
            doc.font('Regular').fontSize(9).fillColor('#888888')
              .text(`Теги: ${p.tags.join(', ')}`);
          }

          if (p.repoUrl) {
            doc.font('Regular').fontSize(9).fillColor('#2c7be5').text(p.repoUrl);
          }

          doc.moveDown(0.7);
        }
      }

      doc.end();
    });
  }

  // --- Radar chart ---
  private drawRadarChart(
    doc: Doc,
    skills: { name: string; level: number }[],
    cx: number,
    cy: number,
    r: number,
  ) {
    const n = skills.length;
    const step = (2 * Math.PI) / n;
    const angleOf = (i: number) => i * step - Math.PI / 2;

    // Сетка (5 уровней)
    for (let lvl = 1; lvl <= 5; lvl++) {
      const rLvl = (lvl / 5) * r;
      const pts = skills.map((_, i) => {
        const a = angleOf(i);
        return { x: cx + rLvl * Math.cos(a), y: cy + rLvl * Math.sin(a) };
      });
      doc.save();
      doc.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) doc.lineTo(pts[i].x, pts[i].y);
      doc.closePath()
        .strokeColor(lvl === 5 ? '#bbbbbb' : '#e8e8e8')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    }

    // Оси
    for (let i = 0; i < n; i++) {
      const a = angleOf(i);
      doc.save()
        .moveTo(cx, cy)
        .lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        .strokeColor('#cccccc').lineWidth(0.5).stroke()
        .restore();
    }

    // Закрашенная фигура навыков
    const skillPts = skills.map((s, i) => {
      const a = angleOf(i);
      const rS = (s.level / 5) * r;
      return { x: cx + rS * Math.cos(a), y: cy + rS * Math.sin(a) };
    });

    doc.save();
    doc.moveTo(skillPts[0].x, skillPts[0].y);
    for (let i = 1; i < skillPts.length; i++) doc.lineTo(skillPts[i].x, skillPts[i].y);
    doc.closePath()
      .fillColor('#2c7be5').fillOpacity(0.25).fill();
    doc.restore();

    doc.save();
    doc.moveTo(skillPts[0].x, skillPts[0].y);
    for (let i = 1; i < skillPts.length; i++) doc.lineTo(skillPts[i].x, skillPts[i].y);
    doc.closePath()
      .strokeColor('#2c7be5').lineWidth(1.5).stroke();
    doc.restore();

    // Подписи навыков
    for (let i = 0; i < n; i++) {
      const a = angleOf(i);
      const labelR = r + 18;
      const lx = cx + labelR * Math.cos(a) - 30;
      const ly = cy + labelR * Math.sin(a) - 6;
      doc.font('Regular').fontSize(7).fillColor('#444444')
        .text(skills[i].name, lx, ly, { width: 60, align: 'center' });
    }
  }

  // --- Coordinates graph ---
  private drawCoordinatesGraph(
    doc: Doc,
    coords: { x: number; y: number },
    cx: number,
    cy: number,
    r: number,
  ) {
    // Оси
    doc.save()
      .moveTo(cx - r, cy).lineTo(cx + r, cy)
      .strokeColor('#aaaaaa').lineWidth(1).stroke()
      .restore();
    doc.save()
      .moveTo(cx, cy - r).lineTo(cx, cy + r)
      .strokeColor('#aaaaaa').lineWidth(1).stroke()
      .restore();

    // Стрелки
    const arr = 5;
    doc.save()
      .moveTo(cx + r, cy).lineTo(cx + r - arr, cy - arr / 2)
      .moveTo(cx + r, cy).lineTo(cx + r - arr, cy + arr / 2)
      .strokeColor('#aaaaaa').lineWidth(1).stroke()
      .restore();
    doc.save()
      .moveTo(cx, cy - r).lineTo(cx - arr / 2, cy - r + arr)
      .moveTo(cx, cy - r).lineTo(cx + arr / 2, cy - r + arr)
      .strokeColor('#aaaaaa').lineWidth(1).stroke()
      .restore();

    // Метки осей
    doc.font('Regular').fontSize(7).fillColor('#666666')
      .text('Низкоуровневое', cx - r - 2, cy + 3, { width: 70, align: 'right' })
      .text('Высокоуровневое', cx + r - 68, cy + 3, { width: 70 })
      .text('Инженерный', cx - 25, cy - r - 14, { width: 50, align: 'center' })
      .text('Продуктовый', cx - 25, cy + r + 4, { width: 50, align: 'center' });

    // Квадранты (лёгкая заливка)
    const colors = ['#eaf2ff', '#fff4ea', '#eafff0', '#fff0f5'];
    const quads = [
      { dx: 0, dy: -r, w: r, h: r },
      { dx: 0, dy: 0, w: r, h: r },
      { dx: -r, dy: -r, w: r, h: r },
      { dx: -r, dy: 0, w: r, h: r },
    ];
    quads.forEach(({ dx, dy, w, h }, qi) => {
      doc.save()
        .rect(cx + dx, cy + dy, w, h)
        .fillColor(colors[qi]).fillOpacity(0.4).fill()
        .restore();
    });

    // Точка разработчика
    const px = cx + (coords.x / 5) * r;
    const py = cy - (coords.y / 5) * r;
    doc.save()
      .circle(px, py, 6)
      .fillColor('#2c7be5').fillOpacity(1).fill()
      .restore();
    doc.save()
      .circle(px, py, 6)
      .strokeColor('#ffffff').lineWidth(1.5).stroke()
      .restore();
  }

  // --- Interest cloud ---
  private buildInterestCloud(projects: Project[]) {
    const weights = new Map<string, number>();
    for (const p of projects) {
      for (const term of [...p.stack, ...p.tags]) {
        const t = term.trim();
        if (t) weights.set(t, (weights.get(t) ?? 0) + 1);
      }
    }
    return [...weights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, weight]) => ({ name, weight }));
  }

  private drawInterestCloud(doc: Doc, interests: { name: string; weight: number }[]) {
    const maxWeight = interests[0]?.weight ?? 1;
    let x = 50;
    const startY = doc.y;
    let y = startY;
    const lineH = 22;

    for (const { name, weight } of interests) {
      const fontSize = 8 + Math.round((weight / maxWeight) * 6);
      const textW = name.length * fontSize * 0.55 + 16;

      if (x + textW > 545) {
        x = 50;
        y += lineH;
      }

      // Badge background
      doc.save()
        .roundedRect(x, y, textW, lineH - 4, 4)
        .fillColor('#eef4ff').fillOpacity(0.8).fill()
        .restore();

      doc.font('Regular').fontSize(fontSize).fillColor('#2c7be5')
        .text(name, x + 6, y + (lineH - 4 - fontSize) / 2 + 2, {
          width: textW - 10,
          lineBreak: false,
        });

      x += textW + 6;
    }

    doc.y = y + lineH + 4;
  }

  // --- Template ---

  private buildTemplatePdf(): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      this.registerFonts(doc);
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.font('Bold').fontSize(22).fillColor('#222222')
        .text('[ Имя Фамилия ]', { align: 'center' });
      doc.font('Regular').fontSize(11).fillColor('#888888')
        .text('[ Сфера деятельности ]', { align: 'center' });

      this.divider(doc);

      this.section(doc, 'О себе');
      this.blankLines(doc, 3);

      this.section(doc, 'Hard skills (radar chart)');
      doc.font('Regular').fontSize(10).fillColor('#bbbbbb')
        .text('[ Здесь будет radar chart навыков с уровнями 1–5 ]');
      doc.moveDown();

      this.section(doc, 'Soft skills');
      this.blankLines(doc, 1);

      this.section(doc, 'Позиционирование');
      doc.font('Regular').fontSize(10).fillColor('#bbbbbb')
        .text('[ Здесь будет coordinates graph ]');
      doc.moveDown();

      this.section(doc, 'Сфера интересов');
      doc.font('Regular').fontSize(10).fillColor('#bbbbbb')
        .text('[ Здесь будет облако тегов из проектов ]');
      doc.moveDown();

      this.section(doc, 'Контакты');
      this.templateRow(doc, 'GitHub');
      this.templateRow(doc, 'Telegram');
      doc.moveDown();

      this.divider(doc);

      this.section(doc, 'Проекты');
      for (let i = 1; i <= 2; i++) {
        doc.font('Bold').fontSize(12).fillColor('#999999').text(`[ Проект ${i} ]`);
        doc.font('Regular').fontSize(10).fillColor('#bbbbbb')
          .text('[ Описание • Стек • Теги ]');
        doc.moveDown(0.5);
      }

      doc.end();
    });
  }

  // --- Helpers ---

  private registerFonts(doc: Doc) {
    doc.registerFont('Regular', this.fontRegular);
    doc.registerFont('Bold', this.fontBold);
    doc.font('Regular');
  }

  private divider(doc: Doc) {
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').lineWidth(1).stroke();
    doc.moveDown(0.5);
  }

  private section(doc: Doc, title: string) {
    doc.font('Bold').fontSize(13).fillColor('#2c7be5').text(title.toUpperCase());
    doc.moveDown(0.3);
  }

  private templateRow(doc: Doc, label: string) {
    doc.font('Bold').fontSize(10).fillColor('#444444')
      .text(`${label}: `, { continued: true })
      .font('Regular').fillColor('#cccccc')
      .text('___________________________________________');
  }

  private blankLines(doc: Doc, count: number) {
    for (let i = 0; i < count; i++) {
      doc.font('Regular').fontSize(11).fillColor('#cccccc')
        .text('_______________________________________________');
    }
  }
}
