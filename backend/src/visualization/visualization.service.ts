import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile, Project } from '../database/entities';

export interface InterestNode {
  id: string;
  weight: number; // количество проектов, в которых встречается
}

export interface InterestEdge {
  source: string;
  target: string;
  weight: number; // количество проектов, где встречаются вместе
}

export interface VisualizationData {
  // Radar chart — навыки с уровнями
  skills: { name: string; level: number }[];

  // Relationship diagram — граф интересов
  interests: {
    nodes: InterestNode[];
    edges: InterestEdge[];
  };

  // Coordinates graph
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

  // Для своего профиля — без проверки isPublic
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

  private buildInterestGraph(projects: Pick<Project, 'stack' | 'tags'>[]) {
    // Собираем все термины из stack + tags каждого проекта
    const projectTerms = projects.map((p) =>
      [...new Set([...p.stack, ...p.tags].map((t) => t.toLowerCase().trim()).filter(Boolean))],
    );

    // Считаем вес каждого термина (в скольких проектах встречается)
    const nodeWeights = new Map<string, number>();
    for (const terms of projectTerms) {
      for (const term of terms) {
        nodeWeights.set(term, (nodeWeights.get(term) ?? 0) + 1);
      }
    }

    // Считаем рёбра (совместное появление в одном проекте)
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
