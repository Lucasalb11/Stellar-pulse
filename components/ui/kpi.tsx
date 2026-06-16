import * as React from "react";
import { Sparkline } from "./sparkline";
import { cn, changeTone, formatPercent } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface KPIProps {
  label: string;
  value: string;
  change?: number;
  spark?: number[];
  sparkColor?: string;
  hint?: string;
  className?: string;
  accent?: "cyan" | "violet" | "success" | "warning" | "danger";
}

const ACCENTS: Record<NonNullable<KPIProps["accent"]>, string> = {
  cyan: "var(--color-accent)",
  violet: "var(--color-violet)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

export function KPI({
  label,
  value,
  change,
  spark,
  sparkColor,
  hint,
  className,
  accent = "cyan",
}: KPIProps) {
  const color = sparkColor ?? ACCENTS[accent];
  return (
    <div
      className={cn(
        "card group p-5 hover:border-strong transition-colors",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
            {label}
          </div>
          <div className="text-2xl font-semibold tracking-tight num text-foreground-strong">
            {value}
          </div>
          {(typeof change === "number" || hint) && (
            <div className="flex items-center gap-2 text-xs">
              {typeof change === "number" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 num font-medium",
                    changeTone(change),
                  )}
                >
                  {change > 0 ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : change < 0 ? (
                    <ArrowDownRight className="size-3.5" />
                  ) : null}
                  {formatPercent(change, { signed: true })}
                </span>
              )}
              {hint && (
                <span className="text-muted-2">{hint}</span>
              )}
            </div>
          )}
        </div>
        {spark && (
          <Sparkline
            data={spark}
            stroke={color}
            width={88}
            height={36}
            className="opacity-90 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
    </div>
  );
}
