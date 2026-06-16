import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

export function LogoMark({ size = 24, className, ...rest }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0 text-foreground-strong", className)}
      {...rest}
    >
      <rect
        x="0.75"
        y="0.75"
        width="22.5"
        height="22.5"
        rx="1.5"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <line x1="7" y1="15" x2="7" y2="17" />
        <line x1="10.5" y1="11" x2="10.5" y2="17" />
        <line x1="14" y1="8" x2="14" y2="17" />
        <line x1="17" y1="13" x2="17" y2="17" />
      </g>
    </svg>
  );
}

export function Wordmark({
  className,
  showKicker = true,
}: {
  className?: string;
  showKicker?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span
          className="text-[16px] font-medium text-foreground-strong"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.005em",
          }}
        >
          Stellar Pulse
        </span>
        {showKicker && (
          <span className="eyebrow mt-1 text-[9px]">
            Intelligence Layer
          </span>
        )}
      </div>
    </div>
  );
}
