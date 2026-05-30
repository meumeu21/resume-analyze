import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile, Project } from '../database/entities';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
type Doc = InstanceType<typeof PDFDocument>;

export interface InterestNode {
  id: string;
  weight: number;
}

export interface InterestEdge {
  source: string;
  target: string;
  weight: number;
}

export interface VisualizationData {
  skills: { name: string; level: number }[];
  interests: {
    nodes: InterestNode[];
    edges: InterestEdge[];
  };
  coordinates: { x: number; y: number } | null;
}

@Injectable()
export class VisualizationService {
  constructor(
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async getVisualizationData(userId: string): Promise<VisualizationData> {
    const profile = await this.profileRepo.findOne({
      where: { userId, isProfilePublic: true },
    });
    if (!profile) throw new NotFoundException('Пользователь не найден');

    const projects = await this.projectRepo.find({
      where: { userId, isPublic: true },
      select: ['stack', 'tags'],
    });

    return {
      skills: profile.hardSkills,
      interests: this.buildInterestGraph(projects),
      coordinates: profile.coordinates,
    };
  }

  async getMyVisualizationData(userId: string): Promise<VisualizationData> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Профиль не найден');

    const projects = await this.projectRepo.find({
      where: { userId },
      select: ['stack', 'tags'],
    });

    return {
      skills: profile.hardSkills,
      interests: this.buildInterestGraph(projects),
      coordinates: profile.coordinates,
    };
  }

  drawRadarChart(
    doc: Doc,
    skills: { name: string; level: number }[],
    cx: number,
    cy: number,
    r: number,
  ) {
    const n = skills.length;
    const step = (2 * Math.PI) / n;
    const angleOf = (i: number) => i * step - Math.PI / 2;

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

    for (let i = 0; i < n; i++) {
      const a = angleOf(i);
      doc.save()
        .moveTo(cx, cy)
        .lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        .strokeColor('#cccccc').lineWidth(0.5).stroke()
        .restore();
    }

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

    for (let i = 0; i < n; i++) {
      const a = angleOf(i);
      const labelR = r + 18;
      const lx = cx + labelR * Math.cos(a) - 30;
      const ly = cy + labelR * Math.sin(a) - 6;
      doc.font('Regular').fontSize(7).fillColor('#444444')
        .text(skills[i].name, lx, ly, { width: 60, align: 'center' });
    }
  }

  drawCoordinatesGraph(
    doc: Doc,
    coords: { x: number; y: number },
    cx: number,
    cy: number,
    r: number,
  ) {
    doc.save()
      .moveTo(cx - r, cy).lineTo(cx + r, cy)
      .strokeColor('#aaaaaa').lineWidth(1).stroke()
      .restore();
    doc.save()
      .moveTo(cx, cy - r).lineTo(cx, cy + r)
      .strokeColor('#aaaaaa').lineWidth(1).stroke()
      .restore();

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

    doc.font('Regular').fontSize(7).fillColor('#666666')
      .text('Низкоуровневое', cx - r - 2, cy + 3, { width: 70, align: 'right' })
      .text('Высокоуровневое', cx + r - 68, cy + 3, { width: 70 })
      .text('Инженерный', cx - 25, cy - r - 14, { width: 50, align: 'center' })
      .text('Продуктовый', cx - 25, cy + r + 4, { width: 50, align: 'center' });

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

  buildInterestCloud(projects: Project[]) {
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

  drawInterestCloud(doc: Doc, interests: { name: string; weight: number }[]) {
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

  private buildInterestGraph(projects: Pick<Project, 'stack' | 'tags'>[]) {
    const projectTerms = projects.map((p) =>
      [...new Set([...p.stack, ...p.tags].map((t) => t.toLowerCase().trim()).filter(Boolean))],
    );

    const nodeWeights = new Map<string, number>();
    for (const terms of projectTerms) {
      for (const term of terms) {
        nodeWeights.set(term, (nodeWeights.get(term) ?? 0) + 1);
      }
    }

    const edgeWeights = new Map<string, number>();
    for (const terms of projectTerms) {
      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < terms.length; j++) {
          const key = [terms[i], terms[j]].sort().join('|||');
          edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
        }
      }
    }

    const nodes: InterestNode[] = Array.from(nodeWeights.entries()).map(([id, weight]) => ({
      id,
      weight,
    }));

    const edges: InterestEdge[] = Array.from(edgeWeights.entries()).map(([key, weight]) => {
      const [source, target] = key.split('|||');
      return { source, target, weight };
    });

    return { nodes, edges };
  }
}
