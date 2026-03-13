'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';

// ── Shared label ───────────────────────────────────────────────────────────────

function NodeLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 text-center text-[11px] font-medium text-gray-600 leading-tight max-w-[120px]">
      {children}
    </div>
  );
}

// ── StartNode ──────────────────────────────────────────────────────────────────

export function StartNode({ data }: NodeProps) {
  const label = (data.label as string) ?? 'Início';
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500" />
      <NodeLabel>{label}</NodeLabel>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// ── EndNode ────────────────────────────────────────────────────────────────────

export function EndNode({ data }: NodeProps) {
  const label = (data.label as string) ?? 'Fim';
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div className="w-12 h-12 rounded-full bg-gray-700 border-[3px] border-gray-800" />
      <NodeLabel>{label}</NodeLabel>
    </div>
  );
}

// ── ActivityNode ───────────────────────────────────────────────────────────────

export function ActivityNode({ data, selected }: NodeProps) {
  const label      = (data.label as string) ?? '';
  const automatable = data.automatable as boolean | undefined;
  const systems    = data.systems as string[] | undefined;

  const borderClass = automatable
    ? 'border-blue-500 bg-blue-50'
    : 'border-blue-300 bg-white';

  const ringClass = selected ? 'ring-2 ring-blue-400 ring-offset-1' : '';

  return (
    <div
      className={`border-2 rounded-lg px-4 py-3 min-w-[160px] max-w-[220px] shadow-sm ${borderClass} ${ringClass}`}
    >
      <Handle type="target" position={Position.Left} />

      <div className="text-xs font-semibold text-gray-800 leading-snug">
        {automatable && <span className="mr-1">⚡</span>}
        {label}
      </div>

      {systems && systems.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {systems.map(s => (
            <span
              key={s}
              className="inline-block bg-gray-100 border border-gray-200 text-gray-500 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// ── GatewayNode ────────────────────────────────────────────────────────────────

export function GatewayNode({ data }: NodeProps) {
  const label    = (data.label as string) ?? '';
  const branches = data.branches as { condition: string }[] | undefined;

  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />

      {/* Diamond */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rotate-45 rounded-sm border-2 border-amber-500 bg-amber-100" />
        <span className="relative text-amber-700 font-bold text-sm -mt-0.5">?</span>
      </div>

      <NodeLabel>{label}</NodeLabel>

      {branches && branches.length >= 2 && (
        <div className="flex gap-3 mt-1">
          <span className="text-[9px] font-semibold text-emerald-600 max-w-[70px] text-center leading-tight">
            {branches[0].condition}
          </span>
          <span className="text-[9px] font-semibold text-red-500 max-w-[70px] text-center leading-tight">
            {branches[1].condition}
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="branch-no" />
    </div>
  );
}

// ── IntermediateEventNode ──────────────────────────────────────────────────────

export function IntermediateEventNode({ data }: NodeProps) {
  const label = (data.label as string) ?? '';
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />

      <div className="w-10 h-10 rounded-full border-2 border-amber-500 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border border-amber-400" />
      </div>

      <NodeLabel>{label}</NodeLabel>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// ── Node type map ──────────────────────────────────────────────────────────────

export const bpmnNodeTypes = {
  start:              StartNode,
  end:                EndNode,
  activity:           ActivityNode,
  gateway:            GatewayNode,
  'intermediate-event': IntermediateEventNode,
  subprocess:         ActivityNode,   // reuse activity style for subprocess
} as const;
