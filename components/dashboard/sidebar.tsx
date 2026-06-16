"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Waves,
  CircleDollarSign,
  Building2,
  Code2,
  Network,
  Gauge,
  Settings,
} from "lucide-react";
import { Wordmark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const items = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "DeFi Pulse", href: "/dashboard/defi", icon: Layers },
  { label: "Capital Flows", href: "/dashboard/flows", icon: Waves },
  { label: "Stablecoins", href: "/dashboard/stablecoins", icon: CircleDollarSign },
  { label: "RWAs", href: "/dashboard/rwa", icon: Building2 },
  { label: "Soroban", href: "/dashboard/soroban", icon: Code2 },
  { label: "Protocols", href: "/dashboard/protocols", icon: Network },
  { label: "Pulse Score", href: "/dashboard/pulse-score", icon: Gauge },
];

const bottomItems = [{ label: "Settings", href: "/dashboard/settings", icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-[var(--color-border)] bg-[rgba(17,24,39,0.5)] backdrop-blur flex-col">
      <div className="h-16 px-5 flex items-center border-b border-[var(--color-border)]">
        <Link href="/">
          <Wordmark />
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-2">
          Intelligence
        </div>
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-accent-soft text-accent border border-[rgba(0,212,255,0.18)]"
                  : "text-muted hover:text-foreground-strong hover:bg-surface-2 border border-transparent",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && (
                <span
                  className="size-1.5 rounded-full bg-accent"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--color-border)] space-y-2">
        {bottomItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-surface-2 text-foreground-strong"
                  : "text-muted hover:text-foreground-strong hover:bg-surface-2",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="card-2 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative size-2">
              <span className="absolute inset-0 rounded-full bg-success" />
              <span className="absolute inset-0 rounded-full bg-success pulse-ring" />
            </div>
            <Badge tone="success" className="px-1.5 py-0">
              All systems normal
            </Badge>
          </div>
          <div className="text-[10px] text-muted-2 leading-snug">
            Mainnet · Block #58,412,038 · 4.2s
          </div>
        </div>
      </div>
    </aside>
  );
}
