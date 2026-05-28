export interface SkillPoint {
  name: string;
  value: number; // 0-10
}

interface Props {
  skills: SkillPoint[];
}

const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_R = 120;
const LABEL_R = MAX_R + 26;
const GRID_LEVELS = [2, 4, 6, 8, 10];
const FILL_COLOR = 'rgba(120, 110, 230, 0.18)';
const STROKE_COLOR = 'rgba(120, 110, 230, 0.85)';

function toXY(r: number, angle: number) {
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function pts(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export default function SkillMapChart({ skills }: Props) {
  const n = skills.length;
  if (n < 3) return null;

  const angles = skills.map((_, i) => (2 * Math.PI * i) / n - Math.PI / 2);

  const gridPolygons = GRID_LEVELS.map((lvl) =>
    angles.map((a) => toXY((lvl / 10) * MAX_R, a)),
  );

  const valuePolygon = skills.map((s, i) => toXY((s.value / 10) * MAX_R, angles[i]));

  return (
    <div className="skill-map-chart">
      <p className="coordinates-chart__title text bold">Карта навыков</p>
      <div className="chart__svg-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        {/* grid polygons */}
        {gridPolygons.map((polygon, i) => (
          <polygon
            key={i}
            points={pts(polygon)}
            fill="none"
            stroke="#ddd"
            strokeWidth={i === gridPolygons.length - 1 ? 1.5 : 1}
          />
        ))}

        {/* axis lines */}
        {angles.map((a, i) => {
          const end = toXY(MAX_R, a);
          return (
            <line key={i} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="#ddd" strokeWidth={1} />
          );
        })}

        {/* value polygon */}
        <polygon points={pts(valuePolygon)} fill={FILL_COLOR} stroke={STROKE_COLOR} strokeWidth={2} />

        {/* dots at each skill vertex */}
        {valuePolygon.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={STROKE_COLOR} />
        ))}

        {/* labels */}
        {skills.map((s, i) => {
          const pos = toXY(LABEL_R, angles[i]);
          const value = s.value.toFixed(0);

          // nudge multi-line label anchor based on angle
          const angleDeg = (angles[i] * 180) / Math.PI;
          const anchor =
            angleDeg > -120 && angleDeg < -60
              ? 'middle'
              : angleDeg >= -60 && angleDeg <= 60
              ? 'start'
              : angleDeg > 60 && angleDeg < 120
              ? 'middle'
              : 'end';

          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fill="#444"
            >
              <tspan x={pos.x} dy="0">{s.name}</tspan>
              <tspan x={pos.x} dy="13" fontWeight="bold" fill={STROKE_COLOR}>{value}/10</tspan>
            </text>
          );
        })}

        {/* center dot */}
        <circle cx={CENTER} cy={CENTER} r={3} fill="#bbb" />
      </svg>
      </div>
    </div>
  );
}
