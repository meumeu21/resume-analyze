import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export const PDF_EXPORT_QUEUE = 'pdf-export';
import { InjectRepository } from '@nestjs/typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import * as path from 'path';
import PizZip from 'pizzip';
import { Repository } from 'typeorm';
import {
  AiReport, ContactLink, Profile, Project, ReportStatus, ReportType, User,
} from '../database/entities';
import { VisualizationService } from '../visualization/visualization.service';

type Doc = InstanceType<typeof PDFDocument>;

const TYPE_LABELS: Record<string, string> = {
  github: 'GitHub',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  website: 'Сайт',
  other: 'Ссылка',
};

@Injectable()
export class ExportService {
  private readonly fontRegular = path.join(process.cwd(), 'fonts', 'DejaVuSans.ttf');
  private readonly fontBold = path.join(process.cwd(), 'fonts', 'DejaVuSans-Bold.ttf');

  constructor(
    @InjectRepository(AiReport) private readonly reportRepo: Repository<AiReport>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(ContactLink) private readonly contactRepo: Repository<ContactLink>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    private readonly visualizationService: VisualizationService,
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

  async generateResumeDocx(reportId: string, userId: string): Promise<{ buffer: Buffer; nickname: string }> {
    const report = await this.reportRepo.findOne({ where: { id: reportId, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    if (report.reportType !== ReportType.RESUME) throw new BadRequestException('Не является отчётом резюме');
    if (report.status !== ReportStatus.DONE) throw new BadRequestException('Отчёт ещё не готов');
    if (!report.rawResponse) throw new BadRequestException('Нет данных резюме');

    const data = report.rawResponse as unknown as {
      job_title: string;
      about: string;
      hard_skills: string;
      soft_skills: string;
      projects: Array<{ title: string; description: string; stack: string }>;
    };

    const [profile, contactLinks] = await Promise.all([
      this.profileRepo.findOne({ where: { userId } }),
      this.contactRepo.find({ where: { userId } }),
    ]);

    const typeOrder = ['github', 'linkedin', 'telegram', 'website', 'other'];
    const links = [...contactLinks]
      .sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))
      .slice(0, 5);

    const buffer = this.buildResumeDocx({
      firstName: profile?.nickname ?? '',
      jobTitle: data.job_title || '',
      about: data.about || '',
      hardSkills: data.hard_skills || '',
      softSkills: data.soft_skills || '',
      projects: Array.isArray(data.projects) ? data.projects : [],
      contactLinks: links,
    });

    const nickname = (profile?.nickname ?? 'user').replace(/[^a-zA-Z0-9_-]/g, '-');
    return { buffer, nickname };
  }

  private buildResumeDocx(params: {
    firstName: string;
    jobTitle: string;
    about: string;
    hardSkills: string;
    softSkills: string;
    projects: Array<{ title: string; description: string; stack: string }>;
    contactLinks: ContactLink[];
  }): Buffer {
    const { firstName, jobTitle, about, hardSkills, softSkills, projects, contactLinks } = params;

    const xmlEsc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const rpr = (opts: { bold?: boolean; size?: number; color?: string }) => {
      const { bold = false, size = 22, color = '333333' } = opts;
      return (
        `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>` +
        (bold ? '<w:b/>' : '') +
        `<w:color w:val="${color}"/>` +
        `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
      );
    };

    const para = (content: string, pprExtra = '') =>
      `<w:p><w:pPr>${pprExtra}</w:pPr>${content}</w:p>`;

    const textRun = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
      `<w:r><w:rPr>${rpr(opts)}</w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;

    const centeredPara = (content: string, spacingAttr = 'w:before="0" w:after="80"') =>
      para(content, `<w:jc w:val="center"/><w:spacing ${spacingAttr}/>`);

    const sectionHeader = (title: string) =>
      para(
        textRun(title, { bold: true, size: 24, color: '1e3a5f' }),
        '<w:spacing w:before="320" w:after="120"/>' +
        '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="2C7BE5"/></w:pBdr>',
      );

    const bodyPara = (content: string) =>
      para(content, '<w:spacing w:before="0" w:after="100"/>');

    const multiLinePara = (text: string, opts: Parameters<typeof textRun>[1] = {}) =>
      text.split('\n')
        .filter((line) => line.trim())
        .map((line) => bodyPara(textRun(line, opts)))
        .join('');

    const boldRuns = (text: string, opts: { size?: number; color?: string } = {}) =>
      text.split(/(\*\*[^*]+\*\*)/).map((part) =>
        part.startsWith('**') && part.endsWith('**')
          ? textRun(part.slice(2, -2), { ...opts, bold: true })
          : textRun(part, opts),
      ).join('');

    const contactPara = (rId: string, label: string, url: string) =>
      `<w:p><w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr>` +
      `<w:r><w:rPr>${rpr({ bold: true, size: 22, color: '1e3a5f' })}</w:rPr>` +
      `<w:t xml:space="preserve">${xmlEsc(label)}  </w:t></w:r>` +
      `<w:hyperlink r:id="${rId}" w:history="1">` +
      `<w:r><w:rPr>${rpr({ size: 22, color: '2563EB' })}<w:u w:val="single"/></w:rPr>` +
      `<w:t xml:space="preserve">${xmlEsc(url)}</w:t></w:r></w:hyperlink></w:p>`;

    const parts: string[] = [];

    // Name
    parts.push(centeredPara(
      textRun(firstName || 'Пользователь', { bold: true, size: 56, color: '1e3a5f' }),
      'w:before="0" w:after="100"',
    ));

    // Job title
    if (jobTitle) {
      parts.push(centeredPara(
        textRun(jobTitle, { size: 28, color: '2C7BE5' }),
        'w:before="0" w:after="60"',
      ));
    }

    // Header divider
    parts.push(para('',
      '<w:spacing w:before="120" w:after="120"/>' +
      '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="2C7BE5"/></w:pBdr>',
    ));

    if (contactLinks.length) {
      parts.push(sectionHeader('КОНТАКТЫ'));
      contactLinks.forEach((link, i) => {
        const label = TYPE_LABELS[link.type] || link.type;
        parts.push(contactPara(`rId${10 + i}`, label, link.url));
      });
    }

    if (about) {
      parts.push(sectionHeader('О СЕБЕ'));
      parts.push(multiLinePara(about));
    }

    if (hardSkills) {
      parts.push(sectionHeader('ИНСТРУМЕНТЫ'));
      parts.push(bodyPara(boldRuns(hardSkills)));
    }

    if (softSkills) {
      parts.push(sectionHeader('SOFT SKILLS'));
      parts.push(bodyPara(boldRuns(softSkills)));
    }

    if (projects.length) {
      parts.push(sectionHeader('ПРОЕКТЫ'));
      projects.forEach((p, i) => {
        if (i > 0) {
          parts.push(para('',
            '<w:spacing w:before="0" w:after="0"/>' +
            '<w:pBdr><w:bottom w:val="single" w:sz="2" w:space="1" w:color="E5E7EB"/></w:pBdr>',
          ));
        }
        parts.push(para(
          textRun(p.title, { bold: true, size: 24, color: '1e3a5f' }),
          '<w:spacing w:before="160" w:after="60"/>',
        ));
        if (p.description) {
          parts.push(bodyPara(textRun(p.description, { size: 22, color: '444444' })));
        }
        if (p.stack) {
          parts.push(bodyPara(
            textRun('Стек: ', { bold: true, size: 20, color: '2C7BE5' }) +
            boldRuns(p.stack, { size: 20, color: '2563EB' }),
          ));
        }
      });
    }

    const hyperlinkRels = contactLinks.map((link, i) =>
      `<Relationship Id="rId${10 + i}" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" ` +
      `Target="${xmlEsc(link.url)}" TargetMode="External"/>`,
    ).join('');

    const relsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      hyperlinkRels +
      `</Relationships>`;

    const docXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<w:body>${parts.join('')}` +
      `<w:sectPr>` +
      `<w:pgSz w:w="11906" w:h="16838"/>` +
      `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>` +
      `</w:sectPr></w:body></w:document>`;

    const zip = new PizZip();

    zip.file('[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
    );

    zip.file('_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
    );

    zip.file('word/_rels/document.xml.rels', relsXml);
    zip.file('word/document.xml', docXml);

    return zip.generate({ type: 'nodebuffer' }) as Buffer;
  }

  async generateTextDocx(reportId: string, userId: string): Promise<{ buffer: Buffer; nickname: string }> {
    const report = await this.reportRepo.findOne({ where: { id: reportId, userId } });
    if (!report) throw new NotFoundException('Отчёт не найден');
    if (report.reportType !== ReportType.RESUME) throw new BadRequestException('Не является отчётом резюме');
    if (report.status !== ReportStatus.DONE) throw new BadRequestException('Отчёт ещё не готов');

    const profile = await this.profileRepo.findOne({ where: { userId } });
    const nickname = (profile?.nickname ?? 'user').replace(/[^a-zA-Z0-9_-]/g, '-');
    return { buffer: this.createTextDocx(report.summary ?? ''), nickname };
  }

  private createTextDocx(text: string): Buffer {
    const xmlEsc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const paragraphs = text.split('\n').map((line) =>
      `<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${xmlEsc(line)}</w:t></w:r></w:p>`,
    ).join('');

    const zip = new PizZip();

    zip.file('[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
    );

    zip.file('_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
    );

    zip.file('word/_rels/document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    );

    zip.file('word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${paragraphs}<w:sectPr/></w:body>` +
      `</w:document>`,
    );

    return zip.generate({ type: 'nodebuffer' }) as Buffer;
  }

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
      const PW = 595.28;
      const MARGIN = 50;
      const CW = PW - MARGIN * 2;

      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
        || profile.nickname;
      const showNickname = !!(profile.nickname && name !== profile.nickname);

      // ── Colored header ─────────────────────────────────────
      const HEADER_H = 130;
      doc.rect(0, 0, PW, HEADER_H).fill('#1e3a5f');

      const linesInHeader =
        1 + (showNickname ? 1 : 0) + (profile.activityField ? 1 : 0);
      const lineH = 20;
      let headerY = (HEADER_H - linesInHeader * lineH) / 2;

      doc.font('Bold').fontSize(22).fillColor('#ffffff')
        .text(name, MARGIN, headerY, { width: CW, align: 'center' });
      headerY += lineH + 2;

      if (showNickname) {
        doc.font('Regular').fontSize(11).fillColor('#93c5fd')
          .text(`@${profile.nickname}`, MARGIN, headerY, { width: CW, align: 'center' });
        headerY += lineH;
      }

      if (profile.activityField) {
        doc.font('Regular').fontSize(12).fillColor('#93c5fd')
          .text(profile.activityField, MARGIN, headerY, { width: CW, align: 'center' });
      }

      // Reset cursor below header
      doc.y = HEADER_H + 20;

      // ── Content ────────────────────────────────────────────
      if (profile.bio) {
        this.section(doc, 'О себе');
        doc.font('Regular').fontSize(11).fillColor('#333333')
          .text(profile.bio, { align: 'justify' });
        doc.moveDown(0.8);
      }

      if (profile.softSkills.length) {
        this.section(doc, 'Soft skills');
        doc.font('Regular').fontSize(10).fillColor('#333333')
          .text(profile.softSkills.join('  ·  '));
        doc.moveDown(0.8);
      }

      if (profile.hardSkills.length >= 3) {
        this.section(doc, 'Hard skills');
        const chartY = doc.y + 10;
        const cx = 297;
        this.visualizationService.drawRadarChart(doc, profile.hardSkills, cx, chartY + 110, 90);
        doc.y = chartY + 230;
        doc.moveDown(0.5);
      } else if (profile.hardSkills.length > 0) {
        this.section(doc, 'Hard skills');
        for (const s of profile.hardSkills) {
          doc.font('Regular').fontSize(10).fillColor('#333333')
            .text(`${s.name}  —  ${'★'.repeat(s.level)}${'☆'.repeat(5 - s.level)}`);
        }
        doc.moveDown(0.8);
      }

      if (profile.coordinates) {
        this.section(doc, 'Позиционирование разработчика');
        const cx = 297;
        const cy = doc.y + 80;
        this.visualizationService.drawCoordinatesGraph(doc, profile.coordinates, cx, cy, 70);
        doc.y = cy + 90;
        doc.moveDown(0.5);
      }

      const interests = this.visualizationService.buildInterestCloud(projects);
      if (interests.length) {
        this.section(doc, 'Сфера интересов');
        this.visualizationService.drawInterestCloud(doc, interests);
        doc.moveDown(0.8);
      }

      if (contacts.length) {
        this.section(doc, 'Контакты');
        for (const c of contacts) {
          const label = TYPE_LABELS[c.type] || c.type;
          doc.font('Bold').fontSize(10).fillColor('#1e3a5f')
            .text(`${label}   `, { continued: true })
            .font('Regular').fillColor('#2563eb')
            .text(c.url, { link: c.url, underline: true });
        }
        doc.moveDown(0.8);
      }

      this.divider(doc);

      if (projects.length) {
        this.section(doc, 'Проекты');
        for (const p of projects) {
          doc.font('Bold').fontSize(12).fillColor('#1e3a5f').text(p.title);

          if (p.description) {
            doc.font('Regular').fontSize(10).fillColor('#444444')
              .text(p.description, { align: 'justify' });
          }

          const meta: string[] = [];
          if (p.role) meta.push(`Роль: ${p.role}`);
          if (meta.length) {
            doc.font('Regular').fontSize(9).fillColor('#888888').text(meta.join('  ·  '));
          }

          if (p.stack.length) {
            doc.font('Regular').fontSize(9).fillColor('#2563eb')
              .text(`Стек: ${p.stack.join(', ')}`);
          }

          if (p.tags.length) {
            doc.font('Regular').fontSize(9).fillColor('#888888')
              .text(`Теги: ${p.tags.join(', ')}`);
          }

          if (p.repoUrl) {
            doc.font('Regular').fontSize(9).fillColor('#2563eb')
              .text(p.repoUrl, { link: p.repoUrl, underline: true });
          }

          doc.moveDown(0.7);
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
    doc.moveDown(0.5);
    doc.font('Bold').fontSize(12).fillColor('#1e3a5f').text(title.toUpperCase());
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#2C7BE5').lineWidth(1.5).stroke();
    doc.moveDown(0.5);
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
