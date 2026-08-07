import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-accent text-white hover:bg-[#255C4E] disabled:opacity-50",
  secondary:
    "bg-white text-ink border border-base-border hover:bg-base-bg disabled:opacity-50",
  ghost: "bg-transparent text-ink-soft hover:bg-base-bg disabled:opacity-50",
  danger: "bg-signal-negative text-white hover:opacity-90 disabled:opacity-50",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium transition-colors",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
