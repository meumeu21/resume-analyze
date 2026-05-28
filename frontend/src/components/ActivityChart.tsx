import { useMemo } from 'react';

interface Props {
  projects: { createdAt: string }[];
}

const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const W = 600;
const H = 120;
const PL = 35;
const PR = 15;
const PT = 10;
const PB = 30;
const cW = W - PL - PR;
const cH = H - PT - PB;

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const dx = (points[i].x - points[i - 1].x) * 0.4;
    const cp1x = (points[i - 1].x + dx).toFixed(1);
    const cp2x = (points[i].x - dx).toFixed(1);
    const cp1y = points[i - 1].y.toFixed(1);
    const cp2y = points[i].y.toFixed(1);
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

export default function ActivityChart({ projects }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = projects.filter((p) => {
        const pd = new Date(p.createdAt);
        return pd.getFullYear() === year && pd.getMonth() === month;
      }).length;
      return { label: `${MONTHS_RU[month]} ${String(year).slice(2)}`, count };
    });
  }, [projects]);

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const pts = data.map((d, i) => ({
    x: PL + (i / (data.length - 1)) * cW,
    y: PT + cH - (d.count / maxVal) * cH,
    label: d.label,
  }));

  const linePath = buildPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${PT + cH} L ${first.x.toFixed(1)} ${PT + cH} Z`;

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="activity-chart">
      <p className="activity-chart__title text bold">Активность</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#ECEBFF" />
            <stop offset="33%"  stopColor="#FAE2FF" />
            <stop offset="66%"  stopColor="#BEEBFF" />
            <stop offset="100%" stopColor="#FFE6BD" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => {
          const y = PT + cH - (v / maxVal) * cH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#E5E5E5" strokeWidth="0.8" />
              <text x={PL - 5} y={y + 4} textAnchor="end" fontSize="11" fill="#888">{v}</text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#actGrad)" />
        <path d={linePath} fill="none" stroke="#7B74C9" strokeWidth="1.8" />

        {pts.map((pt) => (
          <text key={pt.label} x={pt.x} y={H - 8} textAnchor="middle" fontSize="9" fill="#888">
            {pt.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
