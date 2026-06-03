import { ResumeData, ImprovementsData } from './ai.types';

export function extractJson(text: string): string {
  const stripped = text.replace(/```(?:json)?/g, '').replace(/```/g, '');

  let best = '';
  let i = 0;
  while (i < stripped.length) {
    if (stripped[i] !== '{') { i++; continue; }
    let depth = 0;
    let end = -1;
    for (let j = i; j < stripped.length; j++) {
      if (stripped[j] === '{') depth++;
      else if (stripped[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end === -1) { i++; continue; }
    const candidate = stripped.slice(i, end + 1);
    if (candidate.length > best.length) best = candidate;
    i = end + 1;
  }

  if (!best) throw new Error('AI вернул некорректный JSON');
  return repairJson(best);
}

export function repairJson(text: string): string {
  return text
    .replace(/,(\s*[}\]])/g, '$1')           // trailing commas
    .replace(/}(\s*)\n(\s*){/g, '},\n$2{')   // missing comma between adjacent objects
    .replace(/](\s*)\n(\s*)\[/g, '],\n$2['); // missing comma between adjacent arrays
}

export function formatResumeSummary(data: ResumeData): string {
  const clean = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '$1');

  const lines: string[] = [];
  if (data.job_title) lines.push(data.job_title);
  if (data.first_name || data.last_name) lines.push(`${data.first_name} ${data.last_name}`.trim());
  if (lines.length) lines.push('');

  if (data.about) {
    lines.push('О себе:');
    lines.push(clean(data.about));
    lines.push('');
  }
  if (data.hard_skills) {
    lines.push('Инструменты:');
    lines.push(clean(data.hard_skills));
    lines.push('');
  }
  if (data.soft_skills) {
    lines.push('Soft Skills:');
    lines.push(clean(data.soft_skills));
    lines.push('');
  }
  if (data.projects?.length) {
    lines.push('Проекты:');
    for (const p of data.projects) {
      lines.push(p.title);
      if (p.description) lines.push(clean(p.description));
      if (p.stack) lines.push(`Стек: ${clean(p.stack)}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatImprovementsSummary(data: ImprovementsData): string {
  const lines: string[] = [];

  if (data.recommendations?.length) {
    lines.push('Рекомендации по развитию:');
    for (const r of data.recommendations) {
      lines.push(`\n${r.title}`);
      lines.push(r.description);
    }
    lines.push('');
  }

  if (data.project_ideas?.length) {
    lines.push('Идеи для проектов:');
    for (const p of data.project_ideas) {
      lines.push(`\n${p.title}`);
      lines.push(p.description);
      if (p.stack?.length) lines.push(`Стек: ${p.stack.join(', ')}`);
      if (p.benefit) lines.push(`Польза: ${p.benefit}`);
    }
  }

  return lines.join('\n');
}
