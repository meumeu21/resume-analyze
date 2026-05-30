import { useMemo } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'technology' | 'domain';
  weight: number; // 1-5
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface NetworkData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Props {
  data: NetworkData;
}

const W = 480;
const H = 420;

// Fruchterman-Reingold-inspired force layout, runs synchronously once
function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): { x: number; y: number }[] {
  const n = nodes.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: W / 2, y: H / 2 }];

  const idx: Record<string, number> = {};
  nodes.forEach((node, i) => { idx[node.id] = i; });

  // Start positions on a circle so layout is deterministic
  const pos = nodes.map((_, i) => ({
    x: W / 2 + 130 * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: H / 2 + 120 * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
    vx: 0,
    vy: 0,
  }));

  const REPEL = 3500;
  const SPRING = 0.06;
  const REST = 85;
  const DAMPING = 0.78;
  const GRAVITY = 0.012;
  const ITERS = 280;

  const fx = new Float64Array(n);
  const fy = new Float64Array(n);

  for (let iter = 0; iter < ITERS; iter++) {
    fx.fill(0);
    fy.fill(0);

    // Repulsion between all node pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d2 = dx * dx + dy * dy + 1;
        const d = Math.sqrt(d2);
        const f = REPEL / d2;
        const nx = dx / d;
        const ny = dy / d;
        fx[i] += f * nx; fy[i] += f * ny;
        fx[j] -= f * nx; fy[j] -= f * ny;
      }
    }

    // Spring attraction along edges
    for (const e of edges) {
      const si = idx[e.source];
      const ti = idx[e.target];
      if (si === undefined || ti === undefined) continue;
      const dx = pos[ti].x - pos[si].x;
      const dy = pos[ti].y - pos[si].y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.1;
      const f = SPRING * (d - REST);
      const nx = dx / d;
      const ny = dy / d;
      fx[si] += f * nx; fy[si] += f * ny;
      fx[ti] -= f * nx; fy[ti] -= f * ny;
    }

    // Center gravity + integrate
    const cool = 1 - iter / ITERS;
    for (let i = 0; i < n; i++) {
      fx[i] -= GRAVITY * (pos[i].x - W / 2);
      fy[i] -= GRAVITY * (pos[i].y - H / 2);
      pos[i].vx = (pos[i].vx + fx[i]) * DAMPING;
      pos[i].vy = (pos[i].vy + fy[i]) * DAMPING;
      pos[i].x += pos[i].vx * cool;
      pos[i].y += pos[i].vy * cool;
    }
  }

  // Fit into canvas with padding
  const PAD = 60;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pos) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const sx = (W - 2 * PAD) / Math.max(maxX - minX, 1);
  const sy = (H - 2 * PAD) / Math.max(maxY - minY, 1);
  const s = Math.min(sx, sy);
  const ox = PAD + ((W - 2 * PAD) - (maxX - minX) * s) / 2;
  const oy = PAD + ((H - 2 * PAD) - (maxY - minY) * s) / 2;

  return pos.map((p) => ({
    x: ox + (p.x - minX) * s,
    y: oy + (p.y - minY) * s,
  }));
}

const TECH_FILL = '#DBEAFE';
const TECH_STROKE = '#3B82F6';
const TECH_TEXT = '#1E40AF';
const DOMAIN_FILL = '#EDE9FE';
const DOMAIN_STROKE = '#7C3AED';
const DOMAIN_TEXT = '#4C1D95';

export default function NetworkGraphChart({ data }: Props) {
  const { nodes, edges } = data;

  const layout = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);

  if (nodes.length === 0) return null;

  const idx: Record<string, number> = {};
  nodes.forEach((n, i) => { idx[n.id] = i; });

  return (
    <div className="network-graph-chart">
      <p className="coordinates-chart__title text bold">Граф интересов</p>
      <div className="chart__svg-center">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ maxWidth: '100%' }}
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const si = idx[e.source];
          const ti = idx[e.target];
          if (si === undefined || ti === undefined) return null;
          const sp = layout[si];
          const tp = layout[ti];
          if (!sp || !tp) return null;
          return (
            <line
              key={i}
              x1={sp.x} y1={sp.y}
              x2={tp.x} y2={tp.y}
              stroke="#CBD5E1"
              strokeWidth={1.5}
              strokeOpacity={0.65}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const p = layout[i];
          if (!p) return null;
          const r = 9 + node.weight * 2.5; // r 11.5 … 21.5
          const isDomain = node.type === 'domain';
          const fill = isDomain ? DOMAIN_FILL : TECH_FILL;
          const stroke = isDomain ? DOMAIN_STROKE : TECH_STROKE;
          const textColor = isDomain ? DOMAIN_TEXT : TECH_TEXT;

          return (
            <g key={node.id}>
              <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={stroke} strokeWidth={1.8} />
              {/* label below node */}
              <text
                x={p.x}
                y={p.y + r + 11}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={isDomain ? '700' : '500'}
                fill={textColor}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
          <svg width={12} height={12} style={{ flexShrink: 0 }}>
            <circle cx={6} cy={6} r={5} fill={TECH_FILL} stroke={TECH_STROKE} strokeWidth={1.5} />
          </svg>
          Интерес
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
          <svg width={12} height={12} style={{ flexShrink: 0 }}>
            <circle cx={6} cy={6} r={5} fill={DOMAIN_FILL} stroke={DOMAIN_STROKE} strokeWidth={1.5} />
          </svg>
          Область
        </span>
      </div>
    </div>
  );
}
