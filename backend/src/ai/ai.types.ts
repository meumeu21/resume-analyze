export interface ResumeProject {
  title: string;
  description: string;
  stack: string;
}

export interface ResumeData {
  first_name: string;
  last_name: string;
  job_title: string;
  about: string;
  hard_skills: string;
  soft_skills: string;
  projects: ResumeProject[];
}

export interface ImprovementRecommendation {
  title: string;
  description: string;
}

export interface ProjectIdea {
  title: string;
  description: string;
  stack: string[];
  benefit: string;
}

export interface ImprovementsData {
  recommendations: ImprovementRecommendation[];
  project_ideas: ProjectIdea[];
}
