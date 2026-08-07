import { cn } from "@/lib/cn";
import { InputHTMLAttributes, LabelHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-card border border-base-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint",
        "focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent",
        "disabled:cursor-not-allowed disabled:bg-base-bg",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-signal-negative">{children}</p>;
}
