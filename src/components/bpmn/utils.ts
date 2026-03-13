import { Node, Edge, MarkerType } from '@xyflow/react';
import { BPMNNode } from '@/lib/phase2';

// ── Layout constants ───────────────────────────────────────────────────────────

const NODES_PER_ROW = 4;
const X_SPACING     = 250;
const Y_SPACING     = 160;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Given a node index and total count, returns {row, col} in the serpentine grid.
 * Even rows go left→right; odd rows go right→left.
 */
function gridPosition(index: number): { row: number; col: number } {
  const row    = Math.floor(index / NODES_PER_ROW);
  const colRaw = index % NODES_PER_ROW;
  const col    = row % 2 === 0 ? colRaw : NODES_PER_ROW - 1 - colRaw;
  return { row, col };
}

function toXY(index: number): { x: number; y: number } {
  const { row, col } = gridPosition(index);
  return { x: col * X_SPACING, y: row * Y_SPACING };
}

// ── bpmnToReactFlow ────────────────────────────────────────────────────────────

export function bpmnToReactFlow(bpmnNodes: BPMNNode[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = bpmnNodes.map((bpmn, i) => {
    const { x, y }   = toXY(i);
    const isTerminal = bpmn.type === 'start' || bpmn.type === 'end';
    return {
      id:   String(i),
      type: bpmn.type,
      position: { x, y },
      draggable: !isTerminal,
      data: {
        label:       bpmn.label,
        automatable: bpmn.automatable,
        systems:     bpmn.systems,
        branches:    bpmn.branches,
        lane:        bpmn.lane,
      },
    };
  });

  const edges: Edge[] = bpmnNodes.slice(0, -1).map((_, i) => ({
    id:         `e${i}-${i + 1}`,
    source:     String(i),
    target:     String(i + 1),
    type:       'smoothstep',
    markerEnd:  { type: MarkerType.ArrowClosed },
  }));

  return { nodes, edges };
}

// ── reactFlowToBpmn ────────────────────────────────────────────────────────────

export function reactFlowToBpmn(rfNodes: Node[]): BPMNNode[] {
  // Sort by row (Y) then by column, respecting serpentine direction per row.
  const sorted = [...rfNodes].sort((a, b) => {
    const rowA = Math.round(a.position.y / Y_SPACING);
    const rowB = Math.round(b.position.y / Y_SPACING);
    if (rowA !== rowB) return rowA - rowB;

    // Same row: even rows sort ascending X, odd rows descending X.
    return rowA % 2 === 0
      ? a.position.x - b.position.x
      : b.position.x - a.position.x;
  });

  return sorted.map(n => {
    const d = n.data as {
      label?:       string;
      automatable?: boolean;
      systems?:     string[];
      branches?:    { condition: string; target?: string }[];
      lane?:        string;
    };
    const bpmn: BPMNNode = {
      type:  n.type as BPMNNode['type'],
      label: d.label ?? '',
    };
    if (d.lane)        bpmn.lane        = d.lane;
    if (d.branches)    bpmn.branches    = d.branches;
    if (d.automatable) bpmn.automatable = d.automatable;
    if (d.systems)     bpmn.systems     = d.systems;
    return bpmn;
  });
}
