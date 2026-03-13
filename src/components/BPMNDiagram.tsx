'use client';

import { BPMNNode } from '@/lib/phase2';

// ── Layout configs ─────────────────────────────────────────────────────────────

const MAX_PER_ROW = 5;
const MARKER_ID   = 'bpmn-arrowhead';

interface BPMNCfg {
  ACT_W: number; ACT_H: number;
  CIRC_R: number; DIA_R: number;
  SLOT_W: number; SLOT_H: number;
  PAD: number; FONT_SIZE: number;
}

const COMPACT: BPMNCfg = {
  ACT_W: 160, ACT_H: 48,
  CIRC_R: 18, DIA_R: 18,
  SLOT_W: 220, SLOT_H: 130,
  PAD: 28, FONT_SIZE: 10,
};

const FULL: BPMNCfg = {
  ACT_W: 180, ACT_H: 56,
  CIRC_R: 24, DIA_R: 22,
  SLOT_W: 228, SLOT_H: 150,
  PAD: 32, FONT_SIZE: 13,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function trunc(s: string, max = 25): string {
  return s.length > max ? `${s.slice(0, max - 1)}\u2026` : s;
}

function wrapLabel(label: string): [string, string] {
  const s = trunc(label);
  if (s.length <= 20) return [s, ''];
  const words = s.split(' ');
  if (words.length < 2) return [s, ''];
  let best = 0;
  let bestDist = Infinity;
  let cumLen = 0;
  for (let w = 0; w < words.length - 1; w++) {
    cumLen += words[w].length + 1;
    const dist = Math.abs(cumLen - s.length / 2);
    if (dist < bestDist) { bestDist = dist; best = w; }
  }
  return [words.slice(0, best + 1).join(' '), words.slice(best + 1).join(' ')];
}

function center(i: number, total: number, cfg: BPMNCfg): [number, number] {
  const row    = Math.floor(i / MAX_PER_ROW);
  const colRaw = i % MAX_PER_ROW;
  const col    = row % 2 === 0 ? colRaw : MAX_PER_ROW - 1 - colRaw;
  return [
    cfg.PAD + col * cfg.SLOT_W + cfg.SLOT_W / 2,
    cfg.PAD + row * cfg.SLOT_H + cfg.SLOT_H / 2,
  ];
}

function half(type: BPMNNode['type'], cfg: BPMNCfg): { dx: number; dy: number } {
  if (type === 'activity') return { dx: cfg.ACT_W / 2, dy: cfg.ACT_H / 2 };
  if (type === 'gateway')  return { dx: cfg.DIA_R,     dy: cfg.DIA_R };
  return                          { dx: cfg.CIRC_R,    dy: cfg.CIRC_R };
}

// ── SVG node sub-components ────────────────────────────────────────────────────

function StartEvent({ cx, cy, label, cfg }: { cx: number; cy: number; label: string; cfg: BPMNCfg }) {
  return (
    <g className="bpmn-start">
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={cfg.CIRC_R} />
      <text x={cx} y={cy + cfg.CIRC_R + 13} textAnchor="middle" className="bpmn-label bpmn-start-label">
        {trunc(label)}
      </text>
    </g>
  );
}

function EndEvent({ cx, cy, label, cfg }: { cx: number; cy: number; label: string; cfg: BPMNCfg }) {
  return (
    <g className="bpmn-end">
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={cfg.CIRC_R} />
      <text x={cx} y={cy + cfg.CIRC_R + 13} textAnchor="middle" className="bpmn-label bpmn-end-label">
        {trunc(label)}
      </text>
    </g>
  );
}

function Activity({ cx, cy, label, cfg }: { cx: number; cy: number; label: string; cfg: BPMNCfg }) {
  const [line1, line2] = wrapLabel(label);
  return (
    <g className="bpmn-activity">
      <title>{label}</title>
      <rect x={cx - cfg.ACT_W / 2} y={cy - cfg.ACT_H / 2} width={cfg.ACT_W} height={cfg.ACT_H} rx={8} />
      {line2 ? (
        <>
          <text x={cx} y={cy - 5} textAnchor="middle" className="bpmn-label bpmn-activity-label">{line1}</text>
          <text x={cx} y={cy + 9} textAnchor="middle" className="bpmn-label bpmn-activity-label">{line2}</text>
        </>
      ) : (
        <text x={cx} y={cy + 4} textAnchor="middle" className="bpmn-label bpmn-activity-label">{line1}</text>
      )}
    </g>
  );
}

function Gateway({ cx, cy, label, branches, cfg }: {
  cx: number; cy: number; label: string;
  branches?: { condition: string }[];
  cfg: BPMNCfg;
}) {
  const d       = cfg.DIA_R;
  const diamond = `M${cx},${cy - d} L${cx + d},${cy} L${cx},${cy + d} L${cx - d},${cy}Z`;
  return (
    <g className="bpmn-gateway">
      <title>{label}</title>
      <path d={diamond} />
      <text x={cx} y={cy + 4} textAnchor="middle" className="bpmn-label bpmn-gateway-q">?</text>
      <text x={cx} y={cy + d + 14} textAnchor="middle" className="bpmn-label bpmn-gateway-desc">
        {trunc(label, 20)}
      </text>
      {branches && branches.length >= 2 && (
        <>
          <text x={cx - d - 4} y={cy - d - 4} textAnchor="end"   className="bpmn-label bpmn-branch-ok">
            {trunc(branches[0].condition, 14)}
          </text>
          <text x={cx + d + 4} y={cy - d - 4} textAnchor="start" className="bpmn-label bpmn-branch-fail">
            {trunc(branches[1].condition, 14)}
          </text>
        </>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} className="bpmn-arrow" markerEnd={`url(#${MARKER_ID})`} />
  );
}

// ── Embedded CSS (parameterised font size) ────────────────────────────────────

function makeSvgStyle(fontSize: number): string {
  return `
  .bpmn-start  circle { fill:#E8F5E9; stroke:#4CAF50; stroke-width:2; }
  .bpmn-start-label   { fill:#388E3C; }
  .bpmn-end    circle { fill:#FFEBEE; stroke:#E53935; stroke-width:3; }
  .bpmn-end-label     { fill:#C62828; }
  .bpmn-activity rect { fill:#ffffff; stroke:#1976D2; stroke-width:1.5; }
  .bpmn-activity-label{ fill:#1565C0; }
  .bpmn-gateway  path { fill:#FFF8E1; stroke:#FF8F00; stroke-width:2; }
  .bpmn-gateway-q     { fill:#E65100; font-size:12px; font-weight:700; }
  .bpmn-gateway-desc  { fill:#E65100; }
  .bpmn-branch-ok     { fill:#2E7D32; }
  .bpmn-branch-fail   { fill:#C62828; }
  .bpmn-label  { font-family:system-ui,sans-serif; font-size:${fontSize}px; font-weight:500; }
  .bpmn-arrow  { stroke:#9CA3AF; stroke-width:1.5; fill:none; }
  .bpmn-arrowhead { fill:#9CA3AF; }
  @media (prefers-color-scheme: dark) {
    .bpmn-start  circle { fill:#1B5E20; stroke:#81C784; }
    .bpmn-start-label   { fill:#A5D6A7; }
    .bpmn-end    circle { fill:#4E1010; stroke:#EF9A9A; }
    .bpmn-end-label     { fill:#EF9A9A; }
    .bpmn-activity rect { fill:#1E3A5F; stroke:#64B5F6; }
    .bpmn-activity-label{ fill:#90CAF9; }
    .bpmn-gateway  path { fill:#3E2723; stroke:#FFB300; }
    .bpmn-gateway-q     { fill:#FFCC80; }
    .bpmn-gateway-desc  { fill:#FFCC80; }
    .bpmn-branch-ok     { fill:#A5D6A7; }
    .bpmn-branch-fail   { fill:#EF9A9A; }
    .bpmn-arrow  { stroke:#6B7280; }
    .bpmn-arrowhead { fill:#6B7280; }
  }
`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BPMNDiagram({
  nodes,
  size = 'compact',
}: {
  nodes: BPMNNode[];
  size?: 'compact' | 'full';
}) {
  if (nodes.length === 0) return null;

  const cfg      = size === 'full' ? FULL : COMPACT;
  const total    = nodes.length;
  const numRows  = Math.ceil(total / MAX_PER_ROW);
  const colCount = numRows === 1 ? Math.min(total, MAX_PER_ROW) : MAX_PER_ROW;
  const svgW     = cfg.PAD * 2 + colCount * cfg.SLOT_W;
  const svgH     = cfg.PAD * 2 + numRows  * cfg.SLOT_H;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      role="img"
      aria-label="Diagrama BPMN do processo"
    >
      <defs>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: makeSvgStyle(cfg.FONT_SIZE) }} />
        <marker
          id={MARKER_ID}
          markerWidth={8} markerHeight={6}
          refX={7} refY={3}
          orient="auto"
        >
          <polygon points="0 0,8 3,0 6" className="bpmn-arrowhead" />
        </marker>
      </defs>

      {/* ── Connectors (rendered below nodes) ── */}
      {nodes.map((node, i) => {
        if (i === total - 1) return null;
        const next     = nodes[i + 1];
        const rowCurr  = Math.floor(i / MAX_PER_ROW);
        const rowNext  = Math.floor((i + 1) / MAX_PER_ROW);
        const [cx, cy] = center(i,     total, cfg);
        const [nx, ny] = center(i + 1, total, cfg);
        const { dx: adx, dy: ady } = half(node.type, cfg);
        const { dx: bdx, dy: bdy } = half(next.type, cfg);

        if (rowCurr === rowNext) {
          const ltr = rowCurr % 2 === 0;
          return (
            <Arrow key={i}
              x1={ltr ? cx + adx : cx - adx} y1={cy}
              x2={ltr ? nx - bdx : nx + bdx} y2={ny}
            />
          );
        }

        return (
          <Arrow key={i}
            x1={cx} y1={cy + ady}
            x2={nx} y2={ny - bdy}
          />
        );
      })}

      {/* ── Nodes (rendered above connectors) ── */}
      {nodes.map((node, i) => {
        const [cx, cy] = center(i, total, cfg);
        switch (node.type) {
          case 'start':    return <StartEvent key={i} cx={cx} cy={cy} label={node.label} cfg={cfg} />;
          case 'end':      return <EndEvent   key={i} cx={cx} cy={cy} label={node.label} cfg={cfg} />;
          case 'activity': return <Activity   key={i} cx={cx} cy={cy} label={node.label} cfg={cfg} />;
          case 'gateway':  return <Gateway    key={i} cx={cx} cy={cy} label={node.label} branches={node.branches} cfg={cfg} />;
          default:         return null;
        }
      })}
    </svg>
  );
}
