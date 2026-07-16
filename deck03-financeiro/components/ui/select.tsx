import { cn } from "@/lib/cn";
import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-card border border-base-border bg-white px-3 py-2 text-sm text-ink",
        "focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent",
        "disabled:cursor-not-allowed disabled:bg-base-bg",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
