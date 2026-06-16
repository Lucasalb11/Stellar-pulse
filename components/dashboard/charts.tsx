"use client";
import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { formatUSD, formatNumber } from "@/lib/utils";

interface SeriesPoint {
  date: string;
  label: string;
  value: number;
}

type ValueFormat = "usd" | "number";

function fmt(v: number, kind: ValueFormat | undefined) {
  if (kind === "usd") return formatUSD(v);
  return formatNumber(v);
}

const tooltipStyle = {
  background: "rgba(17,24,39,0.95)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--color-foreground)",
  padding: "8px 10px",
};

const labelStyle = { color: "var(--color-muted)", fontSize: 11 };
const itemStyle = { color: "var(--color-foreground-strong)" };

export function AreaTrend({
  data,
  color = "#00D4FF",
  format = "number",
  height = 240,
  showAxes = true,
}: {
  data: SeriesPoint[];
  color?: string;
  format?: ValueFormat;
  height?: number;
  showAxes?: boolean;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showAxes && (
            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
          )}
          {showAxes && (
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted-2)", fontSize: 11 }}
              minTickGap={32}
            />
          )}
          {showAxes && (
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted-2)", fontSize: 11 }}
              width={56}
              tickFormatter={(v) => fmt(Number(v), format).replace(/\$/, "")}
            />
          )}
          <Tooltip
            cursor={{ stroke: "rgba(148,163,184,0.25)" }}
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            itemStyle={itemStyle}
            formatter={(v) => [fmt(Number(v), format), ""]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiLineChart({
  data,
  series,
  height = 260,
  format = "number",
}: {
  data: Array<Record<string, number | string>>;
  series: { key: string; color: string; name: string }[];
  height?: number;
  format?: ValueFormat;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-2)", fontSize: 11 }}
            minTickGap={32}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-2)", fontSize: 11 }}
            width={56}
            tickFormatter={(v) => fmt(Number(v), format).replace(/\$/, "")}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            itemStyle={itemStyle}
            formatter={(v) => fmt(Number(v), format)}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarRanking({
  data,
  color = "#00D4FF",
  height = 280,
  format = "number",
}: {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  format?: ValueFormat;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(148,163,184,0.06)" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-2)", fontSize: 11 }}
            tickFormatter={(v) => fmt(Number(v), format).replace(/\$/, "")}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.06)" }}
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            itemStyle={itemStyle}
            formatter={(v) => fmt(Number(v), format)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={0.85 - i * 0.07} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 260,
  inner = 60,
  outer = 90,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  inner?: number;
  outer?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div style={{ width: "100%", height }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={inner}
            outerRadius={outer}
            stroke="rgba(10,15,28,0.9)"
            strokeWidth={2}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            itemStyle={itemStyle}
            formatter={(v) => formatUSD(Number(v))}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            {centerLabel && (
              <div className="text-[10px] uppercase tracking-wider text-muted-2">
                {centerLabel}
              </div>
            )}
            {centerValue && (
              <div className="text-lg font-semibold num text-foreground-strong">
                {centerValue}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ScoreGauge({
  value,
  size = 160,
  color = "#00D4FF",
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const data = [{ name: "score", value, fill: color }];
  return (
    <div style={{ width: size, height: size }} className="relative">
      <ResponsiveContainer>
        <RadialBarChart
          data={data}
          startAngle={220}
          endAngle={-40}
          innerRadius="78%"
          outerRadius="100%"
          barSize={10}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "rgba(148,163,184,0.1)" }}
            dataKey="value"
            cornerRadius={6}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-semibold num text-foreground-strong">
            {value}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-2">
            Pulse Score
          </div>
        </div>
      </div>
    </div>
  );
}
