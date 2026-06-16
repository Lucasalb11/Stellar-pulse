import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 bg-[rgba(10,15,28,0.85)] backdrop-blur border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 h-[68px] flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Wordmark showKicker={false} />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[13px] text-muted">
          <a
            href="#mission"
            className="hover:text-foreground-strong transition-colors"
          >
            Mission
          </a>
          <a
            href="#modules"
            className="hover:text-foreground-strong transition-colors"
          >
            Modules
          </a>
          <a
            href="#dashboard"
            className="hover:text-foreground-strong transition-colors"
          >
            Dashboard
          </a>
          <a
            href="#roadmap"
            className="hover:text-foreground-strong transition-colors"
          >
            Roadmap
          </a>
        </nav>
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex text-[13px] text-muted hover:text-foreground-strong transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[13px] text-foreground-strong border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:text-accent transition-colors px-3.5 py-1.5 rounded-sm"
          >
            Open terminal
            <span className="text-muted-2">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
