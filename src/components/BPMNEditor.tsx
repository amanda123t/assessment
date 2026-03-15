'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import { BPMNNode } from '@/lib/phase2';
import { bpmnNodeTypes } from '@/components/bpmn/nodes';
import { bpmnToReactFlow, reactFlowToBpmn } from '@/components/bpmn/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BPMNEditorProps {
  nodes:    BPMNNode[];
  onChange: (nodes: BPMNNode[]) => void;
  role:     'respondent' | 'analyst';
  readOnly?: boolean;
}

// ── Edge defaults ──────────────────────────────────────────────────────────────

const DEFAULT_EDGE_OPTIONS = {
  type:      'smoothstep',
  style:     { stroke: '#94a3b8', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
} as const;

// ── Inner component (needs access to React Flow instance) ──────────────────────

function BPMNEditorInner({ nodes: bpmnNodes, onChange, role, readOnly = false }: BPMNEditorProps) {
  const { nodes: initNodes, edges: initEdges } = bpmnToReactFlow(bpmnNodes);
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // ── Debounced sync-back ──────────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncBack = useCallback((rfNodes: Node[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(reactFlowToBpmn(rfNodes));
    }, 300);
  }, [onChange]);

  // Sync whenever nodes change (drag, add, delete, rename).
  useEffect(() => {
    syncBack(nodes);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nodes, syncBack]);

  // ── Re-initialise when parent replaces the entire node list ─────────────────
  // (only on mount — internal edits drive onChange, not the other way around)
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────────

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds =>
      addEdge(
        { ...connection, ...DEFAULT_EDGE_OPTIONS },
        eds,
      ),
    );
  }, [setEdges]);

  // ── Double-click to rename (skip start / end) ────────────────────────────────

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (readOnly) return;
    if (node.type === 'start' || node.type === 'end') return;
    setEditingNodeId(node.id);
    setEditingLabel((node.data.label as string) ?? '');
  }, [readOnly]);

  const confirmEdit = useCallback(() => {
    if (!editingNodeId) return;
    const trimmed = editingLabel.trim();
    if (trimmed) {
      setNodes(nds =>
        nds.map(n =>
          n.id === editingNodeId
            ? { ...n, data: { ...n.data, label: trimmed } }
            : n
        ),
      );
    }
    setEditingNodeId(null);
    setEditingLabel('');
  }, [editingNodeId, editingLabel, setNodes]);

  const cancelEdit = useCallback(() => {
    setEditingNodeId(null);
    setEditingLabel('');
  }, []);

  // ── Add node helper ──────────────────────────────────────────────────────────

  const addNode = useCallback((partial: Partial<BPMNNode> & { type: BPMNNode['type'] }) => {
    const id = `node-${Date.now()}`;
    // Place in the rough centre of the current viewport (fallback position).
    const newNode: Node = {
      id,
      type:     partial.type,
      position: { x: 200 + Math.random() * 80, y: 200 + Math.random() * 80 },
      data: {
        label:       partial.label       ?? 'Novo nó',
        automatable: partial.automatable ?? false,
        systems:     partial.systems     ?? [],
        branches:    partial.branches    ?? undefined,
      },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  // ── Delete selected (protect start / end) ────────────────────────────────────

  const deleteSelected = useCallback(() => {
    let removedIds: string[] = [];
    setNodes(nds => {
      const next = nds.filter(n => {
        if (!n.selected) return true;
        if (n.type === 'start' || n.type === 'end') return true; // protected
        removedIds.push(n.id);
        return false;
      });
      return next;
    });
    setEdges(eds =>
      eds.filter(e => !removedIds.includes(e.source) && !removedIds.includes(e.target)),
    );
  }, [setNodes, setEdges]);

  // ── Keyboard delete ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readOnly, deleteSelected]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDoubleClick={onNodeDoubleClick}
      onPaneClick={() => { if (editingNodeId) confirmEdit(); }}
      nodeTypes={bpmnNodeTypes}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable={!readOnly}
      fitView
      fitViewOptions={{ padding: 0.2 }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={readOnly ? '#e9ecef' : '#e2e8f0'} />
      <Controls showInteractive={false} className="!border-gray-200 !shadow-sm" />
      {!readOnly && (
        <MiniMap
          nodeColor={n => {
            if (n.type === 'start')    return '#86efac';
            if (n.type === 'end')      return '#374151';
            if (n.type === 'gateway')  return '#fcd34d';
            return '#bfdbfe';
          }}
          maskColor="rgba(248,250,252,0.7)"
          className="!border !border-gray-200 !rounded-lg !shadow-sm"
        />
      )}

      {/* Inline node label editor */}
      {editingNodeId && (
        <Panel position="top-center">
          <div className="bg-white border border-blue-300 rounded-xl shadow-lg p-3 flex gap-2 items-center">
            <input
              autoFocus
              type="text"
              value={editingLabel}
              onChange={e => setEditingLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400"
              placeholder="Nome da etapa"
            />
            <button onClick={confirmEdit} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              OK
            </button>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 px-2 py-2 text-sm">
              ✕
            </button>
          </div>
        </Panel>
      )}

      {/* Toolbar — hidden in readOnly mode or for respondents */}
      {!readOnly && role !== 'respondent' && (
        <Panel position="top-left">
          <div className="flex flex-wrap gap-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow-sm p-2">
            <ToolbarButton
              onClick={() => addNode({ type: 'activity', label: 'Nova etapa' })}
            >
              + Atividade
            </ToolbarButton>

            <ToolbarButton
              onClick={() =>
                addNode({
                  type:     'gateway',
                  label:    'Nova decisão',
                  branches: [{ condition: 'Sim' }, { condition: 'Não' }],
                })
              }
            >
              + Decisão
            </ToolbarButton>

            {role === 'analyst' && (
              <ToolbarButton
                onClick={() => addNode({ type: 'intermediate-event', label: 'Evento' })}
              >
                + Evento
              </ToolbarButton>
            )}

            <ToolbarButton onClick={deleteSelected} variant="danger">
              Remover selecionado
            </ToolbarButton>
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
}

// ── Toolbar button sub-component ──────────────────────────────────────────────

function ToolbarButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick:  () => void;
  variant?: 'default' | 'danger';
}) {
  const cls =
    variant === 'danger'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

// ── Linear flow viewer (respondent read-only simplified view) ─────────────────

function LinearFlowNode({ node }: { node: BPMNNode }) {
  if (node.type === 'start') {
    return (
      <div className="flex items-center justify-center w-28 h-8 rounded-full bg-emerald-100 border-2 border-emerald-400 text-xs font-semibold text-emerald-700">
        {node.label || 'Início'}
      </div>
    );
  }
  if (node.type === 'end') {
    return (
      <div className="flex items-center justify-center w-28 h-8 rounded-full bg-gray-700 border-2 border-gray-800 text-xs font-semibold text-white">
        {node.label || 'Fim'}
      </div>
    );
  }
  if (node.type === 'gateway') {
    return (
      <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Decisão</span>
          <span className="text-sm font-semibold text-gray-800">{node.label}</span>
        </div>
        {node.branches && node.branches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {node.branches.map((branch, j) => (
              <span key={j} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-white border border-amber-200 rounded-lg px-2 py-1">
                <span className="text-amber-500">↳</span> {branch.condition}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  // activity, subprocess, intermediate-event
  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      <span className="text-sm text-gray-800">{node.label}</span>
    </div>
  );
}

function LinearFlowViewer({ nodes }: { nodes: BPMNNode[] }) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        Nenhuma etapa gerada ainda.
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center py-6 px-4 overflow-y-auto max-h-[500px] w-full">
      {nodes.map((node, i) => (
        <div key={i} className="flex flex-col items-center w-full max-w-md">
          <LinearFlowNode node={node} />
          {i < nodes.length - 1 && (
            <div className="flex flex-col items-center my-0.5 text-gray-300">
              <div className="w-px h-5 bg-gray-300" />
              <svg width="10" height="6" viewBox="0 0 10 6">
                <path d="M5 6 L0 0 L10 0 Z" fill="#d1d5db" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Public export (wraps in ReactFlowProvider) ────────────────────────────────

export default function BPMNEditor(props: BPMNEditorProps) {
  if (props.role === 'respondent') {
    return (
      <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
        <LinearFlowViewer nodes={props.nodes} />
      </div>
    );
  }
  return (
    <div className={`w-full rounded-xl border border-gray-200 overflow-hidden ${
      props.readOnly ? 'h-[400px] cursor-grab' : 'h-[500px]'
    }`}>
      <ReactFlowProvider>
        <BPMNEditorInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
