import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]/50 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground-strong text-[#0a0f1c] hover:bg-white",
        secondary:
          "bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] border border-[var(--color-border)]",
        ghost:
          "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
        outline:
          "border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:border-[var(--color-accent)] hover:text-accent",
        violet:
          "bg-[var(--color-violet)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-[13px]",
        lg: "h-12 px-7 text-[14px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
