"use client";
import {
  Search,
  Bell,
  ChevronDown,
  Command as CmdIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[rgba(10,15,28,0.7)] backdrop-blur-xl">
      <div className="h-16 px-6 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1
              className="text-lg font-semibold text-foreground-strong tracking-tight truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            <Badge tone="accent" className="hidden md:inline-flex">
              <span className="size-1.5 rounded-full bg-accent" />
              Live
            </Badge>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-2 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              placeholder="Search protocols, contracts, wallets…"
              className="w-full h-9 rounded-lg bg-surface-2 border border-[var(--color-border)] pl-9 pr-16 text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-2 focus:ring-[rgba(0,212,255,0.18)]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-muted-2 font-mono px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-surface">
              <CmdIcon className="size-3" />K
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="size-9 rounded-lg border border-[var(--color-border)] grid place-items-center text-muted hover:text-foreground-strong hover:bg-surface-2 transition-colors relative">
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
          </button>
          <button className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg border border-[var(--color-border)] hover:bg-surface-2 transition-colors">
            <div
              className="size-6 rounded-md grid place-items-center text-[10px] font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(124,58,237,0.3))",
                color: "#fff",
              }}
            >
              LA
            </div>
            <span className="text-xs text-foreground-strong hidden sm:inline">
              Analyst
            </span>
            <ChevronDown className="size-3 text-muted-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
