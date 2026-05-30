interface Props {
  x: number;
  y: number;
}

const SIZE = 320;
const PADDING = 48;
const INNER = SIZE - PADDING * 2;
const CENTER = SIZE / 2;

function toSvg(val: number): number {
  return CENTER + (val / 5) * (INNER / 2);
}

export default function CoordinatesChart({ x, y }: Props) {
  const cx = toSvg(x);
  const cy = toSvg(-y);

  return (
    <div className="coordinates-chart">
      <p className="coordinates-chart__title text bold">Координаты разработчика</p>
      <div className="chart__svg-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        {/* quadrant backgrounds */}
        <rect x={PADDING} y={PADDING} width={INNER / 2} height={INNER / 2} fill="#FFCDD2" />
        <rect x={CENTER} y={PADDING} width={INNER / 2} height={INNER / 2} fill="#BBDEFB" />
        <rect x={PADDING} y={CENTER} width={INNER / 2} height={INNER / 2} fill="#FFE0B2" />
        <rect x={CENTER} y={CENTER} width={INNER / 2} height={INNER / 2} fill="#E1BEE7" />

        {/* axes */}
        <line x1={PADDING} y1={CENTER} x2={SIZE - PADDING} y2={CENTER} stroke="#555" strokeWidth={1.5} />
        <line x1={CENTER} y1={PADDING} x2={CENTER} y2={SIZE - PADDING} stroke="#555" strokeWidth={1.5} />

        {/* axis arrowheads */}
        <polygon points={`${SIZE - PADDING},${CENTER} ${SIZE - PADDING - 6},${CENTER - 4} ${SIZE - PADDING - 6},${CENTER + 4}`} fill="#555" />
        <polygon points={`${CENTER},${PADDING} ${CENTER - 4},${PADDING + 6} ${CENTER + 4},${PADDING + 6}`} fill="#555" />

        {/* axis labels */}
        <text x={PADDING - 2} y={CENTER - 6} textAnchor="middle" fontSize={9} fill="#333" writingMode="horizontal-tb">
          <tspan x={PADDING - 2} dy="0">Низко-</tspan>
          <tspan x={PADDING - 2} dy="10">уровневое</tspan>
        </text>
        <text x={SIZE - PADDING + 2} y={CENTER - 6} textAnchor="middle" fontSize={9} fill="#333">
          <tspan x={SIZE - PADDING + 2} dy="0">Высоко-</tspan>
          <tspan x={SIZE - PADDING + 2} dy="10">уровневое</tspan>
        </text>
        <text x={CENTER} y={PADDING - 6} textAnchor="middle" fontSize={9} fill="#333">
          Инженерный
        </text>
        <text x={CENTER} y={SIZE - PADDING + 14} textAnchor="middle" fontSize={9} fill="#333">
          Продуктовый
        </text>

        {/* grid lines (soft) */}
        {[-4, -3, -2, -1, 1, 2, 3, 4].map((v) => {
          const pos = toSvg(v);
          return (
            <g key={v}>
              <line x1={pos} y1={PADDING} x2={pos} y2={SIZE - PADDING} stroke="#ccc" strokeWidth={0.5} strokeDasharray="3,3" />
              <line x1={PADDING} y1={toSvg(-v)} x2={SIZE - PADDING} y2={toSvg(-v)} stroke="#ccc" strokeWidth={0.5} strokeDasharray="3,3" />
            </g>
          );
        })}

        {/* point */}
        <circle cx={cx} cy={cy} r={7} fill="#1a1a1a" />
        <circle cx={cx} cy={cy} r={3} fill="white" />

        {/* coordinates label */}
        <text
          x={cx + 10}
          y={cy - 8}
          fontSize={10}
          fill="#1a1a1a"
          fontWeight="bold"
        >
          ({x.toFixed(1)}, {y.toFixed(1)})
        </text>
      </svg>
      </div>
    </div>
  );
}
