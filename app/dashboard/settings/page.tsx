import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Key,
  Network,
  Palette,
  ShieldCheck,
  User,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Topbar
        title="Settings"
        subtitle="Manage your workspace, API keys and alerts"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-6xl">
          <nav className="xl:col-span-3 card p-3 h-fit space-y-0.5">
            {[
              { icon: User, label: "Account", active: true },
              { icon: Bell, label: "Notifications" },
              { icon: Key, label: "API Access" },
              { icon: Network, label: "Data sources" },
              { icon: ShieldCheck, label: "Security" },
              { icon: Palette, label: "Appearance" },
            ].map((s) => (
              <div
                key={s.label}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer ${
                  s.active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-foreground-strong hover:bg-surface-2"
                }`}
              >
                <s.icon className="size-4" />
                {s.label}
              </div>
            ))}
          </nav>

          <div className="xl:col-span-9 space-y-6">
            <div className="card p-6">
              <h3 className="text-base font-semibold text-foreground-strong mb-1">
                Account
              </h3>
              <p className="text-xs text-muted-2 mb-6">
                Personal info & workspace preferences
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Display name", value: "Lucas Albuquerque" },
                  { label: "Email", value: "lucas@stellarpulse.xyz" },
                  { label: "Workspace", value: "Stellar Pulse · Personal" },
                  { label: "Time zone", value: "America/Sao_Paulo" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-[11px] uppercase tracking-wider text-muted-2 mb-1.5 block">
                      {f.label}
                    </label>
                    <input
                      defaultValue={f.value}
                      className="w-full h-10 rounded-lg bg-surface-2 border border-[var(--color-border)] px-3 text-sm text-foreground-strong focus:outline-none focus:border-[var(--color-border-strong)]"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <Button>Save changes</Button>
                <Button variant="ghost">Cancel</Button>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground-strong">
                    API access
                  </h3>
                  <p className="text-xs text-muted-2 mt-0.5">
                    Use Stellar Pulse data programmatically
                  </p>
                </div>
                <Badge tone="violet">Beta</Badge>
              </div>
              <div className="card-2 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-2">
                    Primary key
                  </div>
                  <div className="font-mono text-xs text-foreground-strong mt-1 truncate">
                    sp_live_2k4j8h3g9f0a8s7d6f5g4h3j2k1l0p9o8i7u6y5
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Rotate
                </Button>
              </div>
              <div className="mt-3 text-xs text-muted-2">
                Rate limit: 600 req/min · Last used 2m ago
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-foreground-strong mb-1">
                Notifications
              </h3>
              <p className="text-xs text-muted-2 mb-5">
                Set thresholds for alerts on protocols, flows and Pulse Score
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: "TVL drop >10% on watched protocols",
                    on: true,
                  },
                  {
                    label: "Pulse Score decreases >5 points",
                    on: true,
                  },
                  {
                    label: "Capital outflow >$5M in 1h",
                    on: false,
                  },
                  {
                    label: "New RWA issuer launches",
                    on: true,
                  },
                ].map((n) => (
                  <div
                    key={n.label}
                    className="flex items-center justify-between card-2 p-3.5"
                  >
                    <div className="text-sm text-foreground-strong">
                      {n.label}
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        n.on ? "bg-accent" : "bg-surface"
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-white transition-transform ${
                          n.on ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
