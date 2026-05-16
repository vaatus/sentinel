"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { DataFlow } from "../lib/data";

interface Props {
  flows: DataFlow[];
}

export function DataFlowGraph({ flows }: Props) {
  const { nodes, edges } = useMemo(() => buildGraph(flows), [flows]);

  return (
    <div>
      <div className="h-[640px] border border-sentinel-border rounded-xl overflow-hidden bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={20} />
          <Controls className="!bg-slate-900 !border-slate-700" />
        </ReactFlow>
      </div>
      <div className="mt-4 text-xs text-slate-500 flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-sky-500" /> PHI Source
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-slate-500" /> Function in path
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Safe sink
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-rose-500" /> Violating sink
        </span>
      </div>

      <div className="mt-8 space-y-4">
        {flows.map((flow) => (
          <div key={flow.id} className="bg-sentinel-panel border border-sentinel-border rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-slate-500">{flow.id}</div>
            <div className="text-sm text-slate-200 mt-1">{flow.source.description}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              {flow.source.file}:{flow.source.line}
            </div>
            {flow.sinks.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {flow.sinks.map((s, i) => (
                  <li key={i} className="text-xs text-slate-400">
                    <span className={`uppercase font-mono mr-2 ${sinkColor(s.type)}`}>
                      {s.type}
                    </span>
                    <span className="font-mono text-slate-300">{s.file}:{s.line}</span>
                    <span className="ml-2 text-slate-500">— {s.risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 text-xs text-slate-500">No sinks reached.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function sinkColor(type: string): string {
  switch (type) {
    case "log":      return "text-rose-300";
    case "api":      return "text-orange-300";
    case "response": return "text-amber-300";
    case "db":       return "text-sky-300";
    case "file":     return "text-violet-300";
    default:         return "text-slate-400";
  }
}

function buildGraph(flows: DataFlow[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeIds = new Map<string, string>();

  let y = 0;
  const VERTICAL_STEP = 120;
  const X_SOURCE = 0;
  const X_STEP = 220;

  flows.forEach((flow, fi) => {
    const sourceId = `${flow.id}-src`;
    const baseY = y;
    nodes.push({
      id: sourceId,
      position: { x: X_SOURCE, y: baseY },
      data: { label: nodeLabel("source", flow.source.file, flow.source.line, flow.source.description) },
      style: nodeStyle("source"),
      sourcePosition: "right" as any,
    });
    nodeIds.set(sourceId, sourceId);

    const pathNodes = flow.path.slice(1, -1);
    pathNodes.forEach((p, idx) => {
      const id = `${flow.id}-p-${idx}`;
      nodes.push({
        id,
        position: { x: X_SOURCE + X_STEP * (idx + 1), y: baseY },
        data: { label: nodeLabel("path", p.file, p.line, p.function) },
        style: nodeStyle("path"),
        sourcePosition: "right" as any,
        targetPosition: "left" as any,
      });
      const prev = idx === 0 ? sourceId : `${flow.id}-p-${idx - 1}`;
      edges.push({
        id: `${prev}->${id}`,
        source: prev,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
        style: { stroke: "#475569" },
      });
    });

    const sinkBaseX = X_SOURCE + X_STEP * (pathNodes.length + 1);
    flow.sinks.forEach((s, idx) => {
      const id = `${flow.id}-sink-${idx}`;
      const violating =
        s.type === "log" || s.type === "api" || /violat/i.test(s.risk);
      nodes.push({
        id,
        position: { x: sinkBaseX, y: baseY + idx * 70 },
        data: { label: nodeLabel(violating ? "bad" : "ok", s.file, s.line, `${s.type.toUpperCase()} — ${s.risk.slice(0, 64)}`) },
        style: nodeStyle(violating ? "bad" : "ok"),
        targetPosition: "left" as any,
      });
      const prev =
        pathNodes.length > 0
          ? `${flow.id}-p-${pathNodes.length - 1}`
          : sourceId;
      edges.push({
        id: `${prev}->${id}`,
        source: prev,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed, color: violating ? "#fb7185" : "#34d399" },
        style: { stroke: violating ? "#fb7185" : "#34d399", strokeWidth: 1.5 },
        animated: violating,
      });
    });

    y = baseY + Math.max(1, flow.sinks.length) * 70 + VERTICAL_STEP;
  });

  return { nodes, edges };
}

function nodeLabel(_kind: string, file: string, line: number, label: string): string {
  const fileShort = file.split("/").slice(-2).join("/");
  return `${label}\n${fileShort}:${line}`;
}

function nodeStyle(kind: "source" | "path" | "ok" | "bad") {
  const base = {
    padding: 10,
    borderRadius: 8,
    fontSize: 11,
    width: 200,
    color: "#e2e8f0",
    whiteSpace: "pre-line" as const,
    textAlign: "left" as const,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };
  switch (kind) {
    case "source":
      return { ...base, background: "#0c4a6e", border: "1px solid #0ea5e9" };
    case "path":
      return { ...base, background: "#1e293b", border: "1px solid #334155" };
    case "ok":
      return { ...base, background: "#064e3b", border: "1px solid #34d399" };
    case "bad":
      return { ...base, background: "#7f1d1d", border: "1px solid #fb7185" };
  }
}
