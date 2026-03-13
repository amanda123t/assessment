'use client';

import { BPMNNode } from '@/lib/phase2';

// ── Layout constants ───────────────────────────────────────────────────────────

const MAX_PER_ROW = 5;   // nodes per row before serpentine wrap
const SLOT_W      = 220; // horizontal slot width  (activity 160 + 60 gap)
const SLOT_H      = 130; // row height             (activity 48 + gap + branch labels)
const PAD         = 28;  // outer padding

const ACT_W  = 160; // activity rect width
const ACT_H  = 48;  // activity rect height
const CIRC_R = 18;  // start / end circle radius
const DIA_R  = 18;  // gateway diamond: center-to-tip distance

const MARKER_ID = 'bpmn-arrowhead';

// ── Helpers ────────────────────────────────────────────────────────────────────

function trunc(s: string, max = 25): string {
  return s.length > max ? `${s.slice(0, max - 1)}\u2026` : s;
}

/**
 * Wrap a label into at most two lines for display inside an activity rect.
 * Splits at the word boundary nearest to the midpoint.
 */
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

/** Center [x, y] for node at index i (out of total nodes). */
function center(i: number, total: number): [number, number] {
  const row    = Math.floor(i / MAX_PER_ROW);
  const colRaw = i % MAX_PER_ROW;
  // Serpentine: even rows go L→R, odd rows go R→L
  const col = row % 2 === 0 ? colRaw : MAX_PER_ROW - 1 - colRaw;
  return [
    PAD + col * SLOT_W + SLOT_W / 2,
    PAD + row * SLOT_H + SLOT_H / 2,
  ];
}

/** Half-extents of a node (used to calculate connector edge points). */
function half(type: BPMNNode['type']): { dx: number; dy: number } {
  if (type === 'activity') return { dx: ACT_W / 2, dy: ACT_H / 2 };
  if (type === 'gateway')  return { dx: DIA_R,     dy: DIA_R };
  return                          { dx: CIRC_R,    dy: CIRC_R };
}

// ── SVG node sub-components ────────────────────────────────────────────────────

function StartEvent({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  return (
    <g className="bpmn-start">
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={CIRC_R} />
      <text x={cx} y={cy + CIRC_R + 13} textAnchor="middle" className="bpmn-label bpmn-start-label">
        {trunc(label)}
      </text>
    </g>
  );
}

function EndEvent({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  return (
    <g className="bpmn-end">
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={CIRC_R} />
      <text x={cx} y={cy + CIRC_R + 13} textAnchor="middle" className="bpmn-label bpmn-end-label">
        {trunc(label)}
      </text>
    </g>
  );
}

function Activity({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  const [line1, line2] = wrapLabel(label);
  return (
    <g className="bpmn-activity">
      <title>{label}</title>
      <rect x={cx - ACT_W / 2} y={cy - ACT_H / 2} width={ACT_W} height={ACT_H} rx={8} />
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

function Gateway({ cx, cy, label, branches }: {
  cx: number; cy: number; label: string;
  branches?: { condition: string }[];
}) {
  const d = DIA_R;
  const diamond = `M${cx},${cy - d} L${cx + d},${cy} L${cx},${cy + d} L${cx - d},${cy}Z`;
  return (
    <g className="bpmn-gateway">
      <title>{label}</title>
      <path d={diamond} />
      {/* "?" glyph centred in diamond */}
      <text x={cx} y={cy + 4} textAnchor="middle" className="bpmn-label bpmn-gateway-q">?</text>
      {/* decision name below diamond */}
      <text x={cx} y={cy + d + 14} textAnchor="middle" className="bpmn-label bpmn-gateway-desc">
        {trunc(label, 20)}
      </text>
      {/* branch condition labels */}
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

// ── Connector ──────────────────────────────────────────────────────────────────

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      className="bpmn-arrow"
      markerEnd={`url(#${MARKER_ID})`}
    />
  );
}

// ── Embedded CSS (light + dark mode) ──────────────────────────────────────────

const SVG_STYLE = `
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
  .bpmn-label  { font-family:system-ui,sans-serif; font-size:10px; font-weight:500; }
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function BPMNDiagram({ nodes }: { nodes: BPMNNode[] }) {
  if (nodes.length === 0) return null;

  const total   = nodes.length;
  const numRows = Math.ceil(total / MAX_PER_ROW);

  // Width: for a single row use actual count; for multiple rows use MAX_PER_ROW
  // so serpentine columns stay aligned.
  const colCount = numRows === 1 ? Math.min(total, MAX_PER_ROW) : MAX_PER_ROW;
  const svgW     = PAD * 2 + colCount * SLOT_W;
  const svgH     = PAD * 2 + numRows * SLOT_H;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      role="img"
      aria-label="Diagrama BPMN do processo"
    >
      <defs>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: SVG_STYLE }} />
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
        const next    = nodes[i + 1];
        const rowCurr = Math.floor(i / MAX_PER_ROW);
        const rowNext = Math.floor((i + 1) / MAX_PER_ROW);
        const [cx, cy] = center(i, total);
        const [nx, ny] = center(i + 1, total);
        const { dx: adx, dy: ady } = half(node.type);
        const { dx: bdx, dy: bdy } = half(next.type);

        if (rowCurr === rowNext) {
          // Same row — horizontal connector, direction follows row parity
          const ltr = rowCurr % 2 === 0;
          return (
            <Arrow key={i}
              x1={ltr ? cx + adx : cx - adx} y1={cy}
              x2={ltr ? nx - bdx : nx + bdx} y2={ny}
            />
          );
        }

        // Wrap connector — both nodes share the same x (same effective column)
        return (
          <Arrow key={i}
            x1={cx} y1={cy + ady}
            x2={nx} y2={ny - bdy}
          />
        );
      })}

      {/* ── Nodes (rendered above connectors) ── */}
      {nodes.map((node, i) => {
        const [cx, cy] = center(i, total);
        switch (node.type) {
          case 'start':    return <StartEvent key={i} cx={cx} cy={cy} label={node.label} />;
          case 'end':      return <EndEvent   key={i} cx={cx} cy={cy} label={node.label} />;
          case 'activity': return <Activity   key={i} cx={cx} cy={cy} label={node.label} />;
          case 'gateway':  return <Gateway    key={i} cx={cx} cy={cy} label={node.label} branches={node.branches} />;
          default:         return null;
        }
      })}
    </svg>
  );
}
