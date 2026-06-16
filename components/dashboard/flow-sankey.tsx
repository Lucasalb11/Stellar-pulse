"use client";
import * as React from "react";
import { sankeyFlows as mockSankeyFlows } from "@/lib/mock-data";
import { formatUSD } from "@/lib/utils";

interface Node {
  name: string;
  column: number;
  total: number;
  y: number;
  height: number;
}

const COLORS = ["#00D4FF", "#7C3AED", "#10B981", "#F59E0B", "#EC4899", "#29E3FF"];

export interface SankeyFlow {
  source: string;
  target: string;
  value: number;
}

export function FlowSankey({ flows }: { flows?: SankeyFlow[] }) {
  const sankeyFlows: SankeyFlow[] =
    flows && flows.length > 0 ? flows : mockSankeyFlows;
  const sources = new Set(sankeyFlows.map((f) => f.source));
  const targets = new Set(sankeyFlows.map((f) => f.target));
  const allNames = Array.from(new Set([...sources, ...targets]));

  const columns: Record<string, number> = {};
  for (const n of allNames) {
    const isSrc = sources.has(n);
    const isTgt = targets.has(n);
    if (isSrc && !isTgt) columns[n] = 0;
    else if (!isSrc && isTgt) columns[n] = 2;
    else columns[n] = 1;
  }

  // totals per node
  const totals: Record<string, number> = {};
  for (const f of sankeyFlows) {
    totals[f.source] = (totals[f.source] ?? 0) + f.value;
    totals[f.target] = (totals[f.target] ?? 0) + f.value;
  }

  // layout per column
  const W = 920;
  const H = 460;
  const COL_X = [60, W / 2, W - 60];
  const NODE_W = 14;
  const PADDING = 14;

  const columnNodes: Node[][] = [[], [], []];
  for (const n of allNames) {
    columnNodes[columns[n]].push({
      name: n,
      column: columns[n],
      total: totals[n],
      y: 0,
      height: 0,
    });
  }
  for (const col of columnNodes) {
    col.sort((a, b) => b.total - a.total);
    const colTotal = col.reduce((s, x) => s + x.total, 0);
    const availableH = H - PADDING * (col.length + 1);
    let cursor = PADDING;
    for (const node of col) {
      node.height = Math.max(18, (node.total / colTotal) * availableH);
      node.y = cursor;
      cursor += node.height + PADDING;
    }
  }

  const nodeMap: Record<string, Node> = {};
  for (const col of columnNodes) for (const n of col) nodeMap[n.name] = n;

  // build paths with offset tracking on each node
  const sourceOffsets: Record<string, number> = {};
  const targetOffsets: Record<string, number> = {};

  const paths = sankeyFlows
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((f, i) => {
      const src = nodeMap[f.source];
      const tgt = nodeMap[f.target];
      const srcH = (f.value / src.total) * src.height;
      const tgtH = (f.value / tgt.total) * tgt.height;
      const srcY =
        src.y + (sourceOffsets[f.source] ?? 0) + srcH / 2;
      const tgtY =
        tgt.y + (targetOffsets[f.target] ?? 0) + tgtH / 2;
      sourceOffsets[f.source] = (sourceOffsets[f.source] ?? 0) + srcH;
      targetOffsets[f.target] = (targetOffsets[f.target] ?? 0) + tgtH;

      const x1 = COL_X[src.column] + NODE_W;
      const x2 = COL_X[tgt.column];
      const cpx1 = x1 + (x2 - x1) * 0.5;
      const cpx2 = x1 + (x2 - x1) * 0.5;
      const d = `M${x1},${srcY} C${cpx1},${srcY} ${cpx2},${tgtY} ${x2},${tgtY}`;
      const strokeW = Math.max(2, (srcH + tgtH) / 2);
      const color = COLORS[i % COLORS.length];
      return { d, strokeW, color, f };
    });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.color}
            strokeOpacity="0.25"
            strokeWidth={p.strokeW}
            fill="none"
          >
            <title>
              {p.f.source} → {p.f.target} · {formatUSD(p.f.value)}
            </title>
          </path>
        ))}
        {Object.values(nodeMap).map((n, i) => {
          const x = COL_X[n.column];
          return (
            <g key={n.name}>
              <rect
                x={x}
                y={n.y}
                width={NODE_W}
                height={n.height}
                rx={3}
                fill={COLORS[i % COLORS.length]}
              />
              <text
                x={n.column === 2 ? x - 8 : x + NODE_W + 8}
                y={n.y + n.height / 2}
                textAnchor={n.column === 2 ? "end" : "start"}
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--color-foreground)"
                fontWeight={500}
              >
                {n.name}
              </text>
              <text
                x={n.column === 2 ? x - 8 : x + NODE_W + 8}
                y={n.y + n.height / 2 + 13}
                textAnchor={n.column === 2 ? "end" : "start"}
                dominantBaseline="middle"
                fontSize="9"
                fill="var(--color-muted-2)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatUSD(n.total)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute top-4 right-4 text-[10px] uppercase tracking-wider text-muted-2 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" />
          Source
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-violet" />
          Hub
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Destination
        </span>
      </div>
    </div>
  );
}
